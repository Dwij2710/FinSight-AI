"""
FinSight AI - Composite Equity Score Route (SCORE-01)
Provides 0-100 explainable equity ratings across Technical, Momentum, Fundamental,
Sentiment, and Risk dimensions with documented factor attributions.
"""

from fastapi import APIRouter, HTTPException, Path
import datetime
from ..schemas import ApiResponse
from src.score_engine import score_engine
from ..services.cache import CacheService

router = APIRouter(prefix="/api/score", tags=["FinSight Score"])
cache_service = CacheService.get_instance()

@router.get("/{ticker}", response_model=ApiResponse)
async def get_finsight_score(ticker: str = Path(..., description="Stock ticker symbol")):
    """
    Computes a 0–100 explainable FinSight Score across Technical, Momentum,
    Fundamental, Sentiment, and Risk dimensions with top positive contributors and negative detractors.
    """
    sym = str(getattr(ticker, "default", ticker)) if not isinstance(ticker, str) else ticker
    sym = sym.strip().upper()

    cache_key = f"finsight:score:{sym}"
    cached = cache_service.get_sync(cache_key)
    if cached:
        return ApiResponse(
            success=True,
            data_source="cache",
            freshness="cached",
            fetched_at=datetime.datetime.utcnow().isoformat() + "Z",
            data=cached
        )

    try:
        score_data = score_engine.compute_score(sym)
        cache_service.set_sync(cache_key, score_data, ttl_seconds=300)

        now_ts = datetime.datetime.utcnow().isoformat() + "Z"
        return ApiResponse(
            success=True,
            data_source="yfinance",
            freshness="realtime",
            fetched_at=now_ts,
            data=score_data
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate FinSight score for {sym}: {str(e)}")
