import pytest
import numpy as np
import pandas as pd
from unittest.mock import patch, MagicMock
from src.score_engine import FinSightScoreEngine, score_engine
from backend.app.routes.score import get_finsight_score

@pytest.fixture
def mock_stock_df():
    """Generates 100 days of synthetic trading history."""
    dates = pd.date_range(end=pd.Timestamp.now(), periods=100, freq='B')
    prices = 150.0 + np.cumsum(np.random.normal(0.5, 2.0, 100))
    df = pd.DataFrame({
        'Open': prices - 1.0,
        'High': prices + 2.0,
        'Low': prices - 2.0,
        'Close': prices,
        'Volume': np.random.randint(1000000, 5000000, 100)
    }, index=dates)
    return df

@pytest.fixture
def mock_info_full():
    return {
        'trailingPE': 22.5,
        'forwardPE': 19.8,
        'returnOnEquity': 0.28,
        'operatingMargins': 0.24,
        'debtToEquity': 45.0,
        'beta': 1.05
    }

def test_score_engine_computation_bounds(mock_stock_df, mock_info_full):
    """Verifies that overall score and all subscores fall strictly within [0, 100]."""
    engine = FinSightScoreEngine()

    with patch('yfinance.Ticker') as mock_ticker:
        ticker_instance = MagicMock()
        ticker_instance.history.return_value = mock_stock_df
        ticker_instance.info = mock_info_full
        ticker_instance.news = [
            {'title': 'Company announces record quarterly revenue and earnings beat'},
            {'title': 'Institutional upgrades boost target valuation'}
        ]
        mock_ticker.return_value = ticker_instance

        res = engine.compute_score("TEST")

        assert "overall_score" in res
        assert 0.0 <= res["overall_score"] <= 100.0
        assert res["ticker"] == "TEST"

        # Check subscores
        subscores = res["subscores"]
        for dim in ["technical", "momentum", "sentiment", "risk"]:
            assert dim in subscores
            assert subscores[dim] is not None
            assert 0.0 <= subscores[dim] <= 100.0

        if subscores["fundamental"] is not None:
            assert 0.0 <= subscores["fundamental"] <= 100.0

        # Check factor attributions
        assert len(res["top_positive_contributors"]) <= 3
        assert len(res["top_negative_detractors"]) <= 3
        for item in res["top_positive_contributors"]:
            assert "factor" in item and "dimension" in item and "impact" in item
            assert item["impact"] >= 0.0

        for item in res["top_negative_detractors"]:
            assert "factor" in item and "dimension" in item and "impact" in item
            assert item["impact"] >= 0.0

        # Check weights sum to 1.0
        weights_sum = sum(res["weights_used"].values())
        assert abs(weights_sum - 1.0) < 1e-4

def test_score_engine_missing_fundamentals(mock_stock_df):
    """Verifies that when fundamental data is unavailable, weights dynamically renormalize to 1.0."""
    engine = FinSightScoreEngine()

    with patch('yfinance.Ticker') as mock_ticker:
        ticker_instance = MagicMock()
        ticker_instance.history.return_value = mock_stock_df
        ticker_instance.info = {}  # Empty fundamentals
        ticker_instance.news = []
        mock_ticker.return_value = ticker_instance

        res = engine.compute_score("ETF_OR_CRYPTO")

        assert res["subscores"]["fundamental"] is None
        assert "fundamental" not in res["weights_used"]
        weights_sum = sum(res["weights_used"].values())
        assert abs(weights_sum - 1.0) < 1e-4
        assert 0.0 <= res["overall_score"] <= 100.0

def test_score_engine_insufficient_history():
    """Verifies that attempting to score an asset with < 15 trading days raises ValueError."""
    engine = FinSightScoreEngine()

    with patch('yfinance.Ticker') as mock_ticker:
        ticker_instance = MagicMock()
        ticker_instance.history.return_value = pd.DataFrame({'Close': [100.0] * 5})
        mock_ticker.return_value = ticker_instance

        with pytest.raises(ValueError, match="Insufficient trading history"):
            engine.compute_score("NEWIPO")

@pytest.mark.asyncio
async def test_score_endpoint():
    """Verifies the FastAPI score route returns standard ApiResponse with 0-100 rating."""
    mock_score_data = {
        "ticker": "AAPL",
        "overall_score": 78.5,
        "rating": "Buy",
        "rating_code": "BUY",
        "rating_color": "#00F2FE",
        "latest_price": 182.50,
        "as_of_date": "2026-09-06",
        "weights_used": {"technical": 0.25, "momentum": 0.2, "fundamental": 0.25, "sentiment": 0.15, "risk": 0.15},
        "subscores": {"technical": 82.0, "momentum": 75.0, "fundamental": 85.0, "sentiment": 70.0, "risk": 80.0},
        "top_positive_contributors": [{"dimension": "Technical", "factor": "Price above 50-day SMA", "impact": 12.0}],
        "top_negative_detractors": [],
        "synthesis": "AAPL scores 78.5/100 (Buy)..."
    }

    with patch.object(score_engine, 'compute_score', return_value=mock_score_data):
        res = await get_finsight_score("AAPL")
        assert res.success is True
        assert res.data["ticker"] == "AAPL"
        assert res.data["overall_score"] == 78.5
        assert res.data["rating"] == "Buy"
