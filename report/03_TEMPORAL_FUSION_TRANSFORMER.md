# Module 03: Temporal Fusion Transformer & Macro Factor Attention

**Module Owner:** Quantitative Machine Learning  
**File Path:** `backend/app/routes/tft.py` & `frontend/src/components/TftView.tsx`  
**Status:** Production Ready  

---

## 1. Executive Brief (High-Level Summary)

The **TFT Macro Attention Module** models asset returns through the lens of macroeconomic regimes and multi-asset cross-correlations. Utilizing deep self-attention principles from the Temporal Fusion Transformer (TFT) architecture, the module evaluates how systemic market drivers—Treasury yields, currency strength, energy commodities, and broad market volatility—influence individual equity price dynamics.

---

## 2. Macro Factor Basket

FinSight AI models five exogenous macroeconomic pillars:
1. **10-Year US Treasury Yield (`^TNX`)**: Risk-free benchmark and discount rate proxy.
2. **CBOE Volatility Index (`^VIX`)**: Implied volatility and market fear index.
3. **US Dollar Index (`DX-Y.NYB`)**: Global liquidity and foreign exchange strength.
4. **WTI Crude Oil Futures (`CL=F`)**: Energy cost and supply-side inflation pressure.
5. **S&P 500 ETF (`SPY`)**: Broad equity beta and institutional capital flows.

---

## 3. Mathematical Attention Mechanism

### 3.1 Scaled Dot-Product Factor Attention
The cross-attention weight $\alpha_i$ assigned to macro driver $i \in \{1, \dots, M\}$ is calculated as:
$$\alpha_i = \text{Softmax}\left( \frac{\mathbf{q} \mathbf{k}_i^T}{\sqrt{d_k}} \right) = \frac{\exp\left( \frac{\mathbf{q} \cdot \mathbf{k}_i}{\sqrt{d_k}} \right)}{\sum_{j=1}^M \exp\left( \frac{\mathbf{q} \cdot \mathbf{k}_j}{\sqrt{d_k}} \right)}$$

Where:
- $\mathbf{q} \in \mathbb{R}^{d_k}$: Latent representation of the target equity's recent price action.
- $\mathbf{k}_i \in \mathbb{R}^{d_k}$: Temporal feature vector of macro factor $i$.
- $\sqrt{d_k}$: Scaling factor mitigating vanishing gradients in high-dimensional attention spaces.

### 3.2 Attention Normalization Guarantee
The module strictly guarantees that all factor attention weights sum to $100\%$:
$$\sum_{i=1}^M \alpha_i = 1.00 \quad (100.0\%)$$

---

## 4. Multi-Horizon Quantile Output

Rather than generating point forecasts, the TFT network predicts multi-horizon return quantiles:
- **10th Percentile ($q_{0.10}$)**: Severe downside tail-risk scenario.
- **50th Percentile ($q_{0.50}$)**: Median expected trajectory.
- **90th Percentile ($q_{0.90}$)**: Bullish breakout expansion scenario.

The quantile loss (pinball loss) is defined as:
$$\mathcal{L}_q(y, \hat{y}) = \max\left( q(y - \hat{y}), \, (1 - q)(\hat{y} - y) \right)$$

---

## 5. API Specification

`GET /api/tft/analyze/{ticker}`
- **Response**:
  ```json
  {
    "ticker": "AAPL",
    "attention_weights": [
      { "factor": "10Y Treasury Yield (^TNX)", "weight_pct": 34.5 },
      { "factor": "S&P 500 Market Beta (SPY)", "weight_pct": 28.2 },
      { "factor": "CBOE Volatility (^VIX)", "weight_pct": 18.3 },
      { "factor": "US Dollar Index (DXY)", "weight_pct": 12.0 },
      { "factor": "Crude Oil (CL=F)", "weight_pct": 7.0 }
    ],
    "predicted_quantiles": { "q10": 218.40, "q50": 226.10, "q90": 234.80 },
    "regime": "Rate-Sensitive Bullish",
    "data_source": "live",
    "fetched_at": "2026-09-06T15:20:00.000Z"
  }
  ```

---

## 6. Verification & Unit Tests
Tested in `tests/test_data_integrity.py`:
- `test_tft_multivariate_regime_authenticity`: Verifies that macro factor weights sum to 100% and dynamic weights shift appropriately based on asset beta.
