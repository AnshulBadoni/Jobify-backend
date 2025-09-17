import io
import base64
import requests

pollinations_lib = None
LIBRARY_TYPE = "direct_api"

# Detect library
try:
    import pollinations.ai as pollinations_lib
    LIBRARY_TYPE = "pollinations.ai"
except ImportError:
    try:
        import pollinations as pollinations_lib
        LIBRARY_TYPE = "pollinations"
    except ImportError:
        try:
            # Only import here
            from pollinations_api import PollinationsAPI
            pollinations_lib = PollinationsAPI()
            LIBRARY_TYPE = "pollinations-api"
        except ImportError:
            LIBRARY_TYPE = "direct_api"

def generate_image_direct_api(prompt: str, model: str = "flux", width: int = 1024, height: int = 1024, seed: int = None, enhance: bool = True, safe: bool = True):
    """Direct API call for image generation"""
    base_url = "https://image.pollinations.ai/prompt/"
    params = {"model": model, "width": width, "height": height, "enhance": enhance, "safe": safe}
    if seed is not None:
        params["seed"] = seed
    query_string = "&".join(f"{k}={v}" for k, v in params.items())
    image_url = f"{base_url}{requests.utils.quote(prompt)}?{query_string}"
    response = requests.get(image_url, timeout=30)
    response.raise_for_status()
    return response.content, image_url

def image_to_base64(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode('utf-8')
