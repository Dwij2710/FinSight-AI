# FinSight AI: Master Platform Engineering & Quantitative Architecture Report

**Author:** Dwij Prajapati  
**Platform Version:** 2.4.0 (Production Release)  
**Document Classification:** Comprehensive Technical Architecture, Econometric & Machine Learning Reference Manual  
**Publication Date:** September 2026  
**Repository:** [github.com/Dwij2710/FinSight-AI](https://github.com/Dwij2710/FinSight-AI)  
**Production URL:** [frontend-orpin-xi-99.vercel.app](https://frontend-orpin-xi-99.vercel.app/)  
**Backend Infrastructure:** FastAPI containerized on Render with automated UptimeRobot Keep-Alive & GitHub Actions CI/CD  

---

## Executive Abstract

**FinSight AI** is an institutional-grade, full-stack quantitative equity analytics and machine learning trading platform. Built to bridge the structural divide between multi-million-dollar hedge fund infrastructure and quantitative investors, the platform integrates high-frequency econometric forecasting, multivariate deep attention mechanisms, reinforcement learning portfolio agents, Modern Portfolio Theory (MPT) optimization, financial transformer NLP sentiment analysis, real-time breakout alerting, and institutional rebalance order execution into a cohesive, zero-downtime, reactive web application.

The core philosophical foundation of the platform is **Data Provenance, Mathematical Honesty, and Execution Realism**:
1. **Zero-Synthetic Guarantee in Live Mode**: Whenever the platform claims to represent live financial markets, every quote, covariance matrix, forecast, sentiment score, and risk factor is sourced strictly from verified live market data providers (Yahoo Finance / Polygon feeds). Synthetic data is strictly segregated into an explicitly labeled, deterministic Mulberry32 sandbox.
2. **Cold-Start Zero-Downtime Architecture**: Designed to operate flawlessly on containerized cloud microservices (Render free tier), the system features an isolated `/api/warmup` endpoint, client-side fast-polling with exponential backoff retry jitter, real-time spin-up counters, and automated UptimeRobot keep-alive automation.
3. **Rigorous Out-of-Sample Validation**: Blind holdout backtesting (RMSE, MAE, MAPE), Augmented Dickey-Fuller stationarity validation, Platt probability calibration, and Sharpe-ratio penalization for turnover and transaction costs ensure quantitative realism.

---

## Master Module Reference Matrix

| Module ID | Module Title | Primary Mathematical / ML Model | Core Backend Source | Core Frontend View |
| :--- | :--- | :--- | :--- | :--- |
| **MOD-01** | **Centralized Market Data** | Mutex-Locked TTL In-Memory & SQLite Cache | `backend/app/services/market_data.py` | `frontend/src/context/MarketDataContext.tsx` |
| **MOD-02** | **Econometric Forecasting** | $\text{SARIMAX}(p,d,q)\times(P,D,Q)_s$ + STL Loess | `backend/app/routes/forecast.py` | `frontend/src/components/ForecastView.tsx` |
| **MOD-03** | **Temporal Fusion Transformer** | Scaled Dot-Product Macro Factor Attention | `backend/app/routes/tft.py` | `frontend/src/components/TftView.tsx` |
| **MOD-04** | **Reinforcement Learning Agent** | PPO Actor-Critic on Gymnasium FinRL MDP | `backend/app/routes/rl_agent.py` | `frontend/src/components/RlAgentView.tsx` |
| **MOD-05** | **Portfolio Optimization** | Markowitz Mean-Variance SLSQP + Staged Rebalancing | `backend/app/routes/portfolio.py` | `frontend/src/components/PortfolioView.tsx` |
| **MOD-06** | **AI Sentiment & Signals** | ProsusAI FinBERT + Platt-Calibrated Random Forest | `backend/app/routes/news_sentiment.py` | `frontend/src/components/AiInsightsView.tsx` |
| **MOD-07** | **Real-Time Breakout Alerts** | Bidirectional Threshold Engine + Web Push | `frontend/src/context/AlertContext.tsx` | `frontend/src/components/WatchlistView.tsx` |
| **MOD-08** | **Glassmorphic UI & Exporters** | Next.js 14 App Router + High-DPI Canvas Exporter | `frontend/src/lib/chartExport.ts` | `frontend/src/app/globals.css` |
| **MOD-09** | **DevOps & CI/CD Pipeline** | GitHub Actions Workflow + Render Deploy Webhook | `.github/workflows/ci.yml` | `render.yaml` |

---

## 1. System Architecture & Technology Stack

FinSight AI employs a decoupled, dual-cloud distributed architecture separating the reactive client-side rendering layer from the high-throughput asynchronous quantitative computation layer:

```
+-------------------------------------------------------------------------------+
|                           CLIENT LAYER (Vercel Edge)                          |
|  Next.js 14 (App Router) - React 18 - TypeScript - CSS Custom Properties       |
|  * MarketDataProvider (Single Source of Truth, WebSocket / Polling Syncer)    |
|  * AlertContext (Web Notifications API, 15m Anti-Spam Deduplication)          |
|  * ThemeContext (Dark / Light Dynamic Design Tokens)                          |
|  * High-DPI Canvas 2x PNG Chart Exporter & RFC-4180 CSV Streamer              |
+---------------------------------------+---------------------------------------+
                                        │ HTTPS / JSON (REST + Diagnostics)
                                        ▼
+-------------------------------------------------------------------------------+
|                       API & COMPUTATION LAYER (Render Cloud)                  |
|  FastAPI - Uvicorn - Python 3.10 Container                                    |
|  * MarketDataService (Thread-safe Lock, TTL Cache, Provenance Stamping)       |
|  * Warmup Endpoint (/api/warmup - Bypass heavy ML for instant 200 OK)         |
+---------------------------------------+---------------------------------------+
                                        │
       +--------------------------------+--------------------------------+
       │                                │                                │
       ▼                                ▼                                ▼
+--------------+               +------------------+             +-----------------+
| Econometrics |               | Machine Learning |             | Quant Portfolio |
|  * SARIMAX   |               |  * TFT Attention |             |  * SLSQP MPT    |
|  * AutoARIMA |               |  * PPO Trading RL|             |  * Risk Parity  |
|  * Prophet   |               |  * FinBERT NLP   |             |  * Monte Carlo  |
|  * ADF / STL |               |  * Random Forest |             |  * Stress Tests |
+--------------+               +------------------+             +-----------------+
```

### 1.1 Frontend Technology Stack:
- **Framework**: Next.js 14.2.35 (React 18, App Router architecture).
- **Language**: TypeScript (Strict Mode enabled).
- **Design Tokens**: Custom Vanilla CSS Tokens with Glassmorphic HSL palettes (Dark Midnight and Crisp Day Light modes).
- **Icons**: Lucide React.
- **Export Engine**: HTML5 Canvas rasterization at $2\times$ retina device pixel ratio + RFC-4180 CSV data serialization.

### 1.2 Backend & Quantitative Modeling Stack:
- **API Framework**: FastAPI 0.110+, Starlette, Pydantic v2, Uvicorn ASGI.
- **Runtime**: Python 3.10.11.
- **Econometrics & Statistics**: Statsmodels (SARIMAX, ADF unit-root testing, STL decomposition), SciPy (`scipy.optimize.minimize` via SLSQP), NumPy, Pandas.
- **Machine Learning**: Scikit-Learn (Random Forest, Platt probability calibration, StandardScaler), PyTorch.
- **Natural Language Processing**: HuggingFace Transformers (`ProsusAI/finbert`), VADER Sentiment Analysis.
- **Reinforcement Learning**: Gymnasium (custom FinRL market environment), Stable-Baselines3 / Custom PPO Actor-Critic.

---

## 2. Data Engineering & Single-Source-of-Truth Engine

A pervasive flaw in modern financial applications is data fragmentation: different views fetching conflicting price quotes for the same ticker at varying timestamps, leading to irreconcilable metrics. FinSight AI resolves this through its centralized `MarketDataService`:

### 2.1 Concurrency & Mutex Protection
To prevent API stampedes when multiple portfolio components request quotes simultaneously:
- **Thread-Safe Mutex (`threading.Lock`)**: Guards cache access.
- **Two-Tier TTL Caching**:
  - Quotes: 30-second TTL during market hours.
  - Historical Bars: 5-minute TTL for daily OHLCV series.

### 2.2 Telemetry Audit Metadata
Every payload emitted by the API is enriched with provenance metadata:
```json
{
  "ticker": "AAPL",
  "price": 224.50,
  "data_source": "live",
  "fetched_at": "2026-09-06T15:30:00.000Z",
  "cache_hit": false,
  "provider": "yfinance"
}
```

### 2.3 Zero-Synthetic Guarantee in Live Mode
In `live` mode, if a ticker cannot be resolved or the provider times out, the service raises an explicit `HTTP 404` or `HTTP 502` with actionable diagnostic information. It **never** silently replaces live market quotes with random numbers.

---

## 3. Module Deep Dives

### 3.1 Econometric Time-Series Forecasting (`MOD-02`)
The forecasting engine models non-stationary price dynamics using:
$$\Phi_P(L^s) \phi_p(L) (1 - L)^d (1 - L^s)^D y_t = \Theta_Q(L^s) \theta_q(L) \epsilon_t + \mathbf{\beta}^T \mathbf{X}_t$$
1. **Stationarity Diagnostics**: Runs the Augmented Dickey-Fuller (ADF) test:
   $$\Delta y_t = \alpha + \beta t + \gamma y_{t-1} + \sum_{i=1}^k \delta_i \Delta y_{t-i} + e_t$$
   Automatically increments differencing order $d$ if $p\text{-value} > 0.05$.
2. **STL Loess Seasonal Decomposition**: Isolates raw price series into Trend ($T_t$), weekly 5-day Seasonality ($S_t$), and idiosyncratic Residual noise ($R_t$).
3. **Blind Holdout Backtesting**: Withholds the final 20% of historical bars to compute genuine out-of-sample RMSE, MAE, MAPE, and Mean Directional Accuracy (MDA).
4. **Parametric Confidence Bounds**: Generates 80% ($\pm 1.282\sigma$) and 95% ($\pm 1.960\sigma$) confidence envelopes.

---

### 3.2 Temporal Fusion Transformer & Macro Factor Attention (`MOD-03`)
Models how equities interact with broader macroeconomic regimes:
- Macro Basket: 10Y US Treasury Yield (`^TNX`), CBOE Volatility Index (`^VIX`), US Dollar Index (`DX-Y.NYB`), WTI Crude Oil (`CL=F`), S&P 500 (`SPY`).
- Scaled Dot-Product Attention:
  $$\alpha_i = \text{Softmax}\left( \frac{\mathbf{q} \mathbf{k}_i^T}{\sqrt{d_k}} \right)$$
- **100% Normalization Guarantee**: All factor attention weights sum strictly to $100.0\%$.
- **Quantile Loss (Pinball Loss)**: Decodes multi-horizon quantiles ($q_{0.10}, q_{0.50}, q_{0.90}$):
  $$\mathcal{L}_q(y, \hat{y}) = \max\left( q(y - \hat{y}), \, (1 - q)(\hat{y} - y) \right)$$

---

### 3.3 Deep Reinforcement Learning Trading Agent (`MOD-04`)
An autonomous policy agent optimizing portfolio capital allocation within a custom Gymnasium FinRL environment:
- **State Space ($\mathcal{S} \in \mathbb{R}^{10}$)**: Returns, moving average distances, normalized RSI, MACD, 20d volatility, prior allocation, cash ratio, volume delta, and drawdown.
- **Continuous Action Space ($\mathcal{A} \in [-1.0, 1.0]$)**: Target equity allocation fraction.
- **Reward Function with Friction**:
  $$R_t = \frac{V_t - V_{t-1}}{V_{t-1}} - c \cdot |a_t - a_{t-1}| - \lambda \cdot \sigma_{20, t}^2$$
  Deducts 10 bps ($c = 0.0010$) execution slippage and commissions on position changes.
- **PPO Clipped Objective**: Prevents destabilizing policy updates using probability ratio clipping ($\epsilon = 0.20$).

---

### 3.4 Modern Portfolio Theory & Staged Rebalancing (`MOD-05`)
Solves Markowitz Mean-Variance frontiers and transforms mathematical weights into executable orders:
- **Maximum Sharpe Ratio Portfolio**: Solved via SLSQP convex optimization with risk-free rate $R_f = 4.0\%$.
- **Minimum Volatility & Equal Risk Parity**: Solves pure risk minimization and equal volatility risk contributions ($\text{RC}_i = \frac{\sigma_p}{N}$).
- **Staged Rebalance Order Execution**:
  $$\Delta \text{Capital}_i = V \cdot (w_i^{\text{target}} - w_i^{\text{current}}), \quad \Delta \text{Shares}_i = \left\lfloor \frac{\Delta \text{Capital}_i}{P_i} \right\rfloor$$
  Generates discrete `BUY`, `SELL`, and `HOLD` order tickets with estimated execution values.
- **Dynamic Stress Testing**: Simulates immediate portfolio drawdown against historical liquidity shocks (2008 GFC, 2020 COVID, 2022 Tech Rate Hike).

---

### 3.5 Financial Transformer NLP & Trade Signals (`MOD-06`)
Synthesizes unstructured market news with technical indicators:
- **ProsusAI FinBERT**: Fine-tuned on the Financial PhraseBank to classify financial headlines into positive, negative, and neutral sentiment:
  $$S = p_{\text{positive}} - p_{\text{negative}} \in [-1.0, 1.0]$$
- **Platt-Calibrated Random Forest**: Combines RSI, MACD, Bollinger Bands, Volatility, Mean Sentiment, and Sentiment Dispersion, calibrating voting majorities into true posterior probabilities:
  $$P(\text{Up} \mid \mathbf{x}) = \frac{1}{1 + \exp(A \cdot f(\mathbf{x}) + B)}$$
- **Feature Importance Normalization**: Gini feature importances are normalized strictly to sum to $100.0\%$.

---

### 3.6 Real-Time Breakout Alerts & Watchlist (`MOD-07`)
Client-side monitoring engine evaluating live price action every 30 seconds:
- **Bidirectional Rule Tracking**: Triggers on upper resistance breaks (`ABOVE`) and downward support breaks (`BELOW`).
- **15-Minute Anti-Spam Cooldown**: Suppresses rapid oscillation triggers during market consolidation.
- **Web Notifications API**: Native operating system push alerts + floating glassmorphic in-app toasts.
- **Zero-Custody Privacy**: User alerts and watchlists persist locally in browser `localStorage`.

---

### 3.7 Glassmorphic Frontend & High-DPI Exporters (`MOD-08`)
- **Next.js 14 App Router**: Zero-dependency CSS Custom Properties design token system.
- **Dynamic Dark / Light Themes**: Persistent across sessions via `localStorage`.
- **High-DPI Canvas 2x PNG Exporter**: Renders SVG chart DOM elements to an off-screen HTML5 `<canvas>` at $2.0\times$ device pixel ratio for retina-sharp exports.
- **Deterministic Mulberry32 PRNG Sandbox**: Ensures 100% reproducible simulated market data when offline or in sandbox mode.

---

### 3.8 DevOps & CI/CD Pipeline (`MOD-09`)
- **Dual-Cloud Architecture**: Vercel (Frontend Edge) + Render (Containerized FastAPI Backend).
- **Render Cold-Start Solution**:
  1. Ultra-fast `/api/warmup` endpoint ($<5\text{ms}$ response time).
  2. Client-side adaptive fast-polling (accelerates from 30s to 5s during waking phase).
  3. Continuous 5-minute UptimeRobot keep-alive monitoring.
- **GitHub Actions CI/CD (`ci.yml`)**: Automates backend tests (`pytest`), frontend build verification, and automated Render deployment via secure deploy hooks.

---

## 4. Verification, Mathematical Correctness & Test Results

### 4.1 Automated Backend Test Suite (`pytest tests/`)
```text
============================= test session starts =============================
platform win32 -- Python 3.10.11, pytest-9.0.2
rootdir: C:\Dwij\StockAI\StockAI
collected 19 items

tests/test_data_integrity.py::test_backend_warmup_endpoint PASSED       [  5%]
tests/test_data_integrity.py::test_forecast_date_range_validation PASSED [ 10%]
tests/test_data_integrity.py::test_forecast_returns_decomposition PASSED [ 15%]
tests/test_data_integrity.py::test_news_articles_have_valid_urls PASSED  [ 21%]
tests/test_data_integrity.py::test_portfolio_optimization_authenticity PASSED [ 26%]
tests/test_data_integrity.py::test_rl_agent_simulation_realism PASSED   [ 31%]
tests/test_data_integrity.py::test_single_source_of_truth_quote PASSED  [ 36%]
tests/test_data_integrity.py::test_tft_multivariate_regime_authenticity PASSED [ 42%]
tests/test_quant_math.py::test_max_sharpe_weights_sum_to_one PASSED     [ 47%]
tests/test_quant_math.py::test_min_volatility_weights_sum_to_one PASSED [ 52%]
tests/test_quant_math.py::test_risk_parity_weights_sum_to_one PASSED   [ 57%]
tests/test_quant_math.py::test_sharpe_ratio_with_risk_free_rate PASSED  [ 63%]
tests/test_quant_math.py::test_zero_variance_handling PASSED           [ 68%]
tests/test_quant_math.py::test_divergent_weights_high_urgency PASSED     [ 73%]
tests/test_quant_math.py::test_identical_weights_zero_urgency PASSED    [ 78%]
tests/test_quant_math.py::test_api_response_provenance_stamp PASSED     [ 84%]
tests/test_quant_math.py::test_cache_ttl_and_telemetry PASSED          [ 89%]
tests/test_quant_math.py::test_feature_importance_sums_to_100 PASSED   [ 94%]
tests/test_quant_math.py::test_stress_test_differs_by_basket PASSED     [100%]

======================= 19 passed in 36.73s =======================
```
**Result**: 19 of 19 tests passed (100% pass rate).

### 4.2 Frontend Production Compilation (`npm run build`)
```text
  ▲ Next.js 14.2.35
   Creating an optimized production build ...
 ✓ Compiled successfully
   Checking validity of types ...
   Collecting page data ...
 ✓ Generating static pages (4/4)
   Finalizing page optimization ...

Route (app)                              Size     First Load JS
┌ ○ /                                    42 kB           129 kB
└ ○ /_not-found                          873 B          88.1 kB
+ First Load JS shared by all            87.2 kB
```
**Result**: Zero TypeScript compilation errors, successful static prerendering.

---

## 5. Security, Non-Custodial Disclaimers & Regulatory Stance

1. **Non-Custodial Architecture**: FinSight AI does not custody client funds, store private broker API keys on remote servers, or execute automated market orders directly without user confirmation.
2. **Deterministic Sandbox Isolation**: Simulated demo data is generated purely on the client via the Mulberry32 PRNG and is strictly segregated from live financial feeds.
3. **Regulatory Disclaimer**: All forecasts, optimizations, and trade signals generated by the platform are for informational, analytical, and research purposes only, and do not constitute direct financial advice.

---

## 6. Conclusion & Quantitative Roadmap

FinSight AI establishes a new benchmark for accessible quantitative software. By enforcing strict data provenance, eliminating synthetic hallucinations, engineering cold-start resilience, and packaging mathematical modeling into an institutional glassmorphic interface, FinSight AI equips quantitative investors with transparent, mathematically rigorous tools to navigate modern financial markets.
