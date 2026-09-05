"""
Polygon.io Institutional Data Client
Handles market data ingestion from Polygon.io with error resilience and type normalization.
"""
import os
import requests
import pandas as pd
import numpy as np
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

class PolygonClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = (api_key or os.getenv("POLYGON_API_KEY", "")).strip()
        self.base_url = "https://api.polygon.io"

    def get_daily_bars(self, ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
        """
        Fetch daily aggregated OHLCV candles from Polygon.io.
        Returns a DataFrame with columns: ['Date', 'Open', 'High', 'Low', 'Close', 'Volume']
        and DatetimeIndex.
        """
        if not self.api_key:
            return pd.DataFrame()

        clean_ticker = ticker.strip().upper()
        # Polygon expects US equity tickers without exchange suffixes
        if "." in clean_ticker or clean_ticker.startswith("^"):
            return pd.DataFrame()

        url = f"{self.base_url}/v2/aggs/ticker/{clean_ticker}/range/1/day/{start_date}/{end_date}"
        params = {
            "apiKey": self.api_key,
            "adjusted": "true",
            "sort": "asc",
            "limit": 50000
        }

        try:
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code != 200:
                print(f"[PolygonClient] HTTP {resp.status_code} for {clean_ticker}: {resp.text[:150]}")
                return pd.DataFrame()

            data = resp.json()
            results = data.get("results", [])
            if not results:
                return pd.DataFrame()

            records = []
            for r in results:
                # 't' is millisecond timestamp
                ts_sec = r.get("t", 0) / 1000.0
                dt = datetime.utcfromtimestamp(ts_sec).date()
                records.append({
                    "Date": pd.to_datetime(dt),
                    "Open": float(r.get("o", 0.0)),
                    "High": float(r.get("h", 0.0)),
                    "Low": float(r.get("l", 0.0)),
                    "Close": float(r.get("c", 0.0)),
                    "Volume": float(r.get("v", 0.0))
                })

            df = pd.DataFrame(records)
            df.set_index("Date", inplace=True)
            df.sort_index(inplace=True)
            return df

        except Exception as e:
            print(f"[PolygonClient] Error fetching daily bars for {clean_ticker}: {e}")
            return pd.DataFrame()

    def get_previous_close(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Fetch previous day's OHLCV bar for ticker.
        """
        if not self.api_key:
            return None

        clean_ticker = ticker.strip().upper()
        url = f"{self.base_url}/v2/aggs/ticker/{clean_ticker}/prev"
        params = {"apiKey": self.api_key}

        try:
            resp = requests.get(url, params=params, timeout=8)
            if resp.status_code != 200:
                return None

            data = resp.json()
            results = data.get("results", [])
            if not results:
                return None

            r = results[0]
            ts_sec = r.get("t", 0) / 1000.0
            dt = datetime.utcfromtimestamp(ts_sec).date().strftime("%Y-%m-%d")

            return {
                "ticker": clean_ticker,
                "date": dt,
                "open": float(r.get("o", 0.0)),
                "high": float(r.get("h", 0.0)),
                "low": float(r.get("l", 0.0)),
                "close": float(r.get("c", 0.0)),
                "volume": float(r.get("v", 0.0))
            }
        except Exception as e:
            print(f"[PolygonClient] Error fetching previous close for {clean_ticker}: {e}")
            return None

    def get_ticker_details(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Fetch company reference details from Polygon.
        """
        if not self.api_key:
            return None

        clean_ticker = ticker.strip().upper()
        url = f"{self.base_url}/v3/reference/tickers/{clean_ticker}"
        params = {"apiKey": self.api_key}

        try:
            resp = requests.get(url, params=params, timeout=8)
            if resp.status_code != 200:
                return None

            data = resp.json()
            res = data.get("results", {})
            if not res:
                return None

            return {
                "ticker": clean_ticker,
                "name": res.get("name"),
                "description": res.get("description"),
                "market_cap": res.get("market_cap"),
                "primary_exchange": res.get("primary_exchange"),
                "currency_name": res.get("currency_name"),
                "homepage_url": res.get("homepage_url"),
                "list_date": res.get("list_date"),
                "total_employees": res.get("total_employees")
            }
        except Exception as e:
            print(f"[PolygonClient] Error fetching details for {clean_ticker}: {e}")
            return None
