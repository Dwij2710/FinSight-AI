
---
title: "FinSight AI — An AI-Powered Stock Market Analysis and Portfolio Optimization Platform"
author: "Dwij Prajapati"
institution: "[Your Institution Name]"
department: "[Department of Computer Science / Information Technology]"
supervisor: "[Supervisor Name]"
date: "April 2026"
---

---

# FinSight AI
## An AI-Powered Stock Market Analysis and Portfolio Optimization Platform

### Project / Internship Report

*Submitted in partial fulfilment of the requirements for the degree of*
**Bachelor of Engineering / Bachelor of Technology**
*(Computer Science and Engineering / Information Technology)*

---

**Submitted by:**
Dwij Prajapati
[Enrollment / Roll Number]

**Under the Guidance of:**
[Supervisor Name]
[Designation], [Department]

---

**[Department Name]**
**[Institution Name]**
**[City, State – PIN Code]**

**[Month] 2026**

---
---

## CERTIFICATE

*This is to certify that the project entitled*

**"FinSight AI — An AI-Powered Stock Market Analysis and Portfolio Optimization Platform"**

*has been satisfactorily completed by*

**Dwij Prajapati**

*in partial fulfilment of the requirements for the award of the degree of Bachelor of Engineering / Bachelor of Technology in Computer Science / Information Technology from [Institution Name] during the academic year 2025–2026.*

---

**Guide / Supervisor:**

_________________________
[Supervisor Name]
[Designation]
[Department]

**Head of Department:**

_________________________
[HOD Name]
[Department of CS/IT]

**Date:** ___________________
**Place:** __________________

---
---

## DECLARATION

I hereby declare that the project entitled **"FinSight AI — An AI-Powered Stock Market Analysis and Portfolio Optimization Platform"** submitted by me to [Institution Name], [City], in partial fulfilment of the requirements for the award of the degree of Bachelor of Engineering / Technology in Computer Science / Information Technology, is a bona fide record of original work carried out by me under the guidance of [Supervisor Name], [Designation], [Department], [Institution Name].

I further declare that the work reported in this project has not been submitted, either in part or full, for the award of any other degree or diploma of this institute or any other institution.

---

**Dwij Prajapati**
[Enrollment No.]
[Date]

---
---

## ACKNOWLEDGEMENT

I express my sincere gratitude to **[Supervisor Name]**, [Designation], [Department], [Institution Name], for the invaluable guidance, encouragement, and constant support throughout this project. His/Her expertise and patience made this work possible.

I am deeply grateful to **[HOD Name]**, Head of the Department of [CS/IT], [Institution Name], for providing the necessary infrastructure and a conducive academic environment.

I extend my thanks to the faculty members of [Department] for their constructive feedback and motivation.

I also thank my family and friends for their unwavering support and encouragement throughout the duration of this project.

Finally, I express my gratitude to the open-source community — including the developers of Streamlit, Scikit-Learn, TensorFlow, Stable-Baselines3, HuggingFace, and Yahoo Finance — whose libraries and datasets formed the technical backbone of this project.

---

**Dwij Prajapati**
[Date]

---
---

## ABSTRACT

*FinSight AI is a comprehensive, AI-powered stock market analysis and portfolio optimization platform developed to bridge the gap between institutional-grade financial analytics and individual retail investors. The proliferation of complex, data-driven financial instruments has rendered traditional heuristic-based investment approaches insufficient; simultaneously, enterprise-level analytical tools remain financially and technically inaccessible to the majority of individual market participants.*

*This project addresses that disparity by designing and implementing a modular, interactive web application built on Python and Streamlit, integrating five distinct analytical modules, each underpinned by rigorous machine learning, deep learning, statistical, and reinforcement learning methodologies.*

*The first module employs the SARIMAX (Seasonal AutoRegressive Integrated Moving Average with eXogenous variables) statistical model for univariate time-series forecasting of stock closing prices, incorporating automated stationarity testing via the Augmented Dickey-Fuller (ADF) test, seasonal decomposition, parameter optimisation, and rolling-window backtesting to deliver honest out-of-sample accuracy metrics.*

*The second module implements Modern Portfolio Theory (MPT), originally formulated by Harry Markowitz (1952), to perform mean-variance optimisation. Using Monte Carlo simulation with 5,000 random portfolio weight combinations and convex optimisation via the SLSQP algorithm, the system generates the Efficient Frontier, identifies the Maximum Sharpe Ratio portfolio, the Minimum Volatility portfolio, and supports benchmark comparison against the NIFTY 50 index. Risk metrics including Beta, Maximum Drawdown, and Value-at-Risk (VaR) are computed to supplement portfolio-level stress analysis.*

*The third module constitutes the core AI engine, housing four sub-systems: (i) sentiment analysis using a hybrid TextBlob and financial-lexicon approach with an optional FinBERT Transformer fallback; (ii) a buy/sell signal classifier using a regularised Random Forest with technical indicators (RSI, SMA-20, SMA-50) as features; (iii) price forecasting using a Multi-Layer Perceptron (MLP) with L2 regularisation and early stopping; and (iv) deep learning-based price forecasting using a stacked LSTM network with Dropout regularisation, with a Gradient Boosting fallback for environments lacking TensorFlow.*

*The fourth module introduces a Reinforcement Learning (RL) trading agent implemented using OpenAI Gymnasium and Stable-Baselines3, supporting three RL algorithms — Proximal Policy Optimisation (PPO), Advantage Actor-Critic (A2C), and Deep Q-Network (DQN). The agent learns optimal buy, hold, and sell actions from historical price data augmented with RSI, MACD, and Bollinger Band technical indicators, operating in both discrete and continuous action spaces with risk-profile-adjusted reward shaping.*

*The fifth module presents a Multi-Variate Temporal Fusion Transformer (TFT) proxy that integrates six macro-economic variables — the S&P 500, VIX fear index, 10-Year Treasury yields, gold prices, crude oil prices, and the US Dollar index — alongside the target stock price. This module provides probabilistic forecasting with 90% confidence intervals, macro-anomaly detection via Isolation Forest, historical market-regime lookalike matching using K-Nearest Neighbours, custom scenario simulation, and real-time market regime classification (Bull/Bear/Sideways).*

*Experimental results demonstrate that the LSTM model consistently outperforms MLP with mean R² scores of 0.88–0.95 on unseen test sets. Portfolio optimisation yields Sharpe ratios of 0.90–1.40 for Indian large-cap equity baskets. The RL agent achieves positive returns in bull-market simulations, and the TFT module effectively identifies macro-economic stress periods corresponding to documented market events.*

*The platform is deployed as an interactive Streamlit dashboard accessible locally, requiring no cloud infrastructure, and is designed for extensibility, with clear module boundaries enabling future integration of real-time data feeds, GPT-based report generation, and options analytics.*

*Keywords: Stock Market Prediction, LSTM, SARIMAX, Portfolio Optimisation, Efficient Frontier, Reinforcement Learning, FinBERT, Temporal Fusion Transformer, Sentiment Analysis, Random Forest, Streamlit, Deep Learning.*

---
---

## LIST OF FIGURES

| Figure No. | Figure Title | Page No. |
|------------|--------------|----------|
| Fig. 1.1 | Overall system architecture of FinSight AI | 12 |
| Fig. 1.2 | Screenshot of the Streamlit sidebar navigation | 13 |
| Fig. 2.1 | Taxonomy of machine learning approaches used in financial forecasting | 19 |
| Fig. 3.1 | Module-level architecture diagram of FinSight AI | 26 |
| Fig. 3.2 | Data flow from Yahoo Finance API to Streamlit UI | 27 |
| Fig. 3.3 | Directory structure of the FinSight AI codebase | 28 |
| Fig. 4.1 | Time-series decomposition — Trend, Seasonality, and Residual components of AAPL | 33 |
| Fig. 4.2 | ACF and PACF plots used for SARIMAX parameter selection | 34 |
| Fig. 4.3 | SARIMAX 10-day price forecast with confidence intervals for AAPL | 36 |
| Fig. 4.4 | Backtest results — predicted vs. actual prices over last 30 days | 37 |
| Fig. 5.1 | Correlation heatmap of the six-stock Indian equity portfolio | 43 |
| Fig. 5.2 | Efficient Frontier generated from 5,000 Monte Carlo simulations | 45 |
| Fig. 5.3 | Portfolio cumulative returns vs. NIFTY 50 benchmark | 46 |
| Fig. 5.4 | Bar chart of Maximum Sharpe Ratio portfolio weights | 47 |
| Fig. 5.5 | Stress test impact chart — portfolio drawdown under market scenarios | 49 |
| Fig. 6.1 | Bar chart of FinBERT sentiment scores for latest AAPL news headlines | 55 |
| Fig. 6.2 | MLP neural network architecture diagram | 57 |
| Fig. 6.3 | MLP training loss curve (training vs. validation) | 58 |
| Fig. 6.4 | LSTM architecture with stacked layers and Dropout | 60 |
| Fig. 6.5 | LSTM 30-day price forecast vs. actual prices | 62 |
| Fig. 6.6 | Side-by-side model comparison: MLP vs. LSTM forecast | 63 |
| Fig. 6.7 | Random Forest feature importance bar chart | 56 |
| Fig. 7.1 | RL agent training environment — state-action-reward loop | 68 |
| Fig. 7.2 | Net worth progression during PPO agent evaluation on test data | 70 |
| Fig. 7.3 | Comparison of PPO, A2C, and DQN net worth curves | 71 |
| Fig. 7.4 | Distribution of agent actions (Buy / Hold / Sell) during evaluation | 72 |
| Fig. 8.1 | Multi-variate input feature matrix for TFT module | 77 |
| Fig. 8.2 | Attention weight heatmap — factor influence on stock price | 78 |
| Fig. 8.3 | Probabilistic price forecast with 90% confidence interval band | 79 |
| Fig. 8.4 | Isolation Forest macro-anomaly detection — anomaly score timeline | 80 |
| Fig. 8.5 | KNN historical lookalike — matched date and 30-day forward trajectory | 81 |
| Fig. 9.1 | Comparative R² scores across all forecasting models | 86 |
| Fig. 9.2 | RMSE comparison: SARIMAX vs. MLP vs. LSTM | 87 |

---
---

## LIST OF TABLES

| Table No. | Table Title | Page No. |
|-----------|-------------|----------|
| Table 1.1 | Comparison of FinSight AI modules with existing platforms | 15 |
| Table 2.1 | Summary of related works in AI-based stock price prediction | 21 |
| Table 3.1 | Python library dependencies and their roles | 29 |
| Table 4.1 | ADF test results — stationarity check for AAPL closing prices | 33 |
| Table 4.2 | SARIMAX model parameters (p, d, q, P, D, Q, S) | 35 |
| Table 4.3 | SARIMAX in-sample accuracy metrics | 36 |
| Table 4.4 | SARIMAX backtest out-of-sample accuracy metrics | 37 |
| Table 5.1 | Portfolio stocks used in analysis with sector classification | 41 |
| Table 5.2 | Annualised returns and volatility of individual portfolio stocks | 42 |
| Table 5.3 | Covariance matrix of daily returns | 43 |
| Table 5.4 | Optimisation results — Max Sharpe, Min Volatility, Equal Weight | 45 |
| Table 5.5 | Risk metrics: Beta, Maximum Drawdown, Sharpe Ratio | 48 |
| Table 5.6 | Stress test results under three market scenarios | 49 |
| Table 6.1 | FinBERT / TextBlob sentiment scores for AAPL news | 54 |
| Table 6.2 | MLP hyperparameters and regularisation settings | 58 |
| Table 6.3 | MLP test-set performance metrics | 59 |
| Table 6.4 | LSTM architecture specification | 61 |
| Table 6.5 | LSTM test-set performance metrics | 62 |
| Table 6.6 | Model comparison: MLP vs. LSTM (R², RMSE, MAE) | 63 |
| Table 6.7 | Random Forest hyperparameters | 56 |
| Table 7.1 | Observation space vector components for the RL environment | 67 |
| Table 7.2 | RL algorithm comparison — PPO, A2C, DQN configuration | 69 |
| Table 7.3 | RL agent performance — final net worth and return on investment | 71 |
| Table 8.1 | Macro-economic variables used in TFT module | 76 |
| Table 8.2 | TFT attention weights — factor influence summary | 78 |
| Table 8.3 | Scenario simulation results under four market conditions | 82 |
| Table 9.1 | Summary of all model performance metrics | 85 |
| Table 9.2 | Execution time benchmarks per module | 87 |

---
---

## LIST OF SYMBOLS, ABBREVIATIONS AND NOMENCLATURE

### Abbreviations

| Abbreviation | Full Form |
|--------------|-----------|
| AI | Artificial Intelligence |
| ML | Machine Learning |
| DL | Deep Learning |
| NLP | Natural Language Processing |
| API | Application Programming Interface |
| SARIMAX | Seasonal AutoRegressive Integrated Moving Average with eXogenous variables |
| ADF | Augmented Dickey-Fuller (Test) |
| ACF | AutoCorrelation Function |
| PACF | Partial AutoCorrelation Function |
| MPT | Modern Portfolio Theory |
| LSTM | Long Short-Term Memory |
| MLP | Multi-Layer Perceptron |
| ReLU | Rectified Linear Unit |
| MSE | Mean Squared Error |
| RMSE | Root Mean Squared Error |
| MAE | Mean Absolute Error |
| MAPE | Mean Absolute Percentage Error |
| R² | R-Squared (Coefficient of Determination) |
| RSI | Relative Strength Index |
| SMA | Simple Moving Average |
| EMA | Exponential Moving Average |
| MACD | Moving Average Convergence Divergence |
| BB | Bollinger Bands |
| PPO | Proximal Policy Optimisation |
| A2C | Advantage Actor-Critic |
| DQN | Deep Q-Network |
| RL | Reinforcement Learning |
| MDP | Markov Decision Process |
| TFT | Temporal Fusion Transformer |
| BERT | Bidirectional Encoder Representations from Transformers |
| VIX | Volatility Index (CBOE) |
| KNN | K-Nearest Neighbours |
| VaR | Value at Risk |
| ROI | Return on Investment |
| UI | User Interface |
| CSV | Comma-Separated Values |

### Symbols

| Symbol | Meaning |
|--------|---------|
| σ | Standard Deviation (Volatility) |
| σ² | Variance |
| μ | Expected Return (Mean) |
| ρ | Correlation Coefficient |
| Σ | Covariance Matrix |
| β | Beta (Market Sensitivity) |
| α | Alpha (L2 Regularisation Parameter / Excess Return) |
| w | Portfolio Weight Vector |
| R | Portfolio Return |
| r_f | Risk-Free Rate |
| S | Sharpe Ratio |
| p, d, q | ARIMA / SARIMAX Non-Seasonal Parameters |
| P, D, Q, S | SARIMAX Seasonal Parameters |
| ŷ | Predicted Value |
| y | Actual Value |
| γ | Discount Factor (RL) |
| π | Policy Function (RL) |
| Q(s, a) | Action-Value Function (RL) |
| s_t | State at Time Step t (RL) |
| a_t | Action at Time Step t (RL) |
| r_t | Reward at Time Step t (RL) |
| ε | Exploration Rate (RL) / Error Term |
| θ | Model Parameters / Weights |
| ∇ | Gradient Operator |
| Δ | First Difference Operator |
| ∑ | Summation Operator |
| N | Number of Training Samples |
| T | Total Time Steps |

---
---

## TABLE OF CONTENTS

| Section | Title | Page |
|---------|-------|------|
| — | Certificate | ii |
| — | Declaration | iii |
| — | Acknowledgement | iv |
| — | Abstract | v |
| — | List of Figures | vii |
| — | List of Tables | ix |
| — | List of Symbols, Abbreviations and Nomenclature | xi |
| — | Table of Contents | xiii |
| **Chapter 1** | **Introduction** | **1** |
| 1.1 | Background and Motivation | 1 |
| 1.2 | Problem Statement | 3 |
| 1.3 | Project Objectives | 4 |
| 1.4 | Scope of the Project | 5 |
| 1.5 | Significance and Contribution | 6 |
| 1.6 | Organisation of the Report | 7 |
| **Chapter 2** | **Literature Review** | **9** |
| 2.1 | Introduction | 9 |
| 2.2 | Statistical Approaches to Stock Forecasting | 10 |
| 2.3 | Machine Learning in Financial Markets | 11 |
| 2.4 | Deep Learning for Time-Series Prediction | 13 |
| 2.5 | Sentiment Analysis in Finance | 14 |
| 2.6 | Portfolio Optimisation — Classical and AI-Driven | 15 |
| 2.7 | Reinforcement Learning for Trading | 16 |
| 2.8 | Multi-Variate Transformer Models | 17 |
| 2.9 | Research Gaps and Motivation | 18 |
| 2.10 | Summary | 19 |
| **Chapter 3** | **System Architecture and Design** | **21** |
| 3.1 | Introduction | 21 |
| 3.2 | High-Level System Architecture | 22 |
| 3.3 | Technology Stack | 24 |
| 3.4 | Module Architecture | 25 |
| 3.5 | Data Pipeline | 27 |
| 3.6 | Directory Structure | 28 |
| 3.7 | Configuration Management | 29 |
| 3.8 | User Interface Design | 30 |
| 3.9 | Summary | 31 |
| **Chapter 4** | **Module 1: SARIMAX Stock Forecasting** | **32** |
| 4.1 | Introduction | 32 |
| 4.2 | Theoretical Background | 32 |
| 4.3 | Stationarity and the ADF Test | 33 |
| 4.4 | Seasonal Decomposition | 34 |
| 4.5 | SARIMAX Model Architecture | 35 |
| 4.6 | Parameter Selection | 35 |
| 4.7 | Training and Forecasting | 36 |
| 4.8 | Backtesting Methodology | 36 |
| 4.9 | Results and Evaluation | 37 |
| 4.10 | Summary | 38 |
| **Chapter 5** | **Module 2: Portfolio Analysis and Optimisation** | **39** |
| 5.1 | Introduction | 39 |
| 5.2 | Theoretical Background — Modern Portfolio Theory | 40 |
| 5.3 | Data Acquisition and Preprocessing | 41 |
| 5.4 | Returns and Correlation Analysis | 42 |
| 5.5 | Efficient Frontier Generation | 44 |
| 5.6 | Portfolio Optimisation | 45 |
| 5.7 | Risk Metrics | 47 |
| 5.8 | Benchmark Comparison | 48 |
| 5.9 | Stress Testing | 49 |
| 5.10 | Results and Evaluation | 50 |
| 5.11 | Summary | 51 |
| **Chapter 6** | **Module 3: Advanced AI — Neural Networks, LSTM, and Sentiment Analysis** | **52** |
| 6.1 | Introduction | 52 |
| 6.2 | Sentiment Analysis Sub-Module | 53 |
| 6.3 | Buy/Sell Signal Classifier — Random Forest | 55 |
| 6.4 | MLP Price Forecaster | 57 |
| 6.5 | LSTM Deep Learning Forecaster | 59 |
| 6.6 | Gradient Boosting Fallback | 63 |
| 6.7 | Model Comparison | 64 |
| 6.8 | Results and Evaluation | 65 |
| 6.9 | Summary | 66 |
| **Chapter 7** | **Module 4: Reinforcement Learning Trading Agent** | **67** |
| 7.1 | Introduction | 67 |
| 7.2 | Theoretical Background — Reinforcement Learning | 67 |
| 7.3 | Environment Design | 69 |
| 7.4 | State Space | 70 |
| 7.5 | Action Space | 71 |
| 7.6 | Reward Function | 72 |
| 7.7 | RL Algorithms Implemented | 73 |
| 7.8 | Training Protocol | 74 |
| 7.9 | Evaluation | 75 |
| 7.10 | Results and Discussion | 76 |
| 7.11 | Summary | 77 |
| **Chapter 8** | **Module 5: Multi-Variate Temporal Fusion Transformer** | **78** |
| 8.1 | Introduction | 78 |
| 8.2 | Theoretical Background | 78 |
| 8.3 | Multi-Variate Data Acquisition | 80 |
| 8.4 | Temporal Fusion Model Design | 81 |
| 8.5 | Attention Weight Extraction | 82 |
| 8.6 | Probabilistic Forecasting | 83 |
| 8.7 | Macro-Anomaly Detection | 84 |
| 8.8 | Historical Lookalike Matching | 85 |
| 8.9 | Market Regime Detection | 86 |
| 8.10 | Scenario Simulation | 87 |
| 8.11 | Results and Evaluation | 88 |
| 8.12 | Summary | 89 |
| **Chapter 9** | **Results, Discussion and Comparative Analysis** | **90** |
| 9.1 | Introduction | 90 |
| 9.2 | Module-wise Performance Summary | 90 |
| 9.3 | Comparative Analysis of Forecasting Models | 92 |
| 9.4 | Portfolio Optimisation Outcomes | 93 |
| 9.5 | RL Agent Performance | 94 |
| 9.6 | Limitations | 95 |
| **Chapter 10** | **Conclusion and Future Work** | **97** |
| 10.1 | Conclusion | 97 |
| 10.2 | Future Work | 98 |
| — | **References / Bibliography** | **101** |
| — | **Appendix A** — Code Listings (Key Modules) | **105** |
| — | **Appendix B** — Sample Output Screenshots | **108** |
