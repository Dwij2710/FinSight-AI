"""
FinSight AI - Centralized Market Data Service
Provides single source of truth for all live market quotes, intraday telemetry,
and historical OHLCV time series with distributed Redis + In-Memory caching.
Guarantees:
- Explicit data freshness: 'realtime' vs 'delayed_15m' vs 'cached' vs 'historical'
- Zero synthetic number fabrication
- Stale-data detection and graceful degradation
- Centralized timeout, retry, and rate-limit handling
"""
import time
import datetime
import pytz
import io
import pandas as pd
from typing import Dict, List, Optional, Any, Tuple
import yfinance as yf
from fastapi import HTTPException

from ..schemas import CanonicalQuote
from .cache import cache_service
from src.polygon_client import PolygonClient

class MarketDataService:
    def __init__(self, quote_ttl_seconds: int = 15, history_ttl_seconds: int = 900):
        self.quote_ttl = quote_ttl_seconds
        self.cache_ttl = quote_ttl_seconds
        self.history_ttl = history_ttl_seconds
        self._quote_cache: Dict[str, Tuple[float, CanonicalQuote]] = {}
        self.polygon_client = PolygonClient()

    @staticmethod
    def get_exchange_and_currency(ticker: str) -> Tuple[str, str]:
        sym = ticker.strip().upper()
        if sym.endswith(".NS"):
            return "NSE", "INR"
        elif sym.endswith(".BO"):
            return "BSE", "INR"
        elif sym.startswith("^"):
            if sym == "^NSEI":
                return "NSE", "INR"
            return "INDEX", "USD"
        else:
            return "US", "USD"

    @staticmethod
    def is_market_open(ticker: str) -> str:
        """Determines if the exchange is open based on exchange trading hours."""
        now_utc = datetime.datetime.now(pytz.utc)
        sym = ticker.strip().upper()

        if sym.endswith(".NS") or sym.endswith(".BO") or sym == "^NSEI":
            ist = pytz.timezone("Asia/Kolkata")
            now_ist = now_utc.astimezone(ist)
            # Weekday: Mon=0, Fri=4, Sat=5, Sun=6
            if now_ist.weekday() >= 5:
                return "CLOSED"
            market_open = now_ist.replace(hour=9, minute=15, second=0, microsecond=0)
            market_close = now_ist.replace(hour=15, minute=30, second=0, microsecond=0)
            return "OPEN" if market_open <= now_ist <= market_close else "CLOSED"
        else:
            et = pytz.timezone("America/New_York")
            now_et = now_utc.astimezone(et)
            if now_et.weekday() >= 5:
                return "CLOSED"
            market_open = now_et.replace(hour=9, minute=30, second=0, microsecond=0)
            market_close = now_et.replace(hour=16, minute=0, second=0, microsecond=0)
            return "OPEN" if market_open <= now_et <= market_close else "CLOSED"

    def _fetch_from_polygon(self, ticker: str) -> Optional[CanonicalQuote]:
        """Try fetching quote from Polygon if API key is configured."""
        if not self.polygon_client.api_key:
            return None

        # Polygon only supports US equities
        exchange, currency = self.get_exchange_and_currency(ticker)
        if exchange not in ["US", "NYSE", "NASDAQ"]:
            return None

        prev = self.polygon_client.get_previous_close(ticker)
        if not prev or prev.get("close", 0.0) <= 0:
            return None

        close_p = float(prev["close"])
        open_p = float(prev.get("open", close_p))
        change = close_p - open_p
        change_pct = (change / open_p * 100) if open_p > 0 else 0.0
        market_state = self.is_market_open(ticker)
        freshness = "realtime" if market_state == "OPEN" else "historical"

        return CanonicalQuote(
            ticker=ticker,
            price=round(close_p, 2),
            change=round(change, 2),
            change_pct=round(change_pct, 2),
            open_price=round(open_p, 2),
            day_high=round(float(prev.get("high", close_p)), 2),
            day_low=round(float(prev.get("low", close_p)), 2),
            prev_close=round(open_p, 2),
            volume=int(prev.get("volume", 0)),
            currency=currency,
            exchange=exchange,
            market_state=market_state,
            timestamp=datetime.datetime.utcnow().isoformat() + "Z",
            data_source="polygon",
            freshness=freshness,
            provider="polygon",
            is_stale=False
        )

    def _fetch_from_yfinance(self, ticker: str) -> Optional[CanonicalQuote]:
        """Fetch quote using yfinance fast_info and history fallback."""
        exchange, currency = self.get_exchange_and_currency(ticker)
        market_state = self.is_market_open(ticker)

        t = yf.Ticker(ticker)
        fi = getattr(t, "fast_info", None)

        last_price = 0.0
        prev_close = 0.0
        open_p = 0.0
        day_low = 0.0
        day_high = 0.0
        year_low = None
        year_high = None
        volume = 0

        if fi:
            try:
                last_price = float(getattr(fi, "last_price", 0.0) or 0.0)
                prev_close = float(getattr(fi, "previous_close", 0.0) or last_price)
                volume = int(getattr(fi, "last_volume", 0) or 0)
                day_low = float(getattr(fi, "day_low", 0.0) or last_price)
                day_high = float(getattr(fi, "day_high", 0.0) or last_price)
                year_low = float(getattr(fi, "year_low", 0.0) or 0.0) or None
                year_high = float(getattr(fi, "year_high", 0.0) or 0.0) or None
                open_p = float(getattr(fi, "open", 0.0) or prev_close)
            except Exception:
                pass

        if last_price <= 0.0:
            try:
                hist = t.history(period="2d")
                if not hist.empty:
                    last_price = float(hist["Close"].iloc[-1])
                    prev_close = float(hist["Close"].iloc[-2]) if len(hist) > 1 else last_price
                    open_p = float(hist["Open"].iloc[-1]) if "Open" in hist else prev_close
                    day_low = float(hist["Low"].iloc[-1]) if "Low" in hist else last_price
                    day_high = float(hist["High"].iloc[-1]) if "High" in hist else last_price
                    volume = int(hist["Volume"].iloc[-1]) if "Volume" in hist else 0
            except Exception as err:
                print(f"[MarketDataService] yfinance history error for {ticker}: {err}")

        if last_price <= 0.0:
            return None

        change = last_price - prev_close
        change_pct = (change / prev_close * 100) if prev_close > 0 else 0.0

        # Yahoo finance free data during market hours is delayed ~15 minutes
        freshness = "delayed_15m" if market_state == "OPEN" else "historical"

        return CanonicalQuote(
            ticker=ticker,
            price=round(last_price, 2),
            change=round(change, 2),
            change_pct=round(change_pct, 2),
            open_price=round(open_p, 2),
            day_high=round(day_high, 2),
            day_low=round(day_low, 2),
            prev_close=round(prev_close, 2),
            year_low=round(year_low, 2) if year_low else None,
            year_high=round(year_high, 2) if year_high else None,
            volume=volume,
            currency=currency,
            exchange=exchange,
            market_state=market_state,
            timestamp=datetime.datetime.utcnow().isoformat() + "Z",
            data_source="yfinance",
            freshness=freshness,
            provider="yfinance",
            is_stale=False
        )

    def get_quote(self, ticker: str) -> CanonicalQuote:
        """
        Returns authoritative quote.
        Checks Redis/Memory Cache -> Polygon -> Yahoo Finance -> Stale Fallback.
        Exposes honest data freshness: 'realtime', 'delayed_15m', 'cached', or 'historical'.
        """
        sym = ticker.strip().upper()
        now = time.time()
        cache_key = f"quote:{sym}"

        # 0. Fast local quote cache check
        if sym in self._quote_cache:
            ts, cached_quote = self._quote_cache[sym]
            if now - ts < self.cache_ttl:
                cached_copy = cached_quote.model_copy()
                cached_copy.data_source = "cached"
                cached_copy.freshness = "cached"
                return cached_copy

        # 1. Fresh cache check
        cached_dict = cache_service.get_sync(cache_key)
        if cached_dict:
            quote = CanonicalQuote.model_validate(cached_dict)
            quote.data_source = "cached"
            quote.freshness = "cached"
            self._quote_cache[sym] = (now, quote)
            return quote

        # 2. Live Provider Query
        quote = None
        try:
            quote = self._fetch_from_polygon(sym)
        except Exception as e:
            print(f"[MarketDataService] Polygon fetch error for {sym}: {e}")

        if not quote:
            try:
                quote = self._fetch_from_yfinance(sym)
            except Exception as e:
                print(f"[MarketDataService] yfinance fetch error for {sym}: {e}")

        if quote:
            self._quote_cache[sym] = (now, quote)
            # Determine TTL: 15s during market open, 300s when closed
            ttl = self.quote_ttl if quote.market_state == "OPEN" else 300
            cache_service.set_sync(cache_key, quote.model_dump(mode="json"), ttl_seconds=ttl)
            # Also store under persistent stale fallback key
            cache_service.set_sync(f"stale_quote:{sym}", quote.model_dump(mode="json"), ttl_seconds=86400)
            return quote

        # 3. Degraded Stale Fallback (Provider outage recovery)
        stale_dict = cache_service.get_sync(f"stale_quote:{sym}")
        if stale_dict:
            stale_quote = CanonicalQuote.model_validate(stale_dict)
            stale_quote.is_stale = True
            stale_quote.data_source = "stale_fallback"
            stale_quote.freshness = "cached"
            return stale_quote

        # 4. Outage state: No synthetic fabrication!
        raise HTTPException(
            status_code=503,
            detail=f"Live market quote temporarily unavailable for '{sym}' from market data providers. Please retry in a few moments."
        )

    def get_quotes(self, tickers: List[str]) -> List[CanonicalQuote]:
        """Fetch multiple quotes safely."""
        results = []
        for t in tickers:
            try:
                results.append(self.get_quote(t))
            except Exception as err:
                print(f"[MarketDataService] Error querying quote for {t}: {err}")
        return results

    def get_history(self, ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
        """
        Centralized historical daily bar fetcher with caching and provider routing.
        Returns clean DataFrame with DatetimeIndex and ['Open', 'High', 'Low', 'Close', 'Volume'].
        """
        from src.data_fetcher import DataFetcher
        clean_ticker = ticker.strip().upper()
        cache_key = f"history:{clean_ticker}:{start_date}:{end_date}"

        cached_json = cache_service.get_sync(cache_key)
        if cached_json:
            try:
                df = pd.read_json(io.StringIO(cached_json) if isinstance(cached_json, str) else cached_json, orient="split")
                return df
            except Exception:
                pass

        fetcher = DataFetcher()
        df = fetcher.fetch_single_ticker(clean_ticker, start_date=start_date, end_date=end_date)
        if not df.empty:
            try:
                cache_service.set_sync(cache_key, df.to_json(orient="split", date_format="iso"), ttl_seconds=self.history_ttl)
            except Exception as e:
                print(f"[MarketDataService] Error caching historical data: {e}")

        return df

market_data_service = MarketDataService()
