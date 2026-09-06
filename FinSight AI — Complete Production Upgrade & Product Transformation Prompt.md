# FinSight AI — Complete Production Upgrade, Product Research & Production-Ready Implementation

You are a **senior full-stack engineer, quantitative finance engineer, ML engineer, product architect, UX engineer, security engineer, and DevOps engineer**.

Your job is to take the existing **FinSight AI** platform and transform it from its current working/demo state into a **production-grade quantitative investment research and AI market intelligence platform**.

You must **research first, deeply analyze the existing product and codebase, identify everything that is missing compared with leading platforms, create an implementation plan, and then implement the improvements directly in the codebase.**

Do not merely provide recommendations.

**The final result must be working, tested, maintainable production-quality code.**

---

# 1. CURRENT PLATFORM

Live application:

https://frontend-orpin-xi-99.vercel.app/

Current stack:

- Next.js frontend
- Vercel deployment
- FastAPI backend
- Render deployment
- Quantitative/ML models
- Market-data APIs

The current application appears to provide:

- Stock price forecasting
- SARIMAX forecasting
- Seasonal decomposition
- Hold-out/backtest validation
- Portfolio Analysis
- Watchlists
- Advanced AI / RL Trading Agent
- Multi-Variate TFT
- Stock/ticker search
- Market status
- Multiple supported tickers
- configurable forecast horizon
- configurable SARIMAX parameters

The live interface currently exposes sections such as:

- Stock Forecast
- Portfolio Analysis
- Watchlists
- Advanced AI
- RL Trading Agent
- Multi-Variate TFT
- About

The current Stock Forecast workflow includes:

- ticker selection/search
- historical horizon selection
- start/end dates
- SARIMAX parameters
- forecast horizon
- blind backtesting
- forecast/decomposition/backtest views

**Do not assume this list is complete.**

Your first responsibility is to inspect the actual application and repository and determine exactly what exists.

---

# 2. ABSOLUTE RULE — DO NOT START CODING YET

Do **not modify the codebase immediately.**

First perform:

1. live website analysis
2. complete UX/product analysis
3. competitor research
4. architecture/codebase audit
5. quant/ML audit
6. data-provider audit
7. security audit
8. persistence/auth audit
9. deployment audit
10. performance audit
11. accessibility audit
12. gap analysis
13. product roadmap
14. technical implementation plan

Only after this analysis should implementation begin.

If the environment allows you to inspect the repository, inspect the **actual source code**, not only the deployed website.

---

# 3. LIVE WEBSITE AUDIT

Analyze the live FinSight AI website end-to-end.

For every page/tab/workflow determine:

### UI

- What is visible?
- What is clickable?
- What inputs exist?
- What charts exist?
- What metrics exist?
- What actions exist?
- What states exist?
- What is missing?
- What looks unfinished?
- What feels like a demo?
- What feels production-ready?

### UX

Test the full user journey:

**Landing → ticker selection → analysis → model execution → results → interpretation → portfolio/watchlist action**

Identify:

- confusing flows
- unnecessary steps
- missing feedback
- unclear terminology
- missing loading states
- missing error states
- blank panels
- poor hierarchy
- unclear model outputs
- lack of explanations
- poor onboarding
- poor mobile behavior

Do not only criticize the UI aesthetically.

Analyze whether the UI helps a user make sense of the quantitative information.

---

# 4. UNDERSTAND HOW EVERY CURRENT FEATURE WORKS

For every existing feature, trace:

**Frontend → API → backend → data source → preprocessing → model → calculation → response → visualization**

Document exactly how it works.

For example:

## SARIMAX

Determine:

- historical data source
- preprocessing
- missing-value handling
- decomposition
- stationarity
- parameter selection
- model fitting
- forecast generation
- forecast horizon
- backtest methodology
- confidence/prediction intervals
- error metrics

## TFT

Determine:

- features
- target
- sequence length
- prediction horizon
- training process
- inference process
- scaling
- temporal splitting
- quantiles
- uncertainty
- model persistence

## RL

Determine:

- environment
- state
- actions
- reward
- transaction costs
- slippage
- training
- inference
- model persistence
- evaluation

## Portfolio Analysis

Determine:

- expected return
- covariance
- optimization
- risk-free rate
- Sharpe ratio
- constraints
- efficient frontier
- portfolio construction

## Watchlists

Determine:

- persistence
- user association
- refresh mechanism
- price source
- alerts
- authentication

Do not guess.

---

# 5. COMPETITOR RESEARCH

Research these platforms deeply:

### TradingView
### Tickeron
### Danelfin
### Kavout
### Portfolio Visualizer
### Composer

Also identify **2–5 additional modern AI/quantitative investment platforms** that are relevant.

Research their:

- product architecture
- onboarding
- dashboard
- stock analysis
- forecasting
- AI explanations
- confidence/probability
- portfolio tools
- screening
- alerts
- watchlists
- backtesting
- risk analytics
- strategy creation
- paper trading
- data freshness
- real-time functionality
- benchmarks
- export
- user accounts
- persistence
- subscription/product structure

Use official sources whenever possible.

For example:

TradingView emphasizes powerful charting, configurable alerts and paper trading.

Tickeron exposes AI forecasts, confidence levels, trend predictions, patterns, screeners, alerts and AI trading robots.

Danelfin emphasizes AI scores, probabilities, technical/fundamental/sentiment signals, explainability, portfolio scores and alerts.

Kavout combines fundamental, technical, pricing, volume and alternative data into quantitative stock scores.

Composer combines AI-assisted strategy creation, backtesting, risk statistics, benchmarks and execution.

Use these patterns as inspiration, **not as features to blindly copy**.

---

# 6. BUILD A COMPETITOR GAP MATRIX

Create:

| Capability | TradingView | Tickeron | Danelfin | Kavout | Portfolio Visualizer | Composer | FinSight | Gap | Priority |
|---|---|---|---|---|---|---|---|---|---|

Priorities:

### P0
Required for correctness, trust, security and production readiness.

### P1
Major product/value differentiation.

### P2
Polish, scale and advanced features.

For every gap explain:

- why it matters
- how competitors solve it
- how FinSight should solve it
- whether it requires backend/model/database changes

---

# 7. PRODUCT DIRECTION

Do not leave FinSight as a collection of unrelated tabs.

Transform it into a coherent workflow:

# Discover → Analyze → Understand → Compare → Backtest → Build Portfolio → Monitor → Act

A user should be able to:

1. Search a stock.
2. See its current market information.
3. Understand technical/fundamental/sentiment signals.
4. See AI/model forecasts.
5. Understand uncertainty.
6. Compare models.
7. Inspect historical model performance.
8. Evaluate risk.
9. Add the asset to a watchlist.
10. Add it to a portfolio.
11. Monitor changes.
12. Receive alerts.
13. Backtest a strategy.
14. Paper-trade the strategy where appropriate.

The platform should feel like **one product**, not several ML experiments.

---

# 8. BUILD A PROPER STOCK INTELLIGENCE PAGE

Upgrade the stock experience into a comprehensive research page.

For every ticker consider providing:

### Overview

- price
- daily change
- percentage change
- market status
- last updated timestamp
- data source
- delayed/realtime indicator

### Price Chart

- historical price
- volume
- configurable timeframe
- technical indicators
- forecast
- uncertainty bands

### Forecast

Show:

- model prediction
- 80% interval
- 95% interval
- forecast horizon
- forecast timestamp
- model name
- model version
- data timestamp

Never display a bare prediction without uncertainty.

---

# 9. MODEL CONFIDENCE MUST BE HONEST

Never fabricate confidence.

For SARIMAX:

use statistically valid forecast/prediction intervals.

For TFT:

use quantile forecasts or another statistically defensible uncertainty method if supported.

For RL:

do not call a probability/confidence metric "confidence" unless the model actually produces a calibrated probability.

Clearly distinguish:

- prediction
- probability
- uncertainty
- historical accuracy
- expected reward
- trading action

If a model cannot provide a statistically valid metric:

**do not invent one.**

---

# 10. MODEL COMPARISON

Build a unified model comparison interface.

Compare:

- SARIMAX
- TFT
- RL where appropriate
- additional models if justified

Show:

- forecast
- uncertainty
- historical accuracy
- MAE
- RMSE
- directional accuracy
- backtest performance
- stability
- strengths
- weaknesses

Do not compare incompatible outputs incorrectly.

The UI should explain:

> "These models answer different questions."

---

# 11. EXPLAINABLE AI LAYER

Add an explanation layer.

For each prediction explain the measurable factors contributing to the output.

Potential factors:

- trend
- momentum
- volatility
- RSI
- MACD
- volume
- seasonality
- sentiment
- fundamentals
- market regime

Do not fabricate explanations.

Do not expose fake AI "chain of thought."

Show **observable model inputs, factors, signals and measurable evidence**.

---

# 12. AI STOCK SCORE

Consider implementing a transparent FinSight score inspired by the product patterns seen in platforms such as Danelfin and Kavout.

Example:

**FinSight Score: 78/100**

Break into:

- Technical
- Fundamental
- Sentiment
- Momentum
- Risk
- Model consensus

However:

Do not create arbitrary scores.

Every score must have:

- defined methodology
- documented formula/model
- calibration
- historical validation
- explainability

---

# 13. SENTIMENT INTELLIGENCE

Upgrade FinBERT beyond a simple sentiment output.

Show:

- bullish %
- neutral %
- bearish %
- sentiment trend
- recent sentiment changes
- source timestamp
- article/news count
- confidence where valid

Separate:

- news sentiment
- market sentiment
- analyst sentiment

Avoid presenting FinBERT output as objective market truth.

---

# 14. TECHNICAL ANALYSIS

Add a proper technical-analysis layer where useful.

Potential indicators:

- SMA
- EMA
- RSI
- MACD
- Bollinger Bands
- ATR
- ADX
- stochastic oscillator
- volume
- volatility
- support/resistance

But do not add indicators just to increase feature count.

Every indicator should have:

- explanation
- calculation correctness
- timeframe
- interpretation

---

# 15. FUNDAMENTAL ANALYSIS

If reliable data is available, add:

- revenue growth
- EPS
- P/E
- P/S
- P/B
- debt/equity
- ROE
- margins
- free cash flow
- earnings growth
- valuation metrics

Show:

- current value
- historical trend
- sector comparison
- data timestamp

Do not use stale or unreliable fundamentals without disclosure.

---

# 16. MARKET REGIME DETECTION

Consider adding market-regime analysis:

- bullish
- bearish
- sideways
- high volatility
- low volatility

Use statistically defensible methodology.

Explain how regime detection influences model performance.

This can become a major differentiator.

---

# 17. BACKTESTING — MAJOR UPGRADE

Replace simplistic backtesting with serious quantitative evaluation.

Support:

- multiple time windows
- walk-forward validation
- rolling windows
- benchmark comparison
- transaction costs
- slippage
- turnover
- drawdown
- volatility
- Sharpe
- Sortino
- Calmar
- hit rate
- profit factor
- win rate
- average win/loss

Show:

- equity curve
- drawdown curve
- monthly returns
- benchmark comparison
- trade history
- portfolio exposure

Backtests must clearly show assumptions.

Composer explicitly exposes assumptions such as slippage, fees, benchmarks and historical-data limitations; FinSight should provide similar transparency.

---

# 18. PREVENT LOOK-AHEAD BIAS

This is mandatory.

Audit the entire ML/backtesting pipeline for:

- future leakage
- random temporal splitting
- scaler leakage
- feature leakage
- target leakage
- future fundamentals
- future sentiment
- survivorship bias

Financial time-series validation must respect chronology.

Add regression tests specifically designed to catch leakage.

---

# 19. PORTFOLIO INTELLIGENCE

Upgrade Portfolio Analysis substantially.

Add:

- efficient frontier
- minimum volatility portfolio
- maximum Sharpe portfolio
- current portfolio
- target portfolio
- asset allocation
- sector allocation
- risk contribution
- correlation matrix
- diversification score
- concentration risk
- drawdown
- volatility
- VaR
- CVaR/Expected Shortfall

Allow users to compare:

**Current Portfolio vs Optimized Portfolio**

Explain exactly why allocations changed.

---

# 20. PORTFOLIO STRESS TESTING

Add scenario analysis.

Examples:

- market crash
- volatility spike
- rate increase
- sector shock
- individual-stock crash

Where data/methodology supports it.

Clearly label scenarios as simulations, not predictions.

---

# 21. WATCHLISTS

Turn watchlists into an intelligent monitoring system.

Add:

- persistent watchlists
- live/latest price
- daily change
- FinSight score
- forecast direction
- sentiment
- model consensus
- risk
- last updated
- alerts

Allow users to sort/filter by:

- score
- return
- volatility
- sentiment
- forecast
- sector
- market cap

---

# 22. ALERT SYSTEM

Add configurable alerts.

Examples:

- price crosses threshold
- forecast changes materially
- sentiment changes
- score changes
- volatility spikes
- technical signal
- portfolio drawdown
- model disagreement

Support appropriate notification channels where feasible.

Do not claim real-time alerts if the underlying data is delayed.

TradingView demonstrates the value of configurable multi-condition alerts, including watchlist alerts.

---

# 23. PAPER TRADING

Consider implementing a paper-trading environment.

Users should be able to:

- start with virtual capital
- buy/sell
- track positions
- see P&L
- view transactions
- evaluate strategy performance

Never connect to real brokerage accounts without a separate security/compliance review.

TradingView's paper-trading workflow is a useful reference for this type of risk-free simulation.

---

# 24. AI STRATEGY BUILDER

Consider a Composer-inspired workflow.

Allow users to describe:

> "Build a low-volatility portfolio of large-cap technology stocks."

The system can generate a proposed strategy.

But before execution:

1. show the strategy logic
2. show assets
3. show weights
4. show rebalance frequency
5. backtest it
6. show risk statistics
7. compare against benchmark
8. allow editing
9. require explicit user confirmation

Never allow an LLM to directly execute trades.

Composer's current product demonstrates this AI → strategy → backtest → review workflow.

---

# 25. DATA QUALITY & REAL-TIME ARCHITECTURE

Audit the current market-data provider.

Determine:

- source
- licensing
- latency
- rate limits
- reliability
- historical coverage
- corporate actions
- adjusted prices
- real-time availability

Clearly distinguish:

**REAL-TIME**

from

**DELAYED**

from

**HISTORICAL**

from

**CACHED**

Never label cached data as live.

Add:

- timestamps
- provider information
- stale-data detection
- retries
- timeouts
- fallback behavior

---

# 26. CACHING

Introduce Redis where appropriate.

Cache:

- market data
- expensive forecasts
- repeated model inference
- expensive portfolio calculations

Cache keys must include all parameters that affect results.

Use:

- TTL
- invalidation
- graceful failure
- cache versioning

Redis failure must not take down the platform.

---

# 27. ASYNC MODEL JOBS

Long-running operations should not block HTTP requests.

Move appropriate workloads to jobs:

- RL training
- TFT training
- large backtests
- expensive simulations

Implement:

`queued → running → completed/failed`

Provide:

- job ID
- status endpoint
- progress
- error state
- retry

---

# 28. AUTHENTICATION & DATABASE

If the current application does not have proper persistence:

Implement:

- authentication
- user accounts
- PostgreSQL
- Alembic migrations

Persist:

- watchlists
- portfolios
- preferences
- alert configurations
- paper-trading state
- saved strategies

Every record must belong to the correct user.

Implement proper authorization.

---

# 29. SECURITY

Perform a full security review.

Check:

- secrets
- environment variables
- authentication
- authorization
- CORS
- SQL injection
- XSS
- CSRF
- SSRF
- request validation
- rate limiting
- abuse prevention
- sensitive logging
- dependency vulnerabilities

Never expose stack traces to users.

Never hardcode credentials.

---

# 30. FRONTEND QUALITY

Use:

- TypeScript strict mode
- typed API clients
- reusable components
- clear state management
- error boundaries
- skeleton loading
- empty states
- retry states
- responsive layouts

Avoid:

- `any`
- giant components
- duplicated logic
- unnecessary client-side rendering
- excessive prop drilling

---

# 31. PERFORMANCE

Measure and improve:

- initial bundle
- chart loading
- API latency
- model latency
- repeated requests
- unnecessary renders

Lazy-load expensive chart/model sections.

Use appropriate caching.

Do not optimize blindly—measure before/after.

---

# 32. ACCESSIBILITY

Perform a complete accessibility audit.

Ensure:

- keyboard navigation
- semantic HTML
- ARIA labels
- visible focus
- contrast
- accessible forms
- accessible errors
- accessible charts
- screen-reader-friendly summaries

---

# 33. ERROR UX

Every async operation must have:

### Loading

Clear explanation of what is happening.

### Empty

Explain why data is unavailable.

### Error

Explain what went wrong.

### Retry

Provide retry when appropriate.

Never show:

> No data

without explaining why.

Never leave an empty chart after a failed API request.

---

# 34. FINANCIAL DISCLAIMER

Persistently display:

> **Not financial advice — for informational and educational purposes only.**

Also communicate:

- predictions are uncertain
- backtests are hypothetical
- past performance does not guarantee future performance
- model outputs are not investment advice

This should be present throughout forecast, portfolio, backtest and trading-agent workflows.

---

# 35. OBSERVABILITY

Implement:

- structured logs
- request IDs
- model execution timing
- API latency
- cache hit/miss
- external API failures
- job failures

Add Sentry or an equivalent error-monitoring platform where appropriate.

---

# 36. TESTING

Every new backend endpoint must have tests.

Test:

- valid inputs
- invalid inputs
- boundary values
- provider failures
- model failures
- missing data
- NaN
- empty datasets
- malformed tickers
- timeout
- cache failures

Model tests must use:

- fixed seeds
- deterministic fixtures
- mocked providers
- small datasets

Add frontend tests for:

- loading
- success
- empty
- errors
- retry
- form validation

---

# 37. CI/CD

Add GitHub Actions.

On every PR:

### Frontend

- lint
- TypeScript check
- build
- tests

### Backend

- pytest
- lint
- type checking

Prevent deployment when critical checks fail.

---

# 38. DOCUMENTATION

Create/update:

- README
- architecture documentation
- API documentation
- environment setup
- deployment instructions
- database migrations
- Redis setup
- model documentation
- data-provider documentation
- backtesting methodology
- financial assumptions

Document **why** important quantitative decisions were made.

---

# 39. PRODUCTION ARCHITECTURE

Before implementation, propose the target architecture.

Include:

```text
Next.js
   ↓
API / typed client
   ↓
FastAPI
   ↓
┌───────────────┬──────────────┬─────────────┐
│ Market Data   │ ML Services  │ Portfolio   │
│ Service       │              │ Engine      │
└───────────────┴──────────────┴─────────────┘
        ↓              ↓              ↓
      Redis        Job Queue       PostgreSQL
```

Adapt this architecture to the actual repository.

Do not introduce infrastructure simply because it sounds sophisticated.

Every new dependency must have a reason.

---

# 40. IMPLEMENTATION PROCESS

After research and audit:

Create a backlog:

| ID | Feature | Problem | Solution | Files | Dependencies | Priority | Tests | Acceptance Criteria |
|---|---|---|---|---|---|---|---|---|

Then implement in dependency order.

### P0

Production correctness/security/reliability.

### P1

Major product differentiation.

### P2

Advanced features/polish.

---

# 41. MANDATORY APPROVAL GATE

After completing:

- website audit
- competitor research
- code audit
- ML audit
- security audit
- architecture audit
- gap analysis
- roadmap

**STOP.**

Do not modify code yet.

Show me the findings and proposed implementation plan.

Wait for approval.

---

# 42. IMPLEMENTATION STANDARD

Once approved:

Implement **one logical feature at a time**.

For every feature:

1. Analyze existing implementation.
2. Identify root cause.
3. Design solution.
4. Implement.
5. Add tests.
6. Run tests.
7. Run lint/type checks.
8. Verify integration.
9. Check regressions.
10. Document changes.

Do not make huge uncontrolled changes across the repository.

---

# 43. CODE QUALITY RULES

The code must be:

- typed
- modular
- readable
- maintainable
- testable
- secure
- efficient

Avoid:

- god files
- duplicated code
- magic constants
- dead code
- temporary hacks
- fake data
- fake confidence
- fake real-time status
- fake model explanations
- TODO placeholders presented as finished functionality

---

# 44. QUANTITATIVE CORRECTNESS IS NON-NEGOTIABLE

Verify:

- formulas
- statistical assumptions
- annualization
- covariance
- Sharpe
- VaR
- CVaR
- drawdown
- returns
- portfolio weights
- backtesting
- forecasting intervals

Check for:

- look-ahead bias
- survivorship bias
- leakage
- overfitting
- unrealistic transaction assumptions

If a requested feature cannot be implemented correctly:

**do not fake it.**

Explain the limitation and implement the best defensible alternative.

---

# 45. FINAL PRODUCTION AUDIT

After implementation, perform another complete audit.

Verify:

### Product

- coherent user journey
- useful dashboard
- clear outputs
- good onboarding

### ML

- valid predictions
- uncertainty
- no leakage
- deterministic tests

### Quant

- correct formulas
- realistic backtests
- risk metrics
- benchmarks

### Backend

- validation
- errors
- caching
- async jobs
- security

### Frontend

- performance
- accessibility
- responsive UI
- error states

### Infrastructure

- deployment
- monitoring
- database
- Redis
- CI/CD

---

# 46. FINAL REPORT

At the end provide:

## What existed originally

## What was missing

## What competitors do better

## What was implemented

## Architecture changes

## ML/quant changes

## Database changes

## API changes

## Frontend changes

## Security changes

## Performance changes

## Tests added

## Deployment changes

## Remaining limitations

## Remaining technical debt

## Future roadmap

---

# MOST IMPORTANT INSTRUCTION

Do not optimize FinSight merely to make it look like TradingView, Tickeron, Danelfin, Kavout, Portfolio Visualizer or Composer.

Study what makes those products effective, then design a **better and coherent FinSight-specific experience**.

The final product should feel like:

> **An AI-powered quantitative research terminal that combines forecasting, explainable AI, portfolio intelligence, risk analysis, backtesting, sentiment, technical analysis and strategy research in one workflow.**

The objective is:

**Not a demo.  
Not a collection of ML notebooks.  
Not a dashboard full of charts.**

Build a platform that is:

**accurate → transparent → explainable → reliable → secure → fast → testable → scalable → production-ready.**

And throughout implementation:

> **Never fabricate data, confidence, model reasoning, real-time status, backtest performance, or statistical validity.**