"""
FinSight AI - Data Leakage & Look-Ahead Prevention Test Suite (P0.5)
Verifies:
1. Feature Invariance: Features at time t do NOT change when future prices at t+k (k >= 1) are modified.
2. Scaler Isolation: Scalers (MinMaxScaler) are fit strictly on training partitions; extreme outliers
   in the test partition do NOT leak into training scaler parameters (data_min_, data_max_).
3. Temporal Sorting: Unordered or reverse-chronological datasets are sorted ascending before computing
   rolling indicators or differences.
4. Target Shifting: Target variables are aligned strictly with t+1 without contaminating feature columns at time t.
"""
import unittest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

from src.rl_agent import add_technical_indicators
from src.tft_features import MultiFactorRegimeModel
from src.ai_features import NeuralNetForecaster, TrendClassifier, LSTMForecaster

class TestDataLeakagePrevention(unittest.TestCase):

    def setUp(self):
        np.random.seed(42)
        self.dates = pd.date_range(start="2023-01-01", periods=100, freq='B')
        base_prices = 100.0 + np.cumsum(np.random.normal(0.1, 1.0, 100))
        self.df = pd.DataFrame({
            'Close': base_prices
        }, index=self.dates)

    def test_feature_invariance_to_future_data(self):
        """
        Critical Look-Ahead Test:
        Modifying prices in the future (t+k, k >= 1) must NEVER alter features computed at time t.
        """
        # 1. Baseline indicators on original series
        df_base = add_technical_indicators(self.df)
        t_eval = 40  # Evaluation point in the middle of history
        
        base_rsi_at_t = float(df_base['RSI'].iloc[t_eval])
        base_macd_at_t = float(df_base['MACD'].iloc[t_eval])
        base_bb_at_t = float(df_base['BB_Position'].iloc[t_eval])

        # 2. Corrupt future data from t_eval + 1 onwards with an extreme 1000% market shock
        df_future_corrupted = self.df.copy()
        df_future_corrupted.iloc[t_eval + 1:, 0] = df_future_corrupted.iloc[t_eval + 1:, 0] * 10.0

        df_corrupted_indicators = add_technical_indicators(df_future_corrupted)
        
        new_rsi_at_t = float(df_corrupted_indicators['RSI'].iloc[t_eval])
        new_macd_at_t = float(df_corrupted_indicators['MACD'].iloc[t_eval])
        new_bb_at_t = float(df_corrupted_indicators['BB_Position'].iloc[t_eval])

        # Assert perfect invariance at time t
        self.assertAlmostEqual(base_rsi_at_t, new_rsi_at_t, places=9,
                               msg=f"Lookahead leakage detected in RSI at t={t_eval} when future changed!")
        self.assertAlmostEqual(base_macd_at_t, new_macd_at_t, places=9,
                               msg=f"Lookahead leakage detected in MACD at t={t_eval} when future changed!")
        self.assertAlmostEqual(base_bb_at_t, new_bb_at_t, places=9,
                               msg=f"Lookahead leakage detected in Bollinger Bands at t={t_eval} when future changed!")

    def test_scaler_isolation_neural_net(self):
        """
        Validates that NeuralNetForecaster fits its scaler strictly on the train partition (first 90%)
        and does NOT leak future test set minimums or maximums.
        """
        series = self.df['Close']
        forecaster_normal = NeuralNetForecaster(series)
        X_norm, y_norm = forecaster_normal.prepare_data()
        normal_data_max = float(forecaster_normal.scaler.data_max_[0])

        # Inject extreme future outlier into the last 5% of the series
        series_with_future_outlier = series.copy()
        series_with_future_outlier.iloc[-5:] = 999999.0

        forecaster_shocked = NeuralNetForecaster(series_with_future_outlier)
        X_shock, y_shock = forecaster_shocked.prepare_data()
        shocked_data_max = float(forecaster_shocked.scaler.data_max_[0])

        # Scaler max must be strictly identical because outlier occurred in the holdout test set
        self.assertAlmostEqual(normal_data_max, shocked_data_max, places=4,
                               msg="NeuralNetForecaster scaler leaked future test-set maximum into training scaler!")

    def test_scaler_isolation_lstm_forecaster(self):
        """
        Validates that LSTMForecaster fits its scaler strictly on the train partition (first 90%)
        and does NOT leak future test set extrema.
        """
        series = self.df['Close']
        forecaster_normal = LSTMForecaster(series)
        X_norm, y_norm = forecaster_normal.prepare_data()
        normal_data_max = float(forecaster_normal.scaler.data_max_[0])

        # Inject extreme future outlier into the last 5% of data
        series_with_future_outlier = series.copy()
        series_with_future_outlier.iloc[-5:] = 888888.0

        forecaster_shocked = LSTMForecaster(series_with_future_outlier)
        X_shock, y_shock = forecaster_shocked.prepare_data()
        shocked_data_max = float(forecaster_shocked.scaler.data_max_[0])

        self.assertAlmostEqual(normal_data_max, shocked_data_max, places=4,
                               msg="LSTMForecaster scaler leaked future test-set maximum into training scaler!")

    def test_temporal_sorting_resilience(self):
        """
        Validates that technical indicator computation is invariant to input order
        by automatically sorting timestamps ascending.
        """
        # Shuffle rows randomly
        shuffled_df = self.df.sample(frac=1.0, random_state=123)
        
        # Compute on pre-sorted and shuffled
        clean_indicators = add_technical_indicators(self.df)
        shuffled_indicators = add_technical_indicators(shuffled_df)

        # Both must produce identical values on the original date index
        diff_rsi = np.nanmax(np.abs(clean_indicators['RSI'] - shuffled_indicators['RSI']))
        diff_macd = np.nanmax(np.abs(clean_indicators['MACD'] - shuffled_indicators['MACD']))
        self.assertAlmostEqual(diff_rsi, 0.0, places=9, msg="Technical indicators failed temporal sorting test!")
        self.assertAlmostEqual(diff_macd, 0.0, places=9, msg="MACD failed temporal sorting test!")

    def test_target_shifting_temporal_alignment(self):
        """
        Validates that target variables correspond strictly to t+1 and do not leak into time t features.
        """
        trend_clf = TrendClassifier(self.df)
        df_indicators = trend_clf.add_indicators()

        # At row i, Target is 1 if Close[i+1] > Close[i], else 0
        closes = df_indicators['Close'].values
        targets = df_indicators['Target'].values

        for i in range(len(targets) - 1):
            expected_target = int(closes[i+1] > closes[i])
            self.assertEqual(targets[i], expected_target,
                             f"Target at index {i} does not match Close[i+1] > Close[i]")

if __name__ == "__main__":
    unittest.main()
