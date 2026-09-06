"""
FinSight AI — Multi-Condition Alert API Routes
Provides CRUD endpoints and real-time market condition evaluation for user-defined alerts:
- Price boundaries (PRICE_ABOVE, PRICE_BELOW)
- 24h percentage swings (PCT_CHANGE_ABOVE, PCT_CHANGE_BELOW)
- AI Score thresholds (SCORE_ABOVE, SCORE_BELOW)
- Technical RSI extremes (RSI_OVERBOUGHT, RSI_OVERSOLD)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
from datetime import datetime
import logging

from backend.app.db.database import get_db
from backend.app.db.models import Alert, User
from backend.app.schemas import (
    AlertCreate,
    AlertResponse,
    AlertEvaluateResponse,
    AlertTriggerEvent
)
from backend.app.routes.auth import get_current_user
from backend.app.services.market_data import market_data_service
from src.alert_monitor import evaluate_alert_condition

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=List[AlertResponse])
async def get_user_alerts(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Retrieve all multi-condition alerts for the authenticated/guest user."""
    result = await db.execute(
        select(Alert).where(Alert.user_id == user.id).order_by(Alert.created_at.desc())
    )
    alerts = result.scalars().all()
    return alerts


@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    payload: AlertCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Create a new multi-condition alert."""
    # Check for duplicate active alert with same parameters
    dup_res = await db.execute(
        select(Alert).where(
            Alert.user_id == user.id,
            Alert.ticker == payload.ticker,
            Alert.condition_type == payload.condition_type,
            Alert.threshold_value == payload.threshold_value,
            Alert.is_active.is_(True)
        )
    )
    if dup_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An active alert for {payload.ticker} with {payload.condition_type} at {payload.threshold_value} already exists."
        )

    alert = Alert(
        user_id=user.id,
        ticker=payload.ticker,
        condition_type=payload.condition_type,
        threshold_value=payload.threshold_value,
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete a user alert by ID."""
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found"
        )

    await db.delete(alert)
    await db.commit()
    return {"success": True, "message": f"Alert {alert_id} deleted"}


@router.patch("/{alert_id}/toggle", response_model=AlertResponse)
async def toggle_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Toggle an alert's active status (enabled/disabled)."""
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found"
        )

    alert.is_active = not alert.is_active
    await db.commit()
    await db.refresh(alert)
    return alert


@router.post("/evaluate", response_model=AlertEvaluateResponse)
async def evaluate_user_alerts(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Evaluates all active alerts for the current user against live market quotes,
    FinSight AI scores, and technical indicators.
    Updates `triggered_at` for met conditions and returns trigger event notifications.
    """
    result = await db.execute(
        select(Alert).where(Alert.user_id == user.id, Alert.is_active.is_(True))
    )
    active_alerts = result.scalars().all()
    if not active_alerts:
        return AlertEvaluateResponse(evaluated_count=0, triggered_count=0, triggered_events=[])

    # Distinct tickers to evaluate
    tickers = list(set(a.ticker for a in active_alerts))
    
    # Fetch quotes
    quotes = {}
    for sym in tickers:
        try:
            q = market_data_service.get_quote(sym)
            quotes[sym] = q
        except Exception as e:
            logger.warning(f"[AlertEvaluate] Failed to fetch quote for {sym}: {e}")

    triggered_events: List[AlertTriggerEvent] = []
    now_dt = datetime.utcnow()
    now_iso = now_dt.isoformat() + "Z"

    for alert in active_alerts:
        quote = quotes.get(alert.ticker)
        current_price = quote.price if quote else None
        pct_change = quote.change_pct if quote else None
        
        # Lazy fetch score or RSI if needed
        score_val = None
        rsi_val = None
        if "SCORE" in alert.condition_type:
            try:
                from src.score_engine import compute_finsight_score
                sc = compute_finsight_score(alert.ticker)
                score_val = sc.get("composite_score")
            except Exception as e:
                logger.warning(f"[AlertEvaluate] Score calc failed for {alert.ticker}: {e}")

        if "RSI" in alert.condition_type:
            try:
                from src.data_fetcher import get_historical_data
                df = get_historical_data(alert.ticker, period="3mo")
                if not df.empty and len(df) >= 15:
                    delta = df['Close'].diff()
                    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
                    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
                    rs = gain / loss.replace(0, 1e-9)
                    rsi_series = 100 - (100 / (1 + rs))
                    rsi_val = float(rsi_series.iloc[-1])
            except Exception as e:
                logger.warning(f"[AlertEvaluate] RSI calc failed for {alert.ticker}: {e}")

        is_trig, msg = evaluate_alert_condition(
            condition_type=alert.condition_type,
            threshold_value=alert.threshold_value,
            current_price=current_price,
            pct_change=pct_change,
            score=score_val,
            rsi=rsi_val
        )

        if is_trig:
            alert.triggered_at = now_dt
            triggered_events.append(
                AlertTriggerEvent(
                    alert_id=alert.id,
                    ticker=alert.ticker,
                    condition_type=alert.condition_type,
                    threshold_value=alert.threshold_value,
                    trigger_message=msg,
                    triggered_at=now_iso
                )
            )

    if triggered_events:
        await db.commit()

    return AlertEvaluateResponse(
        evaluated_count=len(active_alerts),
        triggered_count=len(triggered_events),
        triggered_events=triggered_events
    )
