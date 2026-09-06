"""
Paper Broker Module (PAPER-01)
Simulates trade execution, position management, cash accounting,
and P&L calculation with mandatory 5 bps commission and 2 bps slippage.
"""
from typing import Dict, Any, Optional, Tuple
from datetime import datetime


class PaperBroker:
    """
    Simulated Broker Engine for Paper Trading.
    Implements realistic order execution, transaction costs, and portfolio accounting.
    """

    COMMISSION_RATE = 0.0005  # 5 basis points (0.05%)
    MIN_COMMISSION = 1.00     # $1 minimum commission
    SLIPPAGE_RATE = 0.0002    # 2 basis points (0.02%)

    @classmethod
    def execute_market_order(
        cls,
        action: str,
        shares: float,
        base_price: float,
        cash_balance: float,
        current_position: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Executes a simulated market buy or sell order.

        Args:
            action: 'BUY' or 'SELL'
            shares: Number of shares to transact (> 0)
            base_price: Live market price of the asset (> 0)
            cash_balance: Available account cash
            current_position: Dict with 'shares' and 'average_entry_price' if open

        Returns:
            Dict with execution details, new cash balance, updated position, and realized P&L.
        """
        if shares <= 0:
            raise ValueError("Order shares must be greater than zero.")
        if base_price <= 0:
            raise ValueError("Market price must be positive.")

        action = action.upper().strip()
        if action not in ("BUY", "SELL"):
            raise ValueError(f"Invalid order action '{action}'. Must be 'BUY' or 'SELL'.")

        curr_shares = current_position.get("shares", 0.0) if current_position else 0.0
        curr_avg_price = current_position.get("average_entry_price", 0.0) if current_position else 0.0

        if action == "BUY":
            slippage_impact = base_price * cls.SLIPPAGE_RATE
            exec_price = round(base_price + slippage_impact, 2)
            gross_cost = shares * exec_price
            commission = max(cls.MIN_COMMISSION, round(gross_cost * cls.COMMISSION_RATE, 2))
            total_cost = gross_cost + commission

            if cash_balance < total_cost:
                raise ValueError(
                    f"Insufficient funds: Required ${total_cost:,.2f} (${gross_cost:,.2f} + ${commission:,.2f} comm), "
                    f"but available cash is ${cash_balance:,.2f}."
                )

            new_cash = round(cash_balance - total_cost, 2)
            new_shares = curr_shares + shares
            new_avg = (curr_shares * curr_avg_price + shares * exec_price) / new_shares if new_shares > 0 else 0.0

            return {
                "action": "BUY",
                "shares": shares,
                "execution_price": exec_price,
                "gross_value": round(gross_cost, 2),
                "commission": commission,
                "slippage": round(slippage_impact * shares, 2),
                "total_cost": round(total_cost, 2),
                "realized_pnl": 0.0,
                "new_cash_balance": new_cash,
                "updated_position": {
                    "shares": round(new_shares, 4),
                    "average_entry_price": round(new_avg, 2)
                },
                "position_closed": False
            }

        else:  # SELL
            if curr_shares < shares:
                raise ValueError(
                    f"Insufficient shares to sell: Requested {shares} shares, but only {curr_shares} shares open."
                )

            slippage_impact = base_price * cls.SLIPPAGE_RATE
            exec_price = round(base_price - slippage_impact, 2)
            gross_proceeds = shares * exec_price
            commission = max(cls.MIN_COMMISSION, round(gross_proceeds * cls.COMMISSION_RATE, 2))
            net_proceeds = gross_proceeds - commission

            # Realized P&L = (exec_price - entry_price) * shares - commission
            cost_basis = shares * curr_avg_price
            realized_pnl = round(gross_proceeds - cost_basis - commission, 2)
            new_cash = round(cash_balance + net_proceeds, 2)
            remaining_shares = round(curr_shares - shares, 4)

            position_closed = remaining_shares <= 1e-4

            return {
                "action": "SELL",
                "shares": shares,
                "execution_price": exec_price,
                "gross_value": round(gross_proceeds, 2),
                "commission": commission,
                "slippage": round(slippage_impact * shares, 2),
                "net_proceeds": round(net_proceeds, 2),
                "realized_pnl": realized_pnl,
                "new_cash_balance": new_cash,
                "updated_position": {
                    "shares": remaining_shares if not position_closed else 0.0,
                    "average_entry_price": curr_avg_price if not position_closed else 0.0
                },
                "position_closed": position_closed
            }

    @classmethod
    def calculate_position_metrics(
        cls,
        shares: float,
        average_entry_price: float,
        current_price: float
    ) -> Dict[str, float]:
        """
        Calculates market value and unrealized P&L for an open position.
        """
        if shares <= 0:
            return {
                "market_value": 0.0,
                "unrealized_pnl": 0.0,
                "unrealized_pnl_pct": 0.0
            }

        market_value = round(shares * current_price, 2)
        cost_basis = shares * average_entry_price
        unrealized_pnl = round(market_value - cost_basis, 2)
        unrealized_pnl_pct = round((unrealized_pnl / cost_basis) * 100.0, 2) if cost_basis > 0 else 0.0

        return {
            "market_value": market_value,
            "unrealized_pnl": unrealized_pnl,
            "unrealized_pnl_pct": unrealized_pnl_pct
        }
