# FinSight AI — Live Data & Production Readiness Enhancement Prompt

Use this as a direct prompt for Claude Code (or any coding agent) working in the `FinSight-AI` repo. It's organized so you can paste the whole thing, or hand over one section at a time.

---

## Context to give the agent

```
Repo: https://github.com/Dwij2710/FinSight-AI
Live: https://frontend-orpin-xi-99.vercel.app/
Stack: Next.js 14 (App Router, React 18, TS) on Vercel + FastAPI (Python) on Render.
Backend routes: forecast.py, portfolio.py, ai_insights.py, rl_agent.py, tft.py
Core logic: src/ (data_fetcher.py, portfolio_optimizer.py, risk_metrics.py, ai_features.py, rl_agent.py, tft_features.py)

Problem: On load, the frontend shows "Checking Backend..." and the app has a
"Client Resilience & Mathematical Fallback Engine" that generates simulated
data when the Render backend is cold or unreachable. This means visitors —
including recruiters/interviewers — may be looking at fake numbers without
knowing it. Goal: make live, real data the default experience, make any
fallback state impossible to mistake for live data, and make the whole app
feel production-grade rather than demo-grade.
```

---

## 1. Fix the root cause: backend cold starts

Render's free tier spins down after ~15 min idle, which is almost certainly why the site opens on "Checking Backend...".

**Prompt:**
> Add a scheduled keep-alive ping to the FastAPI backend's `/health` endpoint every 10 minutes using GitHub Actions (`.github/workflows/keep-alive.yml`) so the Render free-tier instance never fully sleeps during demo hours. Also add a `/health` response payload that includes `{status, uptime_seconds, last_data_fetch_ts, yfinance_reachable: bool}` so the frontend can distinguish "server asleep" from "server up but data source down."
>
> If budget allows, move the backend to Render's paid tier (no spin-down) or Fly.io/Railway with an always-on free/hobby instance, and update `DEPLOYMENT_GUIDE.md` accordingly.

---

## 2. Make "live vs fallback" visually explicit — this is the most important fix

Right now fallback data is invisible to the user. That's a trust problem for a finance app.

**Prompt:**
> In `Header.tsx`, replace the binary "Checking Backend..." state with three explicit states, each with a distinct colored badge:
> - 🟢 **LIVE** — data fetched from yfinance/RSS within the last N minutes (show exact timestamp, e.g. "Live · updated 12s ago")
> - 🟡 **CACHED** — data served from cache older than the live threshold but still real (show "Cached · 4m old")
> - 🔴 **SIMULATED** — the fallback engine generated this data because the backend/data source is unreachable (show "Simulated data — backend unavailable" with a tooltip explaining why)
>
> Every API response from FastAPI should include a `data_source` field (`"live" | "cache" | "simulated"`) and a `fetched_at` ISO timestamp. Every view (ForecastView, PortfolioView, AiInsightsView, RlAgentView, TftView) must read this field and render the matching badge next to its chart/table — not just in the global header, since different modules can be in different states at once.

---

## 3. Real-time price data

**Prompt:**
> Add a lightweight polling mechanism (or WebSocket if you want to go further) that refreshes the ticker prices in the header every 15–30 seconds during market hours only (check NYSE/NSE market-hours logic server-side, since yfinance intraday data won't move outside trading hours). Outside market hours, show "Market closed · last close: $X at HH:MM" instead of a spinning "live" indicator that implies motion that isn't happening.
>
> Implement this as a small `/api/ticker/live` endpoint that returns last price, change %, and volume for the watchlist tickers (AAPL, NVDA, MSFT, TSLA, RELIANCE.NS, TCS.NS), cached server-side for 15s to avoid hammering yfinance and getting rate-limited.

---

## 4. Module-by-module data/display upgrades

### Stock Forecast (SARIMAX)
> Before showing the forecast, plot the actual last 90 days of real closing prices as a line/candlestick so the user sees genuine market data first, then overlay the forecast cone. Display the ADF test p-value and stationarity verdict inline (not just internally used for auto-differencing) — it's a real statistic and makes the model feel rigorous rather than a black box. Show backtest RMSE/MAPE numbers directly on the chart legend, not just in a separate panel.

### Portfolio Analysis
> Pull real historical adjusted-close data for whatever tickers the user enters (already does this per README) but add: (1) a visible "as of [date]" on the efficient frontier chart, (2) the actual current portfolio value if the user inputs share counts instead of just weights, (3) a real-time re-optimization trigger button that shows a loading skeleton rather than freezing the UI during the Monte Carlo run.

### Advanced AI (FinBERT sentiment + models)
> Show the actual headline text and publish timestamp next to each sentiment score (currently just aggregated) — this is what makes FinBERT output verifiable rather than a mystery number. Add a "source" link back to the original RSS article. For the LSTM/MLP/RandomForest benchmark, show training data date range so users know the model isn't stale.

### RL Trading Agent
> This is the one place where "live" doesn't apply the same way (RL agents are trained/backtested, not live-traded) — be transparent about that. Add a disclaimer badge: "Backtested on historical data — not live trading." Show training progress (episode count, reward curve) as it happens via Server-Sent Events instead of a blocking spinner, since PPO/A2C/DQN training can take real wall-clock time.

### Multi-Variate Macro / TFT
> Auto-refresh macro telemetry (VIX, 10Y yield, Gold, Oil, DXY) on a timer during market hours, same as the ticker prices. Timestamp the Isolation Forest anomaly scan and the KNN historical-lookalike match with the data date range used, so "closest historical day" claims are auditable.

---

## 5. Resilience & observability

**Prompt:**
> Add structured logging (e.g. `structlog`) on the backend that records every time the fallback engine activates, with reason (timeout, yfinance error, rate limit). Expose a simple `/api/status` admin view (or just log to Render's dashboard) so you can see how often fallback triggers in practice — this tells you whether the cold-start fix in Section 1 actually worked.
>
> Add retry-with-backoff around all yfinance calls (2–3 retries) before falling back to simulation, since transient yfinance hiccups are common and don't require faking data.

---

## 6. Polish for a portfolio/interview audience

**Prompt:**
> - Replace the static `assets/*.png` screenshots in the README with a short (15–20s) screen-recorded GIF per module showing real interaction, since static images already look dated next to a "live" claim.
> - Add a pinned demo note in the README: "Free-tier hosting — first load may take 20–30s to wake the backend" so visitors don't think it's broken.
> - Add a minimal test suite (`pytest`) covering `risk_metrics.py` (VaR/CVaR/Sharpe/Beta formulas) and `portfolio_optimizer.py` (weights sum to 1, frontier is non-decreasing in risk) — a few unit tests on the math layer materially strengthens the "enterprise-grade" claim in the README and is cheap to add.
> - Add a GitHub Actions CI badge once tests exist.

---

## How to use this

Paste Section 1 + Section 2 first (they fix the trust/reliability problem, which matters most). Then work through Section 4 module by module. Sections 5–6 are polish once the core live-data pipeline is solid.
