"""
FinSight AI — Multi-Condition Alert Test Suite
Verifies:
1. Core mathematical evaluation for all supported condition types in alert_monitor.py
2. REST API lifecycle for alerts (Create, List, Toggle, Delete, Duplicate protection)
3. Real-time condition evaluation endpoint (/api/alerts/evaluate)
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from datetime import datetime

from backend.app.main import app
from src.alert_monitor import evaluate_alert_condition, VALID_CONDITION_TYPES


def test_alert_monitor_all_conditions():
    """Verify mathematical logic of all supported alert condition types."""
    # PRICE_ABOVE
    trig, msg = evaluate_alert_condition("PRICE_ABOVE", 150.0, current_price=155.0)
    assert trig is True
    assert "155.00" in msg

    trig, _ = evaluate_alert_condition("PRICE_ABOVE", 150.0, current_price=145.0)
    assert trig is False

    trig, _ = evaluate_alert_condition("PRICE_ABOVE", 150.0, current_price=None)
    assert trig is False

    # PRICE_BELOW
    trig, msg = evaluate_alert_condition("PRICE_BELOW", 150.0, current_price=145.0)
    assert trig is True
    assert "145.00" in msg

    trig, _ = evaluate_alert_condition("PRICE_BELOW", 150.0, current_price=155.0)
    assert trig is False

    # PCT_CHANGE_ABOVE
    trig, msg = evaluate_alert_condition("PCT_CHANGE_ABOVE", 3.0, pct_change=4.2)
    assert trig is True
    assert "+4.20%" in msg

    trig, _ = evaluate_alert_condition("PCT_CHANGE_ABOVE", 3.0, pct_change=2.1)
    assert trig is False

    # PCT_CHANGE_BELOW
    trig, msg = evaluate_alert_condition("PCT_CHANGE_BELOW", -3.0, pct_change=-4.5)
    assert trig is True
    assert "-4.50%" in msg

    trig, _ = evaluate_alert_condition("PCT_CHANGE_BELOW", -3.0, pct_change=-1.5)
    assert trig is False

    # SCORE_ABOVE
    trig, msg = evaluate_alert_condition("SCORE_ABOVE", 75.0, score=82.0)
    assert trig is True
    assert "82.0" in msg

    trig, _ = evaluate_alert_condition("SCORE_ABOVE", 75.0, score=70.0)
    assert trig is False

    # SCORE_BELOW
    trig, msg = evaluate_alert_condition("SCORE_BELOW", 40.0, score=35.0)
    assert trig is True
    assert "35.0" in msg

    trig, _ = evaluate_alert_condition("SCORE_BELOW", 40.0, score=50.0)
    assert trig is False

    # RSI_OVERBOUGHT
    trig, msg = evaluate_alert_condition("RSI_OVERBOUGHT", 70.0, rsi=74.5)
    assert trig is True
    assert "74.5" in msg

    trig, _ = evaluate_alert_condition("RSI_OVERBOUGHT", 70.0, rsi=65.0)
    assert trig is False

    # RSI_OVERSOLD
    trig, msg = evaluate_alert_condition("RSI_OVERSOLD", 30.0, rsi=26.2)
    assert trig is True
    assert "26.2" in msg

    trig, _ = evaluate_alert_condition("RSI_OVERSOLD", 30.0, rsi=35.0)
    assert trig is False

    # Invalid Condition
    trig, msg = evaluate_alert_condition("UNKNOWN_CRITERIA", 100.0)
    assert trig is False
    assert "Unknown condition" in msg


@pytest.mark.asyncio
async def test_alerts_api_full_lifecycle():
    """Verify REST API lifecycle: creation, listing, toggle, duplicate rejection, and deletion."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Provision a guest session
        guest_res = await ac.post("/api/auth/guest")
        assert guest_res.status_code == 200
        token = guest_res.json()["data"]["session_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get initial alerts (should be empty)
        init_res = await ac.get("/api/alerts", headers=headers)
        assert init_res.status_code == 200
        assert init_res.json() == []

        # 3. Create a valid alert
        create_payload = {
            "ticker": "AAPL",
            "condition_type": "PRICE_ABOVE",
            "threshold_value": 250.0
        }
        create_res = await ac.post("/api/alerts", json=create_payload, headers=headers)
        assert create_res.status_code == 201
        alert_data = create_res.json()
        assert alert_data["ticker"] == "AAPL"
        assert alert_data["condition_type"] == "PRICE_ABOVE"
        assert alert_data["threshold_value"] == 250.0
        assert alert_data["is_active"] is True
        alert_id = alert_data["id"]

        # 4. Attempt creating exact duplicate active alert (should return 409 Conflict)
        dup_res = await ac.post("/api/alerts", json=create_payload, headers=headers)
        assert dup_res.status_code == 409

        # 5. List alerts (should contain 1 alert)
        list_res = await ac.get("/api/alerts", headers=headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) == 1
        assert list_res.json()[0]["id"] == alert_id

        # 6. Toggle alert off
        toggle_off = await ac.patch(f"/api/alerts/{alert_id}/toggle", headers=headers)
        assert toggle_off.status_code == 200
        assert toggle_off.json()["is_active"] is False

        # 7. Toggle alert back on
        toggle_on = await ac.patch(f"/api/alerts/{alert_id}/toggle", headers=headers)
        assert toggle_on.status_code == 200
        assert toggle_on.json()["is_active"] is True

        # 8. Delete alert
        del_res = await ac.delete(f"/api/alerts/{alert_id}", headers=headers)
        assert del_res.status_code == 200
        assert del_res.json()["success"] is True

        # 9. Verify list is empty again
        final_res = await ac.get("/api/alerts", headers=headers)
        assert final_res.status_code == 200
        assert len(final_res.json()) == 0


@pytest.mark.asyncio
async def test_alerts_evaluation_workflow():
    """Verify live condition evaluation endpoint updates triggered_at and yields events."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        guest_res = await ac.post("/api/auth/guest")
        token = guest_res.json()["data"]["session_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create an alert that is guaranteed to trigger (e.g. AAPL price above $1.00)
        payload = {
            "ticker": "AAPL",
            "condition_type": "PRICE_ABOVE",
            "threshold_value": 1.00
        }
        create_res = await ac.post("/api/alerts", json=payload, headers=headers)
        assert create_res.status_code == 201

        # Run evaluation
        eval_res = await ac.post("/api/alerts/evaluate", headers=headers)
        assert eval_res.status_code == 200
        eval_data = eval_res.json()
        assert eval_data["evaluated_count"] >= 1
        assert eval_data["triggered_count"] >= 1
        assert len(eval_data["triggered_events"]) >= 1
        assert eval_data["triggered_events"][0]["ticker"] == "AAPL"
        assert "reached or exceeded target $1.00" in eval_data["triggered_events"][0]["trigger_message"]
