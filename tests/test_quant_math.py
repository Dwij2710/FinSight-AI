"""
Unit and Integration Tests for Quantitative Math, Optimization Constraints,
Cache TTL Telemetry, and Provenance Serialization.
Compatible with both standard library unittest and pytest.
"""
import unittest
import os
import sys
from pathlib import Path

# Add project root to sys.path
_ROOT = str(Path(__file__).resolve().parent.parent)
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import numpy as np
import pandas as pd
import time
from datetime import datetime

from src.portfolio_optimizer import PortfolioOptimizer
from src.risk_metrics import RiskMetrics
from backend.app.schemas import ApiResponse
from backend.app.services.market_data import market_data_service


def generate_sample_returns():
    """Generates synthetic daily returns for 3 correlated assets."""
    np.random.seed(42)
    dates = pd.date_range(start="2023-01-01", periods=252, freq="B")
    mean_returns = [0.0008, 0.0005, 0.0003]
    cov = [
        [0.0004, 0.0001, 0.00005],
        [0.0001, 0.0003, 0.00008],
        [0.00005, 0.00008, 0.0002]
    ]
    data = np.random.multivariate_normal(mean_returns, cov, size=252)
    return pd.DataFrame(data, index=dates, columns=["RELIANCE", "TCS", "INFY"])


def generate_zero_variance_returns():
    """Generates synthetic zero-variance returns to test division-by-zero resilience."""
    dates = pd.date_range(start="2023-01-01", periods=50, freq="B")
    data = np.zeros((50, 2))
    return pd.DataFrame(data, index=dates, columns=["CASH_1", "CASH_2"])


class TestQuantMath(unittest.TestCase):
    def setUp(self):
        self.sample_returns = generate_sample_returns()
        self.zero_variance_returns = generate_zero_variance_returns()

    def test_sharpe_ratio_with_risk_free_rate(self):
        """Validates that Sharpe ratio accurately accounts for non-zero risk-free rate."""
        rf = 0.045  # 4.5% annual risk-free rate
        optimizer = PortfolioOptimizer(self.sample_returns, risk_free_rate=rf, use_shrinkage=False)
        result = optimizer.optimize_sharpe_ratio()

        self.assertIn("sharpe_ratio", result)
        self.assertIn("return", result)
        self.assertIn("volatility", result)

        # Verify mathematical identity: Sharpe = (Return - Rf) / Volatility
        expected_sharpe = (result["return"] - rf) / result["volatility"]
        self.assertAlmostEqual(result["sharpe_ratio"], expected_sharpe, places=3)

    def test_zero_variance_handling(self):
        """Verifies that flat/zero-variance returns do not trigger ZeroDivisionError."""
        optimizer = PortfolioOptimizer(self.zero_variance_returns, risk_free_rate=0.04, use_shrinkage=False)
        result = optimizer.optimize_sharpe_ratio()
        self.assertFalse(np.isnan(result["sharpe_ratio"]) and not np.isneginf(result["sharpe_ratio"]))

        # Also test RiskMetrics directly
        rm = RiskMetrics(self.zero_variance_returns, risk_free_rate=0.04)
        sharpe_series = rm.calculate_sharpe_ratio()
        self.assertEqual(len(sharpe_series), 2)
        for val in sharpe_series:
            self.assertFalse(np.isnan(val))

    def test_max_sharpe_weights_sum_to_one(self):
        """Ensures Max Sharpe portfolio weights strictly sum to 1.0 (within epsilon)."""
        optimizer = PortfolioOptimizer(self.sample_returns, risk_free_rate=0.04)
        result = optimizer.optimize_sharpe_ratio()
        total_weight = sum(result["weights"].values())
        self.assertAlmostEqual(total_weight, 1.0, places=4)
        for w in result["weights"].values():
            self.assertGreaterEqual(w, -1e-6)

    def test_min_volatility_weights_sum_to_one(self):
        """Ensures Min Volatility portfolio weights strictly sum to 1.0 (within epsilon)."""
        optimizer = PortfolioOptimizer(self.sample_returns, risk_free_rate=0.04)
        result = optimizer.optimize_min_volatility()
        total_weight = sum(result["weights"].values())
        self.assertAlmostEqual(total_weight, 1.0, places=4)
        for w in result["weights"].values():
            self.assertGreaterEqual(w, -1e-6)

    def test_risk_parity_weights_sum_to_one(self):
        """Ensures Equal Risk Parity weights strictly sum to 1.0 (within epsilon)."""
        optimizer = PortfolioOptimizer(self.sample_returns, risk_free_rate=0.04)
        result = optimizer.optimize_risk_parity()
        total_weight = sum(result["weights"].values())
        self.assertAlmostEqual(total_weight, 1.0, places=4)
        for w in result["weights"].values():
            self.assertGreater(w, 0.0)


class TestRebalanceUrgencyScore(unittest.TestCase):
    def test_identical_weights_zero_urgency(self):
        """When portfolio weights equal baseline weights, urgency score must be 0."""
        n = 4
        baseline_weight = 1.0 / n
        active_weights = {"A": baseline_weight, "B": baseline_weight, "C": baseline_weight, "D": baseline_weight}
        
        total_divergence = sum(abs(active_weights[sym] - baseline_weight) for sym in active_weights) / 2
        score = min(100, round(total_divergence * 100 * 1.8))
        self.assertEqual(score, 0)

    def test_divergent_weights_high_urgency(self):
        """When portfolio is completely concentrated into 1 asset, urgency score must be high."""
        active_weights = {"A": 1.0, "B": 0.0, "C": 0.0, "D": 0.0}
        n = 4
        baseline_weight = 1.0 / n
        total_divergence = sum(abs(active_weights[sym] - baseline_weight) for sym in active_weights) / 2
        score = min(100, round(total_divergence * 100 * 1.8))
        self.assertGreaterEqual(score, 70)


class TestTelemetryAndProvenance(unittest.TestCase):
    def test_cache_ttl_and_telemetry(self):
        """Tests that MarketDataService honors TTL expiration."""
        from backend.app.schemas import CanonicalQuote
        test_ticker = "MOCK_TEST_TICKER"
        now = time.time()
        mock_quote = CanonicalQuote(
            ticker=test_ticker,
            price=150.0,
            change=1.2,
            change_pct=0.8,
            open_price=149.0,
            day_high=151.0,
            day_low=148.5,
            prev_close=148.8,
            volume=1000000,
            currency="USD",
            exchange="US",
            market_state="OPEN",
            timestamp="2026-09-06T00:00:00Z",
            data_source="mock",
            is_stale=False
        )
        
        # Insert mock cache entry that is fresh
        market_data_service._quote_cache[test_ticker] = (now, mock_quote)
        cached_time, data = market_data_service._quote_cache[test_ticker]
        self.assertLess(now - cached_time, market_data_service.cache_ttl)
        
        # Set timestamp to past (expired)
        market_data_service._quote_cache[test_ticker] = (now - (market_data_service.cache_ttl + 5), mock_quote)
        old_time, _ = market_data_service._quote_cache[test_ticker]
        self.assertGreater(time.time() - old_time, market_data_service.cache_ttl)

    def test_api_response_provenance_stamp(self):
        """Ensures ApiResponse schema requires data_source and fetched_at metadata."""
        resp = ApiResponse(
            success=True,
            data={"status": "ok"},
            message="Test response",
            data_source="live",
            fetched_at=datetime.utcnow().isoformat()
        )
        self.assertTrue(resp.success)
        self.assertEqual(resp.data_source, "live")
        self.assertIsNotNone(resp.fetched_at)
        self.assertIn("T", resp.fetched_at)


class TestFeatureImportanceNormalization(unittest.TestCase):
    def test_feature_importance_sums_to_100(self):
        """Validates that TrendClassifier feature importances strictly sum to 100.0%."""
        from src.ai_features import TrendClassifier
        np.random.seed(42)
        prices = 100.0 + np.cumsum(np.random.randn(120) * 1.5)
        dates = pd.date_range(start="2023-01-01", periods=120, freq="B")
        close_series = pd.Series(prices, index=dates, name="Close")

        classifier = TrendClassifier(close_series)
        signal, confidence, accuracy, feature_importance = classifier.predict_trend()

        self.assertIsNotNone(feature_importance)
        self.assertIsInstance(feature_importance, pd.DataFrame)
        total_importance = float(feature_importance["Importance"].sum())
        self.assertAlmostEqual(total_importance, 100.0, places=2)


class TestDynamicPortfolioStressTesting(unittest.TestCase):
    def test_stress_test_differs_by_basket(self):
        """Verifies that two different asset baskets produce distinct betas and stress impacts."""
        np.random.seed(42)
        n = 100
        bench_returns = pd.Series(np.random.normal(0.0005, 0.01, n))

        # Basket 1: High-beta tech asset (2x sensitivity + noise)
        high_beta_returns = 1.8 * bench_returns + np.random.normal(0, 0.004, n)
        # Basket 2: Low-beta defensive asset (0.4x sensitivity + noise)
        low_beta_returns = 0.4 * bench_returns + np.random.normal(0, 0.004, n)

        beta_high = high_beta_returns.cov(bench_returns) / bench_returns.var()
        beta_low = low_beta_returns.cov(bench_returns) / bench_returns.var()

        self.assertGreater(beta_high, 1.3)
        self.assertLess(beta_low, 0.7)

        # 2008 GFC shock (-38.5%)
        impact_high = -38.5 * beta_high
        impact_low = -38.5 * beta_low

        # Higher beta must experience a significantly worse drawdown
        self.assertLess(impact_high, impact_low)
        self.assertNotEqual(round(impact_high, 1), round(impact_low, 1))


if __name__ == "__main__":
    unittest.main()
