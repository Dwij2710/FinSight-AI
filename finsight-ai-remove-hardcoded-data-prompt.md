# FinSight AI — Eliminate Hardcoded/Mock Data, Enforce 100% Live API-Driven Rendering

Paste this into Claude Code (or your coding agent) inside the `FinSight-AI` repo. It's written as a direct engineering task list, ordered by priority.

---

## Context for the agent

```
Every module on the live site (Stock Forecast, Portfolio Analysis, Advanced AI,
RL Trading Agent, Multi-Variate TFT) currently displays a
"Simulated/Fallback · Offline Engine" badge — meaning the frontend's fallback
math engine is active on every single view, not just during backend cold starts.

Additionally, several values look like static/mock content rather than live
computation:
- Advanced AI feature-importance percentages (RSI 0.3%, MACD 0.3%, SMA 0.2%,
  Bollinger 0.2%) don't sum to 100% — looks like a raw fraction rendered
  without multiplying by 100, OR a hardcoded array.
- News sentiment headlines are generic, non-clickable, and don't look like
  real RSS output.
- RL Agent's "Recent Decision Log" spans exactly the 7 days ending today,
  every time the page loads — a signature of date.now()-relative fake data
  generation rather than a persisted backtest run.
- Portfolio stress-test drawdowns (-24.2%, -19.6%, -14.8%) don't change when
  the ticker basket changes — they should, since different assets crash by
  different amounts.
- Watchlist notes read like authored copy, not user-entered DB rows.

GOAL: Audit the entire frontend and backend. Remove every hardcoded number,
mock array, and placeholder string. Every value rendered in the UI must
originate from a live computation in the FastAPI backend, which itself must
pull real data (yfinance, RSS, computed statistics) at request time — no
value should be able to appear on screen unless it traveled through a real
API call in this session.
```

---

## Step 1 — Find out why the fallback is always active (do this first)

Before touching any "fake data," fix the actual connectivity bug — this alone may resolve most of what you're seeing.

**Prompt:**
> Audit `frontend/src/lib/` (API client) and find the fallback trigger logic. Answer these questions with evidence (logs/screenshots), don't assume:
> 1. Is `NEXT_PUBLIC_API_URL` on Vercel actually pointing at the live Render backend URL, or still `http://127.0.0.1:8000` / an old/incorrect URL?
> 2. Does the Render backend respond to `/health` right now? Curl it directly and paste the response.
> 3. Is the frontend's fetch timeout shorter than the backend's actual cold-start time? If the timeout is e.g. 3–5s and Render cold start takes 20–30s, the app will ALWAYS fall back on first load — that alone explains every screenshot.
> 4. Is CORS configured correctly on the FastAPI side for the deployed Vercel domain (not just localhost)? A CORS rejection looks identical to a network failure to the frontend and will silently trigger fallback.
> 5. Is there a bug where the fallback path is called unconditionally (e.g., `try { ... } catch { return fallback() }` wrapping something that always throws, or a feature flag left on)?
>
> Fix whichever of these is the actual cause. Do not proceed to Step 2 until you can reload the live site and see a 🟢 LIVE state at least once.

---

## Step 2 — Backend: guarantee every endpoint computes from real inputs, every time

**Prompt:**
> For each route in `backend/app/routes/` (`forecast.py`, `portfolio.py`, `ai_insights.py`, `rl_agent.py`, `tft.py`), do the following:
> 1. Grep for any hardcoded numeric constants, static lists of headlines, static decision logs, or static drawdown percentages. Replace every one with a real computation or a real external fetch.
> 2. Add an assertion/test at the top of each handler: the ticker(s) passed in the request must actually be used in the yfinance/data-fetch call — no handler should be able to return a response without a live upstream call succeeding or explicitly failing.
> 3. Every response must include `data_source: "live"` ONLY if every number in that response came from a fresh upstream fetch in this request. If any part used cache or synthetic fill, mark the whole response `"cache"` or `"simulated"` — don't let a response claim "live" while containing any mocked field.
> 4. Remove any function named like `generate_fallback_*`, `mock_*`, `simulate_*` from the *default* code path. Fallback/demo generation should only run if explicitly requested via a `?demo=true` query param used for local dev — never silently in production.

---

## Step 3 — Fix specific confirmed issues

### 3a. Advanced AI — feature importance percentages
> In `ai_features.py`, the feature-importance values (RSI, MACD, SMA, Bollinger) are being rendered as raw fractions instead of percentages of total importance. Fix the calculation so the four values are normalized to sum to 100%, and fix the frontend formatter to not append `%` to an already-fractional decimal without multiplying by 100 first. Add a unit test asserting `sum(importances) == pytest.approx(100.0)`.

### 3b. Advanced AI — news sentiment
> Verify `ai_insights.py`'s RSS ingestion is actually hitting a real financial news RSS feed (e.g. Yahoo Finance RSS, Google News RSS filtered by ticker) and that FinBERT scores are computed from that real headline text — not a static headline bank. Every headline card in the UI must:
> - Link out to the real article URL (`<a href={item.url}>`)
> - Show the actual publish timestamp from the feed, not a relative "Xm ago" computed from a fixed offset
> - Disappear/refresh when the feed genuinely has no new items for that ticker (don't pad with filler headlines to always show 4+ items)

### 3c. RL Agent — decision log
> The "Recent Agent Decision Log" must come from the actual step-by-step output of the trained policy's rollout on real historical price data for the selected ticker, persisted (e.g., logged to a DB row or returned inline from the `/api/rl/simulate` response) — not generated as `today - N days` with synthetic prices. If training happens on-demand per request (per the README, PPO/A2C/DQN train live), stream real intermediate steps via Server-Sent Events as training progresses, and show the actual buy/sell/hold actions and actual portfolio values the trained agent produced during backtesting — not a pre-baked array.

### 3d. Portfolio — stress test
> In `stress_testing.py`, verify the crisis stress-test percentages are computed by applying the *actual historical daily returns* of the 2008 GFC / 2020 COVID crash / 2022 correction windows to the user's *actual selected tickers and weights* — not fixed constants applied to any basket. Confirm this by testing with two very different baskets (e.g., all-tech vs. all-utilities) and verifying the drawdown percentages differ.

### 3e. Watchlists
> Confirm `/api/watchlists` is backed by a real database (README says PostgreSQL/SQLite) and that ticker notes are whatever the user typed when adding the ticker — not seeded copy. If there's a seed/demo watchlist for first-time users, label it clearly as a starter template, and make sure editing/deleting it actually persists (reload the page and confirm the change survives).

---

## Step 4 — Frontend: remove any local mock/demo data files

**Prompt:**
> Search the entire `frontend/src/` tree for any `.ts`/`.tsx` file containing large static arrays of prices, headlines, decision logs, or "mock", "dummy", "sample", "placeholder" in variable names or filenames (e.g. `mockData.ts`, `demoData.ts`, `fallbackEngine.ts`). For each one found:
> - If it's used as a genuine offline-fallback (last resort when backend is truly unreachable), keep it but make sure the LIVE/CACHED/SIMULATED badge (see prior enhancement prompt) is unmistakably shown whenever it's the active source.
> - If it's being used as the *default* rendering path even when the backend is reachable, delete that usage and wire the component to the real API call.

---

## Step 5 — Verification checklist (definition of done)

Run through this manually before considering it fixed:

- [ ] Reload the live site 3 times in a row — see 🟢 LIVE (or a clearly-labeled cache state), not permanent "Simulated/Fallback"
- [ ] Change the active ticker from RELIANCE to AAPL — every number on every page changes (price, forecast, sentiment, RL result, macro levels)
- [ ] Refresh Advanced AI twice, a minute apart — headline "time ago" values actually increment; if new news exists, headlines change
- [ ] Feature importance values sum to 100%
- [ ] Run Portfolio stress-test with two unrelated ticker baskets — drawdown numbers differ
- [ ] Run RL Trading Agent twice with the same settings — decision log/timestamps reflect an actual new run, not the same static 7-day array
- [ ] Add/edit a Watchlist note, reload the page — your exact text persists
- [ ] Open browser DevTools → Network tab while using each module — confirm a real XHR/fetch to your Render backend fires for every action, with a response payload that matches what's rendered (no client-only math conjuring the displayed numbers)

---

## How to use this

Give the agent **Step 1 first, in isolation**, and don't let it move on until you've personally verified a 🟢 LIVE badge on the real site. Most of what you're seeing in the screenshots is very likely explained by Step 1 alone (timeout/CORS/URL misconfig causing permanent fallback). Then work through Steps 2–4 module by module, and use Step 5 as your acceptance test before calling any of it done.
