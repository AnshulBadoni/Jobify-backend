import os
import time
import asyncio
import logging
import json
import uuid
from typing import List, Optional, Dict, Any
from pathlib import Path

from fastapi import APIRouter, Request, HTTPException, FastAPI
from pydantic import BaseModel


from services.text_generation_uncensored import generate_text, batch_generate, init_client, close_client

logger = logging.getLogger(__name__)
uncensored = APIRouter(prefix="/apifreellm", tags=["ApiFreeLLM"])

# ---------------- Config ----------------
TIMEOUT = float(os.getenv("APIFREE_LLM_TIMEOUT", "60"))
RATE_LIMIT_SECONDS = int(os.getenv("APIFREE_LLM_RATE_LIMIT_SECONDS", "5"))
CHAR_FILE = os.getenv("APIFREELLM_CHAR_FILE", "data/characters.json")
MAX_HISTORY_MESSAGES = int(os.getenv("APIFREELLM_MAX_HISTORY", "10"))

# ---------------- Globals ----------------
_last_seen: Dict[str, float] = {}
_characters: Dict[str, Dict[str, Any]] = {}
_sessions: Dict[str, List[Dict[str, str]]] = {}
_characters_lock = asyncio.Lock()
_sessions_lock = asyncio.Lock()

# Load characters from disk
_char_file_path = Path(CHAR_FILE)
_char_file_path.parent.mkdir(parents=True, exist_ok=True)
if _char_file_path.exists():
    try:
        with _char_file_path.open("r", encoding="utf-8") as f:
            _characters = json.load(f)
    except Exception:
        logger.exception("Failed to load characters file, starting empty")
        _characters = {}
else:
    _characters = {}

# ---------------- Models ----------------
class UpstreamResponse(BaseModel):
    status: str
    response: str
    error: Optional[str] = None
    retry_after: Optional[int] = None

class ChatRequest(BaseModel):
    message: str

class SummarizeRequest(BaseModel):
    text: str

class TranslateRequest(BaseModel):
    text: str
    target_lang: str = "es"

class BatchRequest(BaseModel):
    messages: List[str]

class ExampleTurn(BaseModel):
    user: str
    assistant: str

class CharacterCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    system_prompt: Optional[str] = ""
    examples: Optional[List[ExampleTurn]] = []

class CharacterOut(CharacterCreate):
    id: str

class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    examples: Optional[List[ExampleTurn]] = None

class CharacterChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    reset_session: Optional[bool] = False

# ---------------- Helpers ----------------
def get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"

async def _persist_characters():
    loop = asyncio.get_running_loop()
    def _write():
        try:
            with _char_file_path.open("w", encoding="utf-8") as f:
                json.dump(_characters, f, ensure_ascii=False, indent=2)
        except Exception:
            logger.exception("Failed to persist characters")
    await loop.run_in_executor(None, _write)

def _enforce_rate_limit(client_ip: str):
    now = time.time()
    expired = [ip for ip, ts in _last_seen.items() if now - ts > 60]
    for ip in expired:
        _last_seen.pop(ip, None)

    last = _last_seen.get(client_ip)
    if last and (now - last) < RATE_LIMIT_SECONDS:
        retry_after = int(RATE_LIMIT_SECONDS - (now - last))
        raise HTTPException(status_code=429, detail={
            "status": "rate_limited",
            "response": "",
            "error": "Local rate limit exceeded. Try again later.",
            "retry_after": retry_after,
        })
    _last_seen[client_ip] = now

def _trim_history(history: List[Dict[str, str]], max_len: int = MAX_HISTORY_MESSAGES) -> List[Dict[str, str]]:
    return history if len(history) <= max_len else history[-max_len:]

def _build_persona_prompt(character: Dict[str, Any], session_history: List[Dict[str, str]], user_message: str) -> str:
    name = character.get("name", "Character")
    description = character.get("description", "")
    system = character.get("system_prompt", "")
    examples = character.get("examples") or []

    parts: List[str] = []
    if system:
        parts.append(system)
    parts.append(f"You are {name}. {description}")

    if examples:
        parts.append("\n---\nExample conversations:")
        for ex in examples:
            parts.append(f"User: {ex['user']}")
            parts.append(f"{name}: {ex['assistant']}")

    if session_history:
        parts.append("\n---\nConversation so far:")
        for msg in session_history:
            speaker = name if msg.get("role") == "assistant" else "User"
            parts.append(f"{speaker}: {msg.get('content')}")

    parts.append("\n---\nNew message:")
    parts.append(f"User: {user_message}")
    parts.append(f"{name}:")
    return "\n".join(parts)

# ---------------- Character CRUD ----------------
@uncensored.post("/characters", response_model=CharacterOut)
async def create_character(body: CharacterCreate, request: Request):
    _enforce_rate_limit(get_client_ip(request))
    char_id = uuid.uuid4().hex
    char_obj = {
        "id": char_id,
        "name": body.name,
        "description": body.description or "",
        "system_prompt": body.system_prompt or "",
        "examples": [ex.dict() for ex in (body.examples or [])],
        "created_at": time.time(),
    }
    async with _characters_lock:
        _characters[char_id] = char_obj
    await _persist_characters()
    return CharacterOut(**char_obj)

@uncensored.get("/characters")
async def list_characters():
    return [{"id": k, "name": v.get("name"), "description": v.get("description")} for k, v in _characters.items()]

@uncensored.get("/characters/{char_id}")
async def get_character(char_id: str):
    char = _characters.get(char_id)
    if not char:
        raise HTTPException(status_code=404, detail="character not found")
    return char

@uncensored.put("/characters/{char_id}")
async def update_character(char_id: str, body: CharacterUpdate, request: Request):
    _enforce_rate_limit(get_client_ip(request))
    async with _characters_lock:
        char = _characters.get(char_id)
        if not char:
            raise HTTPException(status_code=404, detail="character not found")
        if body.name is not None: char["name"] = body.name
        if body.description is not None: char["description"] = body.description
        if body.system_prompt is not None: char["system_prompt"] = body.system_prompt
        if body.examples is not None: char["examples"] = [ex.dict() for ex in body.examples]
        char["updated_at"] = time.time()
    await _persist_characters()
    return char

@uncensored.delete("/characters/{char_id}")
async def delete_character(char_id: str, request: Request):
    _enforce_rate_limit(get_client_ip(request))
    async with _characters_lock:
        if char_id not in _characters:
            raise HTTPException(status_code=404, detail="character not found")
        _characters.pop(char_id)
    await _persist_characters()
    return {"status": "success", "deleted": char_id}

# ---------------- Character chat ----------------
@uncensored.post("/character_chat/{char_id}")
async def character_chat(char_id: str, body: CharacterChatRequest):
    char = _characters.get(char_id)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    session_id = body.session_id or uuid.uuid4().hex
    history = _sessions.get(session_id, [])
    if body.reset_session:
        history = []
    
    response = await generate_text(body.message, character=char, history=history)

    # Save assistant reply
    if response.get("status") == "success":
        history.append({"role": "assistant", "content": response.get("response", "")})
        _sessions[session_id] = history

    return {"session_id": session_id, **response}


@uncensored.get("/sessions/{session_id}")
async def get_session(session_id: str):
    sess = _sessions.get(session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="session not found")
    return {"session_id": session_id, "history": sess}

@uncensored.post("/sessions/{session_id}/end")
async def end_session(session_id: str):
    async with _sessions_lock:
        if session_id in _sessions:
            _sessions.pop(session_id)
            return {"status": "success", "ended": session_id}
    raise HTTPException(status_code=404, detail="session not found")

# ---------------- Convenience endpoints ----------------
@uncensored.post("/chat", response_model=UpstreamResponse)
async def chat_endpoint(body: ChatRequest, request: Request):
    _enforce_rate_limit(get_client_ip(request))
    return await generate_text(body.message)

@uncensored.post("/summarize", response_model=UpstreamResponse)
async def summarize_endpoint(body: SummarizeRequest, request: Request):
    _enforce_rate_limit(get_client_ip(request))
    return await generate_text(f"Summarize the following text concisely:\n\n{body.text}")

@uncensored.post("/translate", response_model=UpstreamResponse)
async def translate_endpoint(body: TranslateRequest, request: Request):
    _enforce_rate_limit(get_client_ip(request))
    return await generate_text(f"Translate the following text to {body.target_lang}:\n\n{body.text}")

@uncensored.post("/batch")
async def batch_endpoint(body: BatchRequest, request: Request):
    _enforce_rate_limit(get_client_ip(request))
    responses = await batch_generate(body.messages)
    return {"status": "success", "responses": responses}

# ---------------- FastAPI lifecycle ----------------
def register_events(app: FastAPI):
    @app.on_event("startup")
    async def _startup():
        await init_client()
        logger.info("httpx client initialized")

    @app.on_event("shutdown")
    async def _shutdown():
        await close_client()
        logger.info("httpx client closed")
