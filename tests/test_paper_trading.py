"""
Unit and Integration Tests for Paper Trading Environment (PAPER-01).
Tests broker execution, slippage, commissions, positions averaging,
realized P&L, and FastAPI endpoints.
"""
import pytest
from httpx import AsyncClient, ASGITransport

from src.paper_broker import PaperBroker
from backend.app.main import app


def test_broker_buy_and_sell_math():
    """Validates math for market orders, 5 bps commission, and 2 bps slippage."""
    # 1. Buy 100 shares @ $150.00
    base_price = 150.0
    cash = 100000.0

    buy_exec = PaperBroker.execute_market_order(
        action="BUY",
        shares=100.0,
        base_price=base_price,
        cash_balance=cash
    )

    # 2 bps slippage on $150.00 is $0.03 -> $150.03
    expected_exec_price = 150.03
    assert buy_exec["execution_price"] == expected_exec_price
    # Gross value = 100 * 150.03 = $15,003.00
    # Commission (5 bps) = max(1.0, 15003.00 * 0.0005) = $7.50
    assert buy_exec["commission"] == 7.50
    assert buy_exec["total_cost"] == 15010.50
    assert buy_exec["new_cash_balance"] == round(100000.0 - 15010.50, 2)
    assert buy_exec["updated_position"]["shares"] == 100.0
    assert buy_exec["updated_position"]["average_entry_price"] == 150.03

    # 2. Sell 50 shares @ $160.00
    sell_base = 160.0
    curr_cash = buy_exec["new_cash_balance"]
    sell_exec = PaperBroker.execute_market_order(
        action="SELL",
        shares=50.0,
        base_price=sell_base,
        cash_balance=curr_cash,
        current_position=buy_exec["updated_position"]
    )

    # 2 bps slippage on $160 is $0.032 -> $159.97
    assert sell_exec["execution_price"] == 159.97
    # Realized P&L = (159.97 - 150.03) * 50 - commission
    # Gross proceeds = 50 * 159.97 = $7,998.50
    # Comm = 7998.50 * 0.0005 = $4.00
    # P&L = 9.94 * 50 - 4.00 = 497.00 - 4.00 = $493.00
    assert sell_exec["commission"] == 4.00
    assert sell_exec["realized_pnl"] == 493.00
    assert sell_exec["position_closed"] is False
    assert sell_exec["updated_position"]["shares"] == 50.0
    assert sell_exec["updated_position"]["average_entry_price"] == 150.03


def test_broker_validation_errors():
    """Ensures broker blocks orders when cash or shares are insufficient."""
    with pytest.raises(ValueError, match="Insufficient funds"):
        PaperBroker.execute_market_order(
            action="BUY",
            shares=1000.0,
            base_price=200.0,
            cash_balance=1000.0  # Needs $200k+
        )

    with pytest.raises(ValueError, match="Insufficient shares"):
        PaperBroker.execute_market_order(
            action="SELL",
            shares=50.0,
            base_price=100.0,
            cash_balance=5000.0,
            current_position={"shares": 10.0, "average_entry_price": 90.0}
        )


@pytest.mark.asyncio
async def test_paper_trading_api_lifecycle():
    """End-to-end integration test of the paper trading API endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create a test guest session token
        guest_res = await client.post("/api/auth/guest")
        assert guest_res.status_code == 200
        token = guest_res.json()["data"]["session_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Reset account to clean $100k state
        reset_res = await client.post("/api/paper/reset", headers=headers)
        assert reset_res.status_code == 200
        assert reset_res.json()["data"]["cash_balance"] == 100000.0

        # 2. Get Account
        acc_res = await client.get("/api/paper/account", headers=headers)
        assert acc_res.status_code == 200
        acc_data = acc_res.json()["data"]
        assert acc_data["cash_balance"] == 100000.0
        assert acc_data["total_portfolio_value"] == 100000.0
        assert len(acc_data["positions"]) == 0

        # 3. Buy 10 shares of AAPL
        buy_payload = {
            "ticker": "AAPL",
            "action": "BUY",
            "shares": 10.0,
            "order_type": "MARKET"
        }
        order_res = await client.post("/api/paper/order", json=buy_payload, headers=headers)
        assert order_res.status_code == 200
        order_data = order_res.json()["data"]
        assert order_data["action"] == "BUY"
        assert order_data["shares"] == 10.0
        assert order_data["commission"] > 0
        assert order_data["new_cash_balance"] < 100000.0

        # 4. Check Open Positions
        pos_res = await client.get("/api/paper/positions", headers=headers)
        assert pos_res.status_code == 200
        pos_list = pos_res.json()["data"]
        assert len(pos_list) == 1
        assert pos_list[0]["ticker"] == "AAPL"
        assert pos_list[0]["shares"] == 10.0
        assert pos_list[0]["market_value"] > 0

        # 5. Sell 10 shares of AAPL (Close position)
        sell_payload = {
            "ticker": "AAPL",
            "action": "SELL",
            "shares": 10.0,
            "order_type": "MARKET"
        }
        sell_res = await client.post("/api/paper/order", json=sell_payload, headers=headers)
        assert sell_res.status_code == 200
        sell_data = sell_res.json()["data"]
        assert sell_data["action"] == "SELL"
        assert sell_data["position_closed"] is True

        # 6. Check Positions is now 0
        pos_res_after = await client.get("/api/paper/positions", headers=headers)
        assert len(pos_res_after.json()["data"]) == 0

        # 7. Check Trade History has 2 entries (BUY and SELL)
        trades_res = await client.get("/api/paper/trades", headers=headers)
        assert trades_res.status_code == 200
        trade_list = trades_res.json()["data"]
        assert len(trade_list) == 2
        actions = [t["action"] for t in trade_list]
        assert "BUY" in actions
        assert "SELL" in actions
