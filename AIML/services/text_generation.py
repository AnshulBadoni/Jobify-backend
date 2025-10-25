import requests
from typing import Generator, Optional

# Detect library
pollinations_lib = None
LIBRARY_TYPE = "direct_api"

try:
    import pollinations.ai as pollinations_lib
    LIBRARY_TYPE = "pollinations.ai"
except ImportError:
    try:
        import pollinations as pollinations_lib
        LIBRARY_TYPE = "pollinations"
    except ImportError:
        try:
            # Import PollinationsAPI here, only if previous imports failed
            from pollinations_api import PollinationsAPI
            pollinations_lib = PollinationsAPI()
            LIBRARY_TYPE = "pollinations-api"
        except ImportError:
            # Fallback to direct API
            LIBRARY_TYPE = "direct_api"

# Direct API function stays the same
def generate_text_direct_api(prompt: str, model: str = "openai", system: str = "You are a helpful AI assistant.", stream: bool = False):
    url = "https://text.pollinations.ai/"
    messages = [{"role": "system", "content": system}, {"role": "user", "content": prompt}]
    payload = {"messages": messages, "model": model, "stream": stream}
    headers = {"Content-Type": "application/json"}

    if stream:
        response = requests.post(url, json=payload, headers=headers, stream=True, timeout=60)
        response.raise_for_status()
        return response.iter_lines()
    else:
        response = requests.post(url, json=payload, headers=headers, timeout=60)
        response.raise_for_status()
        return response.text

# Unified async interface
async def generate_text_from_prompt(prompt: str, model: str = "openai", system: str = "You are a helpful AI assistant.", stream: bool = False):
    if LIBRARY_TYPE == "pollinations.ai" and pollinations_lib:
        text_model = pollinations_lib.Text(model=model, system=system)
        if stream:
            def generate() -> Generator[str, None, None]:
                try:
                    for chunk in text_model(prompt, stream=True):
                        yield f"data: {chunk}\n\n"
                finally:
                    yield "data: [DONE]\n\n"
            return generate()
        else:
            return text_model(prompt)
    else:
        return generate_text_direct_api(prompt, model=model, system=system, stream=stream)
