# Module 07: Real-Time Alerts & Watchlist Engine

**Module Owner:** Frontend Client Systems & Real-Time Engineering  
**File Path:** `frontend/src/context/AlertContext.tsx` & `frontend/src/components/WatchlistView.tsx`  
**Status:** Production Ready  

---

## 1. Executive Brief (High-Level Summary)

The **Real-Time Breakout Alerting & Watchlist Engine** provides continuous, client-side monitoring of live stock prices against user-defined technical thresholds. Featuring native browser Web Notifications API push alerts, animated floating UI toasts, and an institutional **15-minute anti-spam deduplication cooldown**, the engine ensures users never miss a critical price target breakout while remaining protected from alert fatigue.

---

## 2. Technical Architecture & State Flow

```
[ MarketDataProvider ]
         │
         │ Real-time quote stream (every 30s)
         ▼
[ AlertContext Provider ]
         │
         ├─ Evaluates rules against live quotes
         ├─ Checks 15-minute deduplication timestamp
         │
    +----+----+
    │ Trigger │
    ▼         ▼
[ Web Notifications API ]   [ Floating In-App Glass Toasts ]
 (OS Native Push Alert)       (Animated Canvas / Dismissible)
```

---

## 3. Core Engine Mechanics

### 3.1 Breakout Trigger Conditions
Alerts support bidirectional directional tracking:
- **`ABOVE` Rule**:
  Fires if current quote $P_{\text{live}} \ge P_{\text{target}}$ AND previous recorded quote $P_{\text{prev}} < P_{\text{target}}$.
- **`BELOW` Rule**:
  Fires if current quote $P_{\text{live}} \le P_{\text{target}}$ AND previous recorded quote $P_{\text{prev}} > P_{\text{target}}$.

### 3.2 Anti-Spam Deduplication Cooldown
During periods of market consolidation around a key price level, prices may oscillate across the target repeatedly within minutes. FinSight AI enforces a strict 15-minute cooldown per ticker-rule pair:
$$\Delta t_{\text{trigger}} = t_{\text{current}} - t_{\text{last\_fired}} \ge 900\text{ seconds}$$
If an alert was fired within the last 15 minutes, subsequent crosses are suppressed, and logged to telemetry.

### 3.3 Data Integrity Guard
Alert evaluations only occur when the incoming quote has `data_source === 'live'`. Stale, cached, or fallback data is explicitly rejected to prevent phantom notifications.

---

## 4. UI & Watchlist Integration

1. **Watchlist Table**: Displays live quote, daily percentage change, high/low spread, and instant "Set Alert" modal launcher.
2. **Active Alerts Monitor**: Displays active target rules, current price distance-to-target percentage, status badges (`ACTIVE`, `TRIGGERED`, `MUTED`), and one-click delete/pause toggles.
3. **Persistent LocalStorage**: Alerts and watchlist state survive browser refreshes without requiring custodial database credentials.

---

## 5. Verification
- Validated via end-to-end browser testing: Alert modal configuration, Web Notification permission request handling, and toast dismiss animations verified with zero console warnings.
