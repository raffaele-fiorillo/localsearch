import logging
import httpx
import json
import asyncio
import time
from typing import List, Dict, AsyncGenerator

logger = logging.getLogger(__name__)

OLLAMA_HOST = "http://localhost:11434"
DEFAULT_MODEL = "llama3.1"

async def check_ollama_status() -> bool:
    """Check if Ollama server is running and accessible."""
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            response = await client.get(f"{OLLAMA_HOST}/api/tags")
            return response.status_code == 200
    except Exception:
        return False

async def get_ollama_models() -> List[str]:
    """Retrieve the list of installed models in Ollama."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{OLLAMA_HOST}/api/tags")
            if response.status_code == 200:
                data = response.json()
                return [model["name"] for model in data.get("models", [])]
    except Exception:
        pass
    return []

def build_prompt(query: str, sources: List[Dict[str, str]]) -> tuple:
    """Builds the system prompt and user message for the LLM."""
    system_prompt = (
        "You are a precise search assistant. You will be given a user query and a set of context documents with source URLs.\n"
        "Your task is to answer the query based strictly on the context provided. Follow these rules:\n"
        "1. Do not use any external training knowledge about events after your training cutoff unless it is in the context.\n"
        "2. If the context doesn't contain the answer, say you don't know. Do not make up information or hallucinate.\n"
        "3. For every statement or fact you write, you MUST cite the source index in square brackets, e.g., [1] or [2].\n"
        "4. Place citations directly after the fact/sentence, before punctuation if possible. Example: 'The new model has an M4 chip [1].'\n"
        "5. Do NOT bundle citations together like [1, 2] or [1][2] unless both sources independently verify the exact same fact. Prefer citing the primary source.\n"
        "6. Do NOT append a 'References', 'Sources', or 'Bibliography' section at the end of your response. The user interface already displays all sources in a separate dedicated grid, so listing them again is redundant and looks bad."
    )

    context_str = ""
    for idx, src in enumerate(sources, 1):
        context_str += f"\n--- DOCUMENT [{idx}] ---\n"
        context_str += f"Title: {src.get('title', 'No Title')}\n"
        context_str += f"URL: {src.get('url', '')}\n"
        context_str += f"Content:\n{src.get('content', src.get('snippet', ''))}\n"
        context_str += "---------------------\n"

    user_content = (
        f"Context Documents:\n{context_str}\n"
        f"User Query: {query}\n\n"
        "Provide your citation-backed answer below:"
    )

    return system_prompt, user_content

async def stream_ollama(query: str, sources: List[Dict[str, str]], model: str = DEFAULT_MODEL) -> AsyncGenerator[str, None]:
    """Streams responses from a local Ollama server."""
    system_prompt, user_content = build_prompt(query, sources)
    
    url = f"{OLLAMA_HOST}/api/chat"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "stream": True,
        "options": {
            "temperature": 0.2 # Lower temperature for facts and citations
        }
    }
    
    logger.info(f"Connecting to Ollama model '{model}' at {url}...")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        async with client.stream("POST", url, json=payload) as response:
            if response.status_code != 200:
                logger.error(f"Ollama returned HTTP {response.status_code}")
                raise RuntimeError(f"Ollama returned HTTP error {response.status_code}")
            
            async for line in response.aiter_lines():
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    content = data.get("message", {}).get("content", "")
                    if content:
                        yield f"data: {json.dumps({'text': content})}\n\n"
                    if data.get("done", False):
                        break
                except json.JSONDecodeError:
                    logger.warning(f"Failed to decode Ollama SSE line: {line}")
                    
        yield "data: [DONE]\n\n"

async def generate_answer_stream(query: str, sources: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
    """Determines if Ollama is available and routes to the correct generator."""
    ollama_active = await check_ollama_status()
    if not ollama_active:
        raise ConnectionError("Ollama server is offline.")
        
    models = await get_ollama_models()
    if not models:
        raise ValueError("No models installed in Ollama.")
        
    model_to_use = DEFAULT_MODEL
    # Try to match llama3.1, llama3, or fall back to whatever is installed
    available_llama = [m for m in models if "llama" in m]
    if available_llama:
        model_to_use = available_llama[0]
    else:
        model_to_use = models[0]
        
    logger.info(f"Ollama is running. Using model: {model_to_use}")
    async for chunk in stream_ollama(query, sources, model=model_to_use):
        yield chunk
