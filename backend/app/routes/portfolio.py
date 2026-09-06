from fastapi import APIRouter, HTTPException
from datetime import datetime
import pandas as pd
import numpy as np
import sys
from pathlib import Path

# Add project root to sys.path
_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent.parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from src import DataFetcher, ReturnsAnalysis, CorrelationAnalysis, PortfolioOptimizer
from src.stress_testing import MultiFactorStressEngine, HISTORICAL_CRISIS_SCENARIOS
from config.config import get_risk_free_rate, detect_benchmark_ticker
from ..schemas import PortfolioRequest, StressTestRequest, ApiResponse
from ..utils.serializer import sanitize_for_json

router = APIRouter(prefix="/api/portfolio", tags=["Portfolio"])

@router.post("/optimize", response_model=ApiResponse)
async def optimize_portfolio(req: PortfolioRequest):
    try:
        raw_tickers = [t.strip().upper() for t in req.tickers if t.strip()]
        if len(raw_tickers) < 2:
            raise HTTPException(status_code=400, detail="Please provide at least 2 valid stock tickers.")

        start_date = req.start_date or "2021-01-01"
        end_date = req.end_date or "2024-01-01"

        # 1. Fetch stock data
        fetcher = DataFetcher(tickers=raw_tickers, start_date=start_date, end_date=end_date)
        stock_data = fetcher.fetch_stock_data(save_to_csv=False)

        if stock_data is None or stock_data.empty:
            raise HTTPException(status_code=404, detail="Could not fetch data for any of the given tickers.")

        fetched_tickers = stock_data.columns.tolist()
        invalid_tickers = [t for t in raw_tickers if t not in fetched_tickers]

        if len(fetched_tickers) < 2:
            raise HTTPException(
                status_code=400,
                detail=f"Fewer than 2 valid tickers found. Invalid tickers: {invalid_tickers}"
            )

        # 2. Daily returns & correlation
        returns_analyzer = ReturnsAnalysis(stock_data)
        daily_returns = returns_analyzer.calculate_daily_returns().dropna()

        corr_analyzer = CorrelationAnalysis(daily_returns)
        correlation_matrix = corr_analyzer.calculate_correlation_matrix()

        # Dynamic benchmark & risk-free rate
        benchmark_ticker = getattr(fetcher, 'benchmark_ticker', detect_benchmark_ticker(fetched_tickers))
        risk_free_rate = get_risk_free_rate(benchmark_ticker)
        benchmark_name = "NIFTY 50 (^NSEI)" if benchmark_ticker == "^NSEI" else "S&P 500 (^GSPC)"

        # 3. Portfolio Optimization with Ledoit-Wolf shrinkage
        optimizer = PortfolioOptimizer(daily_returns, risk_free_rate=risk_free_rate, use_shrinkage=True)
        max_sharpe = optimizer.optimize_sharpe_ratio()
        min_vol = optimizer.optimize_min_volatility()
        risk_parity = optimizer.optimize_risk_parity()

        # Efficient frontier and random portfolios
        frontier = optimizer.generate_efficient_frontier(30)
        random_ports = optimizer.generate_random_portfolios(500)

        # 4. Benchmark comparison (NIFTY 50)
        benchmark_data = None
        cum_returns = {}
        dates_list = []
        try:
            benchmark_data = fetcher.fetch_benchmark_data(save_to_csv=False)
            common_index = stock_data.index.intersection(benchmark_data.index)
            if len(common_index) > 0:
                aligned_stocks = stock_data.loc[common_index]
                aligned_bench = benchmark_data.loc[common_index]
                stock_cum = (1 + aligned_stocks.pct_change().fillna(0)).cumprod()
                bench_cum = (1 + aligned_bench.pct_change().fillna(0)).cumprod()

                dates_list = [d.strftime('%Y-%m-%d') for d in common_index]
                cum_returns["benchmark"] = [round(float(v), 4) for v in bench_cum.values]
                for col in stock_cum.columns:
                    cum_returns[col] = [round(float(v), 4) for v in stock_cum[col].values]
        except Exception:
            pass

        # 5. Risk & Beta calculation
        ms_weights = max_sharpe['weights']
        weights_series = pd.Series(ms_weights)
        aligned_weights = weights_series.reindex(daily_returns.columns).fillna(0)
        port_daily_ret = daily_returns.dot(aligned_weights)

        beta = 1.0
        if benchmark_data is not None:
            try:
                bench_daily = benchmark_data.pct_change().dropna()
                common_ret_idx = port_daily_ret.index.intersection(bench_daily.index)
                if len(common_ret_idx) > 10:
                    cov = port_daily_ret.loc[common_ret_idx].cov(bench_daily.loc[common_ret_idx])
                    var = bench_daily.loc[common_ret_idx].var()
                    if var > 0:
                        beta = float(cov / var)
            except Exception:
                beta = 1.0

        # Drawdown calculation
        port_cum = (1 + port_daily_ret).cumprod()
        running_max = port_cum.cummax()
        drawdown = (port_cum - running_max) / running_max
        max_dd = float(drawdown.min() * 100)

        drawdown_history = [
            {"date": d.strftime('%Y-%m-%d'), "drawdown": round(float(v * 100), 2)}
            for d, v in drawdown.items()
        ]

        initial_capital = float(req.initial_capital or 100000.0)
        default_baseline_weight = round(100.0 / len(fetched_tickers), 2)
        current_weights = req.current_weights or {t: default_baseline_weight for t in fetched_tickers}

        # Multi-factor historical crisis stress scenarios calibrated with asset covariance and factor sensitivities
        weights_dict = {t: current_weights.get(t, default_baseline_weight) for t in fetched_tickers}
        stress_results = MultiFactorStressEngine.run_crisis_replays(
            returns_df=daily_returns[fetched_tickers],
            weights_dict=weights_dict,
            initial_capital=initial_capital
        )

        # Latest prices for share calculation
        current_prices = {}
        for t in fetched_tickers:
            try:
                current_prices[t] = float(stock_data[t].dropna().iloc[-1])
            except Exception:
                current_prices[t] = 100.0

        # Calculate VaR and CVaR for each strategy
        var_max_sharpe = optimizer.calculate_var_cvar(max_sharpe['weights'], initial_capital)
        var_min_vol = optimizer.calculate_var_cvar(min_vol['weights'], initial_capital)
        var_risk_parity = optimizer.calculate_var_cvar(risk_parity['weights'], initial_capital)
        var_current = optimizer.calculate_var_cvar(current_weights, initial_capital)

        # Risk contributions (Marginal and Percentage Risk Contributions)
        rc_max_sharpe = optimizer.calculate_risk_contributions(max_sharpe['weights'])
        rc_min_vol = optimizer.calculate_risk_contributions(min_vol['weights'])
        rc_risk_parity = optimizer.calculate_risk_contributions(risk_parity['weights'])

        # Generate rebalance orders for all strategies
        rebalance_plans = {
            "max_sharpe": optimizer.generate_rebalance_orders(current_weights, max_sharpe['weights'], initial_capital, current_prices),
            "min_volatility": optimizer.generate_rebalance_orders(current_weights, min_vol['weights'], initial_capital, current_prices),
            "risk_parity": optimizer.generate_rebalance_orders(current_weights, risk_parity['weights'], initial_capital, current_prices)
        }

        response_data = {
            "valid_tickers": fetched_tickers,
            "invalid_tickers": invalid_tickers,
            "initial_capital": initial_capital,
            "current_weights": {k: round(float(v), 2) for k, v in current_weights.items()},
            "current_prices": {k: round(float(v), 2) for k, v in current_prices.items()},
            "correlation_matrix": {
                "tickers": correlation_matrix.columns.tolist(),
                "values": [[round(float(val), 3) for val in row] for row in correlation_matrix.values]
            },
            "max_sharpe": {
                "return": round(float(max_sharpe['return'] * 100), 2),
                "volatility": round(float(max_sharpe['volatility'] * 100), 2),
                "sharpe_ratio": round(float(max_sharpe['sharpe_ratio']), 4),
                "weights": {k: round(float(v * 100), 2) for k, v in max_sharpe['weights'].items()},
                "var_metrics": var_max_sharpe,
                "risk_contributions": rc_max_sharpe
            },
            "min_volatility": {
                "return": round(float(min_vol['return'] * 100), 2),
                "volatility": round(float(min_vol['volatility'] * 100), 2),
                "sharpe_ratio": round(float(min_vol['sharpe_ratio']), 4),
                "weights": {k: round(float(v * 100), 2) for k, v in min_vol['weights'].items()},
                "var_metrics": var_min_vol,
                "risk_contributions": rc_min_vol
            },
            "risk_parity": {
                "return": round(float(risk_parity['return'] * 100), 2),
                "volatility": round(float(risk_parity['volatility'] * 100), 2),
                "sharpe_ratio": round(float(risk_parity['sharpe_ratio']), 4),
                "weights": {k: round(float(v * 100), 2) for k, v in risk_parity['weights'].items()},
                "var_metrics": var_risk_parity,
                "risk_contributions": rc_risk_parity
            },
            "current_portfolio": {
                "var_metrics": var_current
            },
            "rebalance_plans": rebalance_plans,
            "benchmark_info": {
                "ticker": benchmark_ticker,
                "name": benchmark_name,
                "risk_free_rate_pct": round(float(risk_free_rate * 100), 2)
            },
            "efficient_frontier": {
                "volatility": [round(float(v * 100), 2) for v in frontier['Volatility']],
                "return": [round(float(r * 100), 2) for r in frontier['Return']]
            },
            "random_portfolios": {
                "volatility": [round(float(v * 100), 2) for v in random_ports['Volatility'][:200]],
                "return": [round(float(r * 100), 2) for r in random_ports['Return'][:200]],
                "sharpe": [round(float(s), 3) for s in random_ports['Sharpe Ratio'][:200]]
            },
            "cumulative_growth": {
                "dates": dates_list,
                "series": cum_returns
            },
            "risk_metrics": {
                "beta": round(beta, 2),
                "max_drawdown_pct": round(max_dd, 2),
                "drawdown_history": drawdown_history[::max(1, len(drawdown_history) // 100)] # Sample up to 100 pts
            },
            "stress_tests": stress_results,
            "data_source": "live",
            "fetched_at": datetime.utcnow().isoformat() + "Z"
        }

        now_ts = datetime.utcnow().isoformat() + "Z"
        return ApiResponse(success=True, data_source="live", fetched_at=now_ts, data=sanitize_for_json(response_data))

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        return ApiResponse(success=False, message=f"Portfolio optimization error: {str(e)}\n{traceback.format_exc()}")


@router.post("/stress-test", response_model=ApiResponse)
async def run_portfolio_stress_test(req: StressTestRequest):
    """
    Simulates multi-factor macro stress shocks and empirical crisis replays
    with asset-level covariance and factor sensitivity modeling (STRESS-01).
    """
    try:
        raw_tickers = [t.strip().upper() for t in req.tickers if t.strip()]
        if not raw_tickers:
            raise HTTPException(status_code=400, detail="Please provide at least 1 valid ticker symbol.")

        start_date = req.start_date or "2022-01-01"
        end_date = datetime.utcnow().strftime("%Y-%m-%d")

        fetcher = DataFetcher(tickers=raw_tickers, start_date=start_date, end_date=end_date)
        stock_data = fetcher.fetch_stock_data(save_to_csv=False)

        if stock_data is None or stock_data.empty:
            raise HTTPException(status_code=404, detail="Could not fetch market data for the requested tickers.")

        fetched_tickers = stock_data.columns.tolist()
        if not fetched_tickers:
            raise HTTPException(status_code=404, detail="No historical price series found for tickers.")

        returns_analyzer = ReturnsAnalysis(stock_data)
        daily_returns = returns_analyzer.calculate_daily_returns().dropna()

        initial_capital = float(req.initial_capital or 100000.0)
        default_weight = 100.0 / len(fetched_tickers)
        weights_dict = req.weights or {t: default_weight for t in fetched_tickers}

        # 1. Interactive Macro Slider Simulation
        custom_simulation = MultiFactorStressEngine.simulate_macro_shock(
            returns_df=daily_returns[fetched_tickers],
            weights_dict=weights_dict,
            market_shock_pct=float(req.market_shock_pct if req.market_shock_pct is not None else -15.0),
            rate_shock_bps=float(req.rate_shock_bps if req.rate_shock_bps is not None else 100.0),
            commodity_shock_pct=float(req.commodity_shock_pct if req.commodity_shock_pct is not None else 0.0),
            vix_shock_pct=float(req.vix_shock_pct if req.vix_shock_pct is not None else 50.0),
            initial_capital=initial_capital
        )

        # 2. Empirical Historical Crisis Replays
        crisis_replays = MultiFactorStressEngine.run_crisis_replays(
            returns_df=daily_returns[fetched_tickers],
            weights_dict=weights_dict,
            initial_capital=initial_capital
        )

        # 3. Asset Sensitivities
        sensitivities = MultiFactorStressEngine.compute_asset_sensitivities(daily_returns[fetched_tickers])

        response_data = {
            "tickers": fetched_tickers,
            "weights": weights_dict,
            "initial_capital": initial_capital,
            "custom_simulation": custom_simulation,
            "crisis_replays": crisis_replays,
            "asset_sensitivities": sensitivities,
            "historical_scenarios_meta": HISTORICAL_CRISIS_SCENARIOS,
            "provenance": {
                "method": "multi_factor_covariance_sensitivity",
                "start_date": start_date,
                "end_date": end_date
            }
        }

        now_ts = datetime.utcnow().isoformat() + "Z"
        return ApiResponse(success=True, data_source="live", fetched_at=now_ts, data=sanitize_for_json(response_data))
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        return ApiResponse(success=False, message=f"Stress test simulation error: {str(e)}\n{traceback.format_exc()}")

