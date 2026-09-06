"""
Paper Trading REST Router (PAPER-01)
Provides persistent paper trading account, order execution, position tracking,
realized/unrealized P&L calculation, and trade ledger.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, desc
from typing import List, Optional
from datetime import datetime
import sys
from pathlib import Path

_ROOT = str(Path(__file__).resolve().parent.parent.parent.parent)
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from backend.app.db.database import get_db
from backend.app.db.models import User, PaperAccount, PaperPosition, PaperTrade
from backend.app.routes.auth import get_current_user
from backend.app.schemas import (
    PaperOrderRequest, PaperPositionResponse, PaperTradeResponse,
    PaperAccountResponse, ApiResponse
)
from backend.app.services.market_data import market_data_service
from backend.app.utils.serializer import sanitize_for_json
from src.paper_broker import PaperBroker

router = APIRouter(prefix="/api/paper", tags=["Paper Trading"])


async def get_or_create_paper_account(user: User, db: AsyncSession) -> PaperAccount:
    """Retrieves or initializes a $100,000 virtual paper trading account for the user."""
    stmt = select(PaperAccount).where(PaperAccount.user_id == user.id)
    result = await db.execute(stmt)
    account = result.scalars().first()

    if not account:
        account = PaperAccount(
            user_id=user.id,
            cash_balance=100000.0,
            currency="USD"
        )
        db.add(account)
        await db.commit()
        await db.refresh(account)

    return account


@router.get("/account", response_model=ApiResponse)
async def get_paper_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves the complete paper trading account state, including cash balance,
    open positions with real-time mark-to-market valuation, and recent trades.
    """
    account = await get_or_create_paper_account(current_user, db)

    # Fetch positions
    pos_stmt = select(PaperPosition).where(PaperPosition.account_id == account.id)
    pos_res = await db.execute(pos_stmt)
    positions = pos_res.scalars().all()

    # Fetch recent trades
    trade_stmt = select(PaperTrade).where(PaperTrade.account_id == account.id).order_by(desc(PaperTrade.executed_at)).limit(50)
    trade_res = await db.execute(trade_stmt)
    trades = trade_res.scalars().all()

    # Real-time mark-to-market valuation
    total_positions_value = 0.0
    total_unrealized_pnl = 0.0
    position_dtos = []

    for pos in positions:
        try:
            quote = await market_data_service.get_quote(pos.ticker)
            live_price = quote.price if quote else pos.average_entry_price
        except Exception:
            live_price = pos.average_entry_price

        metrics = PaperBroker.calculate_position_metrics(
            shares=pos.shares,
            average_entry_price=pos.average_entry_price,
            current_price=live_price
        )

        total_positions_value += metrics["market_value"]
        total_unrealized_pnl += metrics["unrealized_pnl"]

        position_dtos.append({
            "id": pos.id,
            "ticker": pos.ticker,
            "shares": pos.shares,
            "average_entry_price": pos.average_entry_price,
            "current_price": live_price,
            "market_value": metrics["market_value"],
            "unrealized_pnl": metrics["unrealized_pnl"],
            "unrealized_pnl_pct": metrics["unrealized_pnl_pct"]
        })

    total_realized_pnl = sum(t.realized_pnl for t in trades)
    total_equity = round(account.cash_balance + total_positions_value, 2)
    total_pnl = round(total_equity - 100000.0, 2)
    total_return_pct = round((total_pnl / 100000.0) * 100.0, 2)

    data = {
        "id": account.id,
        "cash_balance": round(account.cash_balance, 2),
        "currency": account.currency,
        "total_portfolio_value": total_equity,
        "positions_market_value": round(total_positions_value, 2),
        "total_unrealized_pnl": round(total_unrealized_pnl, 2),
        "total_realized_pnl": round(total_realized_pnl, 2),
        "total_pnl": total_pnl,
        "total_return_pct": total_return_pct,
        "positions": position_dtos,
        "recent_trades": [
            {
                "id": t.id,
                "ticker": t.ticker,
                "action": t.action,
                "order_type": t.order_type,
                "shares": t.shares,
                "execution_price": t.execution_price,
                "commission": t.commission,
                "slippage": t.slippage,
                "realized_pnl": t.realized_pnl,
                "executed_at": t.executed_at.isoformat() + "Z"
            }
            for t in trades
        ]
    }

    return ApiResponse(
        success=True,
        data=sanitize_for_json(data),
        message="Paper trading account state retrieved successfully"
    )


@router.get("/positions", response_model=ApiResponse)
async def get_paper_positions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves all open paper trading positions with live market valuation."""
    account = await get_or_create_paper_account(current_user, db)

    pos_stmt = select(PaperPosition).where(PaperPosition.account_id == account.id)
    pos_res = await db.execute(pos_stmt)
    positions = pos_res.scalars().all()

    items = []
    for pos in positions:
        try:
            quote = await market_data_service.get_quote(pos.ticker)
            live_price = quote.price if quote else pos.average_entry_price
        except Exception:
            live_price = pos.average_entry_price

        metrics = PaperBroker.calculate_position_metrics(
            shares=pos.shares,
            average_entry_price=pos.average_entry_price,
            current_price=live_price
        )

        items.append({
            "id": pos.id,
            "ticker": pos.ticker,
            "shares": pos.shares,
            "average_entry_price": pos.average_entry_price,
            "current_price": live_price,
            "market_value": metrics["market_value"],
            "unrealized_pnl": metrics["unrealized_pnl"],
            "unrealized_pnl_pct": metrics["unrealized_pnl_pct"]
        })

    return ApiResponse(
        success=True,
        data=sanitize_for_json(items),
        message=f"{len(items)} open positions retrieved"
    )


@router.post("/order", response_model=ApiResponse)
async def place_paper_order(
    req: PaperOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits and executes a simulated Market or Limit order with 5 bps commission
    and 2 bps slippage friction.
    """
    account = await get_or_create_paper_account(current_user, db)

    # 1. Fetch live market price
    try:
        quote = await market_data_service.get_quote(req.ticker)
        base_price = quote.price if quote and quote.price > 0 else 100.0
    except Exception:
        base_price = 100.0

    # 2. Check limit order conditions if LIMIT specified
    if req.order_type == "LIMIT" and req.limit_price is not None:
        if req.action == "BUY" and base_price > req.limit_price:
            raise HTTPException(
                status_code=400,
                detail=f"Limit Buy order unfilled: Market price ${base_price:.2f} is above your limit ${req.limit_price:.2f}."
            )
        if req.action == "SELL" and base_price < req.limit_price:
            raise HTTPException(
                status_code=400,
                detail=f"Limit Sell order unfilled: Market price ${base_price:.2f} is below your limit ${req.limit_price:.2f}."
            )

    # 3. Lookup existing position
    pos_stmt = select(PaperPosition).where(
        PaperPosition.account_id == account.id,
        PaperPosition.ticker == req.ticker
    )
    pos_res = await db.execute(pos_stmt)
    position = pos_res.scalars().first()

    current_pos_dict = None
    if position:
        current_pos_dict = {
            "shares": position.shares,
            "average_entry_price": position.average_entry_price
        }

    # 4. Execute via PaperBroker engine
    try:
        execution = PaperBroker.execute_market_order(
            action=req.action,
            shares=req.shares,
            base_price=base_price,
            cash_balance=account.cash_balance,
            current_position=current_pos_dict
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 5. Persist updates
    account.cash_balance = execution["new_cash_balance"]

    if req.action == "BUY":
        if position:
            position.shares = execution["updated_position"]["shares"]
            position.average_entry_price = execution["updated_position"]["average_entry_price"]
        else:
            position = PaperPosition(
                account_id=account.id,
                ticker=req.ticker,
                shares=execution["updated_position"]["shares"],
                average_entry_price=execution["updated_position"]["average_entry_price"]
            )
            db.add(position)
    else:  # SELL
        if execution["position_closed"]:
            await db.delete(position)
        else:
            position.shares = execution["updated_position"]["shares"]

    # Record trade ledger entry
    trade = PaperTrade(
        account_id=account.id,
        ticker=req.ticker,
        action=req.action,
        order_type=req.order_type or "MARKET",
        shares=req.shares,
        execution_price=execution["execution_price"],
        commission=execution["commission"],
        slippage=execution["slippage"],
        realized_pnl=execution["realized_pnl"],
        executed_at=datetime.utcnow()
    )
    db.add(trade)

    await db.commit()
    await db.refresh(account)

    result_payload = {
        "trade_id": trade.id,
        "ticker": req.ticker,
        "action": req.action,
        "shares": req.shares,
        "execution_price": execution["execution_price"],
        "commission": execution["commission"],
        "slippage": execution["slippage"],
        "realized_pnl": execution["realized_pnl"],
        "new_cash_balance": execution["new_cash_balance"],
        "position_closed": execution["position_closed"]
    }

    return ApiResponse(
        success=True,
        data=sanitize_for_json(result_payload),
        message=f"{req.action} order for {req.shares} shares of {req.ticker} executed at ${execution['execution_price']:.2f}"
    )


@router.get("/trades", response_model=ApiResponse)
async def get_paper_trades(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves the complete trade execution history."""
    account = await get_or_create_paper_account(current_user, db)

    stmt = select(PaperTrade).where(PaperTrade.account_id == account.id).order_by(desc(PaperTrade.executed_at)).limit(100)
    res = await db.execute(stmt)
    trades = res.scalars().all()

    items = [
        {
            "id": t.id,
            "ticker": t.ticker,
            "action": t.action,
            "order_type": t.order_type,
            "shares": t.shares,
            "execution_price": t.execution_price,
            "commission": t.commission,
            "slippage": t.slippage,
            "realized_pnl": t.realized_pnl,
            "executed_at": t.executed_at.isoformat() + "Z"
        }
        for t in trades
    ]

    return ApiResponse(
        success=True,
        data=sanitize_for_json(items),
        message=f"{len(items)} trade execution records retrieved"
    )


@router.post("/reset", response_model=ApiResponse)
async def reset_paper_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Resets virtual account to initial $100,000 cash balance and closes all open positions."""
    account = await get_or_create_paper_account(current_user, db)

    # 1. Reset cash balance
    account.cash_balance = 100000.0

    # 2. Delete all open positions
    del_pos_stmt = delete(PaperPosition).where(PaperPosition.account_id == account.id)
    await db.execute(del_pos_stmt)

    # 3. Delete trade history
    del_trade_stmt = delete(PaperTrade).where(PaperTrade.account_id == account.id)
    await db.execute(del_trade_stmt)

    await db.commit()
    await db.refresh(account)

    return ApiResponse(
        success=True,
        data={"cash_balance": 100000.0, "positions_closed": True, "trades_cleared": True},
        message="Paper trading account has been reset to $100,000.00 cash."
    )
