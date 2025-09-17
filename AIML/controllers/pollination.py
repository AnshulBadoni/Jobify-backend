import io
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from models.pollination import ImageGenerationRequest, TextGenerationRequest
from services import text_generation, image_generation

pollination = APIRouter(prefix="/pollination", tags=["pollination"])

@pollination.post("/generate-text")
async def generate_text_endpoint(request: TextGenerationRequest):
    try:
        result = await text_generation.generate_text_from_prompt(
            prompt=request.prompt,
            model=request.model,
            system=request.system,
            stream=request.stream
        )
        if request.stream:
            return StreamingResponse(result, media_type="text/event-stream")
        else:
            return JSONResponse({"success": True, "data": {"response": result}})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@pollination.post("/generate-image")
async def generate_image_endpoint(request: ImageGenerationRequest):
    try:
        if text_generation.LIBRARY_TYPE == "pollinations.ai" and image_generation.pollinations_lib:
            image_model = image_generation.pollinations_lib.Image(
                model=request.model,
                width=request.width,
                height=request.height,
                seed=request.seed or "random",
                enhance=request.enhance,
                safe=request.safe
            )
            image = image_model(request.prompt)
            img_buffer = io.BytesIO()
            image.save(img_buffer, format='PNG')
            img_base64 = image_generation.image_to_base64(img_buffer.getvalue())
            return JSONResponse({"success": True, "data": {"image_base64": f"data:image/png;base64,{img_base64}"}})
        else:
            image_bytes, _ = image_generation.generate_image_direct_api(
                prompt=request.prompt,
                model=request.model,
                width=request.width,
                height=request.height,
                seed=request.seed,
                enhance=request.enhance,
                safe=request.safe
            )
            img_base64 = image_generation.image_to_base64(image_bytes)
            return JSONResponse({"success": True, "data": {"image_base64": f"data:image/png;base64,{img_base64}"}})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
