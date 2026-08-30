
# SECTION 4: SYSTEM ANALYSIS

---

## 4.1 Study of Current System

Before FinSight AI was developed, retail investors relied on a fragmented ecosystem of tools for stock market analysis. Each tool addressed only a narrow slice of the analytical problem:

| Existing Tool | What It Provides | What It Lacks |
|--------------|------------------|---------------|
| **Zerodha Kite / Groww** | Live price charts, basic order execution | No AI forecasting, no portfolio optimization, no sentiment analysis |
| **Moneycontrol / Economic Times** | News, price data, analyst opinions | No quantitative analysis, no ML-based insights |
| **Yahoo Finance (Web)** | Historical price data, basic charts | No forecasting, no optimization, no ML integration |
| **TradingView** | Advanced charting, technical indicators | No AI prediction, no portfolio-level analysis |
| **Bloomberg Terminal** | Comprehensive institutional analytics | Costs $20,000+/year; inaccessible to retail investors |
| **Python (Manual)** | Full ML capability | Requires expert programming knowledge; no GUI |
| **Excel / Google Sheets** | Basic portfolio tracking | No AI/ML capabilities; manual and time-consuming |

**Current System Workflow (Manual Process):**

1. User opens Yahoo Finance / Moneycontrol to check stock prices.
2. User reads news articles manually to gauge sentiment.
3. User opens Excel to manually track portfolio returns and correlation.
4. User opens a separate charting tool (TradingView) for technical indicators.
5. User writes or searches for Python code to run any ML model.
6. Results from different tools are manually compared — error-prone and time-consuming.

This fragmented workflow requires switching between 5–7 different tools, requires significant technical knowledge for any advanced analysis, and provides no integrated, reproducible analytical output.

---

## 4.2 Problems and Weaknesses of Current System

### Problem 1: Severe Tool Fragmentation
No single platform integrates statistical forecasting, portfolio optimization, deep learning prediction, sentiment analysis, and macro-economic analysis. Users must manually bridge outputs across incompatible tools.

### Problem 2: Misleading Accuracy Reporting
Most commercial and academic tools report in-sample accuracy metrics — measuring model performance on the same data it was trained on. This produces artificially inflated accuracy numbers (often 90%+) that collapse in real-world use.

### Problem 3: Financial Inaccessibility
Bloomberg Terminal (~$20,000/year) provides the most comprehensive analytics but is inaccessible to retail investors, students, and researchers. Open-source alternatives require advanced Python expertise.

### Problem 4: Absence of Macro-Economic Context
Single-stock forecasting ignores broader market context. A stock may be fundamentally sound but dragged down by rising interest rates, VIX spikes, or dollar strength — none of which single-stock tools capture.

### Problem 5: No Integrated Risk Management
Most retail tools provide either stock predictions OR portfolio tracking, never both with rigorous risk metrics (Beta, Maximum Drawdown, VaR) and stress testing capability.

### Problem 6: No Reinforcement Learning for Retail Users
RL-based trading strategies — capable of learning buy/hold/sell policies directly from historical data — exist only in academic code repositories (FinRL, OpenAI) and are inaccessible to non-expert users.

### Problem 7: Static, Non-Interactive Outputs
Traditional Python analysis scripts generate static images and console output. There is no interactivity — changing a hyperparameter requires editing code and re-running the script.

---

## 4.3 Requirements of New System

### Functional Requirements:

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | System shall accept any Yahoo Finance ticker symbol and fetch historical OHLCV data | High |
| FR-02 | System shall perform ADF stationarity test and seasonal decomposition before SARIMAX fitting | High |
| FR-03 | System shall generate 10-day SARIMAX price forecast with 95% confidence intervals | High |
| FR-04 | System shall enforce rolling-window backtesting and display out-of-sample accuracy | High |
| FR-05 | System shall accept a portfolio of 2–10 tickers and compute optimal weights using MPT | High |
| FR-06 | System shall generate the Efficient Frontier via Monte Carlo simulation (5,000 portfolios) | High |
| FR-07 | System shall compute Beta, Maximum Drawdown, and VaR for any portfolio | High |
| FR-08 | System shall analyze news sentiment using FinBERT with TextBlob fallback | High |
| FR-09 | System shall classify next-day price direction (Buy/Sell) using Random Forest | High |
| FR-10 | System shall generate 30-day price forecast using MLP with L2 regularization | High |
| FR-11 | System shall generate 30-day price forecast using stacked LSTM with Dropout | High |
| FR-12 | System shall implement a custom RL trading environment (Buy/Hold/Sell) | High |
| FR-13 | System shall train and evaluate PPO, A2C, DQN agents and compare performance | High |
| FR-14 | System shall integrate 6 macro-economic variables and compute attention weights | High |
| FR-15 | System shall detect macro anomalies using Isolation Forest | Medium |
| FR-16 | System shall perform historical lookalike matching using KNN | Medium |
| FR-17 | System shall classify market regime (Bull/Bear/Sideways) | Medium |
| FR-18 | System shall allow custom scenario simulation with adjustable macro variables | Medium |

### Non-Functional Requirements:

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-01 | System shall load any module within 30 seconds on standard hardware | High |
| NFR-02 | System shall handle API failures gracefully with informative error messages | High |
| NFR-03 | System shall implement fallback mechanisms when optional libraries are unavailable | High |
| NFR-04 | System shall be deployable locally without cloud infrastructure or API keys | High |
| NFR-05 | System UI shall be intuitive for users with basic financial literacy | Medium |
| NFR-06 | All charts shall be interactive (zoom, hover, export) | Medium |
| NFR-07 | Codebase shall follow separation-of-concerns (src/, views/, config/) | Medium |
| NFR-08 | System shall support Indian NSE/BSE tickers as well as US tickers | High |

---

## 4.4 System Feasibility

### 4.4.1 Does the system contribute to the overall objectives of the organization?

**Yes — fully.** The objectives of this academic project are to:
- Demonstrate applied AI/ML competency in a real-world domain
- Create an educational tool for financial data science learning
- Produce a technically rigorous, documented software system

FinSight AI contributes to all three objectives directly:
- It integrates five AI/ML methodologies on real financial data (SARIMAX, MPT, MLP/LSTM, RL, TFT).
- It is fully self-documented via PROJECT_WORKFLOW.md and this report.
- It produces measurable, verifiable performance metrics (R², RMSE, Sharpe Ratio, RL net worth).

### 4.4.2 Can the system be implemented using current technology within cost and schedule constraints?

**Yes — confirmed through implementation.** All technologies used are:
- **Free and open-source** (zero software cost)
- **Available via pip install** (no complex infrastructure setup)
- **Python-native** (single language throughout the entire stack)
- **Lightweight enough** to run on a standard i5 laptop with 8GB RAM

The project was completed within the 16-week academic semester schedule. The most computationally intensive operation (LSTM training) completes in under 60 seconds on CPU for 2 years of daily stock data.

**Feasibility Risk Table:**

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| TensorFlow not installable | Medium | Medium | GradientBoosting fallback implemented |
| FinBERT model unavailable | Medium | Low | TextBlob + lexicon fallback implemented |
| yfinance API rate limiting | Low | High | Error handling + user notification |
| Insufficient RAM for RL training | Low | Medium | Timestep slider limits max training |

### 4.4.3 Can the system be integrated with other systems already in place?

**Yes — via standard Python interfaces.** FinSight AI's modular architecture enables straightforward integration:

- **Brokerage APIs** (Zerodha Kite Connect, Upstox API): The RL agent's buy/hold/sell signals can be wired to a brokerage API for semi-automated execution.
- **Real-time data feeds** (Alpha Vantage, Polygon.io): `data_fetcher.py` can be extended to support real-time WebSocket streams.
- **Database backends** (PostgreSQL, MongoDB): Prediction results and model weights can be persisted to any database.
- **Notification systems** (Telegram Bot API, email): Signal alerts can trigger push notifications.
- **Cloud platforms** (Streamlit Cloud, AWS EC2): The app deploys to Streamlit Community Cloud with a single `requirements.txt`.

---

## 4.5 Activity / Process in the New System (Proposed System)

```
Activity Flow in FinSight AI:

1. USER OPENS APPLICATION
   └─> Streamlit launches at localhost:8501
   └─> Sidebar displays 6 navigation options

2. USER SELECTS MODULE & INPUTS PARAMETERS
   └─> Ticker symbol entered (e.g., "TCS.NS")
   └─> Date range selected via st.date_input()
   └─> Module-specific sliders adjusted (p,d,q for SARIMAX; n_estimators for RF etc.)

3. DATA FETCH (on button click)
   └─> yfinance API called with ticker + date range
   └─> Data validated (empty check, null handling)
   └─> Returns stored in session or local variable

4. PREPROCESSING
   └─> pct_change() for returns
   └─> MinMaxScaler for NN inputs
   └─> Technical indicators computed (RSI, MACD, BB)
   └─> Sliding window sequences created (60-day lookback)

5. MODEL EXECUTION
   └─> Module 1: SARIMAX ADF → decompose → fit → forecast → backtest
   └─> Module 2: Returns → covariance → Monte Carlo → SLSQP → risk metrics
   └─> Module 3: FinBERT/TextBlob → RF → MLP → LSTM (sequential sub-modules)
   └─> Module 4: Env create → indicators → agent train → agent evaluate
   └─> Module 5: Macro fetch → align → RF train → attention → anomaly → regime

6. OUTPUT RENDERING
   └─> st.metric() cards: RMSE, R², Sharpe Ratio, Net Worth
   └─> Plotly charts: forecast lines, Efficient Frontier, RL net worth curves
   └─> st.dataframe(): raw data tables in expanders
   └─> Colour-coded signals: green (bullish), red (bearish)

7. USER INTERACTION
   └─> User adjusts parameters → Step 2 repeats (Streamlit reactive model)
   └─> User downloads CSV results via st.download_button()
```

---

## 4.6 Features of the New System (Proposed System)

| Feature | Description | Benefit |
|---------|-------------|---------|
| **Unified Multi-Module Platform** | All 5 analytical modules in one application | Eliminates tool fragmentation |
| **Real-Time Data Fetching** | Live Yahoo Finance data for any ticker | Always up-to-date analysis |
| **Honest Backtesting** | Out-of-sample evaluation enforced in all predictive modules | Eliminates misleading accuracy reporting |
| **Interactive Parameter Control** | All model hyperparameters adjustable via sliders | No coding required for experimentation |
| **FinBERT NLP Sentiment** | Domain-specific transformer model for financial news | Superior accuracy vs general NLP tools |
| **Efficient Frontier Visualization** | Monte Carlo cloud + analytical frontier in single Plotly chart | Intuitive portfolio trade-off visualization |
| **RL Multi-Algorithm Support** | PPO, A2C, DQN compared on same environment | Research-grade RL comparison capability |
| **Macro-Economic Context** | 6 global indicators integrated into stock analysis | Beyond single-stock siloed analysis |
| **Graceful Fallbacks** | GradientBoosting↔LSTM, TextBlob↔FinBERT | Robust across all Python environments |
| **Risk Metrics Suite** | Beta, Max Drawdown, VaR, Stress Testing | Institutional-grade risk quantification |
| **Zero-Cost Deployment** | Runs entirely on free, open-source libraries | Democratizes institutional analytics |
| **Dark Theme UI** | Professional dark-themed interface with Plotly charts | Modern, financial-grade aesthetics |

---

## 4.7 Main Modules / Components / Processes / Techniques

| Module | Sub-Components | Core Techniques |
|--------|---------------|-----------------|
| **Module 1: SARIMAX** | ADF Test, Seasonal Decomposition, SARIMAX Fitting, Backtesting | Box-Jenkins methodology, MLE optimization, Rolling-window cross-validation |
| **Module 2: Portfolio** | Returns Analysis, Correlation Matrix, Monte Carlo Simulation, SLSQP Optimizer, Risk Metrics, Stress Testing | Modern Portfolio Theory, Convex optimization, Monte Carlo methods, VaR (historical simulation) |
| **Module 3: Advanced AI** | SentimentAnalyzer, FinBERTAnalyzer, TrendClassifier, NeuralNetForecaster, LSTMForecaster | NLP (BERT fine-tuning), Random Forest (bagging), MLP (backpropagation, L2), LSTM (gated recurrence, Dropout) |
| **Module 4: RL Agent** | StockTradingEnv, add_technical_indicators, train_rl_agent, evaluate_rl_agent | MDP (Markov Decision Process), PPO (clipped surrogate objective), A2C (policy gradient), DQN (experience replay) |
| **Module 5: TFT** | MultiVariateDataFetcher, TemporalFusionModel, detect_macro_anomaly, historical_lookalike, detect_market_regime, simulate_scenario | Random Forest (proxy attention), Isolation Forest (anomaly), KNN (lookalike), Moving average crossover (regime) |
| **Infrastructure** | data_fetcher, config, app | API integration, centralized config, Streamlit routing |

---

## 4.8 Selection of Hardware / Software / Algorithms / Methodology

### Algorithm Selection Justification:

| Algorithm | Alternative Considered | Why This Algorithm Was Chosen |
|-----------|----------------------|-------------------------------|
| **SARIMAX** | Simple ARIMA, Prophet | SARIMAX handles seasonal patterns + exogenous variables; more general than ARIMA; more interpretable than Prophet |
| **SLSQP for portfolio** | Genetic Algorithm, Simulated Annealing | SLSQP is a gradient-based convex optimizer; guaranteed global optimum for convex problems; fast convergence |
| **Random Forest** | SVM, Gradient Boosting, Logistic Regression | RF provides feature importance; robust to overfitting via bagging; no feature scaling required |
| **LSTM** | GRU, Transformer (full) | LSTM is proven on financial time series; lighter than full Transformer; widely benchmarked in literature |
| **PPO** | DDPG, SAC, TD3 | PPO is the most stable on-policy RL algorithm; recommended default in SB3; robust across environment types |
| **Isolation Forest** | One-Class SVM, DBSCAN | Isolation Forest is highly efficient on high-dimensional data; parameter-light; scales to large datasets |
| **KNN for lookalike** | DTW (Dynamic Time Warping), Euclidean cluster | KNN is transparent and interpretable; computationally efficient; easy to explain to non-technical users |

### Software Selection Justification:

| Software | Alternative | Reason for Selection |
|----------|-------------|---------------------|
| **Streamlit** | Flask + React, Dash | Streamlit requires zero frontend code; Python-only; 10x faster development for data apps |
| **Plotly** | Matplotlib, Bokeh | Plotly provides interactive charts natively; dark theme compatible; Streamlit has native `st.plotly_chart()` |
| **Stable-Baselines3** | FinRL, custom RL | SB3 provides production-grade PPO/A2C/DQN with Gymnasium compatibility; well-maintained; clean API |
| **yfinance** | Alpha Vantage, Quandl | yfinance is free, requires no API key, supports all major global exchanges including NSE/BSE |

---
---

# SECTION 5: SYSTEM DESIGN

---

## 5.1 System Design and Methodology

FinSight AI follows a **layered modular architecture** with clear separation between the presentation layer (Streamlit views), business logic layer (src/ modules), and data layer (yfinance API). The design methodology applied is **Object-Oriented Design (OOD)** — each analytical capability is encapsulated in a class with well-defined public methods, enabling independent testing and extension.

### Design Principles Applied:

| Principle | Application in FinSight AI |
|-----------|---------------------------|
| **Separation of Concerns** | views/*.py handles UI only; src/*.py handles all ML logic |
| **Single Responsibility** | Each class has one primary analytical responsibility (e.g., `PortfolioOptimizer` only optimizes portfolios) |
| **Open/Closed Principle** | New modules can be added by creating new view + src files without modifying existing modules |
| **Dependency Inversion** | Views depend on class interfaces, not concrete library implementations (TF vs GradientBoosting swap is invisible to view) |
| **DRY (Don't Repeat Yourself)** | `config/config.py` centralizes all constants; `data_fetcher.py` centralizes all API calls |
| **Graceful Degradation** | Optional dependencies handled via try/except with functional fallbacks |

### System Architecture Diagram:

```
┌─────────────────────────────────────────────────┐
│              PRESENTATION LAYER                  │
│         views/ (Streamlit pages)                 │
│  forecast_page | portfolio_page | ai_page        │
│  rl_page | tft_page | about                      │
└──────────────────────┬──────────────────────────┘
                       │ calls
┌──────────────────────▼──────────────────────────┐
│            BUSINESS LOGIC LAYER                  │
│              src/ (Python classes)               │
│  DataFetcher | PortfolioOptimizer | RiskMetrics  │
│  SentimentAnalyzer | TrendClassifier             │
│  NeuralNetForecaster | LSTMForecaster            │
│  StockTradingEnv | TemporalFusionModel           │
└──────────────────────┬──────────────────────────┘
                       │ fetches
┌──────────────────────▼──────────────────────────┐
│                 DATA LAYER                       │
│         Yahoo Finance (yfinance API)             │
│   OHLCV data | News | Macro indicators           │
└─────────────────────────────────────────────────┘
```

---

## 5.2 Database Design / Data Structure Design

FinSight AI does not use a persistent database. All data flows in-memory through Python data structures. The primary data structures are:

### Core Data Structures:

**1. Price Series (Pandas Series):**
```python
# Single stock closing prices
prices: pd.Series  # DatetimeIndex → float64
# Shape: (N,) where N = number of trading days
# Example: 252 rows for 1 year of daily data
```

**2. Multi-Stock Returns DataFrame:**
```python
returns: pd.DataFrame
# Shape: (N_days, N_stocks)
# Columns: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', ...]
# Values: daily percentage returns (float64)
```

**3. LSTM Input Tensor:**
```python
X_train: np.ndarray  # Shape: (samples, timesteps, features) = (N-60, 60, 1)
y_train: np.ndarray  # Shape: (samples,) = (N-60,)
```

**4. RL Observation Space:**
```python
observation: np.ndarray  # Shape: (15,)
# Components:
# [0]: normalized current price
# [1]: normalized balance
# [2]: normalized shares held
# [3]: normalized net worth
# [4]: RSI (14-day)
# [5]: MACD line
# [6]: MACD signal
# [7]: BB upper band
# [8]: BB lower band
# [9-14]: 5 lagged normalized prices
```

**5. Monte Carlo Portfolio Results:**
```python
portfolio_results: pd.DataFrame
# Columns: ['Return', 'Volatility', 'Sharpe', 'w_stock1', 'w_stock2', ...]
# Shape: (5000, 3 + N_stocks)
```

**6. Multi-Variate TFT Feature Matrix:**
```python
macro_df: pd.DataFrame
# Columns: ['Close', 'SP500', 'VIX', 'Treasury10Y', 'Gold', 'Oil', 'DollarIdx']
# Shape: (N_days, 7)
# All values normalized via MinMaxScaler
```

### Class Diagram (Key Classes):

```
PortfolioOptimizer
├── __init__(returns, expected_returns, cov_matrix, risk_free_rate)
├── monte_carlo_simulation(n_portfolios=5000) → DataFrame
├── optimize_sharpe() → dict (weights, return, volatility, sharpe)
├── optimize_min_volatility() → dict
└── efficient_frontier(n_points=100) → DataFrame

LSTMForecaster
├── __init__(look_back=60)
├── prepare_data(prices) → (X_train, X_test, y_train, y_test, scaler)
├── build_and_train_model(X_train, y_train) → model
├── evaluate(model, X_test, y_test, scaler) → metrics_dict
└── predict_future(model, last_sequence, scaler, days=30) → list

StockTradingEnv (gymnasium.Env)
├── __init__(df, initial_balance, risk_profile)
├── reset() → observation
├── step(action) → (observation, reward, done, truncated, info)
├── _get_observation() → np.ndarray
└── _calculate_reward(prev_worth, curr_worth) → float

TemporalFusionModel
├── __init__(target_col, feature_cols)
├── train_and_extract_attention(df) → (model, attention_weights)
├── probabilistic_forecast(model, df, days=30) → (predictions, lower, upper)
├── detect_macro_anomaly(df) → anomaly_scores
├── historical_lookalike(df, window=30, k=3) → matched_dates
├── detect_market_regime(df) → regime_label
└── simulate_scenario_custom(model, df, scenario_dict) → predicted_price
```

---

## 5.3 Input / Output and Interface Design

### 5.3.1 State Transition Diagram

```
                    [APP LAUNCH]
                         │
                         ▼
              ┌─────────────────────┐
              │   IDLE / HOME STATE │
              │  Sidebar displayed  │
              └─────────┬───────────┘
                        │ User selects module
          ┌─────────────┼──────────────────┐
          ▼             ▼                  ▼
   [MODULE 1]     [MODULE 2]         [MODULE 3-5]
   SARIMAX        PORTFOLIO          AI/RL/TFT
   Input State    Input State        Input State
          │             │                  │
          │ User clicks │                  │
          │ "Analyze"   │                  │
          ▼             ▼                  ▼
   [LOADING]       [LOADING]          [LOADING]
   Spinner          Spinner            Spinner
          │             │                  │
          ▼             ▼                  ▼
   [RESULTS]       [RESULTS]          [RESULTS]
   Charts +         Charts +           Charts +
   Metrics          Metrics            Metrics
          │             │                  │
          └─────────────┼──────────────────┘
                        │ User changes parameter
                        ▼
              [RELOAD → LOADING → RESULTS]
              (Streamlit reactive re-execution)
```

### 5.3.2 Sample Forms, Reports, and Interface

**Module 1 — SARIMAX Input Form:**

| Input Field | Widget Type | Default | Range/Options |
|-------------|-------------|---------|---------------|
| Stock Ticker | st.text_input | "AAPL" | Any valid Yahoo Finance ticker |
| Start Date | st.date_input | 2 years ago | Any historical date |
| End Date | st.date_input | Today | After start date |
| AR Order (p) | st.slider | 2 | 0–5 |
| Differencing (d) | st.slider | 1 | 0–2 |
| MA Order (q) | st.slider | 2 | 0–5 |
| Seasonal Period (S) | st.slider | 12 | 5–52 |
| Forecast Days | st.slider | 10 | 1–30 |

**Module 1 — SARIMAX Output Report:**

| Output | Display Type | Description |
|--------|-------------|-------------|
| ADF Test Result | st.info / st.warning | Pass/Fail with p-value |
| Decomposition Plot | Plotly line chart | Trend + Seasonal + Residual |
| ACF/PACF Plot | Matplotlib bar chart | Correlation at each lag |
| Forecast Chart | Plotly line chart | Historical + forecast + CI bands |
| Backtest Chart | Plotly line chart | Predicted vs actual |
| In-sample metrics | st.metric() | RMSE, MAPE |
| Backtest metrics | st.metric() | RMSE, MAPE, Directional Accuracy |

**Module 2 — Portfolio Input Form:**

| Input Field | Widget Type | Default |
|-------------|-------------|---------|
| Ticker List | st.text_area | RELIANCE.NS, TCS.NS, ... |
| Start/End Date | st.date_input | 2-year range |
| Initial Investment | st.number_input | ₹100,000 |

**Module 4 — RL Agent Input Form:**

| Input Field | Widget Type | Default | Options |
|-------------|-------------|---------|---------|
| Stock Ticker | st.text_input | "AAPL" | Any ticker |
| Algorithm | st.selectbox | "PPO" | PPO, A2C, DQN |
| Training Timesteps | st.slider | 20,000 | 5,000–100,000 |
| Initial Balance | st.number_input | $10,000 | Any positive value |
| Risk Profile | st.selectbox | "balanced" | conservative, balanced, aggressive |

### 5.3.3 Access Control / Security

FinSight AI is a **single-user, locally deployed** application. However, the following security considerations are implemented:

| Security Aspect | Implementation |
|----------------|----------------|
| **No user authentication** | Not required — local-only deployment |
| **No data persistence** | All user inputs and results are in-memory only (no disk writes of personal data) |
| **API rate limiting** | yfinance API has implicit rate limits; error handling catches `HTTPError` and notifies user |
| **No API keys exposed** | yfinance requires no API keys; no secrets management needed |
| **Disclaimer display** | A prominent warning: "This app is for educational purposes only. Not financial advice." is displayed in the About section |
| **Input validation** | Empty ticker → `st.error()` message before any API call. Date range validation prevents end < start |
| **Dependency isolation** | All Python dependencies isolated in `venv/` — no system-level package modifications |

---
