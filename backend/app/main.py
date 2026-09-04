import os
import sys
from pathlib import Path
from datetime import datetime
from contextlib import asynccontextmanager

# Set up path so src and config are directly importable
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _BACKEND_DIR.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from dotenv import load_dotenv

# Load local environment variables from root .env if present
load_dotenv(_PROJECT_ROOT / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .db.database import init_db
from .routes import forecast, portfolio, ai_insights, rl_agent, tft, portfolios, watchlists

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables asynchronously on startup
    await init_db()
    yield

app = FastAPI(
    title="FinSight AI - Quantitative Intelligence API",
    description="Institutional-grade financial forecasting, portfolio optimization, news sentiment, and RL trading backend.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend, local development, and preview deployments
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
app.include_router(portfolios.router)
app.include_router(watchlists.router)

@app.get("/")
async def root():
    return {
        "service": "FinSight AI API",
        "status": "online",
        "version": "1.0.0",
        "endpoints": [
            "/api/forecast",
            "/api/portfolio/optimize",
            "/api/portfolios",
            "/api/watchlists",
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
