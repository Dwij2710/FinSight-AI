# Module 07: Real-Time Alerts & Watchlist Engine

**Module Identifier:** `MOD-07-REALTIME-ALERTS`  
**Core Components:** `frontend/src/context/AlertContext.tsx`, `frontend/src/components/WatchlistView.tsx`, `frontend/src/app/page.tsx`  
**Quantitative Discipline:** Real-Time Stream Event Processing, Client-Side Rule Engines & Web Push Systems  
**Production Status:** Production Ready (Verified Live & Seeded Sandbox Modes)  

---

## 1. Executive Brief (High-Level Summary)

Timing is crucial in quantitative trading. The **Real-Time Breakout Alerting & Watchlist Engine** provides continuous, client-side monitoring of incoming market quotes against user-configured threshold rules. Operating without custodial databases or server-side notification dependencies, the engine evaluates threshold crosses every 30 seconds, dispatches native OS push notifications via the **Web Notifications API**, displays animated glassmorphic in-app toasts, and prevents notification fatigue via a **15-minute anti-spam deduplication cooldown**.

### Key Capabilities at a Glance:
- **Bidirectional Rule Tracking**: Supports breakout rules for upward resistance breaks (`ABOVE`) and downward support violations (`BELOW`).
- **15-Minute Anti-Spam Cooldown**: Implements a per-ticker timestamp cooldown window to suppress oscillating notification loops during sideways consolidation.
- **Web Notifications API Integration**: Dispatches native operating system desktop notifications even when the browser tab is minimized or running in the background.
- **Floating Glass In-App Toasts**: Renders interactive, dismissible notification banners with direct links to the relevant asset view.
- **Live Distance-to-Target Metrics**: Computes real-time percentage distance to price targets across active alerts.
- **Zero-Custody Privacy**: User watchlists and alerts persist locally in browser `localStorage`.

---

## 2. Technical Architecture & State Machine

```
[ MarketDataProvider ]
        │
        │ Live Quote Stream (Every 30s)
        ▼
[ AlertContext Provider ]
  ├─ 1. Ingest Incoming Quotes: { ticker: { price, data_source } }
  ├─ 2. Data Integrity Guard: Reject quote if data_source !== 'live'
  ├─ 3. For each active Alert Rule:
  │      ├─ Check Direction: ABOVE (P_live >= P_target && P_prev < P_target)
  │      ├─ Check Direction: BELOW (P_live <= P_target && P_prev > P_target)
  │      └─ Check Deduplication Cooldown: (t_now - t_last_fired) >= 900s
  │
  ├─ 4. If Triggered:
  │      ├─ Dispatch Browser Notification (Notification API)
  │      ├─ Push In-App Toast into UI Toast Stack
  │      └─ Update Alert Status: 'TRIGGERED' + Timestamp
  │
  └─ 5. Sync State to LocalStorage ('finsight_alerts_v2')
```

---

## 3. Mathematical Rule Evaluation & Cooldown Dynamics

### 3.1 State Transition Conditions
Let $P_t$ represent the live asset price at synchronization step $t$, $P_{t-1}$ represent the previously cached price, and $P^*$ represent the user's defined target threshold:

1. **Upper Breakout Rule (`direction === 'ABOVE'`):**
   $$\text{Trigger Condition: } \left( P_t \ge P^* \right) \land \left( P_{t-1} < P^* \right)$$
2. **Lower Breakdown Rule (`direction === 'BELOW'`):**
   $$\text{Trigger Condition: } \left( P_t \le P^* \right) \land \left( P_{t-1} > P^* \right)$$

### 3.2 Distance-to-Target Calculation
In the watchlist and active alerts monitoring tables, the distance-to-target metric $\Delta\%$ provides immediate situational awareness:

$$\Delta\%_{\text{target}} = \left( \frac{P^* - P_t}{P_t} \right) \times 100\%$$
- A positive percentage indicates the asset is trading below the target.
- A negative percentage indicates the asset has broken above the target.

### 3.3 15-Minute Anti-Spam Sliding-Window Cooldown
During market chop or high-frequency volatility, an asset's price may cross the threshold $P^*$ multiple times per minute. To eliminate alert spam, the engine enforces a temporal lockout window:

$$\Delta t_{\text{elapsed}} = t_{\text{current}} - t_{\text{last\_alert}} \ge 900\text{ seconds} \quad (15\text{ minutes})$$

```typescript
const shouldTrigger = (alert: PriceAlert, currentPrice: number, previousPrice: number): boolean => {
  const now = Date.now();
  if (alert.lastTriggeredAt && (now - alert.lastTriggeredAt) < 15 * 60 * 1000) {
    return false; // Suppressed by 15-minute anti-spam cooldown
  }

  if (alert.direction === 'ABOVE') {
    return currentPrice >= alert.targetPrice && previousPrice < alert.targetPrice;
  } else {
    return currentPrice <= alert.targetPrice && previousPrice > alert.targetPrice;
  }
};
```

---

## 4. Web Notifications API & Toast Notification Engine

### 4.1 Browser Permission Lifecycle
When the user configures their first price alert, the engine requests system notification permissions:

```typescript
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}
```

### 4.2 Native Push Notification Dispatch
When a breakout condition is satisfied:
```typescript
new Notification(`🚨 Price Target Reached: ${alert.ticker}`, {
  body: `${alert.ticker} has broken ${alert.direction} $${alert.targetPrice.toFixed(2)} (Current: $${currentPrice.toFixed(2)})`,
  icon: '/favicon.ico',
  tag: `alert-${alert.ticker}-${alert.id}`, // Prevents duplicate native OS cards
  silent: false
});
```

### 4.3 Floating Glass In-App Toast
Concurrently, an interactive toast is pushed to the client view stack:
- Styled with dark glassmorphic tokens (`background: rgba(18, 26, 43, 0.90)`, `backdrop-filter: blur(12px)`).
- Renders an animated pulse dot, target delta, and a **Dismiss** button.
- Automatically fades out after 8 seconds if not dismissed manually.

---

## 5. LocalStorage Data Schema

All user preferences and alert states are stored under the key `'finsight_alerts_v2'`:

```json
[
  {
    "id": "alt_1788691000",
    "ticker": "NVDA",
    "targetPrice": 125.00,
    "direction": "ABOVE",
    "createdAt": "2026-09-06T14:00:00.000Z",
    "lastTriggeredAt": null,
    "active": true,
    "notes": "Key technical breakout level above 50-day SMA"
  }
]
```

---

## 6. Verification & Automated Testing
- End-to-end browser testing validates:
  1. Alert modal configuration and input validation.
  2. Automatic distance-to-target calculations updating in real-time as quotes refresh.
  3. Correct suppression of duplicate alerts within the 15-minute cooldown window.
  4. LocalStorage persistence across page reloads.
