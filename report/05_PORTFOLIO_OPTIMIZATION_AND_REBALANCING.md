# Module 05: Modern Portfolio Theory & Staged Rebalancing

**Module Owner:** Quantitative Portfolio Management  
**File Path:** `backend/app/routes/portfolio.py`, `frontend/src/components/PortfolioView.tsx`, `frontend/src/components/RebalanceModal.tsx`  
**Status:** Production Ready  

---

## 1. Executive Brief (High-Level Summary)

The **Portfolio Optimization Module** provides institutional Markowitz Mean-Variance allocation, Hierarchical / Equal Risk Parity, Monte Carlo simulation frontiers, dynamic macro stress testing, and actionable staged rebalancing order generation. The module transforms theoretical mathematical weights into discrete, share-level execution tickets with risk-controlled capital staging.

---

## 2. Mathematical Optimization Models

Given expected return vector $\mathbf{\mu} \in \mathbb{R}^N$ and asset covariance matrix $\mathbf{\Sigma} \in \mathbb{R}^{N \times N}$, portfolio return and volatility are defined as:
$$R_p = \mathbf{w}^T \mathbf{\mu}, \quad \sigma_p = \sqrt{\mathbf{w}^T \mathbf{\Sigma} \mathbf{w}}$$

Subject to standard institutional constraints:
$$\sum_{i=1}^N w_i = 1, \quad 0 \le w_i \le 1 \quad \forall i$$

### 2.1 Maximum Sharpe Ratio Portfolio (Tangency Portfolio)
Maximizes excess return per unit of total risk with risk-free rate $R_f = 4.0\%$:
$$\max_{\mathbf{w}} \frac{\mathbf{w}^T \mathbf{\mu} - R_f}{\sqrt{\mathbf{w}^T \mathbf{\Sigma} \mathbf{w}}}$$
Solved via Sequential Least Squares Programming (SLSQP).

### 2.2 Minimum Volatility Portfolio (Global Minimum Variance)
Solves the unconstrained risk minimization frontier:
$$\min_{\mathbf{w}} \mathbf{w}^T \mathbf{\Sigma} \mathbf{w}$$

### 2.3 Equal Risk Parity (ERP)
Ensures every asset contributes equally to total portfolio volatility risk:
$$\text{RC}_i = w_i \frac{(\mathbf{\Sigma} \mathbf{w})_i}{\sigma_p} = \frac{\sigma_p}{N} \quad \forall i$$

---

## 3. Staged Rebalance Order Execution Engine

When an investor applies an optimal portfolio model to an existing holding, the system generates discrete trade instructions:

### 3.1 Mathematical Order Calculation
Given total portfolio equity $V$, current asset price $P_i$, current weight $w_i^{\text{current}}$, and target weight $w_i^{\text{target}}$:
$$\Delta \text{Capital}_i = V \cdot (w_i^{\text{target}} - w_i^{\text{current}})$$
$$\Delta \text{Shares}_i = \left\lfloor \frac{\Delta \text{Capital}_i}{P_i} \right\rfloor$$

### 3.2 Action Classification
- $\Delta \text{Shares}_i > 0$: **BUY** order ticket.
- $\Delta \text{Shares}_i < 0$: **SELL** order ticket.
- $\Delta \text{Shares}_i = 0$: **HOLD** ticket.

### 3.3 Rebalance Urgency Index
Quantifies the drift between current holdings and the optimal target:
$$\text{Urgency Score} = \frac{1}{2} \sum_{i=1}^N |w_i^{\text{target}} - w_i^{\text{current}}| \times 100\%$$
- $0\%$: Portfolio is perfectly balanced.
- $>25\%$: High urgency; severe allocation drift detected.

---

## 4. Dynamic Historical Stress Testing

Simulates instantaneous drawdown across historical liquidity crisis scenarios:
1. **2008 Global Financial Crisis (Subprime Crash)**: $-48.5\%$ market shock.
2. **2020 COVID-19 Liquidity Shock**: $-34.1\%$ rapid liquidity contraction.
3. **2022 Tech Rate Hike Drawdown**: $-28.2\%$ duration repricing shock.

Asset basket betas condition individual asset drawdowns, ensuring realistic portfolio-level divergence.

---

## 5. Verification & Unit Tests
Tested in `tests/test_quant_math.py`:
- `test_max_sharpe_weights_sum_to_one`: Asserts $\sum w_i = 1.00 \pm 10^{-5}$.
- `test_min_volatility_weights_sum_to_one`: Validates non-negative weights summing to unity.
- `test_risk_parity_weights_sum_to_one`: Asserts convergence of risk parity solver.
- `test_divergent_weights_high_urgency`: Validates urgency score calculation under allocation drift.
- `test_stress_test_differs_by_basket`: Confirms dynamic scenario responsiveness.
