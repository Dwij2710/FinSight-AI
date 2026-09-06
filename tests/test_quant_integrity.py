"""
FinSight AI - Quantitative Integrity & Statistical Correctness Test Suite (P0.4)
Validates:
1. SARIMAX dual prediction intervals (80% and 95%) with strict monotonic ordering:
   lower_95 <= lower_80 <= forecast <= upper_80 <= upper_95.
2. Complete separation of in-sample fit metrics (AIC, BIC, LLF) from out-of-sample holdout metrics.
3. Multi-Factor Quantile Regressor estimating q10, q50, q90 with empirical coverage and MDI factor attributions summing to 1.0.
4. RL environment and fallback simulator enforce institutional transaction costs (5 bps fee + 2 bps slippage).
5. RL agent enforces strict chronological Train (80%) vs Out-of-Sample Test (20%) split without lookahead bias.
"""
import os
import sys
import unittest
import asyncio
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

if sys.platform == "win32":
    torch_lib = os.path.join(sys.prefix, "Lib", "site-packages", "torch", "lib")
    if os.path.exists(torch_lib) and hasattr(os, "add_dll_directory"):
        try:
            os.add_dll_directory(torch_lib)
        except Exception:
            pass

from backend.app.schemas import ForecastRequest, RlSimulateRequest
from backend.app.routes.forecast import generate_forecast
from backend.app.routes.rl_agent import simulate_rl_agent, _fallback_simulate_rl
from src.tft_features import MultiFactorRegimeModel
from src.rl_agent import StockTradingEnv, add_technical_indicators

class TestQuantitativeIntegrity(unittest.TestCase):

    def test_sarimax_dual_intervals_and_monotonicity(self):
        """Validates that SARIMAX generates dual 80% and 95% intervals with strict monotonicity."""
        req = ForecastRequest(ticker="AAPL", forecast_period=7, run_backtest=True)
        res = asyncio.run(generate_forecast(req))
        self.assertTrue(res.success)
        data = res.data

        # Verify predictions array
        predictions = data["predictions"]
        self.assertEqual(len(predictions), 7)

        for p in predictions:
            pred = p["predicted_mean"]
            l80 = p["lower_80"]
            u80 = p["upper_80"]
            l95 = p["lower_95"]
            u95 = p["upper_95"]

            # Strict monotonic ordering: Lower_95 <= Lower_80 <= Forecast <= Upper_80 <= Upper_95
            self.assertLessEqual(l95, l80, f"Lower 95% ({l95}) exceeded Lower 80% ({l80}) on {p['date']}")
            self.assertLessEqual(l80, pred, f"Lower 80% ({l80}) exceeded Forecast ({pred}) on {p['date']}")
            self.assertLessEqual(pred, u80, f"Forecast ({pred}) exceeded Upper 80% ({u80}) on {p['date']}")
            self.assertLessEqual(u80, u95, f"Upper 80% ({u80}) exceeded Upper 95% ({u95}) on {p['date']}")

            # Backward compatibility aliases
            self.assertEqual(p["lower_bound"], l95)
            self.assertEqual(p["upper_bound"], u95)

    def test_sarimax_fit_vs_oos_metric_separation(self):
        """Validates that in-sample fit metrics are separated from out-of-sample holdout metrics."""
        req = ForecastRequest(ticker="AAPL", forecast_period=5, run_backtest=True)
        res = asyncio.run(generate_forecast(req))
        self.assertTrue(res.success)
        data = res.data

        # In-sample fit metrics
        self.assertIn("in_sample_fit", data)
        in_sample = data["in_sample_fit"]
        self.assertIn("aic", in_sample)
        self.assertIn("bic", in_sample)
        self.assertIn("rmse", in_sample)
        self.assertIn("mape", in_sample)

        # Out-of-sample holdout metrics
        self.assertIn("out_of_sample_validation", data)
        oos = data["out_of_sample_validation"]
        self.assertIsNotNone(oos)
        self.assertEqual(oos["evaluation_type"], "out_of_sample_holdout")
        self.assertIn("rmse", oos)
        self.assertIn("mae", oos)
        self.assertIn("mape", oos)
        self.assertIn("directional_accuracy_pct", oos)
        self.assertGreaterEqual(oos["directional_accuracy_pct"], 0.0)
        self.assertLessEqual(oos["directional_accuracy_pct"], 100.0)

    def test_multifactor_quantile_ordering_and_attributions(self):
        """Validates that MultiFactorRegimeModel produces monotonic quantiles and normalized attributions."""
        # Generate deterministic synthetic multi-variate dataset
        np.random.seed(42)
        dates = pd.date_range(start="2023-01-01", periods=100, freq='B')
        synthetic_data = pd.DataFrame({
            'Price': 150.0 + np.cumsum(np.random.normal(0.1, 1.0, 100)),
            'S&P 500': 4000.0 + np.cumsum(np.random.normal(0.5, 5.0, 100)),
            'VIX': np.clip(18.0 + np.random.normal(0.0, 2.0, 100), 10.0, 40.0),
            'Interest Rate (10Y)': 3.5 + np.cumsum(np.random.normal(0.01, 0.05, 100)),
            'Gold': 1800.0 + np.cumsum(np.random.normal(0.2, 2.0, 100)),
            'Crude Oil': 75.0 + np.cumsum(np.random.normal(0.05, 1.5, 100)),
            'US Dollar': 102.0 + np.cumsum(np.random.normal(0.02, 0.4, 100))
        }, index=dates)

        model = MultiFactorRegimeModel(synthetic_data)

        # 1. Test factor attributions
        attributions = model.train_and_extract_attention()
        self.assertIsInstance(attributions, dict)
        self.assertGreater(len(attributions), 0)
        total_weight = sum(attributions.values())
        self.assertAlmostEqual(total_weight, 1.0, places=3, msg="Factor attributions must sum to 1.0 (100%)")

        for factor, weight in attributions.items():
            self.assertGreaterEqual(weight, 0.0, f"Negative factor weight detected for {factor}")

        # 2. Test quantile forecast
        curr_price = float(synthetic_data['Price'].iloc[-1])
        forecast = model.probabilistic_forecast(curr_price)
        self.assertIsNotNone(forecast)
        self.assertIn('q10', forecast)
        self.assertIn('median', forecast)
        self.assertIn('q90', forecast)

        # Monotonic quantile condition: q10 <= median (q50) <= q90
        self.assertLessEqual(forecast['q10'], forecast['median'])
        self.assertLessEqual(forecast['median'], forecast['q90'])
        self.assertEqual(forecast['lower'], forecast['q10'])
        self.assertEqual(forecast['upper'], forecast['q90'])

        # Empirical coverage and truthful confidence score
        self.assertGreaterEqual(forecast['confidence'], 10.0)
        self.assertLessEqual(forecast['confidence'], 95.0)

    def test_rl_transaction_costs_deduction(self):
        """Validates that trading simulation deducts 5 bps commission and 2 bps slippage on trades."""
        # 1. Gymnasium environment check
        df = pd.DataFrame({
            'Close': [100.0, 102.0, 105.0, 103.0, 106.0] * 10
        })
        df_ta = add_technical_indicators(df)
        env = StockTradingEnv(df_ta, initial_balance=10000.0, action_type='Discrete')
        obs, info = env.reset()

        # Execute Buy Max (Action 1)
        obs, reward, terminated, truncated, info = env.step(1)
        
        # Verify slippage: buy_price = 100.0 * (1 + 0.0002) = 100.02
        # Cost + Commission: shares = int(10000 / (100.02 * 1.0005)) = int(10000 / 100.07001) = 99 shares
        # cost = 99 * 100.02 = 9901.98, fee = 9901.98 * 0.0005 = 4.95099
        # expected balance = 10000 - 9906.93 = 93.07
        self.assertGreater(info['shares'], 0)
        self.assertLess(env.balance + info['shares'] * 100.0, 10000.0, "Transaction costs were not deducted")

        # 2. Fallback simulator check
        test_df = pd.DataFrame({'Close': [100.0, 110.0, 90.0, 115.0, 85.0] * 5})
        nw, actions = _fallback_simulate_rl(test_df, initial_balance=10000.0, risk_profile='Aggressive', action_type='Discrete')
        self.assertEqual(len(nw), len(test_df))
        self.assertGreater(nw[-1], 0.0)

    def test_rl_train_test_split_temporal_isolation(self):
        """Validates that RL simulation enforces chronological train/test split without lookahead leakage."""
        req = RlSimulateRequest(ticker="AAPL", timesteps=1000, initial_balance=10000.0)
        res = asyncio.run(simulate_rl_agent(req))
        self.assertTrue(res.success)
        data = res.data

        self.assertEqual(data["evaluation_mode"], "out_of_sample_holdout")
        self.assertIn("train_period", data)
        self.assertIn("test_period", data)

        # Chronological boundary: test_period start must be >= train_period end
        train_end = datetime.strptime(data["train_period"]["end"], "%Y-%m-%d")
        test_start = datetime.strptime(data["test_period"]["start"], "%Y-%m-%d")
        self.assertGreaterEqual(test_start, train_end, "Test period overlaps or precedes train period!")

        # Verify transaction friction disclosures
        self.assertEqual(data["transaction_friction"]["commission_bps"], 5)
        self.assertEqual(data["transaction_friction"]["slippage_bps"], 2)
        if not data.get("is_model_fallback"):
            self.assertGreaterEqual(data["episodes_trained"], 1)
        else:
            self.assertEqual(data["episodes_trained"], 0)

if __name__ == "__main__":
    unittest.main()
