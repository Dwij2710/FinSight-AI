
# SECTION 2: OVERVIEW OF DEPARTMENTS / UNITS AND PRODUCTION LAYOUT

---

## 2.1 Details of Work Carried Out in Each Department

FinSight AI is an academic software project developed independently. Rather than traditional manufacturing departments, the project is organized into five analytical **modules** (departments), each with a distinct function:

---

### Department 1 — Stock Forecasting Module (SARIMAX)

**Location in codebase:** `views/forecast_page.py` + `statsmodels` library

**Work Carried Out:**
- Accepts a stock ticker symbol (e.g., `AAPL`, `RELIANCE.NS`) and date range from the user.
- Downloads historical OHLCV (Open, High, Low, Close, Volume) data via the `yfinance` API.
- Performs Augmented Dickey-Fuller (ADF) stationarity test on the closing price series.
- Applies seasonal decomposition to extract Trend, Seasonal, and Residual components.
- Fits a SARIMAX(p,d,q)(P,D,Q,S) model using Maximum Likelihood Estimation via `statsmodels`.
- Generates a 10-day-ahead price forecast with 95% confidence intervals.
- Executes rolling-window backtesting over the last 30 days for honest out-of-sample accuracy.
- Displays interactive Plotly charts for decomposition, ACF/PACF, forecast, and backtest results.

---

### Department 2 — Portfolio Analysis Module (MPT)

**Location in codebase:** `views/portfolio_page.py` + `src/portfolio_optimizer.py`, `src/risk_metrics.py`, `src/stress_testing.py`

**Work Carried Out:**
- Downloads closing prices for a user-specified basket of 2–10 stocks simultaneously.
- Computes daily percentage returns and annualises expected return and covariance matrix.
- Renders a pairwise Pearson correlation heatmap for diversification analysis.
- Runs 5,000-iteration Monte Carlo simulation to generate random portfolios across the risk-return space.
- Applies SLSQP convex optimisation (via `scipy.optimize.minimize`) to find:
  - Maximum Sharpe Ratio portfolio weights
  - Minimum Volatility portfolio weights
  - Analytical Efficient Frontier (100 points)
- Computes risk metrics: Beta (vs NIFTY 50), Maximum Drawdown, Value-at-Risk at 95%.
- Benchmarks portfolio cumulative returns against the NIFTY 50 index (`^NSEI`).
- Runs three stress-test scenarios (Mild Correction −10%, Severe Bear −30%, Black Swan −50%).

---

### Department 3 — Advanced AI Module (NLP + Neural Networks)

**Location in codebase:** `views/ai_page.py` + `src/ai_features.py`

**Work Carried Out:**
- **Sentiment Analysis:** Fetches latest news headlines via `yfinance`. Applies ProsusAI/FinBERT (via HuggingFace Transformers) for domain-specific financial sentiment scoring. Falls back to TextBlob + financial lexicon adjustment if transformers unavailable.
- **Buy/Sell Signal Classifier:** Computes RSI (14-day), SMA-20, SMA-50, and daily returns as features. Trains a regularised Random Forest (100 trees, max_depth=10) to classify next-day price direction (up/down). Reports test accuracy and feature importance.
- **MLP Price Forecaster:** Uses 60-day lookback windows as flattened input vectors. Trains a 2-layer MLP (50→25→1) with L2 regularisation and early stopping. Generates 30-day autoregressive forecast. Reports R², RMSE, MAE on held-out test set.
- **LSTM Deep Learning Forecaster:** Reshapes data into 3D sequences (samples, timesteps, features). Trains a stacked 2-layer LSTM (50→50→Dense(1)) with 0.2 Dropout regularisation. Falls back to Gradient Boosting if TensorFlow unavailable. Generates 30-day forecast.

---

### Department 4 — Reinforcement Learning Trading Agent

**Location in codebase:** `views/rl_page.py` + `src/rl_agent.py`

**Work Carried Out:**
- Builds a custom `StockTradingEnv` class inheriting from `gymnasium.Env`.
- Computes technical indicators: RSI (14), MACD (12/26/9), Bollinger Bands (20-day).
- Defines observation space (15-dimensional vector: price, RSI, MACD, BB, position, balance, net worth).
- Defines action space: Discrete (Buy/Hold/Sell) or Continuous (fraction to trade).
- Implements risk-profile-aware reward shaping (conservative/balanced/aggressive modes).
- Trains PPO, A2C, and DQN agents from Stable-Baselines3 over user-specified timesteps.
- Evaluates trained agent on held-out test period: tracks net worth progression, action distribution.
- Compares all three algorithm performances on final net worth and ROI.

---

### Department 5 — Multi-Variate TFT Module

**Location in codebase:** `views/tft_page.py` + `src/tft_features.py`

**Work Carried Out:**
- Downloads 6 macro-economic proxy tickers alongside the target stock: S&P 500 (^GSPC), VIX (^VIX), 10-Year Treasury (^TNX), Gold (GC=F), Crude Oil (CL=F), US Dollar (DX-Y.NYB).
- Aligns all series to a common trading calendar via forward-fill.
- Trains a Random Forest regressor as a TFT proxy, extracting feature importances as surrogate attention weights.
- Generates probabilistic price forecast with 90% confidence interval (mean ± 1.645σ).
- Applies Isolation Forest for macro-anomaly detection on the multi-variate input matrix.
- Implements K-Nearest Neighbours historical lookalike matching (k=3) on the last 30-day window.
- Classifies current market regime (Bull / Bear / Sideways) based on 20-day vs 50-day moving average crossover and VIX threshold.
- Allows custom scenario simulation: user adjusts macro variables ±% and observes predicted price impact.

---

## 2.2 Technical Specifications of Major Equipment (Software & Hardware)

| Component | Specification | Role in Project |
|-----------|--------------|-----------------|
| **Programming Language** | Python 3.10+ | Core development language |
| **Web Framework** | Streamlit ≥ 1.28 | Interactive multi-page web application |
| **ML Library** | Scikit-Learn ≥ 1.3 | MLP, Random Forest, GradientBoosting, MinMaxScaler |
| **Deep Learning** | TensorFlow/Keras ≥ 2.12 (optional) | LSTM architecture construction and training |
| **Statistical Modelling** | statsmodels ≥ 0.14 | SARIMAX model, ADF test, seasonal decomposition |
| **Optimisation** | SciPy ≥ 1.11 | SLSQP portfolio optimisation algorithm |
| **Data API** | yfinance ≥ 0.2 | Yahoo Finance OHLCV + news headline retrieval |
| **Data Processing** | Pandas ≥ 2.0, NumPy ≥ 1.24 | DataFrame manipulation, matrix operations |
| **NLP (Primary)** | HuggingFace Transformers ≥ 4.30 | FinBERT financial sentiment model |
| **NLP (Fallback)** | TextBlob ≥ 0.17 | General-purpose sentiment analysis |
| **RL Framework** | Gymnasium ≥ 0.29 | Custom trading environment (OpenAI standard) |
| **RL Algorithms** | Stable-Baselines3 ≥ 2.1 | PPO, A2C, DQN implementations |
| **Visualisation** | Plotly ≥ 5.15 | Interactive charts (zoom, hover, export) |
| **Development OS** | Windows 11 / Ubuntu 22.04 | Local development and testing |
| **Processor** | Intel Core i5/i7 (minimum) | CPU-based model training |
| **RAM** | 8 GB minimum, 16 GB recommended | In-memory data and model storage |
| **Storage** | 5 GB free (including venv) | Python environment + model artifacts |
| **Python Environment** | virtualenv / conda | Isolated dependency management |

---

## 2.3 Schematic Layout — Sequence of Operations for End Product

The following diagram illustrates the complete sequence of operations from user input to final analytical output:

```
USER INPUT
(Ticker Symbol, Date Range, Module Selection)
            │
            ▼
┌───────────────────────────────┐
│   STREAMLIT NAVIGATION        │
│   app.py → sidebar.radio()    │
│   Routes to selected module   │
└──────────────┬────────────────┘
               │
    ┌──────────▼──────────┐
    │   DATA ACQUISITION  │
    │  yfinance API fetch  │
    │  OHLCV + News + Macro│
    └──────────┬──────────┘
               │
    ┌──────────▼──────────────────────────────────────┐
    │             PREPROCESSING                        │
    │  • Forward-fill missing values                   │
    │  • Compute daily returns (pct_change)            │
    │  • MinMaxScaler normalisation (for NN modules)   │
    │  • Technical indicator computation (RSI, MACD)   │
    └──────────┬──────────────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────────────┐
    │           MODEL TRAINING & INFERENCE             │
    │  Module 1: SARIMAX fit → 10-day forecast        │
    │  Module 2: Monte Carlo + SLSQP optimisation     │
    │  Module 3: RF / MLP / LSTM train → 30-day pred  │
    │  Module 4: RL agent train (PPO/A2C/DQN)         │
    │  Module 5: TFT proxy → probabilistic forecast    │
    └──────────┬──────────────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────────────┐
    │          POST-PROCESSING & METRICS               │
    │  • RMSE, MAE, R² computation                     │
    │  • Sharpe Ratio, Beta, Drawdown calculation      │
    │  • Confidence interval generation                │
    │  • Anomaly scoring, regime classification        │
    └──────────┬──────────────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────────────┐
    │          VISUALISATION & OUTPUT                  │
    │  • Plotly interactive charts                     │
    │  • st.metric() cards for key figures             │
    │  • Downloadable CSV results                      │
    │  • Colour-coded signals (Green=Bull, Red=Bear)   │
    └─────────────────────────────────────────────────┘
```

*Figure 2.1: End-to-end sequence of operations in FinSight AI*

---

## 2.4 Detailed Explanation of Each Stage of Production

### Stage 1: User Input and Navigation
The user launches the application via `streamlit run app.py`. The Streamlit sidebar presents six navigation options. The user selects a module, enters a stock ticker (e.g., `TCS.NS`), specifies a date range, and adjusts model hyperparameters via sliders and dropdowns. All inputs are captured as Python variables via Streamlit widget functions (`st.text_input`, `st.slider`, `st.selectbox`).

### Stage 2: Data Acquisition
The `DataFetcher` class in `src/data_fetcher.py` calls `yf.Ticker(ticker).history(start, end)` to retrieve historical daily OHLCV data. For portfolio analysis, `yf.download(tickers_list, start, end)` fetches multi-stock data in a single API call. For the TFT module, six additional macro tickers are fetched in parallel. For sentiment analysis, `yf.Ticker(ticker).news` retrieves the 10 most recent news headlines.

### Stage 3: Preprocessing
Raw data is validated for emptiness (returns an error if no data found). Missing values in multi-variate datasets (arising from different trading calendars) are resolved via forward-fill. Daily percentage returns are computed. For neural network modules, closing prices are normalised to [0, 1] using MinMaxScaler — this is essential because neural networks are sensitive to input scale. Sliding window sequences of length 60 are created for MLP/LSTM training.

### Stage 4: Model Training
Each module trains its respective model:
- SARIMAX fitting uses Maximum Likelihood Estimation (statsmodels MLE optimizer).
- Portfolio optimisation runs 5,000 random weight simulations followed by SLSQP gradient-based optimization.
- MLP and Random Forest use Scikit-Learn's standard `fit()` method with Adam optimizer and Gini impurity splitting respectively.
- LSTM training uses TensorFlow's `model.fit()` with the Adam optimizer, MSE loss, and EarlyStopping callback.
- RL agents use Stable-Baselines3's `model.learn(total_timesteps)` with internal experience replay and policy gradient updates.

### Stage 5: Inference and Post-Processing
Trained models generate predictions on held-out test data. RMSE, MAE, R², and MAPE are computed. Portfolio metrics (Sharpe Ratio, Beta, Maximum Drawdown, VaR) are calculated. Confidence intervals are generated by propagating prediction variance or using quantile regression (TFT module). Market regime labels and anomaly flags are assigned.

### Stage 6: Visualisation and Display
All outputs are rendered in the Streamlit UI using Plotly interactive charts. Key metrics are displayed as `st.metric()` cards with delta indicators. Raw data tables are accessible via `st.expander()`. Charts support zoom, pan, hover tooltips, and PNG/SVG export. Green (#00cc88) signals positive outcomes; red (#ff4444) signals risks; blue (#4da6ff) marks neutral indicators.

---
---

# SECTION 3: INTRODUCTION TO PROJECT AND PROJECT MANAGEMENT

---

## 3.1 Project Summary

**FinSight AI is a comprehensive, AI-powered stock market analysis and portfolio optimization platform that integrates five distinct analytical modules — SARIMAX statistical forecasting, Modern Portfolio Theory optimization, multi-model Advanced AI (LSTM, MLP, Random Forest, FinBERT), Reinforcement Learning trading agents, and a Multi-Variate Temporal Fusion Transformer proxy — within a unified, interactive Streamlit web application, democratizing institutional-grade financial analytics for individual retail investors and academic researchers.**

The platform addresses the critical gap between the fragmented, expensive tools available to institutional investors and the inadequate, non-integrated tools available to retail investors. By combining time-series forecasting, portfolio optimization, deep learning price prediction, news sentiment analysis, and macro-economic contextual analysis in a single, zero-cost, locally deployable web application, FinSight AI provides capabilities that previously required access to Bloomberg Terminal ($20,000+/year) or proprietary quantitative research infrastructure.

The project was developed as a full-stack AI application using Python, Streamlit, Scikit-Learn, TensorFlow, Stable-Baselines3, statsmodels, and HuggingFace Transformers. All five modules operate on real financial data fetched live from Yahoo Finance, ensuring relevance and accuracy. The system is designed with modularity and extensibility as primary engineering principles, enabling future integration of real-time data feeds, GPT-based report generation, and options analytics.

---

## 3.2 Purpose

The purpose of FinSight AI is:

1. **To democratize institutional-grade financial analytics** by providing retail investors with AI-powered tools previously available only to hedge funds and investment banks.

2. **To serve as an educational platform** for students of machine learning, data science, and quantitative finance, demonstrating the practical application of academic algorithms (SARIMAX, MPT, LSTM, PPO) to real financial data.

3. **To provide honest, rigorously evaluated predictions** — unlike many commercial tools that report misleading in-sample accuracy metrics, FinSight AI enforces out-of-sample backtesting across all predictive modules.

4. **To integrate five algorithmic traditions** — statistical econometrics, classical optimization, supervised ML, deep learning, and reinforcement learning — within a single coherent system, demonstrating that these approaches are complementary rather than competing.

5. **To establish a reusable open-source template** for AI-powered financial applications, with clean module boundaries, robust fallback mechanisms, and production-quality code organization.

---

## 3.3 Objective

### Primary Objectives:

| # | Objective | Module |
|---|-----------|--------|
| O1 | Implement SARIMAX-based univariate time-series stock price forecasting with ADF stationarity testing and rolling-window backtesting | Module 1 |
| O2 | Implement Mean-Variance Portfolio Optimization using Monte Carlo simulation (5,000 portfolios) and SLSQP convex optimization, generating the Efficient Frontier and optimal portfolio weights | Module 2 |
| O3 | Build a financial news sentiment analyzer using ProsusAI/FinBERT transformer with TextBlob+lexicon fallback | Module 3 |
| O4 | Implement a Random Forest buy/sell signal classifier with technical indicators (RSI, SMA-20, SMA-50) as features | Module 3 |
| O5 | Build a 30-day price forecaster using a regularized MLP (L2 + early stopping) with autoregressive prediction | Module 3 |
| O6 | Build a 30-day price forecaster using a stacked LSTM network with Dropout regularization and GradientBoosting fallback | Module 3 |
| O7 | Design and implement a custom OpenAI Gymnasium trading environment with RSI, MACD, and Bollinger Band state features | Module 4 |
| O8 | Train and evaluate PPO, A2C, and DQN reinforcement learning agents with risk-profile-aware reward shaping | Module 4 |
| O9 | Develop a Multi-Variate TFT proxy integrating 6 macro-economic variables for probabilistic forecasting, anomaly detection, lookalike matching, and scenario simulation | Module 5 |

### Secondary Objectives:

| # | Objective |
|---|-----------|
| S1 | Design a clean, responsive, dark-themed Streamlit UI with interactive Plotly charts |
| S2 | Implement graceful degradation (GradientBoosting ↔ LSTM, TextBlob ↔ FinBERT) |
| S3 | Ensure all models include regularization and report performance on held-out test data |
| S4 | Structure the codebase following separation-of-concerns principles (src/, views/, config/) |
| S5 | Document all design decisions in PROJECT_WORKFLOW.md for educational transparency |

---

## 3.4 Scope

### What FinSight AI CAN Do:

- Forecast closing prices for **any Yahoo Finance ticker** (NSE, BSE, NYSE, NASDAQ, crypto)
- Analyze portfolios of **2 to 10 stocks** with full MPT optimization and risk metrics
- Process news headlines for **sentiment scoring** (positive/negative/neutral) using FinBERT
- Generate **buy/sell trading signals** based on technical indicators
- Produce **30-day deep learning price forecasts** using MLP and LSTM
- Train and evaluate **RL trading agents** (PPO, A2C, DQN) on historical price data
- Analyze **macro-economic impact** via 6 global indicators on any target stock
- Detect **market anomalies** and classify **market regimes** (Bull/Bear/Sideways)
- Run **scenario simulations** (e.g., "What if oil prices rise 20%?")
- Deploy **entirely locally** without any cloud infrastructure or API keys

### What FinSight AI CANNOT Do:

- Execute real trades or connect to any brokerage API
- Perform intraday or high-frequency analysis (daily resolution only)
- Analyse options, futures, bonds, or derivatives
- Provide legally regulated financial advice
- Access paid or proprietary data sources
- Perform fundamental analysis (P/E ratio, earnings, balance sheet)
- Support multi-user concurrent access (single-user local application)
- Guarantee prediction accuracy (all forecasts are probabilistic and educational)

---

## 3.5 Technology and Literature Review

### Technology Review

| Technology | Version | Selection Justification |
|------------|---------|------------------------|
| **Python** | 3.10+ | De facto language for ML/AI; vast ecosystem; excellent financial libraries |
| **Streamlit** | ≥1.28 | Converts Python to interactive web apps with zero HTML/JS; built-in widget library; reactive execution model |
| **yfinance** | ≥0.2 | Free Yahoo Finance API wrapper; supports OHLCV, news, and macro tickers; no API key required |
| **statsmodels** | ≥0.14 | Gold-standard implementation of SARIMAX, ADF test, and seasonal decomposition |
| **Scikit-Learn** | ≥1.3 | Industry-standard ML library; MLP, Random Forest, GradientBoosting, MinMaxScaler all in one package |
| **TensorFlow/Keras** | ≥2.12 | Leading deep learning framework; Keras API enables clean LSTM definition in <10 lines |
| **SciPy** | ≥1.11 | Provides SLSQP optimizer for constrained portfolio optimization |
| **HuggingFace Transformers** | ≥4.30 | Standardized access to FinBERT and 100,000+ pre-trained models |
| **Stable-Baselines3** | ≥2.1 | Production-grade RL library implementing PPO, A2C, DQN with Gymnasium compatibility |
| **Gymnasium** | ≥0.29 | OpenAI standard for RL environments; clean observation/action space API |
| **Plotly** | ≥5.15 | Interactive charts with zoom/hover/export; dark-theme compatible |

### Literature Review Summary

| Domain | Key Works | Relevance to FinSight AI |
|--------|-----------|--------------------------|
| Time-Series Forecasting | Box & Jenkins (1976) ARIMA; Ariyo et al. (2014) | Theoretical basis for SARIMAX Module 1 |
| Statistical Testing | Dickey & Fuller (1979) ADF Test | Stationarity testing before SARIMAX fitting |
| Portfolio Theory | Markowitz (1952) MPT; Sharpe (1966) Sharpe Ratio | Foundation for Module 2 portfolio optimization |
| Random Forest | Breiman (2001); Khaidem et al. (2016) 94% accuracy on S&P 500 | Module 3 signal classifier |
| Deep Learning | Hochreiter & Schmidhuber (1997) LSTM; Fischer & Krauss (2018) | Module 3 LSTM price forecaster |
| NLP & Finance | Tetlock (2007) news-price relationship; Yang et al. (2020) FinBERT 97.2% | Module 3 sentiment analysis |
| Reinforcement Learning | Mnih et al. (2015) DQN; Schulman et al. (2017) PPO | Module 4 RL trading agent |
| Transformer Models | Vaswani et al. (2017) Attention; Lim et al. (2021) TFT | Module 5 macro-economic analysis |

---

## 3.6 Project / Internship Planning

### 3.6.1 Development Approach and Justification

**Approach: Iterative Modular Development**

FinSight AI was developed using an **iterative, module-by-module approach** rather than a monolithic waterfall design. Each module was designed, implemented, tested, and integrated independently before proceeding to the next.

**Justification:**
- **Risk Reduction:** If one module encounters a technical obstacle (e.g., TensorFlow installation issues), other modules remain unaffected.
- **Parallel Testability:** Each module can be tested in isolation without requiring the entire system to be complete.
- **Incremental Value Delivery:** Each completed module delivers immediate analytical value, even before the full platform is finished.
- **Technology Uncertainty Management:** The use of optional dependencies (TensorFlow, Transformers) is managed through fallback mechanisms, which are naturally implemented at the module level.

The development sequence followed increasing algorithmic complexity:
1. **Data Infrastructure First** → Build `data_fetcher.py` and validate API access
2. **Simplest Model First** → SARIMAX (interpretable, well-understood)
3. **Classical ML Next** → Portfolio optimizer, Random Forest
4. **Deep Learning** → MLP, then LSTM
5. **Most Complex Last** → Reinforcement Learning, TFT Module

---

### 3.6.2 Project Effort, Time, and Cost Estimation

**Time Estimation:**

| Phase | Activity | Duration |
|-------|----------|----------|
| Phase 1 | Requirements gathering, literature review, technology selection | 2 weeks |
| Phase 2 | Data infrastructure (yfinance API, data_fetcher.py) | 1 week |
| Phase 3 | Module 1 — SARIMAX implementation and testing | 1 week |
| Phase 4 | Module 2 — Portfolio optimizer, risk metrics, stress testing | 2 weeks |
| Phase 5 | Module 3 — Sentiment, Random Forest, MLP implementation | 2 weeks |
| Phase 6 | Module 3 — LSTM implementation and fallback mechanism | 1 week |
| Phase 7 | Module 4 — RL environment design, agent training, evaluation | 2 weeks |
| Phase 8 | Module 5 — TFT proxy, anomaly detection, scenario simulation | 2 weeks |
| Phase 9 | UI polish, CSS styling, Plotly chart refinement | 1 week |
| Phase 10 | Testing, bug fixing, report writing | 2 weeks |
| **Total** | | **~16 weeks (4 months)** |

**Cost Estimation:**

| Resource | Cost |
|----------|------|
| Python, Streamlit, Scikit-Learn, Stable-Baselines3 | ₹0 (open-source) |
| TensorFlow, HuggingFace Transformers | ₹0 (open-source) |
| Yahoo Finance API (yfinance) | ₹0 (free) |
| Development Hardware (personal laptop) | ₹0 (pre-existing) |
| Cloud Hosting | ₹0 (local deployment) |
| Domain / Certificates | ₹0 (academic project) |
| **Total Project Cost** | **₹0** |

This zero-cost development is a significant aspect of the project's value proposition — the entire institutional-grade analytical platform was built using exclusively free, open-source tools.

**Effort Estimation:**

| Activity | Estimated Hours |
|----------|----------------|
| Design and architecture planning | 20 hrs |
| Data pipeline development | 15 hrs |
| SARIMAX module | 20 hrs |
| Portfolio module | 30 hrs |
| Advanced AI module | 40 hrs |
| RL module | 35 hrs |
| TFT module | 30 hrs |
| UI/UX design and Streamlit integration | 25 hrs |
| Testing and debugging | 20 hrs |
| Documentation and report writing | 25 hrs |
| **Total** | **~260 hrs** |

---

### 3.6.3 Roles and Responsibilities

Since this is a single-developer academic project, all roles are fulfilled by the developer. However, for documentation completeness:

| Role | Responsibility | Person |
|------|---------------|--------|
| Project Manager | Planning, scheduling, milestone tracking | Dwij Prajapati |
| System Architect | High-level design, module boundaries, technology selection | Dwij Prajapati |
| Backend Developer | src/*.py — all ML, RL, statistical model implementation | Dwij Prajapati |
| Frontend Developer | views/*.py — Streamlit UI, Plotly chart design | Dwij Prajapati |
| Data Engineer | data_fetcher.py — API integration, preprocessing pipeline | Dwij Prajapati |
| QA / Tester | Test case design, accuracy validation, edge case testing | Dwij Prajapati |
| Technical Writer | PROJECT_WORKFLOW.md, report documentation | Dwij Prajapati |
| Academic Supervisor | Guidance, feedback, evaluation | [Supervisor Name] |

---

### 3.6.4 Group Dependencies

As a solo academic project, inter-team dependencies are replaced by **inter-module dependencies**:

| Dependency | Dependent Module | Dependency Module | Dependency Type |
|------------|-----------------|-------------------|----------------|
| OHLCV data availability | All modules | data_fetcher.py / yfinance API | Hard dependency |
| MinMaxScaler | MLP, LSTM modules | Scikit-Learn | Hard dependency |
| TensorFlow availability | LSTM Forecaster | TensorFlow/Keras | Soft (fallback exists) |
| Transformers library | FinBERT Analyzer | HuggingFace Transformers | Soft (fallback exists) |
| Gymnasium + SB3 | RL Module | Stable-Baselines3 | Hard dependency |
| config.py constants | All modules | config/config.py | Hard dependency |

---

## 3.7 Project Scheduling (Gantt Chart)

```
WEEK:        1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16
             │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │
Literature   [====]
Review       

Data         [==]
Infrastructure

SARIMAX        [==]
Module 1       

Portfolio         [====]
Module 2          

Advanced AI            [========]
Module 3               

RL Agent                         [====]
Module 4                         

TFT Module                             [====]
Module 5                               

UI Polish                                    [==]

Testing &                                       [====]
Report                                          
```

| Milestone | Target Week | Deliverable |
|-----------|-------------|-------------|
| M1 | Week 3 | Data pipeline validated; SARIMAX forecasting working |
| M2 | Week 6 | Portfolio optimizer with Efficient Frontier operational |
| M3 | Week 10 | Full Advanced AI module (Sentiment + RF + MLP + LSTM) |
| M4 | Week 12 | RL agent training and evaluation pipeline complete |
| M5 | Week 14 | TFT module with all 6 sub-features operational |
| M6 | Week 16 | Fully integrated application; report submitted |

---
