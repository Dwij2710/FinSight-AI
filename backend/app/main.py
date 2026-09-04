import os
import sys
from pathlib import Path
from datetime import datetime

# Set up path so src and config are directly importable
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _BACKEND_DIR.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .routes import forecast, portfolio, ai_insights, rl_agent, tft

app = FastAPI(
    title="FinSight AI - Quantitative Intelligence API",
    description="High-performance financial forecasting, portfolio optimization, news sentiment, and RL trading backend.",
    version="1.0.0"
)

# Enable CORS for Vercel, local development, and external frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(forecast.router)
app.include_router(portfolio.router)
app.include_router(ai_insights.router)
app.include_router(rl_agent.router)
app.include_router(tft.router)

@app.get("/")
async def root():
    return {
        "service": "FinSight AI API",
        "status": "online",
        "version": "1.0.0",
        "endpoints": [
            "/api/forecast",
            "/api/portfolio/optimize",
            "/api/ai/sentiment",
            "/api/ai/signal",
            "/api/rl/simulate",
            "/api/tft/analyze",
            "/health"
        ],
        "documentation": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "service": "FinSight AI API"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
