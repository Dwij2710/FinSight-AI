"""
FinSight AI - Root Application Entry Point
Enables standard ASGI imports for Render and Docker:
- uvicorn main:app --host 0.0.0.0 --port $PORT
- uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
- python main.py
"""
import os
import sys
from pathlib import Path

# Ensure repository root is in sys.path
_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend.app.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 10000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"[FinSight AI] Starting server on {host}:{port}")
    uvicorn.run("main:app", host=host, port=port)
