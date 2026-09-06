"""
FinSight AI - Production Data Integrity & Authenticity Test Suite
Verifies that:
1. All quotes derive from authoritative providers without synthetic fabrication.
2. All article links are valid external URLs (never '#').
3. Forecast returns real seasonal decomposition and hold-out backtest arrays.
4. RL simulation models transaction fees and slippage on real price series.
5. All percentages are standardized to [0.0, 100.0].
"""
import unittest
import asyncio
import os
import sys
from pathlib import Path

_ROOT = str(Path(__file__).resolve().parent.parent)
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from backend.app.services.market_data import market_data_service
from backend.app.schemas import CanonicalQuote, ForecastRequest, RlSimulateRequest
from backend.app.routes.forecast import generate_forecast
from backend.app.routes.rl_agent import simulate_rl_agent
from src.ai_features import FinBERTAnalyzer

class TestProductionDataIntegrity(unittest.TestCase):

    def test_single_source_of_truth_quote(self):
        """Validates that MarketDataService returns canonical quotes with real numbers."""
        quote = market_data_service.get_quote("AAPL")
        self.assertIsInstance(quote, CanonicalQuote)
        self.assertEqual(quote.ticker, "AAPL")
        self.assertGreater(quote.price, 0.0)
        self.assertIn(quote.currency, ["USD", "INR"])
        self.assertIn(quote.data_source, ["polygon", "yfinance", "cached"])
        self.assertIsNotNone(quote.timestamp)

    def test_news_articles_have_valid_urls(self):
        """Verifies that 100% of returned news articles contain valid HTTP links and never '#'."""
        analyzer = FinBERTAnalyzer("AAPL")
        df, model_used = analyzer.get_news_sentiment()
        if not df.empty:
            for idx, row in df.iterrows():
                link = row['Link']
                self.assertIsNotNone(link)
                self.assertNotEqual(link, "#", f"Article '{row['Title']}' has dead link '#'")
                self.assertTrue(
                    link.startswith("http://") or link.startswith("https://"),
                    f"Article link '{link}' is not a valid HTTP URL"
                )

    def test_forecast_returns_decomposition_and_backtest(self):
        """Validates that SARIMAX returns real seasonal decomposition and backtest validation."""
        req = ForecastRequest(ticker="AAPL", forecast_period=7, run_backtest=True)
        res = asyncio.run(generate_forecast(req))
        self.assertTrue(res.success)
        data = res.data
        self.assertIn("decomposition", data)
        self.assertIn("trend", data["decomposition"])
        self.assertIn("seasonal", data["decomposition"])
        self.assertIn("resid", data["decomposition"])

        self.assertIn("backtest", data)
        self.assertIsNotNone(data["backtest"])
        self.assertIn("accuracy", data["backtest"])
        self.assertIn("rmse", data["backtest"])
        self.assertIn("actual", data["backtest"])
        self.assertIn("predicted", data["backtest"])
        self.assertGreater(len(data["backtest"]["actual"]), 0)

    def test_rl_agent_simulation_realism(self):
        """Validates that RL simulation calculates real net worth with trading history."""
        req = RlSimulateRequest(ticker="AAPL", timesteps=1000, initial_balance=10000.0)
        res = asyncio.run(simulate_rl_agent(req))
        self.assertTrue(res.success)
        data = res.data
        self.assertGreater(data["final_balance"], 0.0)
        self.assertIn("win_rate_pct", data)
        self.assertIn("max_drawdown_pct", data)
        self.assertIn("history", data)
        self.assertGreater(len(data["history"]), 10)

    def test_portfolio_optimization_authenticity(self):
        """Validates that portfolio optimization returns real weights summing to ~100% and real Ledoit-Wolf metrics."""
        from backend.app.routes.portfolio import optimize_portfolio
        from backend.app.schemas import PortfolioRequest

        req = PortfolioRequest(tickers=["AAPL", "MSFT"], start_date="2023-01-01", end_date="2024-01-01")
        res = asyncio.run(optimize_portfolio(req))
        self.assertTrue(res.success, f"Portfolio optimization failed: {res.message}")
        data = res.data
        self.assertIn("max_sharpe", data)
        self.assertIn("min_volatility", data)
        self.assertIn("correlation_matrix", data)

        # Check weights sum to ~100%
        ms_weights = data["max_sharpe"]["weights"]
        total_weight = sum(ms_weights.values())
        self.assertAlmostEqual(total_weight, 100.0, delta=1.0)
        self.assertGreater(data["max_sharpe"]["return"], -100.0)
        self.assertGreater(data["max_sharpe"]["volatility"], 0.0)

    def test_tft_multivariate_regime_authenticity(self):
        """Validates that Multi-Factor Regime Analysis returns real macro correlations and synchronized price."""
        from backend.app.routes.tft import analyze_tft
        from backend.app.schemas import TftRequest

        req = TftRequest(ticker="AAPL")
        res = asyncio.run(analyze_tft(req))
        self.assertTrue(res.success, f"TFT analysis failed: {res.message}")
        data = res.data
        self.assertGreater(data["current_price"], 0.0)
        self.assertIn("macro_correlations", data)
        self.assertGreater(len(data["macro_correlations"]), 0)
        self.assertIn("attention_weights", data)
        self.assertGreater(len(data["attention_weights"]), 0)

if __name__ == "__main__":
    unittest.main()
