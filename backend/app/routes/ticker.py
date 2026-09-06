"""
Ticker Route - Real-time Market Prices & Intraday Telemetry
Powered by centralized MarketDataService (Polygon.io primary, Yahoo Finance fallback).
Guarantees 100% real, validated market data without synthetic fabrication.
"""
from fastapi import APIRouter, Query, HTTPException, Path
from typing import List, Dict, Any, Optional
import datetime
from ..schemas import ApiResponse, CanonicalQuote
from ..services.market_data import market_data_service

router = APIRouter(prefix="/api/ticker", tags=["Ticker"])

DEFAULT_WATCHLIST = ["SPY", "QQQ", "AAPL", "NVDA", "MSFT", "RELIANCE.NS", "TCS.NS", "^NSEI"]

@router.get("/live", response_model=ApiResponse)
async def get_live_tickers(tickers: Optional[str] = Query(None, description="Comma-separated ticker list")):
    """
    Returns real-time ticker quotes, daily deltas, volumes, and market open/close status.
    Cached server-side with 15s TTL to prevent external provider rate limits.
    """
    if tickers:
        ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    else:
        ticker_list = DEFAULT_WATCHLIST

    quotes = market_data_service.get_quotes(ticker_list)
    now_ts = datetime.datetime.utcnow().isoformat() + "Z"

    # Determine overall data source from retrieved quotes
    sources = {q.data_source for q in quotes}
    primary_source = "live" if "polygon" in sources or "yfinance" in sources else "cached"

    return ApiResponse(
        success=True,
        data_source=primary_source,
        fetched_at=now_ts,
        data=[q.model_dump() for q in quotes]
    )

@router.get("/quote/{ticker}", response_model=ApiResponse)
async def get_single_quote(ticker: str = Path(..., description="Stock ticker symbol")):
    """
    Returns single authoritative canonical quote for a specific ticker.
    Guarantees consistent price across all UI modules.
    """
    try:
        quote = market_data_service.get_quote(ticker)
        now_ts = datetime.datetime.utcnow().isoformat() + "Z"
        return ApiResponse(
            success=True,
            data_source=quote.data_source,
            fetched_at=now_ts,
            data=quote.model_dump()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch market quote for {ticker}: {str(e)}"
        )
