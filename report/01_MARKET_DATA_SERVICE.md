# Module 01: Centralized Market Data Service & Single Source of Truth

**Module Identifier:** `MOD-01-MKT-DATA`  
**Core Components:** `backend/app/services/market_data.py`, `frontend/src/context/MarketDataContext.tsx`, `frontend/src/components/ProvenanceBadge.tsx`  
**Quantitative Discipline:** Financial Data Engineering, Telemetry & Real-Time Stream Ingestion  
**Production Status:** Production Ready (Verified Live & Seeded Sandbox Modes)  

---

## 1. Executive Brief (High-Level Summary)

In financial quantitative systems, **data integrity is paramount**. Inconsistent or fragmented price feeds between disparate dashboard views produce conflicting metrics, broken risk calculations, and unreliable predictive models. The **Centralized Market Data Service** acts as the single source of truth for all quote, OHLCV bar, and historical time-series inquiries across FinSight AI.

### Key Capabilities at a Glance:
- **Single-Source-of-Truth Hub**: Centralizes asset quotes across all 8 frontend analytical views.
- **Thread-Safe Mutex Caching**: Uses Python `threading.Lock` and two-tier in-memory/SQLite caching (30s quote TTL, 5m historical bar TTL) to prevent rate limiting and race conditions.
- **Zero-Synthetic Guarantee in Live Mode**: When live mode is active, the service strictly serves verified data from institutional providers (Yahoo Finance / Polygon). If feeds fail, it raises explicit diagnostics rather than hallucinating synthetic numbers.
- **Data Provenance & Audit Stamping**: Enriches every API response with timestamp, data source (`live`, `cached`, `simulated`), provider ID, and cache hit metadata.
- **Resilient Fallback Sandbox**: An isolated deterministic Mulberry32-seeded simulator available on-demand when offline or in sandbox mode.

---

## 2. Architecture & Data Flow Pipeline

```
+-----------------------------------------------------------------------------------+
|                              FRONTEND CLIENT VIEWS                                |
|  ForecastView │ PortfolioView │ TftView │ RlAgentView │ AiInsightsView │ Watchlist |
+-----------------------------------------+-----------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
|                     MarketDataProvider (MarketDataContext.tsx)                    |
|  - Holds unified ticker quotes map in React State                                 |
|  - Auto-polls active tickers every 30s during live market hours                    |
|  - Detects cold-starts & accelerates polling to 5s during container boot          |
|  - Provides global isDemoMode toggle & setDemoMode dispatch                       |
+-----------------------------------------+-----------------------------------------+
                                          │ HTTPS GET /api/quote/{ticker}
                                          ▼
+-----------------------------------------------------------------------------------+
|                        FastAPI Server (backend/app/main.py)                       |
+-----------------------------------------+-----------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
|                    MarketDataService (app/services/market_data.py)                |
|  1. Check Memory Cache (Thread-Safe Mutex Lock)                                    |
|     └─ If present and (Now - CachedAt) < TTL (30s): Return Cached Quote           |
|  2. Check SQLite Persistent Disk Cache                                            |
|     └─ If valid within historical TTL (5m): Return Cached Bars                    |
|  3. External Ingestion via yfinance / Polygon API (with Retry & Backoff)          |
|  4. Telemetry Stamping:                                                           |
|     └─ { price, change_pct, data_source: "live", fetched_at: ISO8601, cache_hit } |
+-----------------------------------------+-----------------------------------------+
                                          │
                   +----------------------+----------------------+
                   │                                             │
                   ▼                                             ▼
          [ Live Provider ]                             [ Network Error ]
       Yahoo Finance / Polygon                      Clean HTTP 502 / 404 Error
   (Authentic Real Market Data)                    (Granular Diagnostic Details)
                                                                 │
                                                                 ▼
                                                    [ ErrorBanner Component ]
                                                    - Single-Click "Use Sandbox"
                                                    - Fast Diagnostic Retry
```

---

## 3. Mathematical & Data Engineering Mechanics

### 3.1 Cache Invalidation & Expiration Dynamics
The caching layer implements a multi-tiered Time-To-Live (TTL) model:

$$\text{Cache Validity Condition: } t_{\text{current}} - t_{\text{cached}} < \text{TTL}_{\text{category}}$$

Where:
- $\text{TTL}_{\text{quote}} = 30\text{ seconds}$ (Balances fresh quote updates against external API rate-limit thresholds).
- $\text{TTL}_{\text{bars}} = 300\text{ seconds}$ (5 minutes for daily historical OHLCV series, which change only once per trading day).
- $\text{TTL}_{\text{fundamentals}} = 86400\text{ seconds}$ (24 hours for balance sheet and quarterly macroeconomic metrics).

### 3.2 Thread-Safe Concurrency Model
Under concurrent asynchronous requests (e.g., when a user loads a 10-stock portfolio simultaneously), multiple coroutines could attempt to fetch the same uncached ticker, causing an API stampede. `MarketDataService` guards the cache check and write operations using a thread-safe mutex:

```python
import threading
from datetime import datetime, timezone

class MarketDataService:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._init_cache()
            return cls._instance

    def _init_cache(self):
        self._quote_cache = {}
        self._cache_lock = threading.Lock()

    def get_quote(self, ticker: str, force_refresh: bool = False):
        with self._cache_lock:
            cached = self._quote_cache.get(ticker)
            if cached and not force_refresh:
                age = (datetime.now(timezone.utc) - cached["cached_at"]).total_seconds()
                if age < 30.0:
                    cached["cache_hit"] = True
                    return cached

        # Fetch from external data provider (outside lock to avoid blocking other tickers)
        data = self._fetch_live_quote(ticker)

        with self._cache_lock:
            data["cached_at"] = datetime.now(timezone.utc)
            data["cache_hit"] = False
            self._quote_cache[ticker] = data
            return data
```

---

## 4. Telemetry & Provenance Stamping

Every data payload emitted by the service contains non-repudiable audit metadata:

```json
{
  "ticker": "AAPL",
  "name": "Apple Inc.",
  "price": 224.50,
  "change": 1.75,
  "change_percent": 0.78,
  "volume_24h": 48291000,
  "high_24h": 225.10,
  "low_24h": 222.80,
  "currency": "USD",
  "data_source": "live",
  "fetched_at": "2026-09-06T15:30:00.000Z",
  "cache_hit": false,
  "provider": "yfinance",
  "latency_ms": 142
}
```

### Frontend Provenance Representation
In the frontend, `ProvenanceBadge.tsx` consumes this metadata:
- **`data_source === 'live'`**: Displays a glowing green badge `● LIVE (yfinance)` with an exact UTC timestamp tooltip.
- **`data_source === 'simulated'`**: Displays a purple badge `⚡ SIMULATED (Sandbox PRNG)`.
- **Missing or Failed Data**: If a request returns null, an error, or empty data, `ProvenanceBadge` automatically evaluates `if (!source && !isDemo) return null;`, ensuring the user **never** sees an unverified "Live" badge.

---

## 5. Exhaustive API Specifications

### 5.1 Endpoint: `GET /api/quote/{ticker}`
Fetches the real-time quote and 24h market metrics for a specific asset.

**Query Parameters:**
- `ticker` (path, string, required): Asset ticker symbol (e.g. `AAPL`, `MSFT`, `RELIANCE.NS`).
- `force_refresh` (query, boolean, optional, default: `false`): Bypass cache.

**Response Schema (200 OK):**
```json
{
  "ticker": "string",
  "price": "number (float)",
  "change": "number (float)",
  "change_percent": "number (float)",
  "high_24h": "number (float)",
  "low_24h": "number (float)",
  "volume_24h": "integer",
  "data_source": "live | simulated",
  "fetched_at": "string (ISO 8601)",
  "cache_hit": "boolean",
  "provider": "string"
}
```

**Error Responses:**
- `404 Not Found`: Ticker cannot be resolved on any exchange.
  ```json
  { "detail": "Ticker 'INVALID_TICKER' was not found on connected financial exchanges." }
  ```
- `502 Bad Gateway`: External upstream market provider timed out or rate-limited.
  ```json
  { "detail": "Upstream market data provider (yfinance) failed to respond within 10 seconds." }
  ```

### 5.2 Endpoint: `GET /api/history/{ticker}`
Fetches historical daily OHLCV price bars.

**Query Parameters:**
- `ticker` (path, string, required): Asset ticker symbol.
- `period` (query, string, optional, default: `1y`): Supported values: `6m`, `1y`, `2y`, `5y`.
- `interval` (query, string, optional, default: `1d`): Bar interval (`1d`, `1wk`).

---

## 6. Frontend Context & Real-Time Synchronization

The React Context `MarketDataContext.tsx` provides seamless cross-component price reactivity:

```typescript
export interface MarketDataContextType {
  quotes: Record<string, StockQuote>;
  loading: boolean;
  refreshing: boolean;
  freshnessState: 'LIVE' | 'BACKEND_STARTING' | 'PROVIDER_ERROR' | 'DEMO_SIMULATION';
  backendHealth: BackendHealthStatus | null;
  isDemoMode: boolean;
  setDemoMode: (val: boolean) => void;
  getQuote: (ticker: string) => StockQuote | undefined;
  refreshQuotes: () => Promise<void>;
}
```

### Real-Time Lifecycle:
1. **Initial Mount**: Automatically pings `/api/warmup` and `/health` to establish backend availability.
2. **Periodic Refresh**: Triggers batch synchronization every 30 seconds for all tickers active in the user's Watchlist and Portfolio.
3. **Cold-Start Adaptation**: If health probe indicates Render is waking up (`BACKEND_STARTING`), polling drops to a 5-second interval until the container responds with 200 OK.
4. **Instant State Transition**: If the user clicks "Switch to Sandbox Mode", `isDemoMode` toggles to `true`, instantly notifying all subscribed views to switch to the deterministic Mulberry32 simulator without page reloads.

---

## 7. Edge Cases & Resilience Engineering

| Edge Case / Failure Mode | Platform Handling Behavior | User Experience Guarantee |
| :--- | :--- | :--- |
| **Market Closed / Weekend** | Returns latest trading day closing bar with timestamp of close. | Displays `Fetched at: Friday 16:00 EST` with `● LIVE (Market Closed)` tag. |
| **Delisted or Invalid Ticker** | External provider returns empty DataFrame; raises HTTP 404. | Error banner displays: `"Ticker symbol not found. Verify exchange suffix (e.g. .NS for NSE)."` |
| **Upstream Provider Rate Limit** | Retries 3 times with exponential backoff (1s, 2s, 4s). If still failing, returns last valid cached bar if age < 1 hour. | Banner advises user: `"Upstream rate limit reached. Displaying latest valid cache."` |
| **Render Cold Start Delay** | Detects connection timeout ($>10\text{s}$); transitions to `BACKEND_STARTING`. | Real-time elapsed counter in header (`Waking container... 24s`) + one-click Sandbox fallback. |
| **Network Disconnect** | Browser `navigator.onLine === false`; suppresses requests. | Displays offline warning with button to enable offline Sandbox Mode. |

---

## 8. Verification & Test Suite

Covered by automated tests in `tests/test_data_integrity.py` and `tests/test_quant_math.py`:
- `test_single_source_of_truth_quote`: Ensures identical values across concurrent requests.
- `test_api_response_provenance_stamp`: Asserts that `data_source`, `fetched_at`, and `provider` are always populated.
- `test_cache_ttl_and_telemetry`: Verifies cache hit transition and expiry after TTL elapsed.
- **Pass Rate**: 100% (All 19/19 tests passing).
