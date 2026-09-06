"""
Unit and Integration Tests for Portfolio Optimizer Institutional Intelligence (PORT-01).
Tests Parametric VaR, Historical VaR, CVaR (Expected Shortfall), Equal Risk Parity
attribution, and Rebalance Order generation.
"""
import pytest
import numpy as np
import pandas as pd
from httpx import AsyncClient, ASGITransport

from src.portfolio_optimizer import PortfolioOptimizer
from backend.app.main import app


def generate_test_returns():
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


def test_var_and_cvar_ordering():
    """Validates mathematical invariants of Parametric & Historical VaR and CVaR."""
    returns = generate_test_returns()
    optimizer = PortfolioOptimizer(returns, risk_free_rate=0.05)
    weights = {"RELIANCE": 0.4, "TCS": 0.35, "INFY": 0.25}

    metrics = optimizer.calculate_var_cvar(weights, initial_capital=100000.0)

    # Invariant 1: 99% VaR must be greater than 95% VaR
    p_var = metrics["parametric_var"]
    assert p_var["var_99_1d_pct"] > p_var["var_95_1d_pct"], "99% VaR must exceed 95% VaR"
    assert p_var["var_95_10d_pct"] > p_var["var_95_1d_pct"], "10-day VaR must exceed 1-day VaR"
    assert p_var["var_99_10d_pct"] > p_var["var_99_1d_pct"], "10-day 99% VaR must exceed 1-day 99% VaR"

    # Invariant 2: CVaR (Expected Shortfall) must be >= VaR
    cvar = metrics["cvar_expected_shortfall"]
    h_var = metrics["historical_var"]
    assert cvar["cvar_95_1d_pct"] >= h_var["var_95_1d_pct"], "95% CVaR must be >= 95% Historical VaR"
    assert cvar["cvar_99_1d_pct"] >= h_var["var_99_1d_pct"], "99% CVaR must be >= 99% Historical VaR"

    # Invariant 3: Dollar values must match percentage of capital
    assert abs(p_var["var_95_1d_usd"] - (100000.0 * p_var["var_95_1d_pct"] / 100.0)) < 1.0


def test_equal_risk_parity_attribution():
    """Validates that Risk Parity balances risk contributions across assets."""
    returns = generate_test_returns()
    optimizer = PortfolioOptimizer(returns, risk_free_rate=0.05)
    rp_result = optimizer.optimize_risk_parity()
    weights = rp_result["weights"]

    rc = optimizer.calculate_risk_contributions(weights)
    prc = rc["percentage_risk_contributions"]

    # Sum of percentage risk contributions must equal 100%
    assert abs(sum(prc.values()) - 100.0) < 0.5

    # Each asset in risk parity should contribute approximately 1/3 of total risk (within 6%)
    target_prc = 100.0 / 3.0
    for asset, pct in prc.items():
        assert abs(pct - target_prc) < 6.0, f"Asset {asset} risk contribution {pct}% deviates from {target_prc}%"


def test_rebalance_order_generation():
    """Validates that rebalance orders accurately calculate share deltas and turnover."""
    returns = generate_test_returns()
    optimizer = PortfolioOptimizer(returns, risk_free_rate=0.05)

    current_weights = {"RELIANCE": 80.0, "TCS": 10.0, "INFY": 10.0}
    target_weights = {"RELIANCE": 33.33, "TCS": 33.33, "INFY": 33.34}
    prices = {"RELIANCE": 2500.0, "TCS": 3500.0, "INFY": 1500.0}

    rebalance = optimizer.generate_rebalance_orders(
        current_weights=current_weights,
        target_weights=target_weights,
        total_capital=100000.0,
        current_prices=prices
    )

    orders = {o["ticker"]: o for o in rebalance["orders"]}
    assert orders["RELIANCE"]["action"] == "SELL", "RELIANCE should be SOLD down from 80% to 33%"
    assert orders["TCS"]["action"] == "BUY", "TCS should be BOUGHT up from 10% to 33%"
    assert orders["INFY"]["action"] == "BUY", "INFY should be BOUGHT up from 10% to 33%"

    # Turnover must be positive and friction must be calculated (7 bps)
    assert rebalance["turnover_usd"] > 0
    assert rebalance["estimated_friction_usd"] > 0
    assert rebalance["estimated_friction_usd"] == pytest.approx((orders["TCS"]["delta_value"] + orders["INFY"]["delta_value"] + abs(orders["RELIANCE"]["delta_value"])) * 0.0007, rel=1e-2)


@pytest.mark.asyncio
async def test_portfolio_optimize_api_contract():
    """Integration test verifying that /api/portfolio/optimize returns the complete PORT-01 payload."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "tickers": ["AAPL", "MSFT", "GOOGL"],
            "start_date": "2023-01-01",
            "end_date": "2024-01-01",
            "initial_capital": 50000.0
        }
        res = await client.post("/api/portfolio/optimize", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True

        d = data["data"]
        assert "max_sharpe" in d
        assert "var_metrics" in d["max_sharpe"]
        assert "risk_contributions" in d["max_sharpe"]

        assert "min_volatility" in d
        assert "var_metrics" in d["min_volatility"]

        assert "risk_parity" in d
        assert "var_metrics" in d["risk_parity"]
        assert "risk_contributions" in d["risk_parity"]

        assert "rebalance_plans" in d
        assert "max_sharpe" in d["rebalance_plans"]
        assert len(d["rebalance_plans"]["max_sharpe"]["orders"]) == len(d["valid_tickers"])
