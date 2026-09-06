# Module 08: Modern Glassmorphic Frontend & High-DPI Exporters

**Module Owner:** UI/UX & Frontend Platform Engineering  
**File Path:** `frontend/src/app/globals.css`, `frontend/src/context/ThemeContext.tsx`, `frontend/src/lib/chartExport.ts`  
**Status:** Production Ready  

---

## 1. Executive Brief (High-Level Summary)

The **FinSight AI Frontend** is a modern, high-performance web interface built with **Next.js 14 (App Router)** and **TypeScript**. Designed to institutional financial standards, it features glassmorphic design tokens, dynamic Dark/Light theming, high-DPI Canvas PNG chart exporters (2x retina scale), RFC-4180 compliant CSV streamers, fluid mobile responsiveness, and a deterministic Mulberry32-seeded offline sandbox.

---

## 2. Design System & CSS Architecture

### 2.1 CSS Custom Properties & Glassmorphism
The design system avoids generic styling in favor of curated HSL tokens:
```css
:root {
  --bg-primary: #080C14;
  --bg-card: rgba(18, 26, 43, 0.75);
  --border-color: rgba(255, 255, 255, 0.08);
  --accent-cyan: #00F2FE;
  --accent-emerald: #10B981;
  --accent-rose: #EF4444;
  --accent-purple: #A855F7;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}

[data-theme="light"] {
  --bg-primary: #F8FAFC;
  --bg-card: rgba(255, 255, 255, 0.90);
  --border-color: rgba(0, 0, 0, 0.08);
  --text-primary: #0F172A;
}
```
Card elements feature hardware-accelerated backdrop blur (`backdrop-filter: blur(16px)`), subtle box shadows, and smooth 200ms cubic-bezier transition curves.

### 2.2 Dynamic Theming Engine (`ThemeContext.tsx`)
- Supports `'dark'`, `'light'`, and `'system'` modes.
- Synchronizes with browser `prefers-color-scheme`.
- Persists user preferences seamlessly in `localStorage`.

---

## 3. High-DPI Chart Exporters & Data Streamers (`chartExport.ts`)

1. **Canvas 2x Retina PNG Exporter**:
   - Serializes the live SVG DOM element of any chart.
   - Creates an off-screen HTML5 `<canvas>` scaled by $2.0 \times$ Device Pixel Ratio.
   - Renders vector elements crisply and triggers direct PNG file download.
2. **RFC-4180 CSV Exporter**:
   - Converts multi-line time series (Date, Actual, Forecast, Upper Bound, Lower Bound) into compliant CSV streams.
   - Correctly handles delimiter escaping and header formatting.

---

## 4. Deterministic Seeded Sandbox (`demoData.ts`)

When offline or in sandbox exploration mode, the application utilizes a 32-bit **Mulberry32 PRNG** seeded by the asset ticker string:
```typescript
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
```
This guarantees 100% deterministic, reproducible simulated data across test runs without erratic random generation.

---

## 5. Provenance & Error Resilience

- **Guarded ProvenanceBadge**: Automatically returns `null` if data failed to load or is empty, preventing false "Live" displays.
- **Universal Sandbox Recovery**: Every error banner contains a single-click "Use Sandbox" button allowing immediate failover to interactive simulated mode.
- **Mobile Responsive Layout**: Fluid CSS media queries across 320px, 640px, 768px, and 1024px viewports with horizontally scrollable tab bars.
