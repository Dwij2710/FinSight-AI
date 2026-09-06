"""
Portfolio Optimizer Module
Implements Mean-Variance Optimization and Efficient Frontier generation
"""
import pandas as pd
import numpy as np
from scipy.optimize import minimize
import sys
from pathlib import Path

_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)
from config.config import TRADING_DAYS, RISK_FREE_RATE


class PortfolioOptimizer:
    """
    Class to perform portfolio optimization using Modern Portfolio Theory
    """
    
    def __init__(self, returns_data, risk_free_rate=None, use_shrinkage=True):
        """
        Initialize with returns data
        
        Args:
            returns_data: DataFrame with daily returns
            risk_free_rate: Annual risk-free rate
            use_shrinkage: Whether to use Ledoit-Wolf covariance shrinkage
        """
        self.returns = returns_data
        self.risk_free_rate = risk_free_rate if risk_free_rate is not None else RISK_FREE_RATE
        self.use_shrinkage = use_shrinkage
        self.n_assets = len(returns_data.columns)
        self.assets = returns_data.columns.tolist()
        
        # Calculate expected returns and covariance
        self.expected_returns = self._calculate_expected_returns()
        self.cov_matrix = self._calculate_covariance()
        
    def _calculate_expected_returns(self):
        """
        Calculate annualized expected returns for each asset
        
        Returns:
            Array of expected returns
        """
        return self.returns.mean() * TRADING_DAYS
    
    def _calculate_covariance(self):
        """
        Calculate annualized covariance matrix using Ledoit-Wolf shrinkage
        when possible for numerical stability, falling back to sample covariance.
        
        Returns:
            Covariance matrix
        """
        if self.use_shrinkage and len(self.returns) > self.n_assets:
            try:
                from sklearn.covariance import LedoitWolf
                lw = LedoitWolf()
                clean_returns = self.returns.dropna()
                lw.fit(clean_returns.values)
                shrunk_cov = lw.covariance_ * TRADING_DAYS
                return pd.DataFrame(shrunk_cov, index=self.returns.columns, columns=self.returns.columns)
            except Exception:
                pass
        return self.returns.cov() * TRADING_DAYS
    
    def _portfolio_return(self, weights):
        """
        Calculate portfolio return
        
        Args:
            weights: Portfolio weights
            
        Returns:
            Expected portfolio return
        """
        return np.dot(weights, self.expected_returns)
    
    def _portfolio_volatility(self, weights):
        """
        Calculate portfolio volatility
        
        Args:
            weights: Portfolio weights
            
        Returns:
            Portfolio standard deviation
        """
        return np.sqrt(np.dot(weights.T, np.dot(self.cov_matrix, weights)))
    
    def _negative_sharpe_ratio(self, weights):
        """
        Calculate negative Sharpe ratio (for minimization)
        
        Args:
            weights: Portfolio weights
            
        Returns:
            Negative Sharpe ratio
        """
        ret = self._portfolio_return(weights)
        vol = self._portfolio_volatility(weights)
        if vol <= 1e-8:
            return 0.0
        return -(ret - self.risk_free_rate) / vol
    
    def optimize_sharpe_ratio(self):
        """
        Find the portfolio with maximum Sharpe ratio
        
        Returns:
            Dict with optimal weights, return, volatility, and Sharpe ratio
        """
        # Initial guess (equal weights)
        init_weights = np.array([1/self.n_assets] * self.n_assets)
        
        # Constraints
        constraints = [
            {'type': 'eq', 'fun': lambda w: np.sum(w) - 1}  # Weights sum to 1
        ]
        
        # Bounds (no short selling)
        bounds = tuple((0, 1) for _ in range(self.n_assets))
        
        # Optimize
        result = minimize(
            self._negative_sharpe_ratio,
            init_weights,
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )
        
        optimal_weights = result.x
        optimal_return = self._portfolio_return(optimal_weights)
        optimal_volatility = self._portfolio_volatility(optimal_weights)
        safe_vol = optimal_volatility if optimal_volatility > 1e-8 else 1e-8
        optimal_sharpe = (optimal_return - self.risk_free_rate) / safe_vol
        
        return {
            'weights': dict(zip(self.assets, optimal_weights)),
            'return': optimal_return,
            'volatility': optimal_volatility,
            'sharpe_ratio': optimal_sharpe
        }
    
    def optimize_min_volatility(self):
        """
        Find the minimum volatility portfolio
        
        Returns:
            Dict with optimal weights, return, volatility
        """
        # Initial guess
        init_weights = np.array([1/self.n_assets] * self.n_assets)
        
        # Constraints
        constraints = [
            {'type': 'eq', 'fun': lambda w: np.sum(w) - 1}
        ]
        
        # Bounds
        bounds = tuple((0, 1) for _ in range(self.n_assets))
        
        # Optimize
        result = minimize(
            self._portfolio_volatility,
            init_weights,
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )
        
        optimal_weights = result.x
        optimal_return = self._portfolio_return(optimal_weights)
        optimal_volatility = self._portfolio_volatility(optimal_weights)
        
        safe_vol = optimal_volatility if optimal_volatility > 1e-8 else 1e-8
        return {
            'weights': dict(zip(self.assets, optimal_weights)),
            'return': optimal_return,
            'volatility': optimal_volatility,
            'sharpe_ratio': (optimal_return - self.risk_free_rate) / safe_vol
        }
    
    def optimize_risk_parity(self):
        """
        Find the Equal Risk Contribution (Risk Parity) portfolio.
        Every asset contributes an equal share of overall portfolio volatility.
        
        Returns:
            Dict with optimal weights, return, volatility, and Sharpe ratio
        """
        init_weights = np.array([1/self.n_assets] * self.n_assets)
        cov = self.cov_matrix.values if hasattr(self.cov_matrix, 'values') else np.array(self.cov_matrix)

        def risk_budget_objective(weights):
            w = np.array(weights)
            port_vol = np.sqrt(np.dot(w.T, np.dot(cov, w)))
            if port_vol <= 1e-8:
                return 0.0
            # Marginal risk contribution
            mrc = np.dot(cov, w) / port_vol
            # Total risk contribution
            rc = w * mrc
            target_rc = port_vol / self.n_assets
            return np.sum(np.square(rc - target_rc))

        constraints = [{'type': 'eq', 'fun': lambda w: np.sum(w) - 1.0}]
        bounds = tuple((1e-4, 1.0) for _ in range(self.n_assets))

        result = minimize(
            risk_budget_objective,
            init_weights,
            method='SLSQP',
            bounds=bounds,
            constraints=constraints,
            options={'ftol': 1e-9, 'maxiter': 500}
        )

        optimal_weights = result.x if result.success else init_weights
        optimal_weights = optimal_weights / np.sum(optimal_weights)
        optimal_return = self._portfolio_return(optimal_weights)
        optimal_volatility = self._portfolio_volatility(optimal_weights)
        optimal_sharpe = (optimal_return - self.risk_free_rate) / optimal_volatility

        return {
            'weights': dict(zip(self.assets, optimal_weights)),
            'return': optimal_return,
            'volatility': optimal_volatility,
            'sharpe_ratio': optimal_sharpe
        }

    def calculate_risk_contributions(self, weights):
        """
        Calculate Marginal and Percentage Risk Contributions (MRC and PRC)
        for each asset given portfolio weights.

        Args:
            weights: dict of {asset: weight} or array-like

        Returns:
            Dict containing volatility, marginal_risk_contribution, and percentage_risk_contribution
        """
        if isinstance(weights, dict):
            w = np.array([weights.get(a, 0.0) for a in self.assets], dtype=float)
        else:
            w = np.array(weights, dtype=float)
        w = w / np.sum(w)

        cov = self.cov_matrix.values if hasattr(self.cov_matrix, 'values') else np.array(self.cov_matrix)
        port_vol = np.sqrt(np.dot(w.T, np.dot(cov, w)))

        if port_vol <= 1e-8:
            mrc = np.zeros(self.n_assets)
            prc = np.full(self.n_assets, 100.0 / self.n_assets)
        else:
            mrc = np.dot(cov, w) / port_vol
            trc = w * mrc  # Total risk contribution in vol units
            prc = (trc / port_vol) * 100.0  # Percentage of total risk

        return {
            "portfolio_volatility": float(port_vol),
            "marginal_risk_contributions": dict(zip(self.assets, [round(float(v), 4) for v in mrc])),
            "percentage_risk_contributions": dict(zip(self.assets, [round(float(v), 2) for v in prc]))
        }

    def calculate_var_cvar(self, weights, initial_capital=100000.0):
        """
        Calculate Parametric VaR, Historical VaR, and Conditional VaR (Expected Shortfall)
        at 95% and 99% confidence levels for 1-day and 10-day holding periods.

        Args:
            weights: dict of {asset: weight} or array-like
            initial_capital: Portfolio equity value in currency units

        Returns:
            Dict with parametric and historical VaR/CVaR in % and currency units.
        """
        if isinstance(weights, dict):
            w = np.array([weights.get(a, 0.0) for a in self.assets], dtype=float)
        else:
            w = np.array(weights, dtype=float)
        w = w / np.sum(w)

        # 1. Calculate historical portfolio daily return series
        clean_returns = self.returns.dropna()
        if clean_returns.empty:
            port_returns = pd.Series([0.0])
        else:
            port_returns = clean_returns.dot(w)

        # Daily mean and standard deviation
        mu_daily = float(port_returns.mean())
        sigma_daily = float(port_returns.std())
        if np.isnan(sigma_daily) or sigma_daily < 1e-8:
            sigma_daily = 1e-6

        # Normal z-scores
        z_95 = 1.6448536269514722
        z_99 = 2.3263478740408408

        # --- Parametric VaR (1-day & 10-day) ---
        # VaR expressed as positive percentage loss: VaR = z * sigma - mu
        param_var_95_1d = max(0.0, (z_95 * sigma_daily - mu_daily) * 100.0)
        param_var_99_1d = max(0.0, (z_99 * sigma_daily - mu_daily) * 100.0)
        param_var_95_10d = max(0.0, (z_95 * sigma_daily * np.sqrt(10) - mu_daily * 10) * 100.0)
        param_var_99_10d = max(0.0, (z_99 * sigma_daily * np.sqrt(10) - mu_daily * 10) * 100.0)

        # --- Historical VaR (1-day & 10-day) ---
        # 95% VaR is the negative of the 5th percentile
        p5 = np.percentile(port_returns, 5.0) if len(port_returns) > 5 else -param_var_95_1d / 100.0
        p1 = np.percentile(port_returns, 1.0) if len(port_returns) > 5 else -param_var_99_1d / 100.0

        hist_var_95_1d = max(0.0, float(-p5 * 100.0))
        hist_var_99_1d = max(0.0, float(-p1 * 100.0))
        hist_var_95_10d = hist_var_95_1d * np.sqrt(10)
        hist_var_99_10d = hist_var_99_1d * np.sqrt(10)

        # --- Conditional VaR (Expected Shortfall / CVaR) ---
        # Average loss given that loss exceeds VaR threshold
        tail_95 = port_returns[port_returns <= p5]
        if len(tail_95) > 0:
            cvar_95_1d = max(hist_var_95_1d, float(-tail_95.mean() * 100.0))
        else:
            cvar_95_1d = hist_var_95_1d * 1.25

        tail_99 = port_returns[port_returns <= p1]
        if len(tail_99) > 0:
            cvar_99_1d = max(hist_var_99_1d, float(-tail_99.mean() * 100.0))
        else:
            cvar_99_1d = hist_var_99_1d * 1.25

        cvar_95_10d = cvar_95_1d * np.sqrt(10)
        cvar_99_10d = cvar_99_1d * np.sqrt(10)

        cap = float(initial_capital)
        p_95_1d = round(param_var_95_1d, 2)
        p_99_1d = round(param_var_99_1d, 2)
        p_95_10d = round(param_var_95_10d, 2)
        p_99_10d = round(param_var_99_10d, 2)

        h_95_1d = round(hist_var_95_1d, 2)
        h_99_1d = round(hist_var_99_1d, 2)
        h_95_10d = round(hist_var_95_10d, 2)
        h_99_10d = round(hist_var_99_10d, 2)

        c_95_1d = round(cvar_95_1d, 2)
        c_99_1d = round(cvar_99_1d, 2)
        c_95_10d = round(cvar_95_10d, 2)
        c_99_10d = round(cvar_99_10d, 2)

        return {
            "confidence_levels": ["95%", "99%"],
            "horizons": ["1-Day", "10-Day"],
            "parametric_var": {
                "var_95_1d_pct": p_95_1d,
                "var_99_1d_pct": p_99_1d,
                "var_95_10d_pct": p_95_10d,
                "var_99_10d_pct": p_99_10d,
                "var_95_1d_usd": round(cap * (p_95_1d / 100.0), 2),
                "var_99_1d_usd": round(cap * (p_99_1d / 100.0), 2),
                "var_95_10d_usd": round(cap * (p_95_10d / 100.0), 2),
                "var_99_10d_usd": round(cap * (p_99_10d / 100.0), 2),
            },
            "historical_var": {
                "var_95_1d_pct": h_95_1d,
                "var_99_1d_pct": h_99_1d,
                "var_95_10d_pct": h_95_10d,
                "var_99_10d_pct": h_99_10d,
                "var_95_1d_usd": round(cap * (h_95_1d / 100.0), 2),
                "var_99_1d_usd": round(cap * (h_99_1d / 100.0), 2),
                "var_95_10d_usd": round(cap * (h_95_10d / 100.0), 2),
                "var_99_10d_usd": round(cap * (h_99_10d / 100.0), 2),
            },
            "cvar_expected_shortfall": {
                "cvar_95_1d_pct": c_95_1d,
                "cvar_99_1d_pct": c_99_1d,
                "cvar_95_10d_pct": c_95_10d,
                "cvar_99_10d_pct": c_99_10d,
                "cvar_95_1d_usd": round(cap * (c_95_1d / 100.0), 2),
                "cvar_99_1d_usd": round(cap * (c_99_1d / 100.0), 2),
                "cvar_95_10d_usd": round(cap * (c_95_10d / 100.0), 2),
                "cvar_99_10d_usd": round(cap * (c_99_10d / 100.0), 2),
            }
        }

    def generate_rebalance_orders(self, current_weights, target_weights, total_capital=100000.0, current_prices=None):
        """
        Generate actionable rebalance orders (shares & dollar amounts)
        to transition from current allocation to target allocation.
        Enforces 5 bps commission and 2 bps slippage friction estimation.

        Args:
            current_weights: Dict {asset: weight} (0-1 or 0-100)
            target_weights: Dict {asset: weight} (0-1 or 0-100)
            total_capital: Total portfolio value
            current_prices: Optional dict {asset: price}

        Returns:
            Dict containing order ledger, turnover, and friction drag
        """
        # Normalize inputs to 0-1
        curr_map = {}
        for a in self.assets:
            w = current_weights.get(a, 0.0) if current_weights else (1.0 / self.n_assets)
            curr_map[a] = w / 100.0 if w > 1.0 else w

        # Ensure sum to 1
        curr_sum = sum(curr_map.values())
        if curr_sum > 0:
            curr_map = {a: w / curr_sum for a, w in curr_map.items()}

        targ_map = {}
        for a in self.assets:
            w = target_weights.get(a, 0.0)
            targ_map[a] = w / 100.0 if w > 1.0 else w
        targ_sum = sum(targ_map.values())
        if targ_sum > 0:
            targ_map = {a: w / targ_sum for a, w in targ_map.items()}

        if current_prices is None:
            current_prices = {}

        orders = []
        total_buys = 0.0
        total_sells = 0.0

        for asset in self.assets:
            c_pct = curr_map.get(asset, 0.0)
            t_pct = targ_map.get(asset, 0.0)
            price = current_prices.get(asset, 100.0)
            if price <= 0:
                price = 100.0

            curr_val = total_capital * c_pct
            targ_val = total_capital * t_pct
            delta_val = targ_val - curr_val
            delta_shares = int(round(delta_val / price))

            # Action threshold: $25 or 0.25% of portfolio
            threshold = max(25.0, total_capital * 0.0025)
            if delta_val > threshold and delta_shares > 0:
                action = "BUY"
                total_buys += delta_val
            elif delta_val < -threshold and delta_shares < 0:
                action = "SELL"
                total_sells += abs(delta_val)
            else:
                action = "HOLD"

            orders.append({
                "ticker": asset,
                "action": action,
                "current_weight_pct": round(c_pct * 100.0, 2),
                "target_weight_pct": round(t_pct * 100.0, 2),
                "current_value": round(curr_val, 2),
                "target_value": round(targ_val, 2),
                "delta_value": round(delta_val, 2),
                "price": round(price, 2),
                "delta_shares": abs(delta_shares) if action != "HOLD" else 0
            })

        turnover = (total_buys + total_sells) / 2.0
        turnover_pct = (turnover / total_capital) * 100.0 if total_capital > 0 else 0.0
        # 5 bps fee + 2 bps slippage = 7 bps total friction
        estimated_friction_cost = (total_buys + total_sells) * 0.0007

        return {
            "total_capital": total_capital,
            "turnover_usd": round(turnover, 2),
            "turnover_pct": round(turnover_pct, 2),
            "estimated_friction_usd": round(estimated_friction_cost, 2),
            "orders": orders
        }
    
    def optimize_target_return(self, target_return):
        """
        Find minimum volatility portfolio for a target return
        
        Args:
            target_return: Desired portfolio return
            
        Returns:
            Dict with optimal weights, return, volatility
        """
        # Initial guess
        init_weights = np.array([1/self.n_assets] * self.n_assets)
        
        # Constraints
        constraints = [
            {'type': 'eq', 'fun': lambda w: np.sum(w) - 1},
            {'type': 'eq', 'fun': lambda w: self._portfolio_return(w) - target_return}
        ]
        
        # Bounds
        bounds = tuple((0, 1) for _ in range(self.n_assets))
        
        # Optimize
        result = minimize(
            self._portfolio_volatility,
            init_weights,
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )
        
        if not result.success:
            return None
        
        optimal_weights = result.x
        optimal_volatility = self._portfolio_volatility(optimal_weights)
        
        return {
            'weights': dict(zip(self.assets, optimal_weights)),
            'return': target_return,
            'volatility': optimal_volatility,
            'sharpe_ratio': (target_return - self.risk_free_rate) / optimal_volatility
        }
    
    def generate_efficient_frontier(self, n_portfolios=100):
        """
        Generate the efficient frontier
        
        Args:
            n_portfolios: Number of portfolios on the frontier
            
        Returns:
            DataFrame with frontier portfolios
        """
        # Get min and max return from current assets
        min_vol_portfolio = self.optimize_min_volatility()
        max_sharpe_portfolio = self.optimize_sharpe_ratio()
        
        min_return = min_vol_portfolio['return']
        max_return = max(self.expected_returns)
        
        # Generate target returns
        target_returns = np.linspace(min_return, max_return, n_portfolios)
        
        frontier = []
        for target in target_returns:
            result = self.optimize_target_return(target)
            if result is not None:
                frontier.append({
                    'Return': result['return'],
                    'Volatility': result['volatility'],
                    'Sharpe Ratio': result['sharpe_ratio'],
                    **{f'Weight_{asset}': result['weights'].get(asset, 0) 
                       for asset in self.assets}
                })
        
        return pd.DataFrame(frontier)
    
    def generate_random_portfolios(self, n_portfolios=5000):
        """
        Generate random portfolios for Monte Carlo simulation
        
        Args:
            n_portfolios: Number of random portfolios
            
        Returns:
            DataFrame with portfolio statistics
        """
        results = []
        
        for _ in range(n_portfolios):
            # Generate random weights
            weights = np.random.random(self.n_assets)
            weights = weights / np.sum(weights)  # Normalize to sum to 1
            
            ret = self._portfolio_return(weights)
            vol = self._portfolio_volatility(weights)
            sharpe = (ret - self.risk_free_rate) / vol
            
            results.append({
                'Return': ret,
                'Volatility': vol,
                'Sharpe Ratio': sharpe,
                **{f'Weight_{asset}': w for asset, w in zip(self.assets, weights)}
            })
        
        return pd.DataFrame(results)
    
    def get_equal_weight_portfolio(self):
        """
        Get equal-weighted portfolio statistics
        
        Returns:
            Dict with portfolio statistics
        """
        weights = np.array([1/self.n_assets] * self.n_assets)
        
        return {
            'weights': dict(zip(self.assets, weights)),
            'return': self._portfolio_return(weights),
            'volatility': self._portfolio_volatility(weights),
            'sharpe_ratio': (self._portfolio_return(weights) - self.risk_free_rate) / 
                           self._portfolio_volatility(weights)
        }
    
    def get_optimization_summary(self):
        """
        Get summary of all optimization results
        
        Returns:
            DataFrame with optimization summary
        """
        max_sharpe = self.optimize_sharpe_ratio()
        min_vol = self.optimize_min_volatility()
        risk_parity = self.optimize_risk_parity()
        equal_weight = self.get_equal_weight_portfolio()
        
        summary = pd.DataFrame({
            'Max Sharpe': {
                'Return (%)': max_sharpe['return'] * 100,
                'Volatility (%)': max_sharpe['volatility'] * 100,
                'Sharpe Ratio': max_sharpe['sharpe_ratio'],
                **{k: v * 100 for k, v in max_sharpe['weights'].items()}
            },
            'Min Volatility': {
                'Return (%)': min_vol['return'] * 100,
                'Volatility (%)': min_vol['volatility'] * 100,
                'Sharpe Ratio': min_vol['sharpe_ratio'],
                **{k: v * 100 for k, v in min_vol['weights'].items()}
            },
            'Risk Parity': {
                'Return (%)': risk_parity['return'] * 100,
                'Volatility (%)': risk_parity['volatility'] * 100,
                'Sharpe Ratio': risk_parity['sharpe_ratio'],
                **{k: v * 100 for k, v in risk_parity['weights'].items()}
            },
            'Equal Weight': {
                'Return (%)': equal_weight['return'] * 100,
                'Volatility (%)': equal_weight['volatility'] * 100,
                'Sharpe Ratio': equal_weight['sharpe_ratio'],
                **{k: v * 100 for k, v in equal_weight['weights'].items()}
            }
        })
        
        return summary.round(2)


if __name__ == "__main__":
    # Test portfolio optimizer
    from data_fetcher import DataFetcher
    from returns_analysis import ReturnsAnalysis
    
    fetcher = DataFetcher()
    prices, _ = fetcher.get_all_data()
    
    returns_analyzer = ReturnsAnalysis(prices)
    daily_returns = returns_analyzer.calculate_daily_returns()
    
    optimizer = PortfolioOptimizer(daily_returns)
    
    print("\n" + "="*60)
    print("Portfolio Optimization Results")
    print("="*60)
    
    max_sharpe = optimizer.optimize_sharpe_ratio()
    print("\nMaximum Sharpe Ratio Portfolio:")
    print(f"Expected Return: {max_sharpe['return']*100:.2f}%")
    print(f"Volatility: {max_sharpe['volatility']*100:.2f}%")
    print(f"Sharpe Ratio: {max_sharpe['sharpe_ratio']:.4f}")
    print("\nOptimal Weights:")
    for asset, weight in max_sharpe['weights'].items():
        if weight > 0.01:  # Show only weights > 1%
            print(f"  {asset}: {weight*100:.2f}%")
    
    min_vol = optimizer.optimize_min_volatility()
    print("\n\nMinimum Volatility Portfolio:")
    print(f"Expected Return: {min_vol['return']*100:.2f}%")
    print(f"Volatility: {min_vol['volatility']*100:.2f}%")
    print(f"Sharpe Ratio: {min_vol['sharpe_ratio']:.4f}")
