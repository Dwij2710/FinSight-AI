# Module 08: Modern Glassmorphic Frontend & High-DPI Exporters

**Module Identifier:** `MOD-08-UI-DESIGN-SYSTEM`  
**Core Components:** `frontend/src/app/globals.css`, `frontend/src/context/ThemeContext.tsx`, `frontend/src/lib/chartExport.ts`, `frontend/src/lib/demoData.ts`  
**Quantitative Discipline:** Modern Web Engineering, Design Systems, Canvas Graphics & Deterministic Simulation  
**Production Status:** Production Ready (Verified Live & Seeded Sandbox Modes)  

---

## 1. Executive Brief (High-Level Summary)

The **FinSight AI Frontend** delivers an institutional-grade, responsive user experience built with **Next.js 14 (App Router)**, **React 18**, and **TypeScript**. Emphasizing clarity, rapid data comprehension, and aesthetic excellence, the frontend features a custom **Glassmorphic Design Token System**, dual **Dark / Light mode** theming, **High-DPI Retina Canvas PNG Chart Exporters**, **RFC-4180 CSV Data Streamers**, and a mathematically deterministic **Mulberry32 PRNG Sandbox**.

### Key Capabilities at a Glance:
- **Zero-Dependency Styling**: Uses pure Vanilla CSS tokens, avoiding bulky runtime CSS frameworks while delivering superior rendering performance.
- **Glassmorphic Card Hierarchy**: GPU-accelerated backdrop blur (`backdrop-filter: blur(16px)`), subtle semi-transparent surfaces, and crisp 1px borders.
- **High-DPI Canvas 2x PNG Exporter**: Captures live SVG charts and renders them to an off-screen HTML5 `<canvas>` at $2\times$ retina pixel density for publication-quality downloads.
- **RFC-4180 Compliant CSV Exporter**: Generates structured, RFC-4180 compliant CSV files with escaped headers and ISO timestamps.
- **Mulberry32 Deterministic PRNG**: Guarantees identical, reproducible simulated trajectories in Sandbox Mode based on the asset ticker string.
- **Guarded Provenance Badging**: Automatically hides live labels if responses fail, preventing misleading "Live" badges.

---

## 2. Design System Architecture & Token Palette

### 2.1 Color Tokens & Theming (`globals.css`)
FinSight AI implements a curated color palette engineered specifically for financial telemetry:

```css
:root {
  /* Surface & Background Tokens */
  --bg-primary: #080C14;
  --bg-card: rgba(18, 26, 43, 0.75);
  --bg-card-hover: rgba(26, 38, 64, 0.85);
  --border-color: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 255, 255, 0.16);

  /* Financial Semantic Accents */
  --accent-cyan: #00F2FE;        /* Primary telemetry & forecast trajectories */
  --accent-emerald: #10B981;     /* Gains, Max Sharpe, Bullish indicators */
  --accent-rose: #EF4444;        /* Losses, Downside VaR, Bearish indicators */
  --accent-purple: #A855F7;      /* Machine learning, TFT attention, Sandbox */
  --accent-amber: #F59E0B;       /* Neutral hold signals, warnings, cold starts */
  --accent-blue: #3B82F6;        /* Benchmark Buy & Hold indicators */

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}

[data-theme="light"] {
  --bg-primary: #F8FAFC;
  --bg-card: rgba(255, 255, 255, 0.90);
  --bg-card-hover: rgba(241, 245, 249, 0.95);
  --border-color: rgba(0, 0, 0, 0.08);
  --border-hover: rgba(0, 0, 0, 0.16);
  --text-primary: #0F172A;
  --text-secondary: #475569;
}
```

### 2.2 Theme Switching Engine (`ThemeContext.tsx`)
The `ThemeProvider` manages active themes across three states:
- `'dark'`: Default institutional dark trading theme.
- `'light'`: High-contrast day theme for bright environments.
- `'system'`: Automatically mirrors the operating system's `prefers-color-scheme`.

State is synchronized directly with the root DOM:
```typescript
document.documentElement.setAttribute('data-theme', theme);
localStorage.setItem('finsight_theme_preference', theme);
```

---

## 3. High-DPI Chart Exporters & Data Streamers (`chartExport.ts`)

Quantitative analysts require charts for external investment memos, academic reports, and pitch decks. FinSight AI provides native, zero-dependency client-side exporters:

```
[ Interactive SVG Chart ]
           │
     +-----+-----+
     │           │
     ▼           ▼
[ Export PNG ]   [ Export CSV ]
     │                 │
     ▼                 ▼
[ Canvas 2x DPR ]   [ RFC-4180 Parser ]
- Scale: 200%        - Clean Comma Separation
- Font Rendering     - ISO 8601 Timestamps
- Draw Background    - Trigger Blob Download
     │
     ▼
[ Instant .png ]
```

---

### 3.1 High-DPI Canvas 2x PNG Exporter
Direct browser screenshots are constrained to standard 72 or 96 DPI, resulting in blurry text on retina displays. The `exportChartAsPng` function:
1. Serializes the live SVG DOM element into an XML string.
2. Creates an off-screen HTML5 `<canvas>` element.
3. Scales canvas drawing context by $2.0 \times \text{Device Pixel Ratio}$:
   $$\text{Canvas Width} = \text{SVG Width} \times 2, \quad \text{Canvas Height} = \text{SVG Height} \times 2$$
4. Renders the solid card background color to prevent transparent PNG artifacts.
5. Ingests the SVG as an Image Blob and draws it using `ctx.drawImage()`.
6. Triggers automatic download of a crisp $2\times$ high-resolution PNG file.

---

### 3.2 RFC-4180 Compliant CSV Exporter
The `exportChartAsCsv` utility converts time-series objects into compliant CSV streams:
- Handles headers, quote escaping, and trailing commas.
- Supports multi-line data structures (e.g., Date, Actual Price, Forecast, Lower 80%, Upper 80%, Lower 95%, Upper 95%).
- Wraps the formatted string in a `text/csv;charset=utf-8;` Blob and dispatches a temporary anchor click.

---

## 4. Deterministic Mulberry32 Seeded Sandbox (`demoData.ts`)

When operating in Sandbox Mode or when the live API is unreachable, the system uses a **Mulberry32 32-bit Pseudo-Random Number Generator (PRNG)**.

```typescript
function createSeededPrng(seedString: string) {
  let h = 0;
  for (let i = 0; i < seedString.length; i++) {
    h = Math.imul(31, h) + seedString.charCodeAt(i) | 0;
  }
  let a = h >>> 0;
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
```

### Deterministic Guarantees:
- **Seeded by Ticker**: Querying `AAPL` in Sandbox Mode produces an identical, realistic synthetic time series every single time.
- **Canonical Base Prices**: Anchored to real canonical prices (e.g. AAPL \$224.50, NVDA \$118.20, MSFT \$412.80, TSLA \$215.60, RELIANCE \$3,012.40).
- **Realistic Decomposition**: Generates coherent Trend, weekly Seasonality, and holdout backtest metrics without erratic random oscillations.

---

## 5. Provenance Guards & Error Recovery

1. **Guarded ProvenanceBadge**:
   ```typescript
   if (!source && !isDemo) return null;
   ```
   If a data request fails or is missing, the badge hides completely, eliminating false "Live" indicators.
2. **Universal Sandbox Recovery**:
   Every error banner (`Common/ErrorBanner.tsx`) includes a dedicated **"Use Sandbox"** action button. If the backend is spinning up or offline, users can switch with a single click to simulated mode.

---

## 6. Verification & Build Validation
- Executed `npm run build` in `frontend/`:
  - Zero TypeScript compilation errors.
  - 4 of 4 static pages prerendered successfully.
  - Tested on Chrome, Firefox, Safari, and Edge.
