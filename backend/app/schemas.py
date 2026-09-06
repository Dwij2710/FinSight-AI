from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import re

TICKER_REGEX = r"^[A-Za-z0-9\.\^\=\-]+$"
DATE_REGEX = r"^\d{4}-\d{2}-\d{2}$"

# ==================== FORECAST SCHEMAS ====================
class ForecastRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20, pattern=TICKER_REGEX, description="Stock ticker symbol (e.g., AAPL, RELIANCE.NS)")
    start_date: Optional[str] = Field("2023-01-01", pattern=DATE_REGEX, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, pattern=DATE_REGEX, description="End date (YYYY-MM-DD), defaults to today")
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

    @field_validator('ticker')
    @classmethod
    def sanitize_ticker(cls, v: str) -> str:
        return v.strip().upper()

# ==================== PORTFOLIO SCHEMAS ====================
class PortfolioRequest(BaseModel):
    tickers: List[str] = Field(..., min_length=2, description="List of at least 2 tickers")
    start_date: Optional[str] = Field("2021-01-01", pattern=DATE_REGEX)
    end_date: Optional[str] = Field("2024-01-01", pattern=DATE_REGEX)
    initial_capital: Optional[float] = Field(100000.0, ge=100.0, description="Total portfolio value in currency units")
    current_weights: Optional[Dict[str, float]] = Field(None, description="Current user holdings / weights mapping ticker -> weight")

    @field_validator('tickers')
    @classmethod
    def sanitize_tickers(cls, v: List[str]) -> List[str]:
        cleaned = []
        for t in v:
            sym = t.strip().upper()
            if not re.match(TICKER_REGEX, sym):
                raise ValueError(f"Invalid ticker symbol format: '{t}'")
            if sym not in cleaned:
                cleaned.append(sym)
        if len(cleaned) < 2:
            raise ValueError("Portfolio optimization requires at least 2 distinct tickers.")
        return cleaned

class StressTestRequest(BaseModel):
    tickers: List[str] = Field(..., min_length=1, max_length=20, description="List of stock tickers")
    weights: Optional[Dict[str, float]] = Field(None, description="Current portfolio asset weights")
    initial_capital: Optional[float] = Field(100000.0, ge=100.0, description="Initial portfolio capital in USD")
    market_shock_pct: Optional[float] = Field(-15.0, ge=-90.0, le=90.0, description="Custom market shock percentage")
    rate_shock_bps: Optional[float] = Field(100.0, ge=-500.0, le=1000.0, description="Interest rate shock in basis points")
    commodity_shock_pct: Optional[float] = Field(0.0, ge=-90.0, le=200.0, description="Commodity / Oil shock percentage")
    vix_shock_pct: Optional[float] = Field(50.0, ge=-50.0, le=500.0, description="VIX volatility surge percentage")
    start_date: Optional[str] = Field("2022-01-01", pattern=DATE_REGEX)

    @field_validator('tickers')
    @classmethod
    def sanitize_tickers(cls, v: List[str]) -> List[str]:
        cleaned = []
        for t in v:
            sym = t.strip().upper()
            if not re.match(TICKER_REGEX, sym):
                raise ValueError(f"Invalid ticker symbol format: '{t}'")
            if sym not in cleaned:
                cleaned.append(sym)
        if not cleaned:
            raise ValueError("Stress testing requires at least 1 valid ticker.")
        return cleaned

# ==================== AI INSIGHTS SCHEMAS ====================
class SentimentRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20, pattern=TICKER_REGEX, description="Stock ticker symbol")

    @field_validator('ticker')
    @classmethod
    def sanitize_ticker(cls, v: str) -> str:
        return v.strip().upper()

class SignalRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20, pattern=TICKER_REGEX, description="Stock ticker symbol")

    @field_validator('ticker')
    @classmethod
    def sanitize_ticker(cls, v: str) -> str:
        return v.strip().upper()

# ==================== RL AGENT SCHEMAS ====================
class RlSimulateRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20, pattern=TICKER_REGEX, description="Stock ticker symbol (required)")
    start_date: Optional[str] = Field("2022-01-01", pattern=DATE_REGEX)
    end_date: Optional[str] = Field(None, pattern=DATE_REGEX)
    initial_balance: Optional[float] = Field(10000.0, ge=100)
    algo_type: Optional[str] = Field("PPO", description="PPO, A2C, or DQN")
    action_type: Optional[str] = Field("Continuous", description="Continuous or Discrete")
    risk_profile: Optional[str] = Field("Aggressive", description="Aggressive or Conservative")
    timesteps: Optional[int] = Field(10000, ge=1000, le=50000)

    @field_validator('ticker')
    @classmethod
    def sanitize_ticker(cls, v: str) -> str:
        return v.strip().upper()

# ==================== TFT / MULTI-FACTOR REGIME SCHEMAS ====================
class TftRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20, pattern=TICKER_REGEX, description="Stock ticker symbol (required)")
    stress_scenarios: Optional[Dict[str, float]] = Field(default=None)

    @field_validator('ticker')
    @classmethod
    def sanitize_ticker(cls, v: str) -> str:
        return v.strip().upper()

# ==================== PERSISTENCE SCHEMAS ====================
class PortfolioItemCreate(BaseModel):
    ticker: str
    target_weight: float
    asset_class: Optional[str] = "Equity"

class PortfolioItemResponse(BaseModel):
    id: int
    portfolio_id: int
    ticker: str
    target_weight: float
    asset_class: Optional[str] = "Equity"

    model_config = ConfigDict(from_attributes=True)

class PortfolioCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    items: List[PortfolioItemCreate] = Field(default_factory=list)

class PortfolioResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[PortfolioItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class WatchlistItemCreate(BaseModel):
    ticker: str
    notes: Optional[str] = None

class WatchlistItemResponse(BaseModel):
    id: int
    watchlist_id: int
    ticker: str
    notes: Optional[str] = None
    added_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WatchlistCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class WatchlistResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    items: List[WatchlistItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

# ==================== AUTHENTICATION & USER SCHEMAS ====================
class UserRegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, description="Valid email address")
    password: str = Field(..., min_length=8, max_length=128, description="Password (min 8 characters)")

class UserLoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=1)

class UserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    is_guest: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SessionResponse(BaseModel):
    session_token: str
    user_id: str
    is_guest: bool
    email: Optional[str] = None
    expires_at: datetime

# ==================== ALERT SCHEMAS ====================
class AlertCreate(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)
    condition_type: str = Field("PRICE_ABOVE", description="'PRICE_ABOVE', 'PRICE_BELOW', 'PCT_CHANGE', 'SCORE_CHANGE'")
    threshold_value: float = Field(..., description="Target threshold value")

class AlertResponse(BaseModel):
    id: int
    user_id: str
    ticker: str
    condition_type: str
    threshold_value: float
    is_active: bool
    triggered_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ==================== PAPER TRADING SCHEMAS ====================
class PaperOrderRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)
    action: str = Field(..., description="'BUY' or 'SELL'")
    shares: float = Field(..., gt=0, description="Number of shares")
    order_type: Optional[str] = Field("MARKET", description="'MARKET' or 'LIMIT'")
    limit_price: Optional[float] = Field(None, gt=0)

    @field_validator('ticker')
    @classmethod
    def sanitize_ticker(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator('action')
    @classmethod
    def validate_action(cls, v: str) -> str:
        act = v.strip().upper()
        if act not in ("BUY", "SELL"):
            raise ValueError("Order action must be 'BUY' or 'SELL'")
        return act

    @field_validator('order_type')
    @classmethod
    def validate_order_type(cls, v: Optional[str]) -> str:
        if not v:
            return "MARKET"
        ot = v.strip().upper()
        if ot not in ("MARKET", "LIMIT"):
            raise ValueError("Order type must be 'MARKET' or 'LIMIT'")
        return ot

class PaperPositionResponse(BaseModel):
    id: int
    ticker: str
    shares: float
    average_entry_price: float
    current_price: Optional[float] = None
    market_value: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    unrealized_pnl_pct: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

class PaperTradeResponse(BaseModel):
    id: int
    ticker: str
    action: str
    order_type: str
    shares: float
    execution_price: float
    commission: float
    slippage: float
    realized_pnl: float
    executed_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaperAccountResponse(BaseModel):
    id: int
    cash_balance: float
    currency: str
    total_portfolio_value: Optional[float] = None
    total_unrealized_pnl: Optional[float] = None
    positions: List[PaperPositionResponse] = Field(default_factory=list)
    recent_trades: List[PaperTradeResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

# ==================== ASYNC JOB SCHEMAS ====================
class JobSubmissionResponse(BaseModel):
    job_id: str
    job_type: str
    status: str
    message: str = "Job queued for background execution"
    status_url: str

class JobResponse(BaseModel):
    job_id: str
    job_type: str
    status: str  # 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'
    progress: float
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    result: Optional[Any] = None
    error: Optional[str] = None

# ==================== CANONICAL QUOTE SCHEMA ====================
class CanonicalQuote(BaseModel):
    ticker: str
    price: float
    change: float
    change_pct: float
    open_price: float
    day_high: float
    day_low: float
    prev_close: float
    year_low: Optional[float] = None
    year_high: Optional[float] = None
    volume: int
    currency: str = "USD"
    exchange: str = "US"
    market_state: str = "OPEN"
    timestamp: str
    data_source: str = "live"
    freshness: str = Field("delayed_15m", description="'realtime' | 'delayed_15m' | 'cached' | 'historical'")
    provider: str = Field("yfinance", description="'polygon' | 'yfinance'")
    is_stale: bool = False

# ==================== GENERIC RESPONSE SCHEMA ====================
class ApiResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    data: Optional[Any] = None
    data_source: Optional[str] = Field("live", description="'live' | 'cache' | 'simulated'")
    freshness: Optional[str] = Field("delayed_15m", description="'realtime' | 'delayed_15m' | 'cached' | 'historical'")
    fetched_at: Optional[str] = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

# ==================== ERROR RESPONSE SCHEMA ====================
class ErrorResponse(BaseModel):
    success: bool = False
    error_code: str
    message: str
    request_id: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

# ==================== ALERT SCHEMAS ====================
class AlertCreate(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=10)
    condition_type: str = Field(..., description="'PRICE_ABOVE', 'PRICE_BELOW', 'PCT_CHANGE_ABOVE', 'PCT_CHANGE_BELOW', 'SCORE_ABOVE', 'SCORE_BELOW', 'RSI_OVERBOUGHT', 'RSI_OVERSOLD'")
    threshold_value: float = Field(..., description="Target numerical threshold value")

    @field_validator('ticker')
    @classmethod
    def sanitize_ticker(cls, v: str) -> str:
        t = v.strip().upper()
        if not re.match(r'^[A-Z0-9.\-]{1,10}$', t):
            raise ValueError("Invalid ticker symbol")
        return t

    @field_validator('condition_type')
    @classmethod
    def validate_condition(cls, v: str) -> str:
        cond = v.strip().upper()
        allowed = (
            "PRICE_ABOVE", "PRICE_BELOW",
            "PCT_CHANGE_ABOVE", "PCT_CHANGE_BELOW",
            "SCORE_ABOVE", "SCORE_BELOW",
            "RSI_OVERBOUGHT", "RSI_OVERSOLD"
        )
        if cond not in allowed:
            raise ValueError(f"Condition must be one of: {', '.join(allowed)}")
        return cond

class AlertResponse(BaseModel):
    id: int
    user_id: str
    ticker: str
    condition_type: str
    threshold_value: float
    is_active: bool
    triggered_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AlertTriggerEvent(BaseModel):
    alert_id: int
    ticker: str
    condition_type: str
    threshold_value: float
    trigger_message: str
    triggered_at: str

class AlertEvaluateResponse(BaseModel):
    evaluated_count: int
    triggered_count: int
    triggered_events: List[AlertTriggerEvent]

# ==================== TICKER SEARCH & VALIDATION SCHEMAS ====================
class TickerSearchResult(BaseModel):
    symbol: str
    name: str
    exchange: str
    asset_type: str = "Equity"
    sector: Optional[str] = None
    industry: Optional[str] = None

class TickerSearchResponse(BaseModel):
    query: str
    total: int
    results: List[TickerSearchResult]

class TickerValidationResponse(BaseModel):
    symbol: str
    is_valid: bool
    name: Optional[str] = None
    exchange: Optional[str] = None
    currency: Optional[str] = None
    data_available: bool = False
    message: Optional[str] = None

