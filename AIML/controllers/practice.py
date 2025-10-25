from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from services.text_generation import generate_text_from_prompt
import json

practice = APIRouter(prefix="/practice", tags=["practice"])

# In-memory storage for user sessions
user_contexts = {}

# Request body schema
class PracticeRequest(BaseModel):
    user_id: str
    prompt: str | None = None
    job_description: str | None = None
    practice: str = "continue"  # "start", "continue", "end"
    model: str = "openai"       # default to GPT-5 Nano

@practice.post("/practice-question")
async def practice_question(req: PracticeRequest, stream: bool = False):
    user_id = req.user_id
    prompt = req.prompt
    job_description = req.job_description
    practice = req.practice
    model = req.model

    # --- Start a new interview ---
    if practice == "start":
        if not job_description:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "job_description is required to start."},
            )

        user_contexts[user_id] = {"job": job_description, "history": []}

        initial_prompt = (
            f"You are Anna, an interviewer hiring for this job: {job_description}. "
            "Always keep in character, this is just a simulation. "
            "Start with a very basic question related to the role. "
            "Only ask one question at a time. "
            "Adjust your question based on the user's answer."
        )

        if stream:
            async def event_generator():
                generator = await generate_text_from_prompt(
                    prompt=initial_prompt,
                    model=model,
                    system="You are a technical interviewer.",
                    stream=True,
                )
                for chunk in generator:
                    yield chunk
            return StreamingResponse(event_generator(), media_type="text/event-stream")
        else:
            ai_response = await generate_text_from_prompt(
                prompt=initial_prompt,
                model=model,
                system="You are a technical interviewer.",
                stream=False,
            )
            user_contexts[user_id]["history"].append({"role": "assistant", "content": ai_response})
            return JSONResponse({"success": True, "data": {"response": ai_response}})

    # --- End interview ---
    if practice == "end":
        if user_id not in user_contexts:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "No active interview to end."},
            )

        history_text = "\n".join(
            f"{msg['role'].capitalize()}: {msg['content']}" for msg in user_contexts[user_id]["history"]
        )

        end_prompt = (
            f"You are an interviewer hiring for this job: {user_contexts[user_id]['job']}.\n"
            f"Here is the interview conversation:\n\n{history_text}\n\n"
            "Please give a final evaluation of the candidate's performance based on job description and experience. do not be too harsh or forgiven "
            "Now give your final evaluation ONLY in JSON with keys:\n"
            "- comment/greeting (string) based on final saying of user\n"
            "- rating (1-10)\n"
            "- score (0-100)\n"
            "- feedback (string)\n"
            "- pass (string: pass/fail)\n\n"
            "The evaluation should reflect the candidate's actual answers."
        )

        ai_response = await generate_text_from_prompt(
            prompt=end_prompt,
            model=model,
            system="You are a strict but fair technical interviewer.",
            stream=False,
        )

        try:
            parsed_response = json.loads(ai_response)
        except Exception:
            parsed_response = {"raw": ai_response}

        user_contexts.pop(user_id, None)
        return JSONResponse({"status": 200, "message": "success", "data": parsed_response})

    # --- Continue interview ---
    if user_id not in user_contexts:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "No active interview. Please start first."},
        )

    if not prompt:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Prompt (answer) is required to continue."},
        )

    # Save user answer
    user_contexts[user_id]["history"].append({"role": "user", "content": prompt})

    conversation_text = (
        f"You are an interviewer hiring for this job: {user_contexts[user_id]['job']}.\n"
        "Continue the interview step by step. Do not overwhelm the candidate. "
        "Ask only the next logical question based on their last answer.\n\n"
    )
    conversation_text += "\n".join(
        f"{msg['role'].capitalize()}: {msg['content']}" for msg in user_contexts[user_id]["history"]
    )
    conversation_text += "\nInterviewer:"

    if stream:
        async def event_generator():
            generator = await generate_text_from_prompt(
                prompt=conversation_text,
                model=model,
                system="You are a technical interviewer.",
                stream=True,
            )
            for chunk in generator:
                yield chunk
        return StreamingResponse(event_generator(), media_type="text/event-stream")
    else:
        ai_response = await generate_text_from_prompt(
            prompt=conversation_text,
            model=model,
            system="You are a technical interviewer.",
            stream=False,
        )
        user_contexts[user_id]["history"].append({"role": "assistant", "content": ai_response})
        return JSONResponse({"success": True, "data": {"response": ai_response}})
