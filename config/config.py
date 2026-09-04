"""
Configuration settings for Stock Portfolio Analysis
"""
from datetime import datetime, timedelta

# Selected NIFTY 50 stocks across different sectors for diversification
STOCK_TICKERS = [
    "RELIANCE.NS",    # Energy
    "TCS.NS",         # IT Services
    "HDFCBANK.NS",    # Banking
    "INFY.NS",        # IT Services
    "HINDUNILVR.NS",  # FMCG
    "ICICIBANK.NS",   # Banking
    "BHARTIARTL.NS",  # Telecom
    "ITC.NS",         # FMCG
    "KOTAKBANK.NS",   # Banking
    "LT.NS",          # Infrastructure
]

# Stock sector mapping
STOCK_SECTORS = {
    "RELIANCE.NS": "Energy",
    "TCS.NS": "IT Services",
    "HDFCBANK.NS": "Banking",
    "INFY.NS": "IT Services",
    "HINDUNILVR.NS": "FMCG",
    "ICICIBANK.NS": "Banking",
    "BHARTIARTL.NS": "Telecom",
    "ITC.NS": "FMCG",
    "KOTAKBANK.NS": "Banking",
    "LT.NS": "Infrastructure",
}

# Date range for historical data (3 years)
END_DATE = datetime.now()
START_DATE = END_DATE - timedelta(days=3*365)

# Convert to string format for yfinance
START_DATE_STR = START_DATE.strftime("%Y-%m-%d")
END_DATE_STR = END_DATE.strftime("%Y-%m-%d")

# Benchmark index defaults
BENCHMARK_TICKER = "^GSPC"  # Default global institutional benchmark (S&P 500)
BENCHMARK_NIFTY = "^NSEI"   # Indian equity benchmark (NIFTY 50)
BENCHMARK_SP500 = "^GSPC"   # US equity benchmark (S&P 500)

def detect_benchmark_ticker(tickers):
    """
    Dynamically select appropriate benchmark index based on asset universe.
    """
    if not tickers:
        return BENCHMARK_SP500
    has_indian = any(t.endswith(".NS") or t.endswith(".BO") for t in tickers)
    return BENCHMARK_NIFTY if has_indian else BENCHMARK_SP500

def get_risk_free_rate(benchmark_ticker="^GSPC"):
    """
    Return institutional annual risk-free rate based on market domicile.
    """
    if benchmark_ticker == BENCHMARK_NIFTY:
        return 0.070  # India 10Y G-Sec yield ~ 7.0%
    return 0.043     # US 10Y Treasury yield ~ 4.3%

# Risk-free rate default
RISK_FREE_RATE = 0.043

# Trading days per year
TRADING_DAYS = 252

# Initial portfolio weights (equal weighted)
INITIAL_WEIGHTS = [1/len(STOCK_TICKERS)] * len(STOCK_TICKERS)

# Confidence levels for VaR
VAR_CONFIDENCE_LEVELS = [0.95, 0.99]

# Stress test scenarios (historical market crashes)
STRESS_SCENARIOS = {
    "COVID Crash 2020": -0.38,
    "2008 Financial Crisis": -0.52,
    "Dot-com Bubble 2000": -0.45,
    "Moderate Correction": -0.15,
    "Severe Recession": -0.30,
}

# Output directories
DATA_DIR = "data"
REPORTS_DIR = "reports"
