# 🔍 LocalSearch — Local RAG Search Engine

> Built in 48 hours. Runs entirely on your machine.

[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python&logoColor=white)](https://www.python.org)
[![Ollama](https://img.shields.io/badge/Ollama-local%20LLM-black?logo=ollama)](https://ollama.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![No API Keys](https://img.shields.io/badge/API%20Keys-none-brightgreen)](/)

A local Perplexity-style search engine that queries DuckDuckGo, scrapes the top results, and feeds the content to a local LLM via [Ollama](https://ollama.com) to generate a cited, streaming answer — no API keys, no cloud, no data leaving your computer.

📺 **Built for this video → [I Cloned Perplexity AI in 2 Days (FREE, Runs Locally)](https://www.youtube.com/watch?v=qEN9RRk-E0I)**

---

![LocalSearch Demo](assets/demo.png)

---

## Features

- **100% free** — DuckDuckGo search, Jina AI Reader, and Ollama. Zero API costs.
- **Fully local** — your queries never leave your machine
- **Two scraper modes** — toggle between Jina Reader (clean markdown) and BS4 Raw HTML live in the UI
- **Streaming answers** — responses stream token by token, just like Perplexity
- **Inline citations** — every claim is cited and linked back to its source
- **Live pipeline visualizer** — watch each stage (search → scrape → context → LLM → answer) animate in real time
- **Automatic model detection** — connects to whatever model you have installed in Ollama

---

## How it works

```
User Query → DuckDuckGo Search → Web Scraper → Context Builder → Local LLM → Answer + Citations
```

1. **Web Search** — queries DuckDuckGo via the `ddgs` library (with an HTML fallback)
2. **Scraper** — two modes:
   - **Jina Reader** *(recommended)*: fetches clean markdown via `r.jina.ai`
   - **BS4 Raw HTML**: strips raw HTML — useful for comparison
3. **Context Builder** — packages scraped content into a structured, numbered prompt
4. **Local LLM** — streams the response from Ollama at `temperature: 0.2` for factual accuracy
5. **Frontend** — displays sources, live pipeline diagram, and the streaming answer with clickable citations

---

## Requirements

- Python 3.10+
- [Ollama](https://ollama.com) installed and running locally
- At least one model pulled (recommended: `llama3.1`)

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-username/localsearch.git
cd localsearch

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Pull a model in Ollama (if you haven't already)
ollama pull llama3.1

# 4. Run
python run.py
```

The app opens automatically at `http://127.0.0.1:8000`.

---

## Project structure

```
.
├── backend/
│   ├── main.py          # FastAPI app and API routes
│   ├── search.py        # DuckDuckGo search (library + HTML fallback)
│   ├── scraper.py       # Web scraping (Jina Reader + BS4 fallback)
│   ├── llm.py           # Ollama streaming integration
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── run.py               # Entry point — checks deps, starts the server
```

---

## Configuration

By default the app connects to Ollama at `http://localhost:11434` and auto-detects your installed models, preferring `llama3.1`. You can override this in `backend/llm.py`:

```python
OLLAMA_HOST = "http://localhost:11434"
DEFAULT_MODEL = "llama3.1"
```

---

## Tech stack

| Layer | Tech |
|---|---|
| Backend | FastAPI + Uvicorn |
| Search | DuckDuckGo (`ddgs`) |
| Scraping | Jina Reader API / BeautifulSoup 4 |
| HTTP client | httpx |
| LLM | Ollama (any local model) |
| Frontend | Vanilla HTML / CSS / JS |

---

## License

MIT — do whatever you want with it.

---

*If this helped you, consider starring the repo and [subscribing to the channel](https://www.youtube.com/@RaffaeleDev) for more builds like this.*