"""
FinSight AI — Institutional Stress Testing & Scenario Analysis Engine (STRESS-01)
Performs historical crisis replays (2008 GFC, 2020 COVID, 2022 Rate Shock, 2000 Dot-com, 1987 Black Monday)
and interactive multi-factor macro stress simulations (equity market drop, interest rate shock, commodity spike, VIX surge)
with asset-level covariance and factor sensitivity modeling.
"""

import pandas as pd
import numpy as np
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional

_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from config.config import TRADING_DAYS, STRESS_SCENARIOS, VAR_CONFIDENCE_LEVELS


# Curated Historical Crisis Scenarios with Empirical Factor Shocks
HISTORICAL_CRISIS_SCENARIOS = [
    {
        "id": "gfc_2008",
        "name": "2008 Global Financial Crisis",
        "date_range": "Sep 2008 – Mar 2009",
        "market_shock_pct": -50.0,
        "rate_shock_bps": -300,
        "vix_shock_pct": 250.0,
        "commodity_shock_pct": -55.0,
        "description": "Subprime mortgage collapse, Lehman Brothers bankruptcy, systemic credit freeze, and flight to short-term sovereigns."
    },
    {
        "id": "covid_2020",
        "name": "2020 COVID Flash Crash",
        "date_range": "Feb 2020 – Mar 2020",
        "market_shock_pct": -34.0,
        "rate_shock_bps": -150,
        "vix_shock_pct": 350.0,
        "commodity_shock_pct": -60.0,
        "description": "Global pandemic lockdowns, liquidity crunch, record VIX spike to 82.69, and emergency central bank interventions."
    },
    {
        "id": "rate_shock_2022",
        "name": "2022 Stagflation & Rate Shock",
        "date_range": "Jan 2022 – Oct 2022",
        "market_shock_pct": -25.0,
        "rate_shock_bps": 425,
        "vix_shock_pct": 55.0,
        "commodity_shock_pct": 45.0,
        "description": "40-year high inflation, fastest global rate hiking cycle in 4 decades, severe tech valuation multiple compression, and bond rout."
    },
    {
        "id": "dotcom_2000",
        "name": "2000 Dot-com Bubble Bust",
        "date_range": "Mar 2000 – Oct 2002",
        "market_shock_pct": -49.0,
        "rate_shock_bps": -125,
        "vix_shock_pct": 80.0,
        "commodity_shock_pct": -15.0,
        "description": "Unprofitable dot-com speculative bubble burst, leading to a 78% peak-to-trough collapse in the NASDAQ and broad equity drawdown."
    },
    {
        "id": "black_monday_1987",
        "name": "1987 Black Monday",
        "date_range": "October 19, 1987",
        "market_shock_pct": -22.6,
        "rate_shock_bps": -50,
        "vix_shock_pct": 300.0,
        "commodity_shock_pct": -10.0,
        "description": "Single-day flash collapse driven by cascading automated portfolio insurance stop-losses and market illiquidity."
    }
]


class MultiFactorStressEngine:
    """
    Simulates multi-factor macro stress and historical crisis replays across multi-asset portfolios.
    """

    @classmethod
    def compute_asset_sensitivities(cls, returns_df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        """
        Estimates market beta, duration sensitivity proxy, and volatility sensitivity for each asset.
        """
        sensitivities: Dict[str, Dict[str, float]] = {}
        if returns_df.empty or len(returns_df.columns) == 0:
            return sensitivities

        # Equal-weighted benchmark return proxy
        market_returns = returns_df.mean(axis=1)
        market_var = market_returns.var()
        avg_vol = returns_df.std().mean() or 0.015

        for col in returns_df.columns:
            asset_ret = returns_df[col].dropna()
            asset_vol = asset_ret.std()

            # 1. Market Beta
            if market_var > 0 and len(asset_ret) > 10:
                cov = np.cov(asset_ret, market_returns.loc[asset_ret.index])[0, 1]
                beta = float(cov / market_var)
                beta = max(-0.5, min(3.0, beta))  # Clip extreme estimates
            else:
                beta = 1.0

            # 2. Interest Rate Sensitivity Proxy (% return per 100 bps rate increase)
            # Higher-volatility / growth assets face steeper valuation multiple compression
            vol_ratio = asset_vol / avg_vol if avg_vol > 0 else 1.0
            rate_sensitivity = -1.2 * beta * vol_ratio  # e.g., beta=1.5 -> -1.8% per 100 bps hike

            # 3. VIX Volatility Sensitivity (% return per 100% VIX surge)
            vix_sensitivity = -6.5 * beta

            # 4. Commodity Sensitivity (% return per 100% commodity surge)
            comm_sensitivity = 2.5 * (beta - 0.8)

            sensitivities[col] = {
                "beta": round(beta, 3),
                "volatility_annualized": round(float(asset_vol * np.sqrt(252)), 4),
                "rate_sensitivity": round(rate_sensitivity, 3),
                "vix_sensitivity": round(vix_sensitivity, 3),
                "comm_sensitivity": round(comm_sensitivity, 3)
            }

        return sensitivities

    @classmethod
    def simulate_macro_shock(
        cls,
        returns_df: pd.DataFrame,
        weights_dict: Dict[str, float],
        market_shock_pct: float = -15.0,
        rate_shock_bps: float = 100.0,
        commodity_shock_pct: float = 0.0,
        vix_shock_pct: float = 50.0,
        initial_capital: float = 100000.0
    ) -> Dict[str, Any]:
        """
        Computes dynamic multi-factor portfolio impact from custom macro stress sliders.
        """
        sensitivities = cls.compute_asset_sensitivities(returns_df)
        total_weight = sum(weights_dict.values()) or 1.0
        normalized_weights = {k: v / total_weight for k, v in weights_dict.items()}

        asset_results = []
        weighted_portfolio_return_pct = 0.0

        for ticker, weight in normalized_weights.items():
            sens = sensitivities.get(ticker, {
                "beta": 1.0,
                "rate_sensitivity": -1.2,
                "vix_sensitivity": -6.5,
                "comm_sensitivity": 0.0
            })

            # Calculate individual factor contributions to asset price shock
            beta_impact = sens["beta"] * market_shock_pct
            rate_impact = sens["rate_sensitivity"] * (rate_shock_bps / 100.0)
            vix_impact = sens["vix_sensitivity"] * (vix_shock_pct / 100.0)
            comm_impact = sens["comm_sensitivity"] * (commodity_shock_pct / 100.0)

            asset_shock_pct = beta_impact + rate_impact + vix_impact + comm_impact
            # Restrict asset loss to sensible maximum bounds (-95% to +150%)
            asset_shock_pct = max(-95.0, min(150.0, asset_shock_pct))

            pre_val = initial_capital * weight
            post_val = max(0.0, pre_val * (1.0 + asset_shock_pct / 100.0))
            dollar_pnl = post_val - pre_val

            weighted_portfolio_return_pct += weight * asset_shock_pct

            asset_results.append({
                "ticker": ticker,
                "weight_pct": round(weight * 100, 2),
                "beta": sens["beta"],
                "asset_shock_pct": round(asset_shock_pct, 2),
                "pre_shock_value": round(pre_val, 2),
                "post_shock_value": round(post_val, 2),
                "dollar_loss": round(dollar_pnl, 2)
            })

        post_capital = max(0.0, initial_capital * (1.0 + weighted_portfolio_return_pct / 100.0))
        dollar_drawdown = post_capital - initial_capital

        # Identify most vulnerable and most resilient assets
        sorted_assets = sorted(asset_results, key=lambda x: x["asset_shock_pct"])
        worst_asset = sorted_assets[0] if sorted_assets else None
        best_asset = sorted_assets[-1] if sorted_assets else None

        return {
            "market_shock_pct": market_shock_pct,
            "rate_shock_bps": rate_shock_bps,
            "commodity_shock_pct": commodity_shock_pct,
            "vix_shock_pct": vix_shock_pct,
            "initial_capital": round(initial_capital, 2),
            "post_shock_capital": round(post_capital, 2),
            "dollar_drawdown": round(dollar_drawdown, 2),
            "portfolio_impact_pct": round(weighted_portfolio_return_pct, 2),
            "worst_asset": worst_asset["ticker"] if worst_asset else None,
            "most_resilient_asset": best_asset["ticker"] if best_asset else None,
            "asset_breakdown": asset_results
        }

    @classmethod
    def run_crisis_replays(
        cls,
        returns_df: pd.DataFrame,
        weights_dict: Dict[str, float],
        initial_capital: float = 100000.0
    ) -> List[Dict[str, Any]]:
        """
        Evaluates the portfolio against all empirical historical crises.
        """
        crisis_results = []
        for crisis in HISTORICAL_CRISIS_SCENARIOS:
            sim = cls.simulate_macro_shock(
                returns_df=returns_df,
                weights_dict=weights_dict,
                market_shock_pct=crisis["market_shock_pct"],
                rate_shock_bps=crisis["rate_shock_bps"],
                commodity_shock_pct=crisis.get("commodity_shock_pct", 0.0),
                vix_shock_pct=crisis.get("vix_shock_pct", 0.0),
                initial_capital=initial_capital
            )

            crisis_results.append({
                "crisis_id": crisis["id"],
                "crisis_name": crisis["name"],
                "date_range": crisis["date_range"],
                "description": crisis["description"],
                "benchmark_shock_pct": crisis["market_shock_pct"],
                "portfolio_impact_pct": sim["portfolio_impact_pct"],
                "dollar_drawdown": sim["dollar_drawdown"],
                "post_shock_capital": sim["post_shock_capital"],
                "worst_asset": sim["worst_asset"],
                "most_resilient_asset": sim["most_resilient_asset"],
                "asset_breakdown": sim["asset_breakdown"]
            })

        return crisis_results


class StressTesting:
    """
    Class to perform stress testing and risk analysis.
    Preserved for backward compatibility while enhanced with MultiFactorStressEngine.
    """
    
    def __init__(self, returns_data, weights=None):
        self.returns = returns_data
        self.n_assets = len(returns_data.columns)
        self.weights = weights if weights is not None else np.array([1/self.n_assets] * self.n_assets)
        self.portfolio_returns = (self.returns * self.weights).sum(axis=1)
        
    def calculate_var(self, confidence_level=0.95, method='historical'):
        if method == 'historical':
            var = -np.percentile(self.portfolio_returns, (1 - confidence_level) * 100)
        elif method == 'parametric':
            from scipy.stats import norm
            mean = self.portfolio_returns.mean()
            std = self.portfolio_returns.std()
            z_score = norm.ppf(1 - confidence_level)
            var = -(mean + z_score * std)
        else:
            raise ValueError("Method must be 'historical' or 'parametric'")
        return var
    
    def calculate_cvar(self, confidence_level=0.95):
        var = self.calculate_var(confidence_level, method='historical')
        tail_returns = self.portfolio_returns[self.portfolio_returns <= -var]
        if len(tail_returns) == 0:
            return var
        return -tail_returns.mean()
    
    def calculate_drawdown(self):
        cumulative = (1 + self.portfolio_returns).cumprod()
        running_max = cumulative.cummax()
        return (cumulative - running_max) / running_max
    
    def calculate_max_drawdown(self):
        drawdown = self.calculate_drawdown()
        return drawdown.min()
    
    def calculate_drawdown_duration(self):
        drawdown = self.calculate_drawdown()
        is_drawdown = drawdown < 0
        drawdown_periods = []
        current_duration = 0
        
        for i, in_dd in enumerate(is_drawdown):
            if in_dd:
                current_duration += 1
            else:
                if current_duration > 0:
                    drawdown_periods.append(current_duration)
                current_duration = 0
        
        if current_duration > 0:
            drawdown_periods.append(current_duration)
        
        if len(drawdown_periods) == 0:
            return {'max_duration_days': 0, 'avg_duration_days': 0, 'count': 0}
        
        return {
            'max_duration_days': max(drawdown_periods),
            'avg_duration_days': float(np.mean(drawdown_periods)),
            'count': len(drawdown_periods)
        }
    
    def calculate_recovery_time(self):
        cumulative = (1 + self.portfolio_returns).cumprod()
        running_max = cumulative.cummax()
        drawdown = (cumulative - running_max) / running_max
        max_dd_idx = drawdown.idxmin()
        peak_value = running_max.loc[max_dd_idx]
        post_dd = cumulative.loc[max_dd_idx:]
        recovery_mask = post_dd >= peak_value
        
        if recovery_mask.any():
            recovery_idx = recovery_mask.idxmax()
            return (recovery_idx - max_dd_idx).days
        else:
            return None
    
    def _estimate_portfolio_beta(self):
        try:
            portfolio_vol = self.portfolio_returns.std()
            avg_stock_vol = self.returns.std().mean()
            if avg_stock_vol > 0:
                return float(portfolio_vol / avg_stock_vol)
        except Exception:
            pass
        return 1.0
    
    def run_stress_tests(self, scenarios=None, beta=None):
        scenarios = scenarios or STRESS_SCENARIOS
        if beta is None:
            beta = self._estimate_portfolio_beta()
        
        results = []
        for scenario_name, market_return in scenarios.items():
            portfolio_impact = market_return * beta
            results.append({
                'Scenario': scenario_name,
                'Market Impact (%)': market_return * 100,
                'Portfolio Impact (%)': portfolio_impact * 100,
                'Portfolio Value (assuming 100)': 100 * (1 + portfolio_impact)
            })
        return pd.DataFrame(results)
    
    def calculate_tail_risk_metrics(self):
        return {
            'VaR 95% (daily %)': float(self.calculate_var(0.95) * 100),
            'VaR 99% (daily %)': float(self.calculate_var(0.99) * 100),
            'CVaR 95% (daily %)': float(self.calculate_cvar(0.95) * 100),
            'CVaR 99% (daily %)': float(self.calculate_cvar(0.99) * 100),
            'Max Drawdown (%)': float(self.calculate_max_drawdown() * 100),
            'Skewness': float(self.portfolio_returns.skew()),
            'Kurtosis': float(self.portfolio_returns.kurtosis()),
        }
    
    def calculate_worst_periods(self, n=5, period='D'):
        if period == 'M':
            returns = self.portfolio_returns.resample('ME').apply(lambda x: (1 + x).prod() - 1)
        else:
            returns = self.portfolio_returns
        worst = returns.nsmallest(n)
        return pd.DataFrame({'Date': [str(d) for d in worst.index], 'Return (%)': worst.values * 100})
    
    def calculate_best_periods(self, n=5, period='D'):
        if period == 'M':
            returns = self.portfolio_returns.resample('ME').apply(lambda x: (1 + x).prod() - 1)
        else:
            returns = self.portfolio_returns
        best = returns.nlargest(n)
        return pd.DataFrame({'Date': [str(d) for d in best.index], 'Return (%)': best.values * 100})
    
    def get_stress_test_summary(self):
        dd_duration = self.calculate_drawdown_duration()
        recovery = self.calculate_recovery_time()
        return {
            'tail_risk_metrics': self.calculate_tail_risk_metrics(),
            'stress_scenarios': self.run_stress_tests().to_dict(orient="records"),
            'worst_5_days': self.calculate_worst_periods(5, 'D').to_dict(orient="records"),
            'worst_5_months': self.calculate_worst_periods(5, 'M').to_dict(orient="records"),
            'drawdown_duration': dd_duration,
            'recovery_time_days': recovery if recovery else 'Not yet recovered'
        }
