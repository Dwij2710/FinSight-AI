"""
FinSight AI - Fundamental Analysis Route (FUND-01)
Serves corporate valuation multiples, profitability ratios, balance sheet solvency,
growth statistics, and 0-100 institutional health ratings.
"""

from fastapi import APIRouter, HTTPException, Path
from datetime import datetime
from ..schemas import ApiResponse
from src.fundamental_engine import fundamental_engine
from ..services.cache import CacheService

router = APIRouter(prefix="/api/fundamentals", tags=["Fundamentals"])
cache_service = CacheService.get_instance()

@router.get("/{ticker}", response_model=ApiResponse)
async def get_fundamentals(ticker: str = Path(..., description="Stock ticker symbol")):
    """
    Computes corporate valuation, margins, balance sheet solvency, and financial health scores.
    """
    sym = str(getattr(ticker, "default", ticker)) if not isinstance(ticker, str) else ticker
    sym = sym.strip().upper()

    cache_key = f"finsight:fundamentals:{sym}"
    cached = cache_service.get_sync(cache_key)
    if cached:
        return ApiResponse(
            success=True,
            data_source="cache",
            freshness="cached",
            fetched_at=datetime.utcnow().isoformat() + "Z",
            data=cached
        )

    try:
        data = fundamental_engine.analyze_ticker(sym)
        cache_service.set_sync(cache_key, data, ttl_seconds=300)

        return ApiResponse(
            success=True,
            data_source="yfinance",
            freshness="realtime",
            fetched_at=datetime.utcnow().isoformat() + "Z",
            data=data
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch fundamental metrics for {sym}: {str(e)}")
