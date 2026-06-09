import sys
import os
import subprocess
import threading
import time
import webbrowser
import urllib.request
import json

def print_banner():
    print("=" * 60)
    print("             LOCALSEARCH & RAG SEARCH ENGINE")
    print("=" * 60)
    print("  Starting environment check...")

# Always resolve paths relative to this script's directory
PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))

def check_and_install_requirements():
    print("\n[1/3] Checking dependencies...")
    req_file = os.path.join(PROJECT_ROOT, "backend", "requirements.txt")
    if not os.path.exists(req_file):
        print(f"Error: {req_file} not found!")
        return False
        
    try:
        # Check if packages are installed by trying to import them
        import fastapi
        import uvicorn
        import httpx
        import bs4
        try:
            import ddgs
        except ImportError:
            import duckduckgo_search
        print("  All Python dependencies are already installed.")
    except ImportError:
        print("  Missing dependencies. Installing from requirements.txt...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", req_file])
            print("  Dependencies installed successfully!")
        except Exception as e:
            print(f"  Error installing dependencies: {e}")
            print("  Please run: pip install -r backend/requirements.txt manually.")
            return False
    return True

def check_ollama():
    print("\n[2/3] Checking local Ollama instance...")
    url = "http://localhost:11434/api/tags"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=1.5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                models = [m['name'] for m in data.get('models', [])]
                print("  Ollama: Connected! [OK]")
                if models:
                    print(f"  Available models: {', '.join(models)}")
                else:
                    print("  Warning: Connected to Ollama, but no models found. Run 'ollama pull llama3.1' in terminal.")
                return True
    except Exception:
        pass
    
    print("  Ollama: Offline/Not Installed [WARNING]")
    print("  --> Start Ollama and run 'ollama pull llama3.1' before searching.")
    return False

def open_browser():
    time.sleep(1.5) # Wait for FastAPI to spin up
    url = "http://127.0.0.1:8000"
    print(f"\n[3/3] Opening browser at {url}...")
    webbrowser.open(url)

def start_server():
    print("\n[+] Starting FastAPI Web Server...")
    
    # Add both the project root and the backend/ folder to sys.path
    # so that 'from backend.main import app' AND relative imports
    # inside main.py (e.g. 'from search import search_web') both work.
    sys.path.insert(0, PROJECT_ROOT)
    sys.path.insert(0, os.path.join(PROJECT_ROOT, "backend"))
    
    import uvicorn
    # Import main from backend
    from backend.main import app
    
    # Start browser opener in background thread
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Start Uvicorn blocking server
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=False)

if __name__ == "__main__":
    print_banner()
    if check_and_install_requirements():
        check_ollama()
        start_server()
