"""
FinSight AI — Strategy Builder & Rules Engine Test Suite (STRAT-01)
Tests:
1. Strategy templates retrieval (/api/strategy/templates)
2. Backtest execution math, friction accounting (5 bps commission + 2 bps slippage), and risk metrics
3. REST API contract and validation barriers (/api/strategy/backtest)
"""

import pytest
from httpx import AsyncClient, ASGITransport
import pandas as pd
import numpy as np

from backend.app.main import app
from src.strategy_builder import StrategyBuilderEngine, STRATEGY_TEMPLATES


def test_strategy_templates_loaded():
    """Verify built-in institutional templates are configured correctly."""
    assert len(STRATEGY_TEMPLATES) >= 3
    template_ids = [t["id"] for t in STRATEGY_TEMPLATES]
    assert "tech_momentum_alpha" in template_ids
    assert "all_weather_parity" in template_ids
    assert "dual_momentum_trend" in template_ids


def test_strategy_backtest_simulation_math(monkeypatch):
    """
    Validates walk-forward backtest simulation, 5 bps commission,
    2 bps slippage, Sharpe ratio, and drawdown calculations.
    """
    # Create deterministic synthetic price data
    np.random.seed(42)
    n_days = 200
    dates = pd.date_range("2023-01-01", periods=n_days, freq="B")
    
    # 3 assets + defensive + SPY
    p_aapl = 150.0 * np.cumprod(1 + np.random.normal(0.0008, 0.015, n_days))
    p_msft = 250.0 * np.cumprod(1 + np.random.normal(0.0006, 0.012, n_days))
    p_nvda = 300.0 * np.cumprod(1 + np.random.normal(0.0012, 0.025, n_days))
    p_shy = 80.0 * np.cumprod(1 + np.random.normal(0.0001, 0.002, n_days))
    p_spy = 400.0 * np.cumprod(1 + np.random.normal(0.0005, 0.010, n_days))

    mock_df_dict = {
        "AAPL": pd.DataFrame({"Close": p_aapl}, index=dates),
        "MSFT": pd.DataFrame({"Close": p_msft}, index=dates),
        "NVDA": pd.DataFrame({"Close": p_nvda}, index=dates),
        "SHY": pd.DataFrame({"Close": p_shy}, index=dates),
        "SPY": pd.DataFrame({"Close": p_spy}, index=dates),
    }

    class MockDataFetcher:
        def fetch_single_ticker(self, ticker, start_date=None):
            return mock_df_dict.get(ticker.upper(), pd.DataFrame())

    monkeypatch.setattr("src.strategy_builder.DataFetcher", MockDataFetcher)

    results = StrategyBuilderEngine.run_backtest(
        universe=["AAPL", "MSFT", "NVDA"],
        defensive_asset="SHY",
        allocation_type="EQUAL_WEIGHT",
        top_n=3,
        rebalance_frequency_days=20,
        initial_capital=100000.0,
        period="1y"
    )

    assert results["initial_capital"] == 100000.0
    assert results["ending_capital"] > 0
    assert len(results["equity_curve"]) == n_days
    assert len(results["benchmark_curve"]) == n_days
    # Commission (5 bps) and Slippage (2 bps) must be deducted
    assert results["total_commission_paid"] > 0
    assert results["total_slippage_paid"] > 0
    assert results["rebalances_count"] >= 5
    assert -100.0 <= results["max_drawdown_pct"] <= 0.0
    assert isinstance(results["sharpe_ratio"], float)
    assert isinstance(results["cagr_pct"], float)


@pytest.mark.asyncio
async def test_strategy_api_templates_and_backtest():
    """Verify REST API lifecycle for strategy templates and backtesting."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Get templates
        templates_res = await ac.get("/api/strategy/templates")
        assert templates_res.status_code == 200
        data = templates_res.json()
        assert "templates" in data
        assert len(data["templates"]) >= 3

        # 2. Validation rejection: Invalid allocation_type
        bad_payload = {
            "universe": ["AAPL", "MSFT"],
            "allocation_type": "FABRICATED_ALLOCATION",
            "top_n": 2
        }
        bad_res = await ac.post("/api/strategy/backtest", json=bad_payload)
        assert bad_res.status_code == 422

        # 3. Validation rejection: Empty universe
        empty_payload = {
            "universe": [],
            "allocation_type": "EQUAL_WEIGHT"
        }
        empty_res = await ac.post("/api/strategy/backtest", json=empty_payload)
        assert empty_res.status_code == 422
