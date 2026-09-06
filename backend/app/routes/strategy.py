"""
FinSight AI — Strategy Builder & Rules Engine REST API (STRAT-01)
Provides endpoints for executing backtests with realistic transaction fees and slippage,
as well as retrieving institutional strategy templates.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Any, Optional
import re
import logging

from src.strategy_builder import StrategyBuilderEngine, STRATEGY_TEMPLATES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/strategy", tags=["strategy"])


class StrategyBacktestRequest(BaseModel):
    universe: List[str] = Field(..., min_length=1, max_length=10, description="List of stock tickers in universe")
    defensive_asset: str = Field("SHY", description="Safe haven asset for regime downshifts")
    allocation_type: str = Field("EQUAL_WEIGHT", description="'EQUAL_WEIGHT' | 'MOMENTUM_TOP_N' | 'INVERSE_VOLATILITY'")
    top_n: int = Field(3, ge=1, le=10, description="Number of assets to pick if ranking")
    rebalance_frequency_days: int = Field(21, ge=5, le=90, description="Trading days between rebalances")
    regime_filter: str = Field("NONE", description="'NONE' | 'SMA200_BENCHMARK'")
    initial_capital: float = Field(100000.0, ge=1000.0, le=10000000.0)
    period: str = Field("2y", description="'1y' | '2y' | '5y'")

    @field_validator('universe')
    @classmethod
    def sanitize_universe(cls, v: List[str]) -> List[str]:
        cleaned = []
        for t in v:
            sym = t.strip().upper()
            if re.match(r'^[A-Z0-9.\-]{1,10}$', sym):
                cleaned.append(sym)
            else:
                raise ValueError(f"Invalid ticker symbol: {t}")
        return list(dict.fromkeys(cleaned))

    @field_validator('defensive_asset')
    @classmethod
    def sanitize_defensive(cls, v: str) -> str:
        sym = v.strip().upper()
        if not re.match(r'^[A-Z0-9.\-]{1,10}$', sym):
            raise ValueError("Invalid defensive ticker symbol")
        return sym

    @field_validator('allocation_type')
    @classmethod
    def validate_alloc(cls, v: str) -> str:
        act = v.strip().upper()
        if act not in ("EQUAL_WEIGHT", "MOMENTUM_TOP_N", "INVERSE_VOLATILITY"):
            raise ValueError("allocation_type must be EQUAL_WEIGHT, MOMENTUM_TOP_N, or INVERSE_VOLATILITY")
        return act

    @field_validator('regime_filter')
    @classmethod
    def validate_regime(cls, v: str) -> str:
        rf = v.strip().upper()
        if rf not in ("NONE", "SMA200_BENCHMARK"):
            raise ValueError("regime_filter must be NONE or SMA200_BENCHMARK")
        return rf


@router.get("/templates")
async def get_strategy_templates():
    """Returns curated institutional rules-based strategy templates."""
    return {"templates": STRATEGY_TEMPLATES}


@router.post("/backtest")
async def run_strategy_backtest(payload: StrategyBacktestRequest):
    """
    Executes a walk-forward rules-based backtest deducting 5 bps commission
    and 2 bps execution slippage on all rebalances.
    """
    try:
        results = StrategyBuilderEngine.run_backtest(
            universe=payload.universe,
            defensive_asset=payload.defensive_asset,
            allocation_type=payload.allocation_type,
            top_n=payload.top_n,
            rebalance_frequency_days=payload.rebalance_frequency_days,
            regime_filter=payload.regime_filter,
            initial_capital=payload.initial_capital,
            period=payload.period
        )
        return {
            "success": True,
            "data": results,
            "provenance": {
                "friction_commission_bps": 5,
                "friction_slippage_bps": 2,
                "benchmark": "SPY"
            }
        }
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"[StrategyBacktest] Execution error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete strategy backtest simulation"
        )
