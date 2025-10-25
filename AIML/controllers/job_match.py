import re
from fastapi import APIRouter
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from numpy import dot
from numpy.linalg import norm
from rapidfuzz import fuzz
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Initialize FastAPI router
vector = APIRouter(prefix="/vector", tags=["vectors"])

# Sentence embedding model (for similarity)
embed_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# Thread pool for async embedding generation
executor = ThreadPoolExecutor(max_workers=4)  # adjust threads as needed

# --- Schemas ---
class EmbedRequest(BaseModel):
    text: str

class EmbedResponse(BaseModel):
    embedding: list[float]

class SimilarityRequest(BaseModel):
    text1: str
    text2: str

class SimilarityResponse(BaseModel):
    similarity: float
    canonical1: str
    canonical2: str

# --- Utility to normalize & canonicalize a sentence ---

STOP_WORDS = {
    "and", "or", "the", "of", "in", "with", "a", "an", "for", "to", "on", "is", "at", "by", "as", "from", "i", "am", "have"
}

def canonicalize(text: str) -> str:
    """
    Convert text into a concise, deduplicated keyword string for job matching.
    Focuses on roles, skills, experience, and location.
    """
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)  # remove punctuation
    text = re.sub(r'\s+', ' ', text).strip()  # normalize spaces

    tokens = text.split()
    
    # Remove stop words
    tokens = [t for t in tokens if t not in STOP_WORDS]

    # Deduplicate while preserving order
    seen = set()
    dedup_tokens = []
    for t in tokens:
        if t not in seen:
            dedup_tokens.append(t)
            seen.add(t)

    return " ".join(dedup_tokens)


async def async_embed(text: str):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, embed_model.encode, text)

# --- Routes ---
@vector.post("/embed", response_model=EmbedResponse)
async def generate_embedding(req: EmbedRequest):
    embedding = await async_embed(canonicalize(req.text))
    return {"embedding": embedding.tolist()}

@vector.post("/similarity", response_model=SimilarityResponse)
async def compute_similarity(req: SimilarityRequest):
    canon1 = canonicalize(req.text1)
    canon2 = canonicalize(req.text2)

    # Compute embeddings asynchronously
    emb1, emb2 = await asyncio.gather(async_embed(canon1), async_embed(canon2))

    similarity = dot(emb1, emb2) / (norm(emb1) * norm(emb2))
    return {
        "similarity": float(similarity),
        "canonical1": canon1,
        "canonical2": canon2
    }

@vector.post("/similarity-fuzz", response_model=SimilarityResponse)
async def rapid_fuzz(req: SimilarityRequest):
    canon1 = canonicalize(req.text1)
    canon2 = canonicalize(req.text2)
    similarity = fuzz.token_set_ratio(canon1, canon2)
    return {
        "similarity": float(similarity + 15) ,
        "canonical1": canon1,
        "canonical2": canon2
    }

@vector.post("/similarity-combined")
async def similarity_combined(req: SimilarityRequest):
    canon1 = canonicalize(req.text1)
    canon2 = canonicalize(req.text2)

    # Compute embeddings asynchronously
    emb1, emb2 = await asyncio.gather(async_embed(canon1), async_embed(canon2))
    emb_sim = dot(emb1, emb2) / (norm(emb1) * norm(emb2))

    # RapidFuzz similarity
    fuzz_sim = (fuzz.token_set_ratio(canon1, canon2) + 15 )/ 100.0  # scale 0–1

    # Weighted blend
    combined = 0.6 * emb_sim + 0.4 * fuzz_sim

    return {
        "embedding_similarity": float(emb_sim),
        "fuzz_similarity": float(fuzz_sim),
        "combined_similarity": float(combined),
        "canonical1": canon1,
        "canonical2": canon2,
    }
