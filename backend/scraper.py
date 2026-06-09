import logging
import httpx
from bs4 import BeautifulSoup
import re

logger = logging.getLogger(__name__)

# Standard headers to prevent instant blocking
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def scrape_raw_html(url: str) -> str:
    """
    Fetches raw HTML and strips only tags, returning all the garbage
    (headers, footers, navigation, cookie banners, javascript strings).
    """
    logger.info(f"Scraping raw HTML for: {url}")
    try:
        with httpx.Client(timeout=10.0, follow_redirects=True, headers=HEADERS) as client:
            response = client.get(url)
            if response.status_code != 200:
                return f"Error: Status code {response.status_code} when loading {url}"
            
            soup = BeautifulSoup(response.text, "html.parser")
            raw_text = soup.get_text()
            raw_text = re.sub(r'\s+', ' ', raw_text)
            return raw_text.strip()
    except Exception as e:
        logger.error(f"Raw HTML scraping failed for {url}: {e}", exc_info=True)
        raise e

def clean_html_local_fallback(html_content: str) -> str:
    """
    Local fallback to clean HTML into readable text if Jina Reader is offline.
    Uses BeautifulSoup but removes scripts, styles, nav, footer, etc.
    """
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Remove script and style elements
    for script in soup(["script", "style", "nav", "footer", "header", "aside"]):
        script.decompose()
    
    # Extract headers and paragraphs
    chunks = []
    for elem in soup.find_all(['h1', 'h2', 'h3', 'h4', 'p']):
        text = elem.get_text(strip=True)
        if len(text) > 20:  # Skip short snippets
            chunks.append(text)
            
    return "\n\n".join(chunks)

def scrape_jina_reader(url: str) -> str:
    """
    Fetches clean, structured markdown using Jina AI's Reader API (r.jina.ai).
    Falls back to a clean local BeautifulSoup scrape if Jina is offline or fails.
    """
    logger.info(f"Scraping clean Markdown for: {url}")
    jina_url = f"https://r.jina.ai/{url}"
    
    try:
        with httpx.Client(timeout=12.0, follow_redirects=True) as client:
            response = client.get(jina_url, headers={"Accept": "text/plain"})
            if response.status_code == 200 and len(response.text.strip()) > 100:
                return response.text.strip()
            
            logger.warning(f"Jina Reader failed with status {response.status_code}. Using local clean fallback.")
    except Exception as e:
        logger.warning(f"Jina Reader API error: {e}. Using local clean fallback.")
        
    # Local clean fallback
    try:
        with httpx.Client(timeout=10.0, follow_redirects=True, headers=HEADERS) as client:
            response = client.get(url)
            if response.status_code == 200:
                return clean_html_local_fallback(response.text)
    except Exception as e:
        logger.error(f"Local clean fallback failed for {url}: {e}", exc_info=True)
        raise e
        
    return f"Failed to retrieve clean content for {url}."
