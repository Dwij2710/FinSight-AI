# Module 02: Econometric Time-Series Forecasting

**Module Identifier:** `MOD-02-ECON-FORECAST`  
**Core Components:** `backend/app/routes/forecast.py`, `frontend/src/components/ForecastView.tsx`, `frontend/src/components/Common/Charts.tsx`  
**Quantitative Discipline:** Financial Econometrics, Time-Series Modeling & Statistical Inference  
**Production Status:** Production Ready (Verified Live & Seeded Sandbox Modes)  

---

## 1. Executive Brief (High-Level Summary)

The **Forecasting Module** provides institutional-grade forward trajectory predictions for equity prices over 7, 14, 30, and 90 trading-day horizons. Built upon classical statistical econometrics, the module combines **SARIMAX** (Seasonal Autoregressive Integrated Moving Average with Exogenous Regressors), automated **Augmented Dickey-Fuller (ADF)** stationarity verification, **STL Loess Seasonal Decomposition**, and **Blind Holdout Backtesting**.

### Key Capabilities at a Glance:
- **Statistical Rigor**: Enforces differencing order $d$ derived from formal unit-root hypothesis testing, avoiding spurious regressions on non-stationary price series.
- **Dynamic Seasonal Decomposition**: Splits observed market action into long-term macroeconomic Trend ($T_t$), 5-day cyclical weekly Seasonality ($S_t$), and idiosyncratic Residual noise ($R_t$).
- **Honest Out-of-Sample Backtesting**: Partitions the last 20% of historical price bars into a blind holdout set to compute genuine predictive accuracy metrics (RMSE, MAE, MAPE, Directional Accuracy).
- **Parametric Confidence Envelopes**: Computes Gaussian error propagation envelopes ($\pm 1\sigma$ and $\pm 2\sigma$) reflecting growing predictive uncertainty over extended time horizons.
- **Custom Time Horizon & Date Pickers**: Allows users to select custom historical training windows (6M, 1Y, 2Y, 5Y) with strict ISO 8601 validation.

---

## 2. Complete Mathematical Foundations & Equations

### 2.1 SARIMAX$(p, d, q) \times (P, D, Q)_s$ Model Formulation
Let $y_t$ denote the raw asset price or log price at trading day $t$. The model applies non-seasonal differencing of order $d$ and seasonal differencing of order $D$ with period $s=5$ (corresponding to a 5-day trading week):

$$y_t^* = (1 - L)^d (1 - L^s)^D y_t$$

Where $L$ is the backshift / lag operator defined by $L^k y_t = y_{t-k}$.

The full SARIMAX equation incorporating exogenous regressors $\mathbf{X}_t$ is:

$$\Phi_P(L^s) \phi_p(L) y_t^* = \Theta_Q(L^s) \theta_q(L) \epsilon_t + \mathbf{\beta}^T \mathbf{X}_t$$

Where:
- $\phi_p(L) = 1 - \sum_{i=1}^p \phi_i L^i$: Non-seasonal autoregressive polynomial of order $p$.
- $\theta_q(L) = 1 + \sum_{j=1}^q \theta_j L^j$: Non-seasonal moving average polynomial of order $q$.
- $\Phi_P(L^s) = 1 - \sum_{i=1}^P \Phi_i L^{i \cdot s}$: Seasonal autoregressive polynomial of order $P$.
- $\Theta_Q(L^s) = 1 + \sum_{j=1}^Q \Theta_j L^{j \cdot s}$: Seasonal moving average polynomial of order $Q$.
- $\epsilon_t \overset{\text{i.i.d.}}{\sim} \mathcal{N}(0, \sigma^2)$: Uncorrelated Gaussian white-noise innovations.
- $\mathbf{\beta}^T \mathbf{X}_t$: Linear projection of exogenous macroeconomic regressors (e.g., benchmark index return, bond yields).

---

### 2.2 Augmented Dickey-Fuller (ADF) Unit Root Test
Before fitting the autoregressive polynomials, the stationarity of the input sequence must be established. The Augmented Dickey-Fuller test evaluates the regression:

$$\Delta y_t = \alpha + \beta t + \gamma y_{t-1} + \sum_{i=1}^k \delta_i \Delta y_{t-i} + e_t$$

Where:
- $\Delta y_t = y_t - y_{t-1}$ is the first difference.
- $\alpha$ is a drift constant.
- $\beta t$ is a deterministic linear time trend.
- $k$ is the lag order determined via Akaike Information Criterion (AIC).

**Hypothesis Testing:**
- **Null Hypothesis ($H_0$)**: $\gamma = 0$ (The series contains a unit root and is non-stationary).
- **Alternative Hypothesis ($H_1$)**: $\gamma < 0$ (The series is stationary).

The test statistic is computed as:
$$t_{\text{ADF}} = \frac{\hat{\gamma}}{\text{SE}(\hat{\gamma})}$$

If the MacKinnon approximate $p$-value exceeds $\alpha = 0.05$, the system rejects stationarity and automatically differences the series ($d \leftarrow d + 1$).

---

### 2.3 Maximum Likelihood Estimation via Kalman Filter
SARIMAX parameters $\mathbf{\Theta} = \{\phi, \theta, \Phi, \Theta, \sigma^2\}$ are estimated via Maximum Likelihood using the state-space representation and the **Kalman Filter recursion**:

$$\mathbf{x}_{t} = \mathbf{T} \mathbf{x}_{t-1} + \mathbf{R} \epsilon_t \quad \text{(State Equation)}$$
$$y_t = \mathbf{Z} \mathbf{x}_t + \mathbf{d} + \eta_t \quad \text{(Observation Equation)}$$

The log-likelihood function maximized by the numerical optimizer (BFGS / Nelder-Mead) is:

$$\ln \mathcal{L}(\mathbf{\Theta}) = -\frac{N}{2} \ln(2\pi) - \frac{1}{2} \sum_{t=1}^N \ln |F_t| - \frac{1}{2} \sum_{t=1}^N \frac{v_t^2}{F_t}$$

Where:
- $v_t = y_t - \mathbf{Z} \mathbf{x}_{t|t-1}$ is the one-step-ahead prediction error (innovation).
- $F_t = \mathbf{Z} \mathbf{P}_{t|t-1} \mathbf{Z}^T + \sigma^2$ is the innovation variance.
- $\mathbf{P}_{t|t-1}$ is the predicted state covariance matrix.

Model order selection optimizes the Bayesian Information Criterion (BIC):
$$\text{BIC} = -2 \ln \mathcal{L} + k \ln(N)$$
Where $k = p + q + P + Q + 1$ is the number of estimated parameters.

---

### 2.4 STL Seasonal Decomposition by Loess
The time series is deconstructed into additive structural components:
$$y_t = T_t + S_t + R_t$$

1. **Trend ($T_t$)**: Derived via a locally weighted polynomial regression (Loess) smoothing filter:
   $$T_t = \arg\min_{a, b} \sum_{j=1}^N w_j(t) \left( y_j - a - b(j - t) \right)^2$$
   With tricube weighting kernel: $w_j(t) = \left( 1 - \left| \frac{j - t}{h} \right|^3 \right)^3$.
2. **Seasonal ($S_t$)**: Sub-cycle smoothing over recurring 5-day weekly trading cycles:
   $$\sum_{k=1}^s S_{t+k} \approx 0$$
3. **Residual ($R_t$)**: The idiosyncratic component capturing earnings announcements, macro shocks, and stochastic noise:
   $$R_t = y_t - T_t - S_t$$

---

### 2.5 Out-of-Sample Holdout Backtesting Metrics
To provide genuine model performance without look-ahead bias, the last $H = \lfloor 0.20 \cdot N \rfloor$ historical bars are withheld during training. Predictions $\hat{y}_t$ are evaluated against realized values $y_t$:

1. **Root Mean Squared Error (RMSE)**:
   $$\text{RMSE} = \sqrt{\frac{1}{H} \sum_{t=N-H+1}^N (y_t - \hat{y}_t)^2}$$
2. **Mean Absolute Error (MAE)**:
   $$\text{MAE} = \frac{1}{H} \sum_{t=N-H+1}^N |y_t - \hat{y}_t|$$
3. **Mean Absolute Percentage Error (MAPE)**:
   $$\text{MAPE} = \frac{100\%}{H} \sum_{t=N-H+1}^N \left| \frac{y_t - \hat{y}_t}{y_t} \right|$$
4. **Mean Directional Accuracy (MDA)**:
   $$\text{MDA} = \frac{100\%}{H-1} \sum_{t=N-H+2}^N \mathbf{1}_{\{ \text{sign}(y_t - y_{t-1}) == \text{sign}(\hat{y}_t - y_{t-1}) \}}$$

---

### 2.6 Confidence Interval Construction
For an $h$-step ahead forecast horizon $h \in \{1, \dots, H\}$, the conditional forecast variance grows monotonically:

$$\text{Var}(\hat{y}_{T+h|T}) = \sigma^2 \sum_{j=0}^{h-1} \psi_j^2$$

Where $\psi_j$ are the weights of the Wold infinite moving average representation $y_t = \sum_{j=0}^\infty \psi_j \epsilon_{t-j}$.

The confidence envelopes are constructed as:
- **80% Confidence Bound**: $\hat{y}_{T+h} \pm 1.282 \cdot \sqrt{\text{Var}(\hat{y}_{T+h|T})}$
- **95% Confidence Bound**: $\hat{y}_{T+h} \pm 1.960 \cdot \sqrt{\text{Var}(\hat{y}_{T+h|T})}$

---

## 3. Architecture & Data Flow

```
[ Frontend: ForecastView.tsx ]
  ├─ User inputs: Ticker, Horizon (30d), Range (1Y), Orders (p=1, d=1, q=1)
  └─ Dispatches POST /api/forecast
           │
           ▼
[ FastAPI Route: forecast.py ]
  ├─ Validate Date Format (ISO 8601 YYYY-MM-DD)
  ├─ Validate Date Logic: (start_date < end_date) and (end_date <= today + 2d)
  ├─ Fetch Historical Bars from MarketDataService (>= 30 days)
  │
  ├─ 1. ADF Stationarity Test (statsmodels.tsa.stattools.adfuller)
  ├─ 2. STL Loess Seasonal Decomposition (statsmodels.tsa.seasonal)
  ├─ 3. Train/Test Holdout Split (80% Train, 20% Out-of-Sample Test)
  ├─ 4. Fit SARIMAX Model on Train Split
  ├─ 5. Calculate Backtest Metrics (RMSE, MAE, MAPE, MDA)
  ├─ 6. Refit on 100% History & Project Forward Horizon (with 80%/95% CIs)
  └─ 7. Package JSON Response with Provenance Metadata
           │
           ▼
[ Frontend Visualization: Charts.tsx ]
  ├─ MultiLineChart: Actual vs Forecast + Shaded Confidence Band
  ├─ Decomposition Charts: Trend, Seasonal (5-day), Residual Noise
  ├─ Backtest Chart: Blind Holdout Realized vs Out-of-Sample Predicted
  └─ Export Toolbar: One-Click High-DPI PNG & RFC-4180 CSV Download
```

---

## 4. Complete API Request / Response Schema

### Endpoint: `POST /api/forecast`

**Request Headers:** `Content-Type: application/json`

**Request Body:**
```json
{
  "ticker": "NVDA",
  "days": 30,
  "model_type": "sarimax",
  "order": [1, 1, 1],
  "seasonal_order": [1, 0, 1, 5],
  "start_date": "2023-01-01",
  "end_date": "2026-09-01"
}
```

**Response Payload (200 OK):**
```json
{
  "ticker": "NVDA",
  "model": "SARIMAX(1,1,1)x(1,0,1,5)",
  "aic": 1420.5,
  "bic": 1438.2,
  "history": [
    { "date": "2026-08-31", "actual": 118.20 },
    { "date": "2026-09-01", "actual": 119.45 }
  ],
  "forecast": [
    {
      "date": "2026-09-02",
      "predicted": 120.10,
      "lower_80": 117.80,
      "upper_80": 122.40,
      "lower_95": 116.10,
      "upper_95": 124.10
    }
  ],
  "decomposition": {
    "dates": ["2026-08-31", "2026-09-01"],
    "trend": [116.50, 116.80],
    "seasonal": [0.45, -0.30],
    "residual": [1.25, 2.95]
  },
  "backtest": {
    "dates": ["2026-08-15", "2026-08-31"],
    "actual": [115.00, 118.20],
    "predicted": [114.50, 117.80],
    "metrics": {
      "rmse": 1.84,
      "mae": 1.42,
      "mape": 1.21,
      "directional_accuracy_pct": 68.4
    }
  },
  "data_source": "live",
  "fetched_at": "2026-09-06T15:30:00.000Z"
}
```

---

## 5. Failure Modes, Edge Cases & Error Diagnostics

| Failure Scenario | Root Cause | System Response & Resolution |
| :--- | :--- | :--- |
| **Chronological Inversion** | User enters `start_date >= end_date`. | Returns HTTP 400 with detail: `"start_date must precede end_date."` |
| **Future End Date** | User enters `end_date > today + 2 days`. | Returns HTTP 400 with detail: `"end_date cannot be in the future."` |
| **Insufficient Sample Size** | Ticker has $<30$ historical trading bars. | Returns HTTP 400 with detail: `"At least 30 trading days of historical data are required for SARIMAX convergence."` |
| **Non-Invertible Matrix** | Near-singular covariance matrix during optimization. | Falls back gracefully to simpler AutoARIMA $(1, 1, 0)$ and flags `model_fallback: true`. |
| **Backend Offline / 404** | Cloud service asleep or unreachable. | ErrorBanner displays error with single-click **"Use Sandbox"** recovery action. |

---

## 6. Verification & Automated Test Suite

Automated tests in `tests/test_data_integrity.py`:
- `test_forecast_date_range_validation`: Validates date parsing, rejection of future dates, and interval order.
- `test_forecast_returns_decomposition_and_backtest`: Asserts presence of all three decomposition series and non-empty holdout backtest metrics.
- **Pass Rate**: 100% verified.
