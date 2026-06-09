import logging
import httpx
from bs4 import BeautifulSoup
from typing import List, Dict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def search_ddg_library(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """Try to search using the ddgs library."""
    try:
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS
        logger.info(f"Searching using DDGS library for query: {query}")
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            if results:
                return [
                    {
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "snippet": r.get("body", "")
                    }
                    for r in results
                ]
    except Exception as e:
        logger.warning(f"DDGS library search failed: {e}")
    return []

def search_ddg_html_fallback(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """Fallback search by scraping html.duckduckgo.com directly."""
    logger.info(f"Attempting HTML fallback search for query: {query}")
    url = "https://html.duckduckgo.com/html/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    data = {"q": query}
    
    try:
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            response = client.post(url, data=data, headers=headers)
            if response.status_code != 200:
                logger.warning(f"DuckDuckGo HTML fallback returned status {response.status_code}")
                return []
            
            soup = BeautifulSoup(response.text, "html.parser")
            results = []
            
            links = soup.find_all("a", class_="result__url")
            snippets = soup.find_all("a", class_="result__snippet")
            result_blocks = soup.find_all("div", class_="result")
            for block in result_blocks[:max_results]:
                title_elem = block.find("a", class_="result__a")
                snippet_elem = block.find("a", class_="result__snippet")
                url_elem = block.find("a", class_="result__url")
                
                if title_elem and url_elem:
                    title = title_elem.get_text(strip=True)
                    href = title_elem.get("href", "")
                    if href.startswith("//duckduckgo.com/l/?uddg="):
                        from urllib.parse import unquote, urlparse, parse_qs
                        parsed = urlparse("https:" + href)
                        href = parse_qs(parsed.query).get("uddg", [href])[0]
                    
                    snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""
                    results.append({
                        "title": title,
                        "url": href,
                        "snippet": snippet
                    })
            
            return results
    except Exception as e:
        logger.error(f"HTML fallback search failed: {e}")
    return []

def search_web(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """Unified search entry point trying library and HTML fallback."""
    results = search_ddg_library(query, max_results)
    if not results:
        results = search_ddg_html_fallback(query, max_results)
    return results
