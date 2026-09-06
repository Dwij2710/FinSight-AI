# Module 03: Temporal Fusion Transformer & Macro Factor Attention

**Module Identifier:** `MOD-03-DEEP-TFT`  
**Core Components:** `backend/app/routes/tft.py`, `frontend/src/components/TftView.tsx`, `frontend/src/components/Common/Charts.tsx`  
**Quantitative Discipline:** Deep Attention Mechanisms, Multi-Horizon Forecasting & Macroeconomic Cross-Asset Modeling  
**Production Status:** Production Ready (Verified Live & Seeded Sandbox Modes)  

---

## 1. Executive Brief (High-Level Summary)

Modern financial asset prices do not evolve in isolation; they are deeply coupled to monetary policy, systemic risk appetites, commodity cycles, and global currency liquidity. The **Temporal Fusion Transformer (TFT) Module** introduces multi-asset cross-attention modeling into FinSight AI. Inspired by Google Cloud Research's TFT architecture (Lim et al., 2021), this module models how key macroeconomic drivers condition individual equity returns and generates multi-horizon probabilistic return quantiles ($q_{0.10}, q_{0.50}, q_{0.90}$) rather than deterministic point estimates.

### Key Capabilities at a Glance:
- **Macro Factor Cross-Attention**: Calculates dynamic attention weights for five key systemic drivers: 10Y US Treasury Yield, CBOE Volatility Index, US Dollar Index, Crude Oil Futures, and S&P 500 Beta.
- **Strict 100% Weight Normalization**: All factor attention weights sum strictly to $100.0\%$, providing clean, interpretable factor attribution.
- **Probabilistic Quantile Forecasts**: Generates 10th percentile (tail-risk downside), 50th percentile (median projection), and 90th percentile (bullish breakout) trajectories.
- **Regime Identification**: Classifies the prevailing macroeconomic environment (e.g., "Rate-Sensitive Inflationary", "Flight to Quality / Risk-Off", "Liquidity Expansion Bull").
- **Universal Export**: Interactive chart toolbar supporting high-DPI Canvas PNG export and RFC-4180 CSV download.

---

## 2. Macroeconomic Factor Basket & Economic Rationale

The module continuously samples five benchmark macroeconomic series:

| Symbol | Macroeconomic Driver | Economic Transmission Mechanism to Equities |
| :--- | :--- | :--- |
| **`^TNX`** | **10-Year US Treasury Yield** | Benchmark risk-free discount rate. Rising yields compress equity valuation multiples (particularly long-duration growth and tech stocks) by increasing the discount denominator in discounted cash flow (DCF) models: $P_0 = \sum \frac{CF_t}{(1 + r)^t}$. |
| **`^VIX`** | **CBOE Volatility Index** | Market-wide implied volatility of S&P 500 options ("fear gauge"). Elevated VIX indicates institutional hedging demand, rising equity risk premia, and liquidity contraction. |
| **`DX-Y.NYB`** | **US Dollar Index (DXY)** | Measures greenback strength against a basket of 6 major currencies. A surging dollar exerts foreign-exchange translation drag on multinational revenues and tightens dollar-denominated global credit. |
| **`CL=F`** | **WTI Crude Oil Futures** | Key proxy for supply-side energy input costs and breakeven inflation expectations. Rising oil pressures operating margins for non-energy sectors and fuels central bank hawkishness. |
| **`SPY`** | **S&P 500 ETF Trust** | Broad equity market beta proxy capturing systematic market risk and institutional index capital flows. |

---

## 3. Mathematical Foundations & Attention Architecture

```
[ Target Asset Time Series ]         [ Macro Factor Basket (^TNX, ^VIX, DXY, CL=F, SPY) ]
             │                                              │
             ▼                                              ▼
   [ LSTM / Temporal Embedder ]                 [ Variable Selection Network (VSN) ]
             │                                              │
             ▼                                              ▼
   [ Query Vector: q ∈ ℝ^d ]                   [ Key / Value Matrix: K, V ∈ ℝ^(M × d) ]
             │                                              │
             +----------------------+-----------------------+
                                    │
                                    ▼
                     [ Scaled Dot-Product Attention ]
                       α_i = Softmax( (q · k_i) / √d )
                                    │
                                    ▼
                [ Macro Factor Attention Weights (∑ α_i = 100%) ]
                                    │
                                    ▼
                     [ Multi-Horizon Quantile Decoder ]
                        q_10, q_50, q_90 Pinball Loss
```

---

### 3.1 Gated Residual Networks (GRN) & Variable Selection
To filter out noisy macro factors during quiet market regimes, input vectors pass through a **Gated Residual Network (GRN)**:

$$\text{GRN}(\mathbf{x}) = \text{LayerNorm}\left( \mathbf{x} + \text{GLU}(\mathbf{W}_1 \mathbf{x} + \mathbf{b}_1) \right)$$

Where $\text{GLU}$ is the Gated Linear Unit with element-wise gating:
$$\text{GLU}(\mathbf{z}) = \sigma(\mathbf{W}_2 \mathbf{z} + \mathbf{b}_2) \odot (\mathbf{W}_3 \mathbf{z} + \mathbf{b}_3)$$

The **Variable Selection Network (VSN)** computes softmax factor routing weights $v_j$:
$$\mathbf{v} = \text{Softmax}\left( \text{GRN}_{v}(\mathbf{\xi}) \right)$$
Generating a refined, noise-filtered macro representation: $\tilde{\mathbf{x}} = \sum_{j=1}^M v_j \tilde{\mathbf{x}}_j$.

---

### 3.2 Scaled Dot-Product Factor Attention
The interaction between the target asset's internal price momentum and external macro drivers is modeled via multi-head attention:

$$\mathbf{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \text{Softmax}\left( \frac{\mathbf{Q} \mathbf{K}^T}{\sqrt{d_k}} \right) \mathbf{V}$$

For query vector $\mathbf{q} \in \mathbb{R}^{d_k}$ (derived from the target stock's recent returns) and factor keys $\mathbf{k}_i \in \mathbb{R}^{d_k}$ ($i \in \{1, \dots, M\}$):

$$\alpha_i = \frac{\exp\left( \frac{\mathbf{q} \cdot \mathbf{k}_i}{\sqrt{d_k}} \right)}{\sum_{j=1}^M \exp\left( \frac{\mathbf{q} \cdot \mathbf{k}_j}{\sqrt{d_k}} \right)}$$

**Mathematical Weight Normalization Guarantee:**
$$\sum_{i=1}^M \alpha_i = 1.00 \quad \implies \quad \sum_{i=1}^M (\alpha_i \times 100\%) = 100.0\%$$

---

### 3.3 Multi-Horizon Quantile Loss (Pinball Loss)
Rather than producing a single point forecast, the decoder outputs parametric quantiles $\mathcal{Q} = \{0.10, 0.50, 0.90\}$ to capture tail asymmetries:
- $q_{0.10}$: **Bearish Downside Tail** (Value-at-Risk floor).
- $q_{0.50}$: **Median Trajectory** (Central expectation).
- $q_{0.90}$: **Bullish Breakout Expansion** (Upside resistance boundary).

The model is trained by minimizing the summed quantile loss:

$$\mathcal{L}_{\text{TFT}}(\mathbf{y}, \hat{\mathbf{y}}) = \sum_{t=1}^T \sum_{q \in \mathcal{Q}} \frac{\rho_q(y_t - \hat{y}_t^{(q)})}{T}$$

Where the pinball loss function $\rho_q(u)$ is defined as:
$$\rho_q(u) = u \cdot (q - \mathbf{1}_{\{u < 0\}}) = \max(q \cdot u, \, (q - 1) \cdot u)$$

---

## 4. API Specification

### Endpoint: `GET /api/tft/analyze/{ticker}`

**Query Parameters:**
- `ticker` (path, string, required): Asset ticker symbol (e.g. `AAPL`, `NVDA`, `TCS.NS`).

**Response Payload (200 OK):**
```json
{
  "ticker": "AAPL",
  "attention_weights": [
    {
      "factor": "10Y Treasury Yield (^TNX)",
      "weight_pct": 34.2,
      "annotation": "Rates & Discount Multiples"
    },
    {
      "factor": "S&P 500 Market Beta (SPY)",
      "weight_pct": 28.5,
      "annotation": "Equity Market Capital Flows"
    },
    {
      "factor": "CBOE Volatility (^VIX)",
      "weight_pct": 18.1,
      "annotation": "Risk Appetite & Hedging Demand"
    },
    {
      "factor": "US Dollar Index (DXY)",
      "weight_pct": 12.4,
      "annotation": "Currency Valuation & FX Drag"
    },
    {
      "factor": "Crude Oil (CL=F)",
      "weight_pct": 6.8,
      "annotation": "Commodity Input & Inflation"
    }
  ],
  "predicted_quantiles": {
    "dates": ["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"],
    "q10": [220.10, 218.40, 217.20, 216.50],
    "q50": [224.80, 226.20, 227.80, 229.40],
    "q90": [228.50, 232.10, 235.80, 239.20]
  },
  "macro_regime": "Rate-Sensitive Expansion",
  "regime_confidence": 0.84,
  "data_source": "live",
  "fetched_at": "2026-09-06T15:30:00.000Z"
}
```

---

## 5. Frontend Visual Presentation & UX

1. **Macro Driver Breakdown (`AllocationBars`)**:
   - Visualizes each macro factor with dedicated color coding (Cyan, Emerald, Purple, Amber, Pink).
   - Renders animated progress bars reflecting the exact percentage attention allocation.
2. **Quantile Forecast Cone (`MultiLineChart`)**:
   - Displays the historical price line transitioning into the multi-horizon quantile cone ($q_{0.10}, q_{0.50}, q_{0.90}$).
   - Shaded quantile region provides an immediate visual depiction of forecast volatility dispersion.
3. **Macro Regime Indicator**:
   - Outlines whether the current asset is trading primarily as an interest-rate proxy, volatility hedge, or beta multiplier.
4. **Sandbox Failover**:
   - If the macro data feed is temporarily offline, the error banner displays `"Ensure the backend service is running, or switch to Sandbox Mode"` with a single-click fallback to the deterministic Mulberry32 sandbox.

---

## 6. Verification & Automated Test Suite

Tested in `tests/test_data_integrity.py`:
- `test_tft_multivariate_regime_authenticity`:
  - Asserts all 5 macro factors are returned in `attention_weights`.
  - Asserts $\sum \text{weight\_pct} = 100.0\% \pm 0.1\%$.
  - Confirms dynamic attention shifting based on asset beta (e.g., Tech stocks show higher ^TNX sensitivity than Utilities).
- **Pass Rate**: 100% verified.
