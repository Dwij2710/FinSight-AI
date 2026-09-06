"""
SQLAlchemy ORM models for FinSight AI.
Supports Users, Sessions, Portfolios, Watchlists, Alerts, Paper Trading, and Analysis Snapshots.
Enforces multi-tenant isolation through indexed user_id foreign keys.
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean, Index
)
from sqlalchemy.orm import relationship
from .database import Base
from ..utils.security import generate_uuid

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=True, index=True)
    hashed_password = Column(String(255), nullable=True)
    is_guest = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    portfolios = relationship("Portfolio", back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    watchlists = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    paper_account = relationship("PaperAccount", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="selectin")

class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_token = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="sessions")

class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="portfolios")
    items = relationship(
        "PortfolioItem",
        back_populates="portfolio",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

class PortfolioItem(Base):
    __tablename__ = "portfolio_items"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False, index=True)
    ticker = Column(String(20), nullable=False)
    target_weight = Column(Float, nullable=False)
    asset_class = Column(String(50), default="Equity")

    portfolio = relationship("Portfolio", back_populates="items")

class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="watchlists")
    items = relationship(
        "WatchlistItem",
        back_populates="watchlist",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, index=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id", ondelete="CASCADE"), nullable=False, index=True)
    ticker = Column(String(20), nullable=False)
    notes = Column(Text, nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    watchlist = relationship("Watchlist", back_populates="items")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ticker = Column(String(20), nullable=False)
    condition_type = Column(String(30), nullable=False)  # 'PRICE_ABOVE', 'PRICE_BELOW', 'PCT_CHANGE', 'SCORE_CHANGE'
    threshold_value = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    triggered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="alerts")

class PaperAccount(Base):
    __tablename__ = "paper_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    cash_balance = Column(Float, default=100000.0, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="paper_account")
    positions = relationship("PaperPosition", back_populates="account", cascade="all, delete-orphan", lazy="selectin")
    trades = relationship("PaperTrade", back_populates="account", cascade="all, delete-orphan", lazy="selectin")

class PaperPosition(Base):
    __tablename__ = "paper_positions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("paper_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    ticker = Column(String(20), nullable=False)
    shares = Column(Float, default=0.0, nullable=False)
    average_entry_price = Column(Float, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    account = relationship("PaperAccount", back_populates="positions")

class PaperTrade(Base):
    __tablename__ = "paper_trades"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("paper_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    ticker = Column(String(20), nullable=False)
    action = Column(String(10), nullable=False)  # 'BUY', 'SELL'
    order_type = Column(String(10), default="MARKET", nullable=False)  # 'MARKET', 'LIMIT'
    shares = Column(Float, nullable=False)
    execution_price = Column(Float, nullable=False)
    commission = Column(Float, default=0.0, nullable=False)
    slippage = Column(Float, default=0.0, nullable=False)
    realized_pnl = Column(Float, default=0.0, nullable=False)
    executed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    account = relationship("PaperAccount", back_populates="trades")

class AnalysisSnapshot(Base):
    __tablename__ = "analysis_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    ticker = Column(String(20), nullable=False)
    analysis_type = Column(String(50), nullable=False)  # 'forecast', 'portfolio', 'regime', 'rl'
    summary_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    job_type = Column(String(50), nullable=False, index=True)  # 'rl_simulation', 'quantile_forecast', 'walk_forward_backtest'
    status = Column(String(20), default="QUEUED", nullable=False, index=True)  # 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'
    progress = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    result_json = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    input_params_json = Column(Text, nullable=True)

    user = relationship("User", backref="jobs")

