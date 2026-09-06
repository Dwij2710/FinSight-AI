"""
Unit & Integration Tests for Fully Dynamic Ticker Architecture
Validates:
1. Universal Ticker Search (by symbol, company name, NSE stocks)
2. Ticker Validation Endpoint
3. Required Ticker Schema Rejections (no silent AAPL defaults)
4. Cache Isolation between Tickers
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.cache import CacheService

client = TestClient(app)

def test_ticker_search_by_symbol():
    """Verify searching for symbol returns relevant match with full metadata."""
    response = client.get("/api/ticker/search?q=TSLA")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    results = data["data"]["results"]
    assert len(results) > 0
    symbols = [r["symbol"] for r in results]
    assert "TSLA" in symbols
    tsla = next(r for r in results if r["symbol"] == "TSLA")
    assert "Tesla" in tsla["name"]
    assert tsla["exchange"] == "NASDAQ"
    assert tsla["asset_type"] == "Equity"

def test_ticker_search_by_company_name():
    """Verify searching by company name resolves to canonical symbol."""
    response = client.get("/api/ticker/search?q=Microsoft")
    assert response.status_code == 200
    data = response.json()
    results = data["data"]["results"]
    symbols = [r["symbol"] for r in results]
    assert "MSFT" in symbols

def test_ticker_search_indian_market():
    """Verify Indian NSE tickers (.NS) are properly indexed and returned."""
    response = client.get("/api/ticker/search?q=Reliance")
    assert response.status_code == 200
    data = response.json()
    results = data["data"]["results"]
    symbols = [r["symbol"] for r in results]
    assert any("RELIANCE" in s for s in symbols)

def test_ticker_search_empty_query():
    """Empty or blank query returns zero results gracefully without error."""
    response = client.get("/api/ticker/search?q=   ")
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["total"] == 0
    assert data["data"]["results"] == []

def test_ticker_validate_valid_and_invalid():
    """Verify ticker validation distinguishes real securities from non-existent ones."""
    # Real security
    res_valid = client.get("/api/ticker/validate/AAPL")
    assert res_valid.status_code == 200
    valid_data = res_valid.json()
    assert valid_data["success"] is True
    assert valid_data["data"]["is_valid"] is True
    assert valid_data["data"]["symbol"] == "AAPL"

    # Fake / invalid security
    res_invalid = client.get("/api/ticker/validate/XYZNONEXISTENT999")
    assert res_invalid.status_code == 200
    invalid_data = res_invalid.json()
    assert invalid_data["success"] is False
    assert invalid_data["data"]["is_valid"] is False

def test_schema_rejection_without_ticker():
    """Verify endpoints reject requests with missing ticker (no silent AAPL fallback)."""
    # RL simulate without ticker
    rl_res = client.post("/api/rl/simulate", json={
        "initial_balance": 10000,
        "algo_type": "PPO"
    })
    assert rl_res.status_code == 422  # Unprocessable Entity (Missing required field: ticker)

    # TFT analyze without ticker
    tft_res = client.post("/api/multifactor/analyze", json={})
    assert tft_res.status_code == 422

def test_cache_isolation_between_tickers():
    """Verify cache keys strictly isolate AAPL data from TSLA data."""
    cache = CacheService.get_instance()
    
    # Store mocked items with composite keys
    key_aapl = "finsight:forecast:AAPL:Close:2023-01-01:2024-01-01:2_1_2:14:True"
    key_tsla = "finsight:forecast:TSLA:Close:2023-01-01:2024-01-01:2_1_2:14:True"
    
    cache.set_sync(key_aapl, {"ticker": "AAPL", "predicted_mean": 220.0}, ttl_seconds=60)
    cache.set_sync(key_tsla, {"ticker": "TSLA", "predicted_mean": 250.0}, ttl_seconds=60)

    val_aapl = cache.get_sync(key_aapl)
    val_tsla = cache.get_sync(key_tsla)

    assert val_aapl["ticker"] == "AAPL"
    assert val_tsla["ticker"] == "TSLA"
    assert val_aapl["predicted_mean"] != val_tsla["predicted_mean"]

def test_cache_isolation_between_horizons_and_parameters():
    """Verify cache keys never confuse different horizons (e.g. 30 vs 90 days) for same ticker."""
    cache = CacheService.get_instance()

    key_30d = "finsight:forecast:TSLA:Close:2023-01-01:2024-01-01:2_1_2:30:True"
    key_90d = "finsight:forecast:TSLA:Close:2023-01-01:2024-01-01:2_1_2:90:True"

    cache.set_sync(key_30d, {"ticker": "TSLA", "horizon": 30, "forecast_steps": 30}, ttl_seconds=60)
    cache.set_sync(key_90d, {"ticker": "TSLA", "horizon": 90, "forecast_steps": 90}, ttl_seconds=60)

    res_30 = cache.get_sync(key_30d)
    res_90 = cache.get_sync(key_90d)

    assert res_30 is not None
    assert res_90 is not None
    assert res_30["horizon"] == 30
    assert res_90["horizon"] == 90
    assert res_30["forecast_steps"] != res_90["forecast_steps"]

def test_ticker_normalization_and_multi_markets():
    """Verify validation normalizes lowercase symbols and handles US & NSE exchange suffixes."""
    markets = [
        ("aapl", "AAPL"),
        ("tsla", "TSLA"),
        ("nvda", "NVDA"),
        ("msft", "MSFT"),
        ("googl", "GOOGL"),
        ("reliance.ns", "RELIANCE.NS"),
        ("tcs.ns", "TCS.NS")
    ]

    for input_sym, expected_norm in markets:
        res = client.get(f"/api/ticker/validate/{input_sym}")
        assert res.status_code == 200
        data = res.json()
        assert data["data"]["symbol"] == expected_norm
        assert data["data"]["is_valid"] is True

