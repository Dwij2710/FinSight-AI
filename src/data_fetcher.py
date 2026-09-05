"""
Data Fetcher Module
Handles fetching, caching, and preprocessing of market data using Polygon.io (US Equities)
and Yahoo Finance (Global Equities, Indian NSE/BSE, Indices, Commodities).
Includes an in-memory TTL cache to eliminate redundant network roundtrips.
"""
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any

import numpy as np
import pandas as pd
import yfinance as yf

# Add project root to path for config imports
_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from config.config import (
    STOCK_TICKERS, BENCHMARK_TICKER,
    START_DATE_STR, END_DATE_STR, DATA_DIR,
    detect_benchmark_ticker, get_risk_free_rate
)
from src.polygon_client import PolygonClient

# In-memory TTL cache: {cache_key: (timestamp, data)}
_IN_MEMORY_CACHE: Dict[str, Tuple[float, Any]] = {}
_PRICE_CACHE_TTL = 900  # 15 minutes
_LAST_DATA_FETCH_TS: Optional[str] = None


def get_last_data_fetch_ts() -> Optional[str]:
    """Returns the ISO timestamp of the most recent successful market data fetch."""
    return _LAST_DATA_FETCH_TS


def _mark_data_fetched() -> None:
    global _LAST_DATA_FETCH_TS
    _LAST_DATA_FETCH_TS = datetime.utcnow().isoformat() + "Z"


def is_yfinance_reachable(timeout_sec: float = 3.0) -> bool:
    """Quick probe to verify external market data provider reachability."""
    try:
        # Fast query of 1 day on S&P 500
        probe = yf.download("^GSPC", period="1d", progress=False)
        return not probe.empty
    except Exception:
        return False


def _download_with_retry(ticker_or_tickers, start: Optional[str] = None, end: Optional[str] = None, retries: int = 3, backoff: float = 1.0, **kwargs) -> pd.DataFrame:
    """Execute yfinance download with exponential backoff retries."""
    for attempt in range(1, retries + 1):
        try:
            if start and end:
                df = yf.download(ticker_or_tickers, start=start, end=end, progress=False, auto_adjust=False, **kwargs)
            else:
                df = yf.download(ticker_or_tickers, progress=False, auto_adjust=False, **kwargs)
            if not df.empty:
                _mark_data_fetched()
                return df
        except Exception as e:
            if attempt == retries:
                print(f"[DataFetcher] yfinance query failed after {retries} retries: {e}")
                break
        time.sleep(backoff * attempt)
    return pd.DataFrame()


def _get_from_cache(key: str) -> Optional[Any]:
    if key in _IN_MEMORY_CACHE:
        ts, val = _IN_MEMORY_CACHE[key]
        if time.time() - ts < _PRICE_CACHE_TTL:
            return val.copy() if hasattr(val, 'copy') else val
        else:
            del _IN_MEMORY_CACHE[key]
    return None


def _set_in_cache(key: str, val: Any) -> None:
    _IN_MEMORY_CACHE[key] = (time.time(), val)


class DataFetcher:
    """
    Unified institutional data fetcher with Polygon.io routing,
    Yahoo Finance global fallback, and fast in-memory caching.
    """

    def __init__(self, tickers: Optional[List[str]] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, benchmark: Optional[str] = None):
        self.tickers = [t.strip().upper() for t in (tickers or STOCK_TICKERS) if t.strip()]
        self.start_date = start_date or START_DATE_STR
        self.end_date = end_date or END_DATE_STR
        self.benchmark = benchmark or detect_benchmark_ticker(self.tickers)
        self.polygon_client = PolygonClient()
        self.price_data: Optional[pd.DataFrame] = None
        self.benchmark_data: Optional[pd.Series] = None

    @staticmethod
    def is_us_equity(ticker: str) -> bool:
        clean = ticker.strip().upper()
        if clean.startswith("^") or "=" in clean or clean in ["GLD", "USO"]:
            return False
        if "." in clean:
            return False
        return clean.isalpha() and len(clean) <= 6

    def fetch_single_ticker(self, ticker: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> pd.DataFrame:
        """
        Fetches daily OHLCV bars for a single ticker with caching and provider routing.
        Returns DataFrame with ['Open', 'High', 'Low', 'Close', 'Volume'] and DatetimeIndex.
        """
        clean_ticker = ticker.strip().upper()
        s_date = start_date or self.start_date
        e_date = end_date or self.end_date
        cache_key = f"single_{clean_ticker}_{s_date}_{e_date}"

        cached = _get_from_cache(cache_key)
        if cached is not None:
            return cached

        df = pd.DataFrame()

        # 1. If US equity, try Polygon.io first
        if self.is_us_equity(clean_ticker):
            try:
                df = self.polygon_client.get_daily_bars(clean_ticker, s_date, e_date)
            except Exception as e:
                print(f"[DataFetcher] Polygon.io query error for {clean_ticker}: {e}")

        # 2. If Polygon returned empty (historical limit, international, or rate limit), query Yahoo Finance
        if df.empty:
            try:
                yf_data = _download_with_retry(clean_ticker, start=s_date, end=e_date)
                if not yf_data.empty:
                    if isinstance(yf_data.columns, pd.MultiIndex):
                        yf_data.columns = [c[0] for c in yf_data.columns]
                    
                    # Deduplicate columns if both Close and Adj Close exist
                    if 'Adj Close' in yf_data.columns and 'Close' in yf_data.columns:
                        yf_data = yf_data.drop(columns=['Adj Close'])
                    elif 'Adj Close' in yf_data.columns and 'Close' not in yf_data.columns:
                        yf_data = yf_data.rename(columns={'Adj Close': 'Close'})
                    
                    # Keep only the first instance of any duplicated column name
                    yf_data = yf_data.loc[:, ~yf_data.columns.duplicated()]
                    std_cols = [c for c in ['Open', 'High', 'Low', 'Close', 'Volume'] if c in yf_data.columns]
                    df = yf_data[std_cols].dropna()
            except Exception as e:
                print(f"[DataFetcher] Yahoo Finance query error for {clean_ticker}: {e}")

        if not df.empty:
            _set_in_cache(cache_key, df)

        return df

    def fetch_stock_data(self, save_to_csv: bool = False) -> pd.DataFrame:
        """
        Fetch historical close prices for all configured tickers.
        Returns a DataFrame of closing prices indexed by Date.
        """
        cache_key = f"multi_{'_'.join(sorted(self.tickers))}_{self.start_date}_{self.end_date}"
        cached = _get_from_cache(cache_key)
        if cached is not None:
            self.price_data = cached
            return self.price_data

        price_series_dict = {}

        for ticker in self.tickers:
            df = self.fetch_single_ticker(ticker, self.start_date, self.end_date)
            if not df.empty and 'Close' in df.columns:
                close_col = df['Close']
                if isinstance(close_col, pd.DataFrame):
                    close_col = close_col.iloc[:, 0]
                series = close_col.astype(float)
                series.name = ticker
                price_series_dict[ticker] = series

        if not price_series_dict:
            # Fallback batch download
            try:
                batch_data = _download_with_retry(self.tickers, start=self.start_date, end=self.end_date)
                if not batch_data.empty:
                    if isinstance(batch_data.columns, pd.MultiIndex):
                        level0 = batch_data.columns.get_level_values(0)
                        if 'Close' in level0:
                            self.price_data = batch_data['Close']
                        elif 'Adj Close' in level0:
                            self.price_data = batch_data['Adj Close']
                        else:
                            self.price_data = batch_data.iloc[:, :len(self.tickers)]
                    else:
                        self.price_data = batch_data
            except Exception as e:
                print(f"[DataFetcher] Batch yfinance download error: {e}")
                self.price_data = pd.DataFrame()
        else:
            self.price_data = pd.DataFrame(price_series_dict)

        if self.price_data is not None and not self.price_data.empty:
            self.price_data = self._clean_data(self.price_data)
            _set_in_cache(cache_key, self.price_data)

            if save_to_csv:
                self._save_to_csv(self.price_data, "stock_prices.csv")

        return self.price_data if self.price_data is not None else pd.DataFrame()

    def fetch_benchmark_data(self, benchmark_ticker: Optional[str] = None, save_to_csv: bool = False) -> pd.Series:
        """
        Fetch benchmark index data (e.g. ^GSPC for US, ^NSEI for India).
        """
        bench = benchmark_ticker or self.benchmark
        cache_key = f"bench_{bench}_{self.start_date}_{self.end_date}"
        cached = _get_from_cache(cache_key)
        if cached is not None:
            self.benchmark_data = cached
            return self.benchmark_data

        try:
            data = yf.download(bench, start=self.start_date, end=self.end_date, progress=False)
            if isinstance(data.columns, pd.MultiIndex):
                if 'Close' in data.columns.get_level_values(0):
                    self.benchmark_data = data['Close'].iloc[:, 0]
                else:
                    self.benchmark_data = data.iloc[:, 0]
            else:
                if 'Close' in data.columns:
                    self.benchmark_data = data['Close']
                elif 'Adj Close' in data.columns:
                    self.benchmark_data = data['Adj Close']
                else:
                    self.benchmark_data = data.iloc[:, 0]

            if isinstance(self.benchmark_data, pd.DataFrame):
                self.benchmark_data = self.benchmark_data.iloc[:, 0]

            self.benchmark_data.name = bench
            self.benchmark_data = self.benchmark_data.dropna().astype(float)
            _set_in_cache(cache_key, self.benchmark_data)

            if save_to_csv:
                bench_df = pd.DataFrame({bench: self.benchmark_data})
                self._save_to_csv(bench_df, "benchmark_prices.csv")

            return self.benchmark_data
        except Exception as e:
            print(f"[DataFetcher] Failed to fetch benchmark {bench}: {e}")
            return pd.Series(dtype=float, name=bench)

    def _clean_data(self, data: pd.DataFrame) -> pd.DataFrame:
        if data.empty:
            return data
        data = data.dropna(axis=1, how='all')
        data = data.ffill().bfill().dropna()
        data = data.sort_index()
        return data

    def _save_to_csv(self, data: pd.DataFrame, filename: str) -> None:
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR, exist_ok=True)
        filepath = os.path.join(DATA_DIR, filename)
        data.to_csv(filepath)

    def get_stock_info(self, ticker: str) -> Dict[str, Any]:
        """
        Get company information using Polygon details or Yahoo Finance info.
        """
        clean = ticker.strip().upper()
        if self.is_us_equity(clean):
            details = self.polygon_client.get_ticker_details(clean)
            if details:
                return details
        try:
            stock = yf.Ticker(clean)
            return stock.info
        except Exception:
            return {"symbol": clean}

    def get_all_data(self) -> Tuple[pd.DataFrame, pd.Series]:
        stocks = self.fetch_stock_data()
        bench = self.fetch_benchmark_data()
        common_dates = stocks.index.intersection(bench.index)
        return stocks.loc[common_dates], bench.loc[common_dates]
