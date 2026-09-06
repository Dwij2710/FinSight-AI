import pytest
import numpy as np
import pandas as pd
from unittest.mock import patch, MagicMock
from backend.app.routes.model_comparison import (
    compare_models,
    _calculate_directional_accuracy,
    _calculate_max_drawdown,
    _calculate_sharpe
)

def test_quant_metric_functions():
    """Validates math helpers for directional accuracy, max drawdown, and Sharpe."""
    actual = np.array([0.02, -0.01, 0.03, -0.02])
    pred = np.array([0.01, -0.03, -0.01, -0.01])
    # Matches: (+,+), (-,-), (+,-), (-,-) -> 3 out of 4 = 75%
    acc = _calculate_directional_accuracy(actual, pred)
    assert acc == 75.0

    # Max Drawdown
    prices = np.array([100.0, 120.0, 90.0, 110.0])
    # Peak is 120, trough is 90 -> (90-120)/120 = -30/120 = -25%
    mdd = _calculate_max_drawdown(prices)
    assert mdd == 25.0

    # Sharpe ratio
    daily_rets = np.array([0.01, 0.005, -0.002, 0.008, 0.003, -0.001])
    sharpe = _calculate_sharpe(daily_rets, risk_free_annual=0.04)
    assert isinstance(sharpe, float)

@pytest.fixture
def mock_extended_price_df():
    """Generates 200 trading days of realistic prices."""
    dates = pd.date_range(end=pd.Timestamp.now(), periods=200, freq='B')
    base = 100.0
    drift = np.linspace(0, 20, 200)
    noise = np.sin(np.linspace(0, 10, 200)) * 5.0
    prices = base + drift + noise
    df = pd.DataFrame({
        'Open': prices - 0.5,
        'High': prices + 1.5,
        'Low': prices - 1.5,
        'Close': prices,
        'Volume': np.random.randint(1000000, 5000000, 200)
    }, index=dates)
    return df

@pytest.mark.asyncio
async def test_model_comparison_full_run(mock_extended_price_df):
    """Verifies that compare_models computes side-by-side empirical performance across all 3 models."""
    with patch('yfinance.Ticker') as mock_ticker:
        ticker_instance = MagicMock()
        ticker_instance.history.return_value = mock_extended_price_df
        mock_ticker.return_value = ticker_instance

        res = await compare_models(ticker="TEST_TICKER", horizon=30, test_days=50)

        assert res.success is True
        data = res.data
        assert data["ticker"] == "TEST_TICKER"
        assert "current_price" in data
        assert data["evaluation_window"]["test_days"] == 50
        assert data["evaluation_window"]["forecast_horizon_days"] == 30

        # Verify all three models evaluated
        models = data["models"]
        assert "sarimax" in models
        assert "quantile_ml" in models
        assert "rl_agent" in models

        # SARIMAX Checks
        sarima = models["sarimax"]
        assert sarima["direction"] in ["BULLISH", "BEARISH", "NEUTRAL"]
        assert sarima["metrics"]["rmse"] >= 0.0
        assert sarima["metrics"]["mae"] >= 0.0
        assert 0.0 <= sarima["metrics"]["directional_accuracy_pct"] <= 100.0
        assert "ci_80_lower" in sarima["confidence_bands"]
        assert "ci_95_lower" in sarima["confidence_bands"]

        # Quantile ML Checks
        qml = models["quantile_ml"]
        assert qml["direction"] in ["BULLISH", "BEARISH", "NEUTRAL"]
        assert qml["metrics"]["rmse"] >= 0.0
        assert 0.0 <= qml["metrics"]["directional_accuracy_pct"] <= 100.0
        assert "q10_lower" in qml["confidence_bands"]
        assert "q50_median" in qml["confidence_bands"]
        assert "q90_upper" in qml["confidence_bands"]

        # RL Agent Checks (Transaction fee accounting)
        rl = models["rl_agent"]
        assert rl["current_action"] in ["BUY", "HOLD / DEFENSIVE"]
        assert rl["metrics"]["commission_drag_bps"] == 5
        assert rl["metrics"]["slippage_drag_bps"] == 2
        assert isinstance(rl["metrics"]["sharpe_ratio"], float)
        assert 0.0 <= rl["metrics"]["max_drawdown_pct"] <= 100.0

        # Consensus & Leaderboard Checks
        assert "consensus" in data
        assert data["consensus"]["outlook"] in ["BULLISH", "BEARISH", "NEUTRAL / MIXED"]
        assert len(data["consensus"]["synthesis"]) > 20

        winners = data["category_winners"]
        assert "directional_accuracy" in winners
        assert "risk_adjusted_performance" in winners
        assert "capital_preservation" in winners
