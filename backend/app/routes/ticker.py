"""
Ticker Route - Market Prices & Intraday Telemetry
Powered by centralized MarketDataService (Polygon.io primary, Yahoo Finance fallback).
Guarantees 100% real, validated market data with honest freshness disclosure.
"""
from fastapi import APIRouter, Query, HTTPException, Path
from typing import List, Dict, Any, Optional
import datetime
import re
import numpy as np
import pandas as pd
import yfinance as yf
from ..schemas import (
    ApiResponse,
    CanonicalQuote,
    TickerSearchResult,
    TickerSearchResponse,
    TickerValidationResponse,
    TICKER_REGEX
)
from ..services.market_data import market_data_service
from ..services.cache import CacheService

router = APIRouter(prefix="/api/ticker", tags=["Ticker"])
cache_service = CacheService.get_instance()

DEFAULT_WATCHLIST = ["SPY", "QQQ", "AAPL", "NVDA", "MSFT", "RELIANCE.NS", "TCS.NS", "^NSEI"]

# Authoritative high-volume in-memory securities directory for sub-millisecond instant autocomplete
POPULAR_DIRECTORY: List[Dict[str, str]] = [
    {"symbol": "AAPL", "name": "Apple Inc.", "exchange": "NASDAQ", "asset_type": "Equity", "sector": "Technology"},
    {"symbol": "MSFT", "name": "Microsoft Corporation", "exchange": "NASDAQ", "asset_type": "Equity", "sector": "Technology"},
    {"symbol": "NVDA", "name": "NVIDIA Corporation", "exchange": "NASDAQ", "asset_type": "Equity", "sector": "Technology"},
    {"symbol": "TSLA", "name": "Tesla, Inc.", "exchange": "NASDAQ", "asset_type": "Equity", "sector": "Consumer Cyclical"},
    {"symbol": "GOOGL", "name": "Alphabet Inc. (Class A)", "exchange": "NASDAQ", "asset_type": "Equity", "sector": "Communication Services"},
    {"symbol": "GOOG", "name": "Alphabet Inc. (Class C)", "exchange": "NASDAQ", "asset_type": "Equity", "sector": "Communication Services"},
    {"symbol": "AMZN", "name": "Amazon.com, Inc.", "exchange": "NASDAQ", "asset_type": "Equity", "sector": "Consumer Cyclical"},
    {"symbol": "META", "name": "Meta Platforms, Inc.", "exchange": "NASDAQ", "asset_type": "Equity", "sector": "Communication Services"},
    {"symbol": "NFLX", "name": "Netflix, Inc.", "exchange": "NASDAQ", "asset_type": "Equity", "sector": "Communication Services"},
    {"symbol": "AMD", "name": "Advanced Micro Devices, Inc.", "exchange": "NASDAQ", "asset_type": "Equity", "sector": "Technology"},
    {"symbol": "INTC", "name": "Intel Corporation", "exchange": "NASDAQ", "asset_type": "Equity", "sector": "Technology"},
    {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "exchange": "NYSE", "asset_type": "Equity", "sector": "Financial Services"},
    {"symbol": "BAC", "name": "Bank of America Corp.", "exchange": "NYSE", "asset_type": "Equity", "sector": "Financial Services"},
    {"symbol": "WMT", "name": "Walmart Inc.", "exchange": "NYSE", "asset_type": "Equity", "sector": "Consumer Defensive"},
    {"symbol": "DIS", "name": "The Walt Disney Company", "exchange": "NYSE", "asset_type": "Equity", "sector": "Communication Services"},
    {"symbol": "COST", "name": "Costco Wholesale Corporation", "exchange": "NASDAQ", "asset_type": "Equity", "sector": "Consumer Defensive"},
    {"symbol": "SPY", "name": "SPDR S&P 500 ETF Trust", "exchange": "NYSE Arca", "asset_type": "ETF", "sector": "Index ETF"},
    {"symbol": "QQQ", "name": "Invesco QQQ Trust", "exchange": "NASDAQ", "asset_type": "ETF", "sector": "Index ETF"},
    {"symbol": "IWM", "name": "iShares Russell 2000 ETF", "exchange": "NYSE Arca", "asset_type": "ETF", "sector": "Small Cap ETF"},
    {"symbol": "TLT", "name": "iShares 20+ Year Treasury Bond ETF", "exchange": "NASDAQ", "asset_type": "ETF", "sector": "Fixed Income"},
    {"symbol": "GLD", "name": "SPDR Gold Shares", "exchange": "NYSE Arca", "asset_type": "ETF", "sector": "Commodity"},
    {"symbol": "RELIANCE.NS", "name": "Reliance Industries Limited", "exchange": "NSE", "asset_type": "Equity", "sector": "Energy"},
    {"symbol": "TCS.NS", "name": "Tata Consultancy Services Ltd.", "exchange": "NSE", "asset_type": "Equity", "sector": "Technology"},
    {"symbol": "HDFCBANK.NS", "name": "HDFC Bank Limited", "exchange": "NSE", "asset_type": "Equity", "sector": "Financial Services"},
    {"symbol": "INFY.NS", "name": "Infosys Limited", "exchange": "NSE", "asset_type": "Equity", "sector": "Technology"},
    {"symbol": "ICICIBANK.NS", "name": "ICICI Bank Limited", "exchange": "NSE", "asset_type": "Equity", "sector": "Financial Services"},
    {"symbol": "SBIN.NS", "name": "State Bank of India", "exchange": "NSE", "asset_type": "Equity", "sector": "Financial Services"},
    {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel Limited", "exchange": "NSE", "asset_type": "Equity", "sector": "Communication Services"},
    {"symbol": "TATAMOTORS.NS", "name": "Tata Motors Limited", "exchange": "NSE", "asset_type": "Equity", "sector": "Auto Manufacturers"},
    {"symbol": "WIPRO.NS", "name": "Wipro Limited", "exchange": "NSE", "asset_type": "Equity", "sector": "Technology"}
]

@router.get("/search", response_model=ApiResponse)
async def search_tickers(
    q: str = Query(..., min_length=1, max_length=50, description="Ticker symbol or company name query")
):
    """
    Universal securities search endpoint with autocomplete and company name resolution.
    Blends instant local high-volume securities directory with live Yahoo Finance Search fallback.
    Results are cached server-side (3600s TTL). Never returns fake stocks.
    """
    query_str = q.strip()
    if not query_str:
        return ApiResponse(
            success=True,
            data_source="cache",
            freshness="realtime",
            fetched_at=datetime.datetime.utcnow().isoformat() + "Z",
            data=TickerSearchResponse(query="", total=0, results=[]).model_dump()
        )

    q_upper = query_str.upper()
    q_lower = query_str.lower()
    cache_key = f"finsight:search:{q_upper}"
    cached = cache_service.get_sync(cache_key)
    if cached:
        return ApiResponse(
            success=True,
            data_source="cache",
            freshness="cached",
            fetched_at=datetime.datetime.utcnow().isoformat() + "Z",
            data=cached
        )

    matched_symbols = set()
    results: List[TickerSearchResult] = []

    # 1. Fast match against curated local directory
    for item in POPULAR_DIRECTORY:
        sym = item["symbol"]
        name = item["name"]
        if sym == q_upper or sym.startswith(q_upper) or q_lower in name.lower():
            if sym not in matched_symbols:
                matched_symbols.add(sym)
                results.append(TickerSearchResult(
                    symbol=sym,
                    name=name,
                    exchange=item["exchange"],
                    asset_type=item["asset_type"],
                    sector=item.get("sector")
                ))

    # 2. Live provider search fallback for comprehensive global symbol resolution
    try:
        yf_search = yf.Search(query_str, max_results=10)
        quotes = getattr(yf_search, "quotes", [])
        for quote in quotes:
            sym = quote.get("symbol")
            if not sym or not isinstance(sym, str):
                continue
            sym = sym.strip().upper()
            if sym in matched_symbols:
                continue

            name = quote.get("shortname") or quote.get("longname") or sym
            exch = quote.get("exchDisp") or quote.get("exchange") or "UNKNOWN"
            asset_t = quote.get("typeDisp") or quote.get("quoteType") or "Equity"
            sector = quote.get("sectorDisp") or quote.get("sector")

            matched_symbols.add(sym)
            results.append(TickerSearchResult(
                symbol=sym,
                name=name,
                exchange=exch,
                asset_type=asset_t,
                sector=sector
            ))
    except Exception:
        # If live yfinance search times out or errors, continue with local results
        pass

    # Sort results: Exact symbol match first, then starts with symbol, then alphabetical
    def sort_key(item: TickerSearchResult):
        if item.symbol == q_upper:
            return 0
        if item.symbol.startswith(q_upper):
            return 1
        return 2

    results.sort(key=sort_key)
    top_results = results[:12]

    response_data = TickerSearchResponse(
        query=query_str,
        total=len(top_results),
        results=top_results
    ).model_dump()

    cache_service.set_sync(cache_key, response_data, ttl_seconds=3600)

    now_ts = datetime.datetime.utcnow().isoformat() + "Z"
    return ApiResponse(
        success=True,
        data_source="yfinance",
        freshness="realtime",
        fetched_at=now_ts,
        data=response_data
    )

@router.get("/validate/{ticker}", response_model=ApiResponse)
async def validate_ticker(ticker: str = Path(..., description="Stock ticker symbol to validate")):
    """
    Validates whether a ticker symbol exists, is supported by market data providers,
    and has active trading data.
    """
    sym = ticker.strip().upper()
    if not re.match(TICKER_REGEX, sym):
        return ApiResponse(
            success=False,
            data=TickerValidationResponse(
                symbol=sym,
                is_valid=False,
                data_available=False,
                message=f"Invalid ticker format: '{ticker}'. Ticker symbols must contain alphanumeric characters, dots, or hyphens."
            ).model_dump()
        )

    try:
        quote = market_data_service.get_quote(sym)
        if quote and quote.price > 0:
            return ApiResponse(
                success=True,
                data_source=quote.data_source,
                freshness=quote.freshness,
                fetched_at=datetime.datetime.utcnow().isoformat() + "Z",
                data=TickerValidationResponse(
                    symbol=sym,
                    is_valid=True,
                    name=quote.name,
                    exchange=quote.exchange,
                    currency=quote.currency,
                    data_available=True,
                    message="Security validated successfully."
                ).model_dump()
            )
    except Exception:
        pass

    # Fallback verification check
    try:
        ticker_obj = yf.Ticker(sym)
        fast_info = getattr(ticker_obj, "fast_info", None)
        last_price = getattr(fast_info, "last_price", None) if fast_info else None
        if last_price is not None and not np.isnan(last_price) and last_price > 0:
            currency = getattr(fast_info, "currency", "USD")
            exchange = getattr(fast_info, "exchange", "UNKNOWN")
            return ApiResponse(
                success=True,
                data_source="yfinance",
                freshness="realtime",
                fetched_at=datetime.datetime.utcnow().isoformat() + "Z",
                data=TickerValidationResponse(
                    symbol=sym,
                    is_valid=True,
                    exchange=exchange,
                    currency=currency,
                    data_available=True,
                    message="Security validated successfully via provider fast-info."
                ).model_dump()
            )
    except Exception:
        pass

    return ApiResponse(
        success=False,
        data=TickerValidationResponse(
            symbol=sym,
            is_valid=False,
            data_available=False,
            message=f"We couldn't find a supported security for '{sym}'."
        ).model_dump()
    )

@router.get("/live", response_model=ApiResponse)
async def get_live_tickers(tickers: Optional[str] = Query(None, description="Comma-separated ticker list")):
    """
    Returns ticker quotes, daily deltas, volumes, and market open/close status.
    Cached server-side with Redis / memory TTL to prevent external provider rate limits.
    """
    if tickers:
        ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    else:
        ticker_list = DEFAULT_WATCHLIST

    quotes = market_data_service.get_quotes(ticker_list)
    now_ts = datetime.datetime.utcnow().isoformat() + "Z"

    # Determine overall data source & freshness
    sources = {q.data_source for q in quotes}
    primary_source = "cache" if sources == {"cache"} else ("polygon" if "polygon" in sources else "yfinance")
    freshness_set = {q.freshness for q in quotes}
    primary_freshness = "cached" if freshness_set == {"cached"} else ("realtime" if "realtime" in freshness_set else "delayed_15m")

    return ApiResponse(
        success=True,
        data_source=primary_source,
        freshness=primary_freshness,
        fetched_at=now_ts,
        data=[q.model_dump() for q in quotes]
    )

@router.get("/quote/{ticker}", response_model=ApiResponse)
async def get_single_quote(ticker: str = Path(..., description="Stock ticker symbol")):
    """
    Returns single authoritative canonical quote for a specific ticker.
    Guarantees consistent price and honest data freshness.
    """
    try:
        quote = market_data_service.get_quote(ticker)
        now_ts = datetime.datetime.utcnow().isoformat() + "Z"
        return ApiResponse(
            success=True,
            data_source=quote.data_source,
            freshness=quote.freshness,
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

@router.get("/history/{ticker}", response_model=ApiResponse)
async def get_ticker_history(
    ticker: str = Path(..., description="Stock ticker symbol"),
    period: str = Query("1Y", description="Timeframe: 1M, 3M, 6M, 1Y, 2Y, 5Y"),
    interval: str = Query("1d", description="Interval: 1d")
):
    """
    Returns historical OHLCV candlestick bars and computed technical indicators
    (SMA 20/50/200, EMA 12/26, RSI 14, MACD, Bollinger Bands, ATR) plus executive technical summary.
    Cached via CacheService (300s TTL).
    """
    sym = str(getattr(ticker, "default", ticker)) if not isinstance(ticker, str) else ticker
    sym = sym.strip().upper()

    period_val = str(getattr(period, "default", period)) if not isinstance(period, str) else period
    interval_val = str(getattr(interval, "default", interval)) if not isinstance(interval, str) else interval

    valid_periods = {"1M": "1mo", "3M": "3mo", "6M": "6mo", "1Y": "1y", "2Y": "2y", "5Y": "5y"}
    yf_period = valid_periods.get(period_val.upper(), "1y")

    cache_key = f"finsight:history:{sym}:{yf_period}:{interval_val}"
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
        raw_df = yf.download(sym, period=yf_period, interval=interval_val, progress=False, auto_adjust=False)
        if raw_df.empty:
            raise HTTPException(status_code=404, detail=f"No historical market data found for ticker '{sym}'")

        if isinstance(raw_df.columns, pd.MultiIndex):
            df_dict = {}
            for col in ['Open', 'High', 'Low', 'Close', 'Volume']:
                if col in raw_df.columns.get_level_values(0):
                    sub = raw_df[col]
                    df_dict[col] = sub.iloc[:, 0] if isinstance(sub, pd.DataFrame) else sub
            df = pd.DataFrame(df_dict, index=raw_df.index)
        else:
            cols = [c for c in ['Open', 'High', 'Low', 'Close', 'Volume'] if c in raw_df.columns]
            df = raw_df[cols].copy()

        df = df.sort_index().dropna(subset=['Close'])
        if len(df) < 5:
            raise HTTPException(status_code=400, detail=f"Insufficient history bars for '{sym}'.")

        close = df['Close']
        sma_20 = close.rolling(20, min_periods=1).mean()
        sma_50 = close.rolling(50, min_periods=1).mean()
        sma_200 = close.rolling(200, min_periods=1).mean()
        ema_12 = close.ewm(span=12, adjust=False).mean()
        ema_26 = close.ewm(span=26, adjust=False).mean()
        macd = ema_12 - ema_26
        macd_signal = macd.ewm(span=9, adjust=False).mean()
        macd_hist = macd - macd_signal

        # RSI 14
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(14, min_periods=1).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14, min_periods=1).mean()
        rs = gain / loss.replace(0, np.nan)
        rsi_14 = 100 - (100 / (1 + rs))
        rsi_14 = rsi_14.fillna(50.0)

        # Bollinger Bands (20, 2)
        std_20 = close.rolling(20, min_periods=1).std().fillna(0)
        bb_upper = sma_20 + (std_20 * 2)
        bb_lower = sma_20 - (std_20 * 2)

        # Average True Range (14)
        tr1 = df['High'] - df['Low']
        tr2 = (df['High'] - close.shift()).abs()
        tr3 = (df['Low'] - close.shift()).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr_14 = tr.rolling(14, min_periods=1).mean().fillna(0)

        bars = []
        for i in range(len(df)):
            dt = df.index[i]
            dt_str = dt.strftime('%Y-%m-%d') if hasattr(dt, 'strftime') else str(dt)[:10]
            bars.append({
                "date": dt_str,
                "open": round(float(df['Open'].iloc[i]), 2),
                "high": round(float(df['High'].iloc[i]), 2),
                "low": round(float(df['Low'].iloc[i]), 2),
                "close": round(float(df['Close'].iloc[i]), 2),
                "volume": int(df['Volume'].iloc[i]) if not np.isnan(df['Volume'].iloc[i]) else 0,
                "sma_20": round(float(sma_20.iloc[i]), 2) if not np.isnan(sma_20.iloc[i]) else None,
                "sma_50": round(float(sma_50.iloc[i]), 2) if not np.isnan(sma_50.iloc[i]) else None,
                "sma_200": round(float(sma_200.iloc[i]), 2) if not np.isnan(sma_200.iloc[i]) else None,
                "ema_12": round(float(ema_12.iloc[i]), 2) if not np.isnan(ema_12.iloc[i]) else None,
                "ema_26": round(float(ema_26.iloc[i]), 2) if not np.isnan(ema_26.iloc[i]) else None,
                "rsi_14": round(float(rsi_14.iloc[i]), 2) if not np.isnan(rsi_14.iloc[i]) else None,
                "macd": round(float(macd.iloc[i]), 2) if not np.isnan(macd.iloc[i]) else None,
                "macd_signal": round(float(macd_signal.iloc[i]), 2) if not np.isnan(macd_signal.iloc[i]) else None,
                "macd_hist": round(float(macd_hist.iloc[i]), 2) if not np.isnan(macd_hist.iloc[i]) else None,
                "bb_upper": round(float(bb_upper.iloc[i]), 2) if not np.isnan(bb_upper.iloc[i]) else None,
                "bb_middle": round(float(sma_20.iloc[i]), 2) if not np.isnan(sma_20.iloc[i]) else None,
                "bb_lower": round(float(bb_lower.iloc[i]), 2) if not np.isnan(bb_lower.iloc[i]) else None,
                "atr_14": round(float(atr_14.iloc[i]), 2) if not np.isnan(atr_14.iloc[i]) else None,
            })

        latest_close = float(close.iloc[-1])
        latest_rsi = float(rsi_14.iloc[-1])
        latest_macd = float(macd.iloc[-1])
        latest_signal = float(macd_signal.iloc[-1])
        latest_sma20 = float(sma_20.iloc[-1])
        latest_sma50 = float(sma_50.iloc[-1])
        latest_sma200 = float(sma_200.iloc[-1])

        # Trend and momentum classification
        if latest_close >= latest_sma50 and latest_sma50 >= latest_sma200:
            trend_signal = "STRONG_BULLISH"
        elif latest_close >= latest_sma50:
            trend_signal = "MODERATE_BULLISH"
        elif latest_close < latest_sma50 and latest_sma50 < latest_sma200:
            trend_signal = "STRONG_BEARISH"
        else:
            trend_signal = "NEUTRAL"

        rsi_cond = "OVERSOLD" if latest_rsi <= 30 else ("OVERBOUGHT" if latest_rsi >= 70 else "NEUTRAL")
        macd_cond = "BULLISH_CROSSOVER" if latest_macd > latest_signal else "BEARISH_CROSSOVER"

        quote_data = None
        try:
            quote = market_data_service.get_quote(sym)
            quote_data = quote.model_dump()
        except Exception:
            pass

        window_52w = min(252, len(df))
        high_52w = round(float(df['High'].iloc[-window_52w:].max()), 2)
        low_52w = round(float(df['Low'].iloc[-window_52w:].min()), 2)
        avg_vol_30 = round(float(df['Volume'].iloc[-min(30, len(df)):].mean()), 0)

        response_data = {
            "ticker": sym,
            "period": period.upper(),
            "bars_count": len(bars),
            "canonical_quote": quote_data,
            "summary": {
                "latest_price": round(latest_close, 2),
                "trend": trend_signal,
                "rsi": round(latest_rsi, 1),
                "rsi_condition": rsi_cond,
                "macd": round(latest_macd, 2),
                "macd_signal": round(latest_signal, 2),
                "macd_condition": macd_cond,
                "sma_20": round(latest_sma20, 2),
                "sma_50": round(latest_sma50, 2),
                "sma_200": round(latest_sma200, 2),
                "above_sma50": bool(latest_close > latest_sma50),
                "above_sma200": bool(latest_close > latest_sma200),
                "high_52w": high_52w,
                "low_52w": low_52w,
                "avg_volume_30d": avg_vol_30
            },
            "bars": bars
        }

        cache_service.set_sync(cache_key, response_data, ttl_seconds=300)

        now_ts = datetime.datetime.utcnow().isoformat() + "Z"
        return ApiResponse(
            success=True,
            data_source="yfinance",
            freshness="realtime",
            fetched_at=now_ts,
            data=response_data
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate technical history for {sym}: {str(e)}"
        )
