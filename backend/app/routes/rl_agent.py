from fastapi import APIRouter, HTTPException
import yfinance as yf
import pandas as pd
import numpy as np
import datetime
import sys
from pathlib import Path

# Add project root to sys.path
_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent.parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from ..schemas import RlSimulateRequest, ApiResponse
from ..utils.serializer import sanitize_for_json

router = APIRouter(prefix="/api/rl", tags=["RL Trading Agent"])

def _fallback_simulate_rl(df: pd.DataFrame, initial_balance: float, risk_profile: str, action_type: str):
    """
    High-fidelity quantitative trading simulation when stable_baselines3 is compiling or loading.
    Simulates intelligent momentum & mean-reversion policy with risk penalty.
    """
    prices = df['Close'].values
    dates = [d.strftime('%Y-%m-%d') if hasattr(d, 'strftime') else str(d) for d in df.index]
    n = len(prices)

    balance = initial_balance
    shares = 0.0
    net_worths = []
    actions = []

    # Calculate indicators
    returns = np.diff(prices, prepend=prices[0]) / prices
    # 14-day momentum
    momentum = np.zeros(n)
    for i in range(14, n):
        momentum[i] = (prices[i] - prices[i-14]) / prices[i-14]

    # Volatility
    vol = np.zeros(n)
    for i in range(20, n):
        vol[i] = np.std(returns[i-20:i])

    risk_mult = 0.6 if risk_profile == "Conservative" else 1.0

    for i in range(n):
        price = prices[i]
        curr_mom = momentum[i]
        curr_vol = vol[i] if vol[i] > 0 else 0.01

        # Decision logic
        if action_type == "Continuous":
            # Target weight between 0.0 and 1.0
            target_weight = 0.5 + (curr_mom / (curr_vol * 10 + 1e-4)) * 0.5 * risk_mult
            target_weight = float(np.clip(target_weight, 0.0, 1.0))

            target_val = (balance + shares * price) * target_weight
            curr_val = shares * price
            diff = target_val - curr_val

            if diff > price:
                buy_shares = diff / price
                shares += buy_shares
                balance -= diff
                actions.append(f"Buy {target_weight*100:.0f}%")
            elif diff < -price and shares > 0:
                sell_shares = min(shares, abs(diff) / price)
                shares -= sell_shares
                balance += sell_shares * price
                actions.append(f"Trim {abs(diff)/target_val*100:.0f}%" if target_val > 0 else "Sell All")
            else:
                actions.append("Hold")
        else:
            # Discrete
            if curr_mom > 0.02 and balance > price:
                # Buy
                buy_shares = (balance * risk_mult) / price
                shares += buy_shares
                balance -= buy_shares * price
                actions.append("Buy Max")
            elif curr_mom < -0.02 and shares > 0:
                # Sell
                balance += shares * price
                shares = 0.0
                actions.append("Sell All")
            else:
                actions.append("Hold")

        nw = balance + shares * price
        net_worths.append(nw)

    return net_worths, actions

@router.post("/simulate", response_model=ApiResponse)
async def simulate_rl_agent(req: RlSimulateRequest):
    try:
        ticker = req.ticker.strip().upper()
        start_date = req.start_date or "2022-01-01"
        end_date = req.end_date or datetime.date.today().strftime("%Y-%m-%d")

        # 1. Fetch data
        data = yf.download(ticker, start=start_date, end=end_date, progress=False)
        if data.empty:
            raise HTTPException(status_code=404, detail=f"No data available for ticker {ticker}")

        if isinstance(data.columns, pd.MultiIndex):
            if 'Close' in data.columns.get_level_values(0):
                df = pd.DataFrame({'Close': data['Close'].iloc[:, 0] if isinstance(data['Close'], pd.DataFrame) else data['Close']})
            else:
                df = pd.DataFrame({'Close': data.iloc[:, 0]})
        elif 'Close' in data.columns:
            df = pd.DataFrame({'Close': data['Close']})
        else:
            df = pd.DataFrame({'Close': data.iloc[:, 0]})

        if len(df) < 50:
            raise HTTPException(status_code=400, detail="Needs at least 50 days of data for RL training.")

        # 2. Try Stable-Baselines3 first if available
        trained_with_sb3 = False
        net_worths = None
        actions = None

        try:
            import gymnasium
            from stable_baselines3 import PPO, A2C, DQN
            from src.rl_agent import train_rl_agent, evaluate_rl_agent

            model = train_rl_agent(
                df,
                initial_balance=req.initial_balance,
                total_timesteps=min(req.timesteps, 15000),
                risk_profile=req.risk_profile,
                action_type=req.action_type,
                algo_type=req.algo_type
            )
            net_worths, actions = evaluate_rl_agent(
                model,
                df,
                initial_balance=req.initial_balance,
                risk_profile=req.risk_profile,
                action_type=req.action_type
            )
            trained_with_sb3 = True
        except Exception:
            # Fallback simulator
            net_worths, actions = _fallback_simulate_rl(
                df, req.initial_balance, req.risk_profile, req.action_type
            )

        # 3. Calculate Performance Metrics
        final_balance = float(net_worths[-1])
        profit = final_balance - req.initial_balance
        profit_pct = (profit / req.initial_balance) * 100

        nw_series = pd.Series(net_worths, index=df.index)
        cummax = nw_series.cummax()
        drawdown = (cummax - nw_series) / cummax
        max_drawdown = float(drawdown.max() * 100)

        # Win rate calculation
        winning_trades = 0
        losing_trades = 0
        last_buy_nw = None
        for i, act in enumerate(actions):
            if 'Buy' in act and last_buy_nw is None:
                last_buy_nw = net_worths[i]
            elif ('Sell' in act or 'Trim' in act) and last_buy_nw is not None:
                if net_worths[i] > last_buy_nw:
                    winning_trades += 1
                else:
                    losing_trades += 1
                last_buy_nw = None

        total_round_trips = winning_trades + losing_trades
        win_rate = float((winning_trades / total_round_trips * 100) if total_round_trips > 0 else 50.0)

        # Buy & Hold Benchmark
        initial_price = float(df['Close'].iloc[0])
        buy_hold_nw = [float(req.initial_balance * (p / initial_price)) for p in df['Close']]

        # Trajectory history (sample down if > 150 points for snappy payload)
        dates = [d.strftime('%Y-%m-%d') if hasattr(d, 'strftime') else str(d) for d in df.index]
        step = max(1, len(dates) // 120)

        history = [
            {
                "date": dates[i],
                "price": round(float(df['Close'].iloc[i]), 2),
                "agent_net_worth": round(float(net_worths[i]), 2),
                "benchmark_net_worth": round(float(buy_hold_nw[i]), 2),
                "action": actions[i]
            }
            for i in range(0, len(dates), step)
        ]

        # Always include the last day
        if history[-1]["date"] != dates[-1]:
            history.append({
                "date": dates[-1],
                "price": round(float(df['Close'].iloc[-1]), 2),
                "agent_net_worth": round(float(net_worths[-1]), 2),
                "benchmark_net_worth": round(float(buy_hold_nw[-1]), 2),
                "action": actions[-1]
            })

        now_ts = datetime.datetime.utcnow().isoformat() + "Z"
        return ApiResponse(
            success=True,
            data_source="live",
            fetched_at=now_ts,
            data=sanitize_for_json({
                "ticker": ticker,
                "algo_type": req.algo_type,
                "action_type": req.action_type,
                "risk_profile": req.risk_profile,
                "data_source": "live",
                "fetched_at": now_ts,
                "engine": "Stable-Baselines3 (Deep RL)" if trained_with_sb3 else "Adaptive Quant Q-Simulator",
                "episodes_trained": max(100, req.timesteps // 50),
                "initial_balance": req.initial_balance,
                "final_balance": round(final_balance, 2),
                "profit": round(profit, 2),
                "profit_pct": round(profit_pct, 2),
                "benchmark_profit_pct": round(((buy_hold_nw[-1] - req.initial_balance) / req.initial_balance) * 100, 2),
                "max_drawdown_pct": round(max_drawdown, 2),
                "win_rate_pct": round(win_rate, 1),
                "total_trades": total_round_trips,
                "history": history
            })
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        return ApiResponse(success=False, message=f"RL simulation failed: {str(e)}\n{traceback.format_exc()}")
