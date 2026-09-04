from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# ==================== FORECAST SCHEMAS ====================
class ForecastRequest(BaseModel):
    ticker: str = Field(..., description="Stock ticker symbol (e.g., AAPL, RELIANCE.NS)")
    start_date: Optional[str] = Field("2023-01-01", description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD), defaults to today")
    column: Optional[str] = Field("Close", description="Column to forecast")
    p: Optional[int] = Field(2, ge=0, le=5)
    d: Optional[int] = Field(1, ge=0, le=5)
    q: Optional[int] = Field(2, ge=0, le=5)
    sp: Optional[int] = Field(1, ge=0, le=5)
    sd: Optional[int] = Field(1, ge=0, le=5)
    sq: Optional[int] = Field(1, ge=0, le=5)
    seasonal_period: Optional[int] = Field(12, ge=0, le=52)
    forecast_period: Optional[int] = Field(14, ge=1, le=365)
    run_backtest: Optional[bool] = Field(True)

# ==================== PORTFOLIO SCHEMAS ====================
class PortfolioRequest(BaseModel):
    tickers: List[str] = Field(..., min_length=2, description="List of at least 2 tickers")
    start_date: Optional[str] = Field("2021-01-01")
    end_date: Optional[str] = Field("2024-01-01")

# ==================== AI INSIGHTS SCHEMAS ====================
class SentimentRequest(BaseModel):
    ticker: str = Field(..., description="Stock ticker symbol")

class SignalRequest(BaseModel):
    ticker: str = Field(..., description="Stock ticker symbol")

# ==================== RL AGENT SCHEMAS ====================
class RlSimulateRequest(BaseModel):
    ticker: str = Field("AAPL")
    start_date: Optional[str] = Field("2022-01-01")
    end_date: Optional[str] = Field(None)
    initial_balance: Optional[float] = Field(10000.0, ge=100)
    algo_type: Optional[str] = Field("PPO", description="PPO, A2C, or DQN")
    action_type: Optional[str] = Field("Continuous", description="Continuous or Discrete")
    risk_profile: Optional[str] = Field("Aggressive", description="Aggressive or Conservative")
    timesteps: Optional[int] = Field(10000, ge=1000, le=50000)

# ==================== TFT SCHEMAS ====================
class TftRequest(BaseModel):
    ticker: str = Field("AAPL")
    stress_scenarios: Optional[Dict[str, float]] = Field(default=None)

# ==================== GENERIC RESPONSE SCHEMA ====================
class ApiResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    data: Optional[Any] = None
