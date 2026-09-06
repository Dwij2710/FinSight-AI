import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.ensemble import RandomForestRegressor, IsolationForest, GradientBoostingRegressor
from sklearn.neighbors import NearestNeighbors
import datetime

class MultiVariateDataFetcher:
    def __init__(self, ticker):
        self.ticker = ticker
        # Mapping standard macro indicators to Yahoo Finance symbols
        self.macro_tickers = {
            'S&P 500': '^GSPC',
            'VIX': '^VIX',
            'Interest Rate (10Y)': '^TNX',
            'Gold': 'GLD',
            'Crude Oil': 'USO',
            'US Dollar': 'DX-Y.NYB'
        }
        
    def fetch_data(self, lookback_days=365*2): # Increased to 2 years for better KNN/Anomaly detection
        end = datetime.date.today()
        start = end - datetime.timedelta(days=lookback_days)
        
        tickers_to_fetch = [self.ticker] + list(self.macro_tickers.values())
        
        try:
            # Download multi-variate data
            data = yf.download(tickers_to_fetch, start=start, end=end)['Close']
            
            if data.empty:
                return pd.DataFrame()
                
            # Rename columns back to human-readable names
            rename_map = {self.macro_tickers[k]: k for k in self.macro_tickers}
            rename_map[self.ticker] = 'Price'
            data = data.rename(columns=rename_map)
            
            # Forward fill missing data from mismatched trading days
            data = data.ffill().dropna()
            
            return data
        except Exception as e:
            print(f"Error fetching multi-variate data: {e}")
            return pd.DataFrame()


class MultiFactorRegimeModel:
    """
    Multi-Factor Macro Regime Analysis using Quantile Gradient Boosting,
    Random Forest MDI Factor Attribution, and Isolation Forest Anomaly Detection.
    """
    def __init__(self, data):
        self.data = data
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.scaler = MinMaxScaler()
        self._factor_betas_cache = None
        
    def prepare_data(self):
        df = self.data.copy()
        if hasattr(df, 'sort_index'):
            df = df.sort_index()
        
        # Calculate Returns as additional input features
        for col in df.columns:
            df[f'{col}_Return'] = df[col].pct_change()
        
        # Replace inf/-inf (from zero-price division) with NaN before dropping
        df = df.replace([np.inf, -np.inf], np.nan)
            
        # Target is tomorrow's price
        df['Target'] = df['Price'].shift(-1)
        df = df.dropna()
        
        features = [c for c in df.columns if c != 'Target' and c != 'Price']
        
        X = df[features]
        y = df['Target']
        
        return X, y, features
        
    def calculate_factor_attributions(self):
        """
        Calculates genuine Mean Decrease in Impurity (MDI) factor attribution 
        across macroeconomic, momentum, and volatility dimensions.
        """
        try:
            X, y, features = self.prepare_data()
            if X.empty:
                return {}
            
            X_scaled = self.scaler.fit_transform(X)
            self.model.fit(X_scaled, y)
            
            importances = self.model.feature_importances_
            
            raw_weights = {
                'Price Trend & Momentum': float(np.sum([importances[i] for i, f in enumerate(features) if 'Price' in f])),
                'Overall Market (S&P 500)': float(np.sum([importances[i] for i, f in enumerate(features) if 'S&P 500' in f])),
                'Fear Index (VIX)': float(np.sum([importances[i] for i, f in enumerate(features) if 'VIX' in f])),
                'Interest Rates (10Y Yield)': float(np.sum([importances[i] for i, f in enumerate(features) if 'Interest' in f])),
                'Gold (Safe Haven)': float(np.sum([importances[i] for i, f in enumerate(features) if 'Gold' in f])),
                'Crude Oil': float(np.sum([importances[i] for i, f in enumerate(features) if 'Crude Oil' in f])),
                'US Dollar Strength': float(np.sum([importances[i] for i, f in enumerate(features) if 'US Dollar' in f]))
            }
            
            # Normalize to 1.0 (100%)
            total = sum(raw_weights.values())
            if total > 0:
                attribution_weights = {k: float(v) / total for k, v in raw_weights.items()}
            else:
                attribution_weights = {k: 1.0 / len(raw_weights) for k in raw_weights}
                
            return attribution_weights
        except Exception as e:
            print(f"Error in factor attribution extraction: {e}")
            return {}

    # Backward compatibility alias for legacy tests and references
    train_and_extract_attention = calculate_factor_attributions

    def probabilistic_forecast(self, current_price):
        """
        Fits Quantile Gradient Boosting Regressors at alpha=0.10, 0.50 (median), and 0.90
        to generate non-parametric empirical prediction intervals with pinball loss validation.
        """
        try:
            X, y, features = self.prepare_data()
            if len(X) < 30:
                return None
            
            # Chronological 80/20 train/test split to validate empirical coverage
            split_idx = int(len(X) * 0.8)
            X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
            y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

            scaler = MinMaxScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            X_all_scaled = scaler.fit_transform(X)

            # Fit 3 quantile estimators (pinball loss)
            gbr_q10 = GradientBoostingRegressor(loss='quantile', alpha=0.10, n_estimators=60, random_state=42)
            gbr_q50 = GradientBoostingRegressor(loss='quantile', alpha=0.50, n_estimators=60, random_state=42)
            gbr_q90 = GradientBoostingRegressor(loss='quantile', alpha=0.90, n_estimators=60, random_state=42)

            gbr_q10.fit(X_train_scaled, y_train)
            gbr_q50.fit(X_train_scaled, y_train)
            gbr_q90.fit(X_train_scaled, y_train)

            # Holdout validation metrics
            test_preds_q10 = gbr_q10.predict(X_test_scaled)
            test_preds_q50 = gbr_q50.predict(X_test_scaled)
            test_preds_q90 = gbr_q90.predict(X_test_scaled)

            # Empirical coverage: % of actual test points falling inside [q10, q90]
            covered = np.logical_and(y_test.values >= test_preds_q10, y_test.values <= test_preds_q90)
            empirical_coverage = float(np.mean(covered) * 100.0) if len(y_test) > 0 else 80.0

            with np.errstate(divide='ignore', invalid='ignore'):
                holdout_mape = float(np.nanmean(np.abs((y_test.values - test_preds_q50) / y_test.values)) * 100.0)

            # Refit on all available data for final forward projection
            gbr_q10.fit(X_all_scaled, y)
            gbr_q50.fit(X_all_scaled, y)
            gbr_q90.fit(X_all_scaled, y)

            latest_features = scaler.transform(X.iloc[[-1]])
            pred_q10 = float(gbr_q10.predict(latest_features)[0])
            pred_q50 = float(gbr_q50.predict(latest_features)[0])
            pred_q90 = float(gbr_q90.predict(latest_features)[0])

            # Monotonic ordering enforcement: q10 <= q50 <= q90
            pred_q10 = min(pred_q10, pred_q50)
            pred_q90 = max(pred_q90, pred_q50)

            # Truthful confidence score based on holdout calibration & error
            confidence_score = round(max(10.0, min(95.0, 100.0 - (holdout_mape * 1.5) - abs(empirical_coverage - 80.0) * 0.5)), 1)

            return {
                'predicted': round(float(pred_q50), 2),
                'median': round(float(pred_q50), 2),
                'q10': round(float(pred_q10), 2),
                'q90': round(float(pred_q90), 2),
                'lower': round(float(pred_q10), 2),
                'upper': round(float(pred_q90), 2),
                'empirical_coverage_pct': round(empirical_coverage, 1),
                'holdout_mape': round(holdout_mape, 2),
                'confidence': confidence_score,
                'method': 'Quantile Gradient Boosting (Pinball Loss q10/q50/q90)'
            }
        except Exception as e:
            print(f"Quantile forecast error: {e}")
            return None

    def detect_macro_anomaly(self):
        """
        Uses Isolation Forest to scan the current multivariate signature 
        to detect if we are in a 'Black Swan' or anomalous macro state.
        """
        try:
            X, _, _ = self.prepare_data()
            if len(X) < 10:
                return {'is_anomaly': False, 'risk_score': 0.0, 'message': "Unable to detect."}

            scaler = MinMaxScaler()
            X_hist_scaled = scaler.fit_transform(X.iloc[:-1])
            current_state = scaler.transform(X.iloc[[-1]])
            
            # Train Isolation Forest on everything EXCEPT the current day
            iso_forest = IsolationForest(contamination=0.05, random_state=42)
            iso_forest.fit(X_hist_scaled)
            
            # Predict the current day
            anomaly_score = iso_forest.decision_function(current_state)[0] # negative means anomaly
            is_anomaly = iso_forest.predict(current_state)[0] == -1
            
            # Map score to a 0-100 gauge (lower score = higher anomaly risk)
            # Typically scores range between -0.3 and 0.2
            normalized_risk = min(max((0.15 - anomaly_score) * 200, 0), 100)
            
            return {
                'is_anomaly': is_anomaly,
                'risk_score': normalized_risk,
                'message': "HIGH ALERT: Extreme Macro Deviation Detected" if is_anomaly else "NORMAL: Macro conditions stable."
            }
        except:
             return {'is_anomaly': False, 'risk_score': 0.0, 'message': "Unable to detect."}

    def historical_lookalike(self, current_price):
        """
        Uses K-Nearest Neighbors to find the historical day that closest matches 
        today's complex multi-variate macro environment.
        """
        try:
            X, _, _ = self.prepare_data()
            if len(X) < 40:
                return None

            # Scaler fitted strictly on search pool to avoid future leakage
            scaler = MinMaxScaler()
            search_pool_raw = X.iloc[:-30]
            search_pool = scaler.fit_transform(search_pool_raw)
            dates = search_pool_raw.index
            price_history = self.data['Price']
            
            knn = NearestNeighbors(n_neighbors=1, metric='euclidean')
            knn.fit(search_pool)
            
            current_state = scaler.transform(X.iloc[[-1]])
            distances, indices = knn.kneighbors(current_state)
            
            matched_idx = indices[0][0]
            matched_date = dates[matched_idx]
            match_confidence = max(100 - (distances[0][0] * 20), 0) # proxy percentage
            
            # Calculate what happened to the stock 30 days after that historical date
            historical_price_then = price_history.loc[matched_date]
            # Try to get the price 30 calendar days later
            end_date = matched_date + datetime.timedelta(days=30)
            # Find closest trading day to end_date
            future_prices = price_history[price_history.index >= end_date]
            if not future_prices.empty:
                historical_price_future = future_prices.iloc[0]
                pct_change = ((historical_price_future - historical_price_then) / historical_price_then) * 100
                return {
                    'matched_date': matched_date.strftime('%B %d, %Y'),
                    'similarity': float(match_confidence),
                    'future_return': float(pct_change)
                }
            return None
        except Exception as e:
            print("Lookalike error:", e)
            return None

    def _compute_factor_betas(self):
        """
        Fits an asset-specific multivariate OLS regression against macro factor returns:
        R_asset ~ beta_sp * R_sp + beta_vix * R_vix + beta_rate * R_rate + beta_oil * R_oil
        """
        if self._factor_betas_cache is not None:
            return self._factor_betas_cache

        from sklearn.linear_model import LinearRegression
        default_betas = {'sp': 1.0, 'vix': -0.15, 'rate': -0.2, 'oil': -0.05}
        try:
            returns_df = self.data.pct_change().dropna()
            if len(returns_df) < 20 or 'Price' not in returns_df.columns:
                self._factor_betas_cache = default_betas
                return self._factor_betas_cache
            
            y = returns_df['Price'].values
            factor_mapping = {
                'sp': 'S&P 500',
                'vix': 'VIX',
                'rate': 'Interest Rate (10Y)',
                'oil': 'Crude Oil'
            }
            factors = []
            keys = []
            for k, col in factor_mapping.items():
                if col in returns_df.columns:
                    factors.append(returns_df[col].values)
                    keys.append(k)

            if not factors:
                self._factor_betas_cache = default_betas
                return self._factor_betas_cache

            X = np.column_stack(factors)
            lr = LinearRegression(fit_intercept=True).fit(X, y)
            betas = dict(default_betas)
            for k, coef in zip(keys, lr.coef_):
                betas[k] = float(coef)
            self._factor_betas_cache = betas
            return betas
        except Exception:
            self._factor_betas_cache = default_betas
            return self._factor_betas_cache

    def simulate_scenario_custom(self, current_price, sp500_pct, vix_pct, rate_pct, oil_pct):
        betas = self._compute_factor_betas()
        impact = 0.0
        impact += (sp500_pct / 100.0) * betas.get('sp', 1.0)
        impact += (vix_pct / 100.0) * betas.get('vix', -0.15)
        impact += (rate_pct / 100.0) * betas.get('rate', -0.2)
        impact += (oil_pct / 100.0) * betas.get('oil', -0.05)
        new_price = current_price * (1 + impact)
        return new_price, (impact * 100.0)
        
    def detect_market_regime(self):
        try:
            recent_trend = self.data['S&P 500'].pct_change(30).iloc[-1]
            vix_level = self.data['VIX'].iloc[-1]
            
            if recent_trend > 0.02 and vix_level < 20:
                return "Bull Market 📈", "Optimistic conditions, low volatility."
            elif (recent_trend < -0.02) or vix_level > 24:
                return "Bear Market 📉", "High fear index, downward momentum."
            else:
                return "Sideways Market ↔️", "Consolidating, uncertain direction."
        except:
            return "Unknown", "Insufficient data."

# Backward compatibility alias
TemporalFusionModel = MultiFactorRegimeModel

