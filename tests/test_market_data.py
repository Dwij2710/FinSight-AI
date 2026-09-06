"""
Unit & Integration Tests for P0.3 - Market Data Service, Redis/Memory Caching,
Stale Fallback Recovery, and Honest Freshness Disclosure.
"""
import unittest
import time
from datetime import datetime
import pandas as pd

from backend.app.services.cache import CacheService
from backend.app.services.market_data import MarketDataService
from backend.app.schemas import CanonicalQuote

class TestMarketDataAndCache(unittest.TestCase):
    def setUp(self):
        self.cache = CacheService()
        self.market_service = MarketDataService(quote_ttl_seconds=2, history_ttl_seconds=5)

    def test_cache_set_get_and_expiration(self):
        """Validates that cache stores values and expires them according to TTL."""
        key = "test_asset_price"
        val = {"price": 195.50, "currency": "USD"}

        # Store with 1 second TTL
        self.cache.set_sync(key, val, ttl_seconds=1)
        retrieved = self.cache.get_sync(key)
        self.assertEqual(retrieved, val)

        # Wait for expiration
        time.sleep(1.2)
        expired = self.cache.get_sync(key)
        self.assertIsNone(expired)

    def test_cache_unreachable_redis_fallback(self):
        """Asserts that an invalid Redis configuration safely degrades to memory without throwing."""
        fallback_cache = CacheService()
        fallback_cache.is_redis_available = False
        fallback_cache._sync_redis_client = None

        key = "offline_key"
        self.assertTrue(fallback_cache.set_sync(key, "safe_data", ttl_seconds=5))
        self.assertEqual(fallback_cache.get_sync(key), "safe_data")

    def test_exchange_and_currency_resolution(self):
        """Verifies accurate exchange and currency identification."""
        self.assertEqual(self.market_service.get_exchange_and_currency("AAPL"), ("US", "USD"))
        self.assertEqual(self.market_service.get_exchange_and_currency("NVDA"), ("US", "USD"))
        self.assertEqual(self.market_service.get_exchange_and_currency("RELIANCE.NS"), ("NSE", "INR"))
        self.assertEqual(self.market_service.get_exchange_and_currency("TCS.BO"), ("BSE", "INR"))
        self.assertEqual(self.market_service.get_exchange_and_currency("^NSEI"), ("NSE", "INR"))
        self.assertEqual(self.market_service.get_exchange_and_currency("^GSPC"), ("INDEX", "USD"))

    def test_canonical_quote_and_cache_freshness(self):
        """Validates real canonical quote structure, caching, and honest freshness labeling."""
        quote1 = self.market_service.get_quote("AAPL")
        self.assertIsInstance(quote1, CanonicalQuote)
        self.assertEqual(quote1.ticker, "AAPL")
        self.assertGreater(quote1.price, 0.0)
        self.assertIn(quote1.freshness, ["realtime", "delayed_15m", "historical", "cached"])
        self.assertFalse(quote1.is_stale)

        # Second fetch must hit cache and disclose freshness as 'cached'
        quote2 = self.market_service.get_quote("AAPL")
        self.assertEqual(quote2.freshness, "cached")
        self.assertIn(quote2.data_source, ["cached", "cache"])
        self.assertEqual(quote1.price, quote2.price)

    def test_stale_fallback_recovery(self):
        """Verifies that when live providers fail, stale cached quotes are served with is_stale=True."""
        sym = "STALE_TEST_TICKER"
        test_quote = CanonicalQuote(
            ticker=sym,
            price=150.25,
            change=2.5,
            change_pct=1.69,
            open_price=148.0,
            day_high=151.0,
            day_low=147.5,
            prev_close=147.75,
            volume=500000,
            currency="USD",
            exchange="US",
            market_state="OPEN",
            timestamp=datetime.utcnow().isoformat() + "Z",
            data_source="yfinance",
            freshness="delayed_15m",
            provider="yfinance",
            is_stale=False
        )
        # Store in stale fallback key
        from backend.app.services.cache import cache_service
        cache_service.set_sync(f"stale_quote:{sym}", test_quote.model_dump(mode="json"), ttl_seconds=60)

        # Retrieve quote for ticker that does not exist in live market
        quote = self.market_service.get_quote(sym)
        self.assertTrue(quote.is_stale)
        self.assertEqual(quote.data_source, "stale_fallback")
        self.assertEqual(quote.price, 150.25)

    def test_ticker_history_endpoint(self):
        """Validates that /api/ticker/history returns OHLCV candlestick bars and technicals."""
        import asyncio
        from backend.app.routes.ticker import get_ticker_history
        res = asyncio.run(get_ticker_history("AAPL", period="1M"))
        self.assertTrue(res.success)
        data = res.data
        self.assertEqual(data["ticker"], "AAPL")
        self.assertGreater(data["bars_count"], 10)
        self.assertIn("summary", data)
        self.assertIn("rsi", data["summary"])
        self.assertIn("trend", data["summary"])
        bar0 = data["bars"][0]
        self.assertIn("open", bar0)
        self.assertIn("high", bar0)
        self.assertIn("low", bar0)
        self.assertIn("close", bar0)
        self.assertIn("volume", bar0)
        self.assertIn("sma_20", bar0)
        self.assertIn("rsi_14", bar0)
        self.assertIn("macd", bar0)

if __name__ == "__main__":
    unittest.main()

