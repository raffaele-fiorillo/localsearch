import os
import logging
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any

from search import search_web
from scraper import scrape_raw_html, scrape_jina_reader
from llm import generate_answer_stream, check_ollama_status, get_ollama_models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="LocalSearch API")

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Request Models
class SearchRequest(BaseModel):
    query: str

class ScrapeRequest(BaseModel):
    urls: List[str]
    mode: str  # "raw" or "clean"

class AnswerRequest(BaseModel):
    query: str
    sources: List[Dict[str, str]]

@app.get("/api/status")
async def get_status():
    """Check connection status to Ollama and list models."""
    ollama_running = await check_ollama_status()
    models = await get_ollama_models() if ollama_running else []
    return {
        "status": "online",
        "ollama": {
            "running": ollama_running,
            "models": models
        }
    }

@app.post("/api/search")
async def api_search(request: SearchRequest):
    """Retrieve top search results for a query."""
    logger.info(f"Received search request for: {request.query}")
    try:
        results = search_web(request.query)
        return {"results": results}
    except Exception as e:
        logger.error(f"Search API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scrape")
async def api_scrape(request: ScrapeRequest):
    """Scrape content from multiple URLs using BeautifulSoup or Jina Reader."""
    logger.info(f"Received scrape request for {len(request.urls)} URLs in mode: {request.mode}")
    results = []
    
    for idx, url in enumerate(request.urls, 1):
        try:
            if request.mode == "raw":
                content = scrape_raw_html(url)
            else:
                content = scrape_jina_reader(url)
                
            results.append({
                "index": idx,
                "url": url,
                "content": content
            })
        except Exception as e:
            logger.error(f"Scraping error for {url}: {e}")
            results.append({
                "index": idx,
                "url": url,
                "content": f"Error scraping: {str(e)}"
            })
            
    return {"results": results}

@app.post("/api/answer")
async def api_answer(request: AnswerRequest):
    """Streams the citation-backed answer from Ollama."""
    logger.info(f"Received answer request for query: {request.query}")
    
    ollama_running = await check_ollama_status()
    if not ollama_running:
        raise HTTPException(
            status_code=503,
            detail="Ollama server is offline. Please start Ollama locally (e.g. run 'ollama serve' in your command prompt)."
        )
        
    models = await get_ollama_models()
    if not models:
        raise HTTPException(
            status_code=400,
            detail="No models found in Ollama. Please pull a model (e.g. run 'ollama pull llama3.1' in your terminal) before searching."
        )
        
    try:
        return StreamingResponse(
            generate_answer_stream(request.query, request.sources),
            media_type="text/event-stream"
        )
    except Exception as e:
        logger.error(f"Answer streaming error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Serve Frontend Static Files
from fastapi.responses import Response

class NoCacheStaticFiles(StaticFiles):
    def file_response(self, *args: Any, **kwargs: Any) -> Response:
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "../frontend"))

if os.path.exists(FRONTEND_DIR):
    logger.info(f"Serving static frontend files from: {FRONTEND_DIR}")
    # We must mount static files at the root, but AFTER defining the API routes
    app.mount("/", NoCacheStaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
else:
    logger.warning(f"Frontend directory not found at {FRONTEND_DIR}. API only mode enabled.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
