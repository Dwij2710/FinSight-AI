"""
SQLAlchemy ORM models for Portfolios, Watchlists, and Analysis Snapshots.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship(
        "PortfolioItem",
        back_populates="portfolio",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

class PortfolioItem(Base):
    __tablename__ = "portfolio_items"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(20), nullable=False)
    target_weight = Column(Float, nullable=False)
    asset_class = Column(String(50), default="Equity")

    portfolio = relationship("Portfolio", back_populates="items")

class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship(
        "WatchlistItem",
        back_populates="watchlist",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, index=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(20), nullable=False)
    notes = Column(Text, nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow)

    watchlist = relationship("Watchlist", back_populates="items")

class AnalysisSnapshot(Base):
    __tablename__ = "analysis_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False)
    analysis_type = Column(String(50), nullable=False)  # 'forecast', 'portfolio', 'regime', 'rl'
    summary_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
