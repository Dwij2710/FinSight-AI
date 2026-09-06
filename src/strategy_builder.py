"""
FinSight AI — AI Strategy Builder & Rules Engine (STRAT-01)
Provides modular rules-based quantitative portfolio strategy execution,
walk-forward backtesting with realistic execution friction (5 bps commission + 2 bps slippage),
and institutional risk/performance metrics.
"""

from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import pandas as pd
import datetime

from src.data_fetcher import DataFetcher


# Built-in Institutional Strategy Templates
STRATEGY_TEMPLATES: List[Dict[str, Any]] = [
    {
        "id": "tech_momentum_alpha",
        "name": "Tech Momentum Alpha",
        "description": "Selects top 3 momentum leaders among tech giants based on 60-day returns, rebalancing monthly.",
        "universe": ["AAPL", "NVDA", "MSFT", "GOOGL", "AMZN", "META"],
        "defensive_asset": "SHY",
        "allocation_type": "MOMENTUM_TOP_N",
        "top_n": 3,
        "rebalance_frequency_days": 21,
        "regime_filter": "NONE"
    },
    {
        "id": "all_weather_parity",
        "name": "All-Weather Risk Parity",
        "description": "Diversified asset allocation balancing equities, long-term treasuries, and gold by inverse volatility.",
        "universe": ["SPY", "TLT", "GLD", "IEF", "DBC"],
        "defensive_asset": "SHY",
        "allocation_type": "INVERSE_VOLATILITY",
        "top_n": 5,
        "rebalance_frequency_days": 30,
        "regime_filter": "NONE"
    },
    {
        "id": "dual_momentum_trend",
        "name": "Dual Momentum Regime Shield",
        "description": "Allocates to high-beta equities in market uptrends (SPY > 200-day SMA), shifting to defensive assets during market corrections.",
        "universe": ["AAPL", "NVDA", "MSFT", "TSLA"],
        "defensive_asset": "TLT",
        "allocation_type": "EQUAL_WEIGHT",
        "top_n": 4,
        "rebalance_frequency_days": 14,
        "regime_filter": "SMA200_BENCHMARK"
    }
]


class StrategyBuilderEngine:
    """Executes rules-based backtests with explicit transaction costs and slippage."""

    COMMISSION_BPS = 0.0005  # 5 bps
    SLIPPAGE_BPS = 0.0002    # 2 bps

    @classmethod
    def run_backtest(
        cls,
        universe: List[str],
        defensive_asset: str = "SHY",
        allocation_type: str = "EQUAL_WEIGHT",
        top_n: int = 3,
        rebalance_frequency_days: int = 21,
        regime_filter: str = "NONE",
        initial_capital: float = 100000.0,
        period: str = "2y"
    ) -> Dict[str, Any]:
        """
        Executes a chronological walk-forward backtest.
        """
        all_tickers = list(set([t.upper().strip() for t in universe + [defensive_asset, "SPY"]]))
        
        fetcher = DataFetcher()
        days_map = {"1y": 365, "2y": 730, "5y": 1825}
        days = days_map.get(period.lower(), 730)
        start_date = (datetime.datetime.now() - datetime.timedelta(days=days)).strftime("%Y-%m-%d")

        # 1. Fetch historical price matrices
        price_dict: Dict[str, pd.Series] = {}
        for ticker in all_tickers:
            try:
                df = fetcher.fetch_single_ticker(ticker, start_date=start_date)
                if not df.empty and "Close" in df.columns:
                    price_dict[ticker] = df["Close"]
            except Exception:
                pass

        if "SPY" not in price_dict or len(price_dict["SPY"]) < 30:
            # Fallback benchmark if SPY fetch fails
            if universe and universe[0] in price_dict:
                price_dict["SPY"] = price_dict[universe[0]]

        # Combine into unified aligned dataframe
        prices_df = pd.DataFrame(price_dict).dropna()
        if len(prices_df) < 50:
            raise ValueError("Insufficient historical data across universe for backtesting")

        dates = prices_df.index
        n_days = len(dates)
        
        # Track portfolio state
        capital = initial_capital
        equity_curve: List[Dict[str, Any]] = []
        benchmark_curve: List[Dict[str, Any]] = []
        shares: Dict[str, float] = {}
        trade_logs: List[Dict[str, Any]] = []
        total_commission_paid = 0.0
        total_slippage_paid = 0.0

        spy_start_price = float(prices_df["SPY"].iloc[0])

        for i in range(n_days):
            current_date = dates[i]
            date_str = current_date.strftime("%Y-%m-%d") if hasattr(current_date, "strftime") else str(current_date)[:10]

            # Benchmark performance (SPY buy & hold)
            spy_curr = float(prices_df["SPY"].iloc[i])
            benchmark_equity = initial_capital * (spy_curr / spy_start_price)
            benchmark_curve.append({
                "date": date_str,
                "equity": round(benchmark_equity, 2)
            })

            # Check if rebalance day
            is_rebalance = (i % rebalance_frequency_days == 0) or (i == 0)

            if is_rebalance:
                # Current portfolio valuation before rebalance
                if i == 0:
                    portfolio_value = capital
                else:
                    portfolio_value = sum(
                        shares.get(s, 0.0) * float(prices_df[s].iloc[i])
                        for s in shares
                    )

                # Determine market regime if filter enabled
                regime_bullish = True
                if regime_filter == "SMA200_BENCHMARK" and i >= 20:
                    spy_series = prices_df["SPY"].iloc[:i+1]
                    sma200 = spy_series.rolling(min(200, len(spy_series))).mean().iloc[-1]
                    regime_bullish = spy_series.iloc[-1] >= sma200

                target_weights: Dict[str, float] = {}

                if not regime_bullish:
                    # Risk-off: allocate 100% to defensive asset
                    target_weights = {defensive_asset: 1.0}
                else:
                    avail_universe = [t for t in universe if t in prices_df.columns]

                    if allocation_type == "MOMENTUM_TOP_N" and i >= 20:
                        lookback = min(60, i)
                        returns = {
                            t: (prices_df[t].iloc[i] / prices_df[t].iloc[i - lookback]) - 1.0
                            for t in avail_universe
                        }
                        sorted_assets = sorted(returns.keys(), key=lambda k: returns[k], reverse=True)
                        selected = sorted_assets[:min(top_n, len(sorted_assets))]
                        w = 1.0 / max(1, len(selected))
                        target_weights = {t: w for t in selected}

                    elif allocation_type == "INVERSE_VOLATILITY" and i >= 20:
                        lookback = min(30, i)
                        vol_dict = {}
                        for t in avail_universe:
                            daily_ret = prices_df[t].iloc[i - lookback:i+1].pct_change().dropna()
                            vol = float(daily_ret.std()) if len(daily_ret) > 5 else 0.02
                            vol_dict[t] = max(1e-4, vol)

                        inv_vol = {t: 1.0 / vol_dict[t] for t in avail_universe}
                        sum_inv = sum(inv_vol.values())
                        target_weights = {t: inv_vol[t] / sum_inv for t in avail_universe}

                    else:
                        w = 1.0 / max(1, len(avail_universe))
                        target_weights = {t: w for t in avail_universe}

                # Calculate turnover against drifted holding values
                turnover_usd = 0.0
                all_involved = set(list(shares.keys()) + list(target_weights.keys()))
                for s in all_involved:
                    curr_pos_val = shares.get(s, 0.0) * float(prices_df[s].iloc[i]) if s in prices_df.columns else 0.0
                    tgt_pos_val = target_weights.get(s, 0.0) * portfolio_value
                    turnover_usd += abs(tgt_pos_val - curr_pos_val)

                turnover_usd /= 2.0
                commission = turnover_usd * cls.COMMISSION_BPS
                slippage = turnover_usd * cls.SLIPPAGE_BPS

                portfolio_value -= (commission + slippage)
                total_commission_paid += commission
                total_slippage_paid += slippage

                # Reallocate shares
                shares = {}
                for s, w in target_weights.items():
                    if s in prices_df.columns:
                        p = float(prices_df[s].iloc[i])
                        if p > 0:
                            shares[s] = (portfolio_value * w) / p

                if turnover_usd > 1.0 or i == 0:
                    trade_logs.append({
                        "date": date_str,
                        "turnover_usd": round(turnover_usd, 2),
                        "commission": round(commission, 2),
                        "slippage": round(slippage, 2),
                        "weights": {k: round(v, 3) for k, v in target_weights.items()}
                    })

            # Daily valuation from active shares
            current_day_value = sum(
                shares.get(s, 0.0) * float(prices_df[s].iloc[i])
                for s in shares
                if s in prices_df.columns
            )
            capital = current_day_value
            equity_curve.append({
                "date": date_str,
                "equity": round(capital, 2)
            })

        # 2. Performance & Risk Metrics
        eq_series = pd.Series([pt["equity"] for pt in equity_curve])
        daily_returns = eq_series.pct_change().dropna()

        total_return_pct = ((capital - initial_capital) / initial_capital) * 100.0
        days_total = max(1, n_days)
        years = days_total / 252.0
        cagr_pct = (((capital / initial_capital) ** (1.0 / max(0.1, years))) - 1.0) * 100.0

        ann_volatility_pct = float(daily_returns.std() * np.sqrt(252)) * 100.0
        risk_free_rate = 0.04
        excess_return = (cagr_pct / 100.0) - risk_free_rate
        sharpe_ratio = float(excess_return / (ann_volatility_pct / 100.0)) if ann_volatility_pct > 0 else 0.0

        # Maximum Drawdown
        cum_max = eq_series.cummax()
        drawdown = (eq_series - cum_max) / cum_max
        max_drawdown_pct = float(drawdown.min()) * 100.0
        calmar_ratio = float(cagr_pct / abs(max_drawdown_pct)) if max_drawdown_pct < 0 else 0.0

        win_rate_pct = float((daily_returns > 0).mean()) * 100.0 if len(daily_returns) > 0 else 50.0

        # Benchmark total return
        bm_start = benchmark_curve[0]["equity"]
        bm_end = benchmark_curve[-1]["equity"]
        benchmark_return_pct = ((bm_end - bm_start) / bm_start) * 100.0
        alpha_pct = total_return_pct - benchmark_return_pct

        total_final_val = sum(shares.get(s, 0.0) * float(prices_df[s].iloc[-1]) for s in shares if s in prices_df.columns)
        active_weights = {
            s: round((shares[s] * float(prices_df[s].iloc[-1])) / total_final_val, 4)
            for s in shares
            if total_final_val > 0
        }

        return {
            "initial_capital": initial_capital,
            "ending_capital": round(capital, 2),
            "total_return_pct": round(total_return_pct, 2),
            "cagr_pct": round(cagr_pct, 2),
            "benchmark_return_pct": round(benchmark_return_pct, 2),
            "alpha_pct": round(alpha_pct, 2),
            "annualized_volatility_pct": round(ann_volatility_pct, 2),
            "sharpe_ratio": round(sharpe_ratio, 2),
            "max_drawdown_pct": round(max_drawdown_pct, 2),
            "calmar_ratio": round(calmar_ratio, 2),
            "win_rate_pct": round(win_rate_pct, 1),
            "total_commission_paid": round(total_commission_paid, 2),
            "total_slippage_paid": round(total_slippage_paid, 2),
            "rebalances_count": len(trade_logs),
            "active_weights": active_weights,
            "equity_curve": equity_curve,
            "benchmark_curve": benchmark_curve,
            "trade_logs": trade_logs[-10:]  # Last 10 rebalances
        }
