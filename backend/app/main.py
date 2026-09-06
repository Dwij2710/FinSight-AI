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

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import uuid
import logging

from .db.database import init_db
from .services.jobs import job_manager
from .routes import auth, jobs, forecast, portfolio, ai_insights, rl_agent, tft, portfolios, watchlists, ticker, score, model_comparison, fundamentals, paper_trading, alerts, strategy

logger = logging.getLogger("finsight.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables asynchronously on startup
    await init_db()
    await job_manager.start()
    yield
    await job_manager.shutdown()

app = FastAPI(
    title="FinSight AI - Quantitative Intelligence API",
    description="Institutional-grade financial forecasting, portfolio optimization, news sentiment, and RL trading backend.",
    version="1.0.0",
    lifespan=lifespan
)

# Secure CORS configuration: explicit whitelist loaded from env or production defaults
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://finsight-ai.vercel.app"
    ]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# ==================== GLOBAL EXCEPTION ARCHITECTURE ====================
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    req_id = f"req-{uuid.uuid4().hex[:12]}"
    error_messages = []
    for err in exc.errors():
        loc = " -> ".join([str(l) for l in err.get("loc", []) if l != "body"])
        msg = err.get("msg", "Invalid parameter")
        error_messages.append(f"{loc}: {msg}" if loc else msg)

    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error_code": "VALIDATION_ERROR",
            "message": "; ".join(error_messages) if error_messages else "Request validation failed.",
            "request_id": req_id,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    req_id = f"req-{uuid.uuid4().hex[:12]}"
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error_code": f"HTTP_{exc.status_code}",
            "message": exc.detail if isinstance(exc.detail, str) else "HTTP Request Error",
            "request_id": req_id,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    )

@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception):
    req_id = f"req-{uuid.uuid4().hex[:12]}"
    # Log internal traceback safely to stderr with request ID for debugging
    logger.error(f"[ERROR {req_id}] Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)

    # Strictly mask stack trace, internal paths, and db schemas from the client response
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred while processing your request. Please try again later.",
            "request_id": req_id,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    )

# Register route modules
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(forecast.router)
app.include_router(portfolio.router)
app.include_router(ai_insights.router)
app.include_router(rl_agent.router)
app.include_router(tft.router)
app.include_router(portfolios.router)
app.include_router(watchlists.router)
app.include_router(ticker.router)
app.include_router(score.router)
app.include_router(model_comparison.router)
app.include_router(fundamentals.router)
app.include_router(paper_trading.router)
app.include_router(alerts.router)
app.include_router(strategy.router)

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
            "/api/ticker/history/{ticker}",
            "/api/score/{ticker}",
            "/api/models/compare/{ticker}",
            "/api/fundamentals/{ticker}",
            "/api/paper/account",
            "/api/paper/positions",
            "/api/paper/order",
            "/api/paper/trades",
            "/api/paper/reset",
            "/api/alerts",
            "/api/alerts/evaluate",
            "/api/strategy/templates",
            "/api/strategy/backtest",
            "/health"
        ],
        "documentation": "/docs"
    }

from src.data_fetcher import get_last_data_fetch_ts, is_yfinance_reachable

_START_TIME = datetime.utcnow()

@app.get("/api/warmup")
async def warmup():
    uptime = (datetime.utcnow() - _START_TIME).total_seconds()
    return {
        "status": "warm",
        "service": "FinSight AI API",
        "uptime_seconds": round(uptime, 1),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

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
