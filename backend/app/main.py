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
from .routes import forecast, portfolio, ai_insights, rl_agent, tft, portfolios, watchlists, ticker

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
app.include_router(ticker.router)

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
            "/api/ticker/live",
            "/health"
        ],
        "documentation": "/docs"
    }

from src.data_fetcher import get_last_data_fetch_ts, is_yfinance_reachable

_START_TIME = datetime.utcnow()

@app.get("/health")
async def health_check():
    uptime = (datetime.utcnow() - _START_TIME).total_seconds()
    last_fetch = get_last_data_fetch_ts()
    yf_ok = is_yfinance_reachable()
    return {
        "status": "healthy",
        "service": "FinSight AI API",
        "uptime_seconds": round(uptime, 1),
        "last_data_fetch_ts": last_fetch,
        "yfinance_reachable": yf_ok,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 10000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"[FinSight AI] Starting backend server on {host}:{port}")
    uvicorn.run("backend.app.main:app", host=host, port=port)
