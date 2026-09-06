# Module 02: Econometric Time-Series Forecasting

**Module Owner:** Quantitative Econometrics  
**File Path:** `backend/app/routes/forecast.py` & `frontend/src/components/ForecastView.tsx`  
**Status:** Production Ready  

---

## 1. Executive Brief (High-Level Summary)

The **Forecasting Module** provides statistically rigorous, multi-horizon equity price trajectory forecasting. Employing Seasonal Autoregressive Integrated Moving Average with Exogenous Regressors (**SARIMAX**), automated stationarity testing (**Augmented Dickey-Fuller**), Holt-Winters seasonal decomposition, and blind holdout backtesting, the module eliminates optimistic look-ahead bias and supplies confidence intervals ($\pm 1\sigma$ and $\pm 2\sigma$) for risk-adjusted trade planning.

---

## 2. Mathematical Modeling & Equations

### 2.1 SARIMAX Formulation
The core model is specified as:
$$\Phi_P(L^s) \phi_p(L) (1 - L)^d (1 - L^s)^D y_t = \Theta_Q(L^s) \theta_q(L) \epsilon_t + \beta^T X_t$$

Where:
- $L$ is the lag operator: $L^k y_t = y_{t-k}$
- $d$: Order of first differencing to achieve mean stationarity.
- $D$: Order of seasonal differencing with period $s=5$ (trading week cycle).
- $\phi_p(L) = 1 - \sum_{i=1}^p \phi_i L^i$: Non-seasonal autoregressive polynomial.
- $\theta_q(L) = 1 + \sum_{j=1}^q \theta_j L^j$: Non-seasonal moving average polynomial.
- $\epsilon_t \sim \text{i.i.d. } \mathcal{N}(0, \sigma^2)$: Gaussian white noise innovations.

### 2.2 Augmented Dickey-Fuller (ADF) Stationarity Test
The stationarity of log returns is verified by testing the null hypothesis $\gamma = 0$ (unit root exists):
$$\Delta y_t = \alpha + \beta t + \gamma y_{t-1} + \sum_{i=1}^k \delta_i \Delta y_{t-i} + e_t$$
If $p\text{-value} > 0.05$, the series is differenced ($d = d + 1$) until stationarity is attained.

---

## 3. Key Pipeline Capabilities

1. **Seasonal Decomposition (Loess / STL)**:
   Deconstructs observed prices into additive components:
   $$y_t = T_t + S_t + R_t$$
   - **Trend ($T_t$)**: Low-frequency macroeconomic drift.
   - **Seasonal ($S_t$)**: 5-day cyclical trading week patterns.
   - **Residual ($R_t$)**: Idiosyncratic noise and earnings shock deviations.

2. **Blind Out-of-Sample Holdout Backtesting**:
   - The final 20% of historical trading bars are withheld from model training.
   - The model generates predictions across the holdout set, computing:
     - **RMSE**: $\sqrt{\frac{1}{N}\sum_{t=1}^N (y_t - \hat{y}_t)^2}$
     - **MAE**: $\frac{1}{N}\sum_{t=1}^N |y_t - \hat{y}_t|$
     - **MAPE**: $\frac{100\%}{N}\sum_{t=1}^N |\frac{y_t - \hat{y}_t}{y_t}|$

3. **Date Range & Horizon Controls**:
   - Customizable horizons: 7, 14, 30, and 90 trading days.
   - Presets: 6M, 1Y, 2Y, 5Y, and ISO 8601 custom date pickers.
   - Minimum sample requirement: Enforces $\ge 30$ historical bars for numerical convergence.

---

## 4. API Specification

`POST /api/forecast`
- **Request Body**:
  ```json
  {
    "ticker": "AAPL",
    "days": 30,
    "model_type": "sarimax",
    "order": [1, 1, 1],
    "seasonal_order": [1, 0, 1, 5],
    "start_date": "2023-01-01",
    "end_date": "2026-09-01"
  }
  ```
- **Response**: Forecast point estimates, upper/lower confidence bounds (80% and 95%), decomposition time series, and out-of-sample backtest metrics.

---

## 5. Verification & Unit Tests
Tested in `tests/test_data_integrity.py`:
- `test_forecast_date_range_validation`: Enforces ISO date parsing and chronologically valid ranges.
- `test_forecast_returns_decomposition_and_backtest`: Asserts presence of non-empty trend, seasonal, residual, and holdout backtest series.
