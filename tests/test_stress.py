"""
FinSight AI — Scenario Stress Testing & Historical Replay Test Suite (STRESS-01)
Validates:
1. Asset-level beta and factor sensitivities (interest rate, VIX, commodity)
2. Interactive multi-factor macro stress simulation math and bounds
3. Historical crisis replay evaluation (2008 GFC, 2020 COVID, 2022 Rate Shock, etc.)
4. REST API contract for POST /api/portfolio/stress-test
"""

import pytest
import numpy as np
import pandas as pd
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from src.stress_testing import MultiFactorStressEngine, HISTORICAL_CRISIS_SCENARIOS, StressTesting


@pytest.fixture
def sample_returns_df():
    """Generates synthetic multi-asset return series with realistic covariance."""
    np.random.seed(42)
    n_days = 252
    dates = pd.date_range("2023-01-01", periods=n_days, freq="B")
    
    # Market factor
    market = np.random.normal(0.0005, 0.01, n_days)
    
    # Asset 1 (High Beta Tech): Beta ~ 1.5
    r_tech = 1.5 * market + np.random.normal(0.0, 0.012, n_days)
    # Asset 2 (Defensive Utility): Beta ~ 0.6
    r_def = 0.6 * market + np.random.normal(0.0, 0.006, n_days)
    # Asset 3 (Financial): Beta ~ 1.1
    r_fin = 1.1 * market + np.random.normal(0.0, 0.009, n_days)

    return pd.DataFrame({
        "TECH": r_tech,
        "DEF": r_def,
        "FIN": r_fin
    }, index=dates)


def test_asset_sensitivities_calculation(sample_returns_df):
    """Verifies beta, volatility, and factor sensitivities are computed correctly."""
    sens = MultiFactorStressEngine.compute_asset_sensitivities(sample_returns_df)

    assert "TECH" in sens
    assert "DEF" in sens
    assert "FIN" in sens

    # TECH should have higher beta and volatility than DEF
    assert sens["TECH"]["beta"] > sens["DEF"]["beta"]
    assert sens["TECH"]["volatility_annualized"] > sens["DEF"]["volatility_annualized"]
    # Rate sensitivity should be negative (interest rate hike is a headwind for equities)
    assert sens["TECH"]["rate_sensitivity"] < 0
    assert sens["DEF"]["rate_sensitivity"] < 0
    # VIX sensitivity should be negative
    assert sens["TECH"]["vix_sensitivity"] < 0


def test_macro_slider_simulation_math(sample_returns_df):
    """Verifies that macro shocks produce consistent portfolio and asset-level losses."""
    weights = {"TECH": 40.0, "DEF": 30.0, "FIN": 30.0}
    initial_cap = 100000.0

    res = MultiFactorStressEngine.simulate_macro_shock(
        returns_df=sample_returns_df,
        weights_dict=weights,
        market_shock_pct=-20.0,
        rate_shock_bps=150.0,
        commodity_shock_pct=10.0,
        vix_shock_pct=50.0,
        initial_capital=initial_cap
    )

    assert res["initial_capital"] == initial_cap
    assert res["market_shock_pct"] == -20.0
    assert res["rate_shock_bps"] == 150.0
    # Portfolio must suffer a drawdown
    assert res["portfolio_impact_pct"] < 0.0
    assert res["dollar_drawdown"] < 0.0
    assert res["post_shock_capital"] < initial_cap
    assert res["post_shock_capital"] == pytest.approx(initial_cap + res["dollar_drawdown"], abs=1.0)

    # Asset breakdown check
    assert len(res["asset_breakdown"]) == 3
    for asset in res["asset_breakdown"]:
        assert asset["ticker"] in weights
        assert asset["pre_shock_value"] > 0
        assert asset["post_shock_value"] > 0
        assert asset["dollar_loss"] < 0

    # TECH with higher beta must drop more than DEF
    tech_asset = next(a for a in res["asset_breakdown"] if a["ticker"] == "TECH")
    def_asset = next(a for a in res["asset_breakdown"] if a["ticker"] == "DEF")
    assert tech_asset["asset_shock_pct"] < def_asset["asset_shock_pct"]


def test_historical_crisis_replays(sample_returns_df):
    """Verifies that all curated historical crisis scenarios evaluate successfully."""
    weights = {"TECH": 50.0, "DEF": 50.0}
    replays = MultiFactorStressEngine.run_crisis_replays(
        returns_df=sample_returns_df,
        weights_dict=weights,
        initial_capital=100000.0
    )

    assert len(replays) == len(HISTORICAL_CRISIS_SCENARIOS)
    crisis_ids = [c["crisis_id"] for c in replays]
    assert "gfc_2008" in crisis_ids
    assert "covid_2020" in crisis_ids
    assert "rate_shock_2022" in crisis_ids
    assert "dotcom_2000" in crisis_ids
    assert "black_monday_1987" in crisis_ids

    for c in replays:
        assert c["portfolio_impact_pct"] < 0.0
        assert c["post_shock_capital"] < 100000.0
        assert len(c["asset_breakdown"]) == 2


def test_legacy_stress_testing_compatibility(sample_returns_df):
    """Verifies backward-compatibility of the StressTesting class."""
    st = StressTesting(sample_returns_df)
    summary = st.get_stress_test_summary()

    assert "tail_risk_metrics" in summary
    assert "stress_scenarios" in summary
    assert "worst_5_days" in summary
    assert "drawdown_duration" in summary


@pytest.mark.asyncio
async def test_api_stress_test_endpoint(monkeypatch, sample_returns_df):
    """Tests the REST API endpoint POST /api/portfolio/stress-test."""
    # Mock DataFetcher to return deterministic returns
    price_df = (1 + sample_returns_df).cumprod() * 100.0

    class MockDataFetcher:
        def __init__(self, tickers=None, start_date=None, end_date=None):
            self.tickers = tickers or []

        def fetch_stock_data(self, save_to_csv=False):
            return price_df[self.tickers]

    monkeypatch.setattr("backend.app.routes.portfolio.DataFetcher", MockDataFetcher)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Valid stress test request
        payload = {
            "tickers": ["TECH", "DEF"],
            "weights": {"TECH": 60.0, "DEF": 40.0},
            "initial_capital": 50000.0,
            "market_shock_pct": -25.0,
            "rate_shock_bps": 200.0,
            "commodity_shock_pct": 15.0,
            "vix_shock_pct": 80.0
        }
        res = await ac.post("/api/portfolio/stress-test", json=payload)
        assert res.status_code == 200
        json_data = res.json()
        assert json_data["success"] is True
        data = json_data["data"]

        assert "custom_simulation" in data
        assert "crisis_replays" in data
        assert "asset_sensitivities" in data
        assert data["custom_simulation"]["initial_capital"] == 50000.0
        assert data["custom_simulation"]["portfolio_impact_pct"] < 0.0

        # 2. Validation error: empty tickers
        bad_res = await ac.post("/api/portfolio/stress-test", json={"tickers": []})
        assert bad_res.status_code == 422
