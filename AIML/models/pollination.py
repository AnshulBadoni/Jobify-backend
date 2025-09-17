from pydantic import BaseModel
from typing import Optional

class ImageGenerationRequest(BaseModel):
    prompt: str
    model: Optional[str] = "flux"
    width: Optional[int] = 1024
    height: Optional[int] = 1024
    seed: Optional[int] = None
    enhance: Optional[bool] = True
    safe: Optional[bool] = True

class TextGenerationRequest(BaseModel):
    prompt: str
    model: Optional[str] = "openai"
    stream: Optional[bool] = False
    system: Optional[str] = "You are a helpful AI assistant."
