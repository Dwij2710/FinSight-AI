import pytest
from unittest.mock import patch, MagicMock
from src.fundamental_engine import FundamentalAnalysisEngine, fundamental_engine
from backend.app.routes.fundamentals import get_fundamentals

@pytest.fixture
def mock_corporate_info():
    return {
        "shortName": "Apple Inc.",
        "sector": "Technology",
        "industry": "Consumer Electronics",
        "currency": "USD",
        "trailingPE": 28.5,
        "forwardPE": 25.2,
        "pegRatio": 2.1,
        "priceToSalesTrailing12Months": 7.4,
        "priceToBook": 38.2,
        "enterpriseToEbitda": 21.0,
        "marketCap": 3400000000000,
        "enterpriseValue": 3450000000000,
        "returnOnEquity": 1.45,
        "returnOnAssets": 0.22,
        "operatingMargins": 0.305,
        "profitMargins": 0.245,
        "grossMargins": 0.455,
        "totalCash": 65000000000,
        "totalDebt": 105000000000,
        "debtToEquity": 1.55,
        "currentRatio": 1.05,
        "quickRatio": 0.88,
        "freeCashflow": 108000000000,
        "revenueGrowth": 0.08,
        "earningsGrowth": 0.12,
        "dividendYield": 0.005,
        "payoutRatio": 0.15
    }

def test_fundamental_engine_complete_analysis(mock_corporate_info):
    """Verifies complete calculation of valuation, profitability, solvency, and health rating."""
    engine = FundamentalAnalysisEngine()

    with patch('yfinance.Ticker') as mock_ticker:
        ticker_instance = MagicMock()
        ticker_instance.info = mock_corporate_info
        mock_ticker.return_value = ticker_instance

        res = engine.analyze_ticker("AAPL")

        assert res["ticker"] == "AAPL"
        assert res["company_name"] == "Apple Inc."
        assert res["sector"] == "Technology"
        assert 0.0 <= res["health_score"] <= 100.0
        assert res["health_rating"] in ["Excellent", "Good", "Fair", "Weak", "Distressed"]

        # Check valuation metrics
        val = res["valuation"]
        assert val["trailing_pe"] == 28.5
        assert val["market_cap_billions"] == 3400.0
        assert val["pe_status"] in ["Undervalued", "Overvalued", "In-Line"]

        # Check profitability metrics
        prof = res["profitability"]
        assert prof["return_on_equity_pct"] == 145.0
        assert prof["operating_margin_pct"] == 30.5
        assert prof["roe_quality"] in ["High", "Moderate"]

        # Check solvency metrics
        solv = res["solvency"]
        assert solv["total_cash_billions"] == 65.0
        assert solv["debt_to_equity"] == 1.55
        assert solv["balance_sheet_strength"] in ["Fortress", "Adequate"]

        # Check growth & dividends
        growth = res["growth_and_dividends"]
        assert growth["quarterly_revenue_growth_yoy_pct"] == 8.0
        assert growth["dividend_yield_pct"] == 0.5

def test_fundamental_engine_unprofitable_growth():
    """Verifies that companies with negative P/E or zero dividends are handled cleanly."""
    engine = FundamentalAnalysisEngine()

    unprofitable_info = {
        "shortName": "Growth Biotech",
        "sector": "Healthcare",
        "currency": "USD",
        "trailingPE": None,
        "forwardPE": None,
        "returnOnEquity": -0.15,
        "operatingMargins": -0.25,
        "totalCash": 500000000,
        "totalDebt": 50000000,
        "debtToEquity": 0.1,
        "currentRatio": 3.5,
        "revenueGrowth": 0.45
    }

    with patch('yfinance.Ticker') as mock_ticker:
        ticker_instance = MagicMock()
        ticker_instance.info = unprofitable_info
        mock_ticker.return_value = ticker_instance

        res = engine.analyze_ticker("BIOT")
        assert res["valuation"]["trailing_pe"] is None
        assert res["profitability"]["return_on_equity_pct"] == -15.0
        assert res["solvency"]["balance_sheet_strength"] == "Fortress"
        assert 0.0 <= res["health_score"] <= 100.0

def test_fundamental_engine_missing_data():
    """Verifies that unlisted securities raise ValueError."""
    engine = FundamentalAnalysisEngine()

    with patch('yfinance.Ticker') as mock_ticker:
        ticker_instance = MagicMock()
        ticker_instance.info = {}
        mock_ticker.return_value = ticker_instance

        with pytest.raises(ValueError, match="Fundamental financial data unavailable"):
            engine.analyze_ticker("INVALID_OR_ETF")

@pytest.mark.asyncio
async def test_fundamentals_endpoint(mock_corporate_info):
    """Verifies the FastAPI route returns valid ApiResponse."""
    with patch.object(fundamental_engine, 'analyze_ticker') as mock_analyze:
        mock_analyze.return_value = {
            "ticker": "AAPL",
            "company_name": "Apple Inc.",
            "sector": "Technology",
            "health_score": 85.0,
            "health_rating": "Excellent",
            "health_color": "#10B981",
            "valuation": {"trailing_pe": 28.5},
            "profitability": {"operating_margin_pct": 30.5},
            "solvency": {"debt_to_equity": 1.55},
            "growth_and_dividends": {"revenue_growth_pct": 8.0},
            "synthesis": "Healthy fundamentals"
        }

        res = await get_fundamentals("AAPL")
        assert res.success is True
        assert res.data["ticker"] == "AAPL"
        assert res.data["health_score"] == 85.0
