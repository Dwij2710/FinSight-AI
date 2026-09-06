# FinSight AI — Make the Entire Platform Fully Dynamic by Ticker

You are a **senior full-stack engineer, quantitative finance engineer, ML engineer, and software architect** working directly in the FinSight AI codebase.

The current application has quick-select stocks such as:

`AAPL | NVDA | MSFT | TSLA | RELIANCE | TCS`

However, much of the current analysis appears to be tied to these predefined/default stocks.

I want you to completely upgrade this architecture so that **the entire FinSight platform is dynamically driven by the ticker selected by the user**.

The user should be able to search/select a supported stock ticker, and **every applicable feature must automatically use that ticker's actual data and produce ticker-specific results.**

---

# IMPORTANT EXECUTION RULE

**DO NOT START CODING IMMEDIATELY.**

First inspect the existing codebase and understand exactly how ticker selection currently works.

Then create a **detailed implementation plan for this change**.

The implementation plan must be based on the actual codebase, not assumptions.

After creating the plan:

> **STOP and show me the implementation plan.**

Do not modify the code until I explicitly approve the plan.

After I approve it, implement the plan directly in the codebase.

---

# PHASE 1 — AUDIT THE CURRENT TICKER ARCHITECTURE

Search the entire repository for all ticker-related logic.

Specifically search for:

* `AAPL`
* `NVDA`
* `MSFT`
* `TSLA`
* `RELIANCE`
* `TCS`
* hardcoded ticker arrays
* default ticker constants
* mock ticker data
* static chart datasets
* hardcoded API parameters
* ticker values inside URLs
* default backend ticker parameters
* localStorage ticker values
* React state defaults
* model-specific ticker assumptions
* hardcoded stock names
* hardcoded stock prices
* hardcoded forecast results

Do not only inspect the visible UI.

Trace the entire architecture:

```text
User
 ↓
Ticker Search / Quick Select
 ↓
Frontend State
 ↓
API Request
 ↓
FastAPI Endpoint
 ↓
Validation
 ↓
Market Data Service
 ↓
Model / Quant Engine
 ↓
Cache
 ↓
Database where applicable
 ↓
API Response
 ↓
Frontend State
 ↓
Charts / Tables / Metrics
```

Identify exactly where the ticker is:

* selected
* stored
* passed
* transformed
* lost
* hardcoded
* incorrectly reused

---

# PHASE 2 — AUDIT EVERY EXISTING FEATURE

Determine how the selected ticker currently affects every feature.

Audit at minimum:

### Stock Forecast

* SARIMAX
* forecast
* prediction intervals
* decomposition
* backtesting

### Technical Analysis

* RSI
* MACD
* moving averages
* Bollinger Bands
* volatility
* volume

### TFT / Quantile Model

* features
* training data
* inference
* predictions
* uncertainty

### RL Trading Agent

* training data
* test data
* environment
* actions
* performance

### Sentiment

* news
* FinBERT
* sentiment scores
* articles

### Fundamentals

* valuation
* financial metrics
* company information

### FinSight Score

* technical
* fundamental
* momentum
* sentiment
* risk

### Model Comparison

* SARIMAX
* TFT/quantile model
* RL

### Backtesting

* historical data
* strategy
* benchmark
* performance

### Portfolio Analysis

Understand the distinction between:

**selected ticker**

and

**multi-asset portfolio**.

Do not incorrectly force a single selected ticker into portfolio calculations.

### Watchlists

Verify whether watchlist items are dynamically tied to their actual ticker.

---

# PHASE 3 — CREATE THE IMPLEMENTATION PLAN

After the audit, create a **complete implementation plan specifically for making FinSight ticker-dynamic**.

The plan must contain:

## 1. Current Problem

Explain exactly what is currently hardcoded or incorrectly implemented.

## 2. Root Cause

Explain why the architecture currently behaves this way.

## 3. Target Architecture

Explain how ticker state should flow through the application.

## 4. Files to Change

List the exact existing files that need modification.

Also list:

* files to create
* files to delete
* files to refactor

Do not invent filenames without checking the repository.

## 5. Frontend Changes

Specify:

* ticker state
* search UI
* quick-select behavior
* URL routing
* API calls
* state management
* loading states
* error states
* race-condition handling

## 6. Backend Changes

Specify:

* endpoint changes
* Pydantic schemas
* ticker validation
* market-data service
* service-layer changes
* model changes
* response models

## 7. Model Changes

Explain how ticker will flow into:

* SARIMAX
* TFT/quantile model
* RL
* sentiment
* technical indicators
* fundamentals
* FinSight Score
* backtesting

## 8. Cache Changes

Define the cache-key strategy.

For example:

```text
forecast:{ticker}:{model}:{parameters}
```

Explain how cross-ticker cache contamination will be prevented.

## 9. Race-Condition Strategy

Explain how this scenario will be handled:

```text
AAPL request starts
       ↓
User switches to TSLA
       ↓
TSLA request starts
       ↓
AAPL request finishes late
```

The old AAPL response must never overwrite the current TSLA state.

## 10. URL Architecture

Recommend the best approach:

```text
/stocks/AAPL
/stocks/TSLA
/stocks/NVDA
```

or another appropriate architecture.

Explain why.

## 11. Validation

Explain:

* ticker normalization
* supported ticker validation
* invalid ticker handling
* insufficient historical data
* unsupported market
* unavailable fundamentals
* unavailable sentiment

## 12. Testing Plan

Define tests for:

* frontend
* backend
* API
* cache
* models
* ticker isolation
* race conditions
* URL routing

## 13. Acceptance Criteria

Create a precise checklist describing when the implementation is complete.

---

# IMPORTANT PLAN REQUIREMENT

The implementation plan must be **dependency-aware**.

For example:

```text
1. Centralize ticker state
        ↓
2. Create/upgrade ticker validation
        ↓
3. Centralize market-data service
        ↓
4. Update API contracts
        ↓
5. Update models
        ↓
6. Update frontend data flow
        ↓
7. Fix caching
        ↓
8. Add race-condition protection
        ↓
9. Add URL/deep linking
        ↓
10. Add tests
        ↓
11. End-to-end verification
```

Do not implement things in an order that creates temporary broken states unnecessarily.

---

# PHASE 4 — STOP FOR APPROVAL

After completing the audit and implementation plan:

**STOP.**

Show me:

### A. Current ticker architecture

### B. All hardcoded ticker locations

### C. Features affected

### D. Root causes

### E. Proposed architecture

### F. Detailed implementation plan

### G. Files to modify/create

### H. Testing plan

### I. Risks and assumptions

### J. Acceptance criteria

Then ask:

> **"Should I proceed with implementing this plan?"**

Do not modify the repository before approval.

---

# PHASE 5 — IMPLEMENT AFTER APPROVAL

Once I approve the plan:

Implement the changes **one logical phase at a time**.

Do not rewrite the entire application unnecessarily.

Preserve existing functionality.

For every phase:

1. Inspect existing implementation.
2. Implement the smallest clean architectural change.
3. Add/update tests.
4. Run tests.
5. Run lint.
6. Run TypeScript checks.
7. Run backend type checks.
8. Build the frontend.
9. Verify the affected feature.
10. Check for regressions.

---

# CORE FUNCTIONAL REQUIREMENT

The final application must work like this:

```text
User searches TSLA
        ↓
selectedTicker = TSLA
        ↓
All relevant APIs receive TSLA
        ↓
MarketDataService fetches TSLA
        ↓
All models calculate using TSLA
        ↓
Results contain ticker = TSLA
        ↓
Frontend verifies response belongs to TSLA
        ↓
All charts/cards/tables display TSLA
```

If the user changes:

```text
TSLA → NVDA
```

the entire analysis context must switch:

```text
NVDA price
NVDA technicals
NVDA forecast
NVDA prediction intervals
NVDA backtest
NVDA sentiment
NVDA fundamentals
NVDA FinSight Score
NVDA model comparison
NVDA RL analysis
```

where each feature is supported for that security.

---

# QUICK-SELECT BUTTONS

Do NOT necessarily remove the existing buttons:

```text
AAPL | NVDA | MSFT | TSLA | RELIANCE | TCS
```

Instead convert them into **quick-select shortcuts**.

They should simply update:

```text
selectedTicker
```

They must NOT define the universe of supported stocks.

The search functionality should allow the user to enter other supported tickers.

---

# UNIVERSAL TICKER SEARCH

Implement a proper search interface:

```text
Search stocks...
```

User can enter:

```text
TSLA
GOOGL
AMZN
META
NFLX
RELIANCE.NS
TCS.NS
```

where supported by the configured data provider.

If company-name search is technically supported by the provider, allow:

```text
Tesla
```

to resolve to:

```text
TSLA
```

Search results should ideally display:

```text
Company Name
Ticker
Exchange
Asset Type
```

---

# NEVER CLAIM UNSUPPORTED DATA

"Any stock" means:

> Any security actually supported by the configured market-data provider and containing sufficient data for the requested analysis.

Do not fabricate results.

If a ticker exists but a model requires more history:

> "This security does not have enough historical data to run this model."

If fundamentals aren't available:

> "Fundamental data is unavailable for this security."

If sentiment isn't available:

> "No relevant recent news was found."

---

# DYNAMIC API CONTRACT

Every ticker-dependent endpoint must explicitly receive the ticker.

For example:

```text
GET /api/forecast?ticker=TSLA
```

or:

```json
{
  "ticker": "TSLA",
  "horizon": 30
}
```

Responses should include:

```json
{
  "ticker": "TSLA",
  "data": {}
}
```

Use typed Pydantic request/response schemas.

Avoid silently falling back to AAPL.

---

# CACHE ISOLATION

This is mandatory.

AAPL cache must never be returned for TSLA.

Cache keys must include all relevant parameters:

```text
ticker
model
date range
forecast horizon
timeframe
hyperparameters
feature configuration
data version
```

Test cache isolation explicitly.

---

# RACE-CONDITION PROTECTION

Implement protection against stale requests.

Example:

```text
Request AAPL
↓
User selects TSLA
↓
Request TSLA
↓
TSLA completes
↓
AAPL completes later
```

The UI must remain on TSLA.

Use an appropriate combination of:

* AbortController
* request IDs
* query keys
* state validation
* cancellation
* selected-ticker checks

Choose the approach appropriate to the existing frontend architecture.

---

# DATA CORRECTNESS

Never reuse another ticker's:

* price
* forecast
* sentiment
* fundamentals
* technical indicators
* model output
* score
* backtest
* cached result

Every result should carry enough metadata to identify what it represents.

At minimum where applicable:

```text
ticker
timestamp
data source
data status
model
model version
```

---

# TEST MATRIX

After implementation, test multiple securities:

```text
AAPL
TSLA
NVDA
MSFT
GOOGL
AMZN
META
RELIANCE.NS
TCS.NS
```

For every supported ticker verify:

* ticker search
* current price
* historical chart
* technical indicators
* SARIMAX
* prediction intervals
* backtest
* sentiment
* fundamentals where available
* FinSight Score
* model comparison
* RL where supported
* caching

Also test:

```text
valid ticker
invalid ticker
ticker with insufficient history
ticker switch during loading
rapid ticker switching
page refresh
direct ticker URL
cache hit
cache miss
backend restart
API failure
data-provider failure
```

---

# CODE QUALITY REQUIREMENTS

Write:

* clean TypeScript
* strict types
* Python type hints
* Pydantic validation
* small components
* small services
* reusable functions
* clear interfaces
* meaningful errors
* deterministic tests

Do not:

* use `any` unnecessarily
* duplicate ticker logic
* create god-files
* hardcode stock-specific behavior
* create fake data
* silently swallow errors
* add unnecessary dependencies
* break existing features

---

# FINAL ACCEPTANCE CRITERIA

The task is complete only when:

* [ ] User can search for a supported ticker.
* [ ] User can press Enter to select it.
* [ ] Quick-select stocks work as shortcuts.
* [ ] Selected ticker has one canonical source of truth.
* [ ] All ticker-dependent APIs receive the selected ticker.
* [ ] Backend validates the ticker.
* [ ] Market data is dynamically fetched.
* [ ] SARIMAX uses selected ticker.
* [ ] TFT/quantile model uses selected ticker.
* [ ] RL uses selected ticker.
* [ ] Technical indicators use selected ticker.
* [ ] Sentiment uses selected ticker.
* [ ] Fundamentals use selected ticker.
* [ ] FinSight Score uses selected ticker.
* [ ] Backtesting uses selected ticker.
* [ ] Model comparison uses selected ticker.
* [ ] Charts dynamically update.
* [ ] Chart titles dynamically update.
* [ ] Cache keys isolate tickers.
* [ ] Stale requests cannot overwrite current results.
* [ ] Invalid tickers produce proper errors.
* [ ] Insufficient data is handled properly.
* [ ] Direct ticker URLs work.
* [ ] Refresh preserves the selected ticker.
* [ ] No production feature depends on hardcoded AAPL data.
* [ ] No static/mock stock data is accidentally used.
* [ ] Automated tests pass.
* [ ] TypeScript checks pass.
* [ ] Backend tests pass.
* [ ] Frontend production build passes.
* [ ] End-to-end testing succeeds with multiple tickers.

---

# MOST IMPORTANT

Do not solve this by simply changing the ticker displayed in the UI.

I want the **entire underlying data and computation pipeline to become ticker-driven**.

Trace the ticker all the way through:

**Search → State → API → Validation → Market Data → Cache → Models → Database → Response → Charts → UI**

and verify that the selected ticker is preserved correctly at every stage.

First:

**ANALYZE → AUDIT → DESIGN → WRITE IMPLEMENTATION PLAN → STOP FOR MY APPROVAL**

Then:

**IMPLEMENT → TEST → VERIFY → FIX → REGRESSION TEST → REPORT**

Do not start implementation until I approve the implementation plan.
