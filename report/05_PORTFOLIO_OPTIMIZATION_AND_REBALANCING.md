# Module 05: Modern Portfolio Theory & Staged Rebalancing

**Module Identifier:** `MOD-05-QUANT-PORTFOLIO`  
**Core Components:** `backend/app/routes/portfolio.py`, `frontend/src/components/PortfolioView.tsx`, `frontend/src/components/RebalanceModal.tsx`  
**Quantitative Discipline:** Convex Optimization, Modern Portfolio Theory (MPT) & Order Sizing  
**Production Status:** Production Ready (Verified Live & Seeded Sandbox Modes)  

---

## 1. Executive Brief (High-Level Summary)

The **Portfolio Optimization & Rebalancing Module** provides institutional-grade asset allocation, risk attribution, historical scenario stress testing, and actionable order staging. Moving beyond theoretical percentage weights, the module translates mathematical Markowitz frontiers and Equal Risk Parity allocations into discrete, share-level rebalance orders formatted for one-click execution.

### Key Capabilities at a Glance:
- **Convex Portfolio Solvers**: Computes Maximum Sharpe Ratio (Tangency Portfolio), Minimum Volatility (Global Minimum Variance), and Equal Risk Parity (ERP) allocations via SLSQP optimization.
- **Adaptive Weight Normalization**: Enforces strict mathematical weight constraints ($\sum w_i = 1.00$ or $100.0\%$), eliminating double-scaling bugs.
- **Actionable Staged Rebalancing Engine**: Translates weight deltas into discrete `BUY`, `SELL`, or `HOLD` share tickets based on user-defined total capital ($V$) and live quotes.
- **Dynamic Stress Testing**: Simulates immediate portfolio drawdown against historical liquidity shocks (2008 Subprime Crash, 2020 COVID Liquidity Crisis, 2022 Fed Rate Hike Drawdown).
- **Universal Export**: Allows one-click export of rebalance execution schedules to CSV and clipboard, accompanied by prominent non-custodial financial disclaimers.

---

## 2. Complete Mathematical Foundations & Optimizers

Given an investment universe of $N$ assets with annualized expected return vector $\mathbf{\mu} \in \mathbb{R}^N$ and annualized covariance matrix $\mathbf{\Sigma} \in \mathbb{R}^{N \times N}$, the portfolio return $R_p$ and portfolio variance $\sigma_p^2$ are defined as:

$$R_p = \mathbf{w}^T \mathbf{\mu} = \sum_{i=1}^N w_i \mu_i$$
$$\sigma_p^2 = \mathbf{w}^T \mathbf{\Sigma} \mathbf{w} = \sum_{i=1}^N \sum_{j=1}^N w_i w_j \sigma_{ij}$$

Subject to institutional long-only and budget constraints:
$$\sum_{i=1}^N w_i = 1.0, \quad w_i \ge 0 \quad \forall i \in \{1, \dots, N\}$$

---

### 2.1 Maximum Sharpe Ratio Portfolio (Tangency Portfolio)
The tangency portfolio maximizes excess return per unit of volatility relative to risk-free rate $R_f = 4.0\%$:

$$\max_{\mathbf{w}} \text{SR}(\mathbf{w}) = \frac{\mathbf{w}^T \mathbf{\mu} - R_f}{\sqrt{\mathbf{w}^T \mathbf{\Sigma} \mathbf{w}}}$$

The objective is transformed into an equivalent quadratic program via the Stutzer-Sharpe substitution:
$$\min_{\mathbf{y}} \mathbf{y}^T \mathbf{\Sigma} \mathbf{y} \quad \text{subject to} \quad (\mathbf{\mu} - R_f \mathbf{1})^T \mathbf{y} = 1, \quad y_i \ge 0$$
Where optimal weights are recovered as: $\mathbf{w}^* = \frac{\mathbf{y}^*}{\mathbf{1}^T \mathbf{y}^*}$.

Solved using **Sequential Least Squares Programming (SLSQP)** with tolerance $\epsilon = 10^{-7}$.

---

### 2.2 Global Minimum Volatility Portfolio (Min Vol)
Solves the pure risk minimization problem on the efficient frontier:

$$\min_{\mathbf{w}} \frac{1}{2} \mathbf{w}^T \mathbf{\Sigma} \mathbf{w} \quad \text{subject to} \quad \mathbf{w}^T \mathbf{1} = 1, \quad w_i \ge 0$$

Using Lagrangian formulation:
$$\mathcal{L}(\mathbf{w}, \lambda) = \frac{1}{2} \mathbf{w}^T \mathbf{\Sigma} \mathbf{w} - \lambda (\mathbf{w}^T \mathbf{1} - 1)$$
Setting first-order conditions $\nabla_{\mathbf{w}} \mathcal{L} = \mathbf{\Sigma} \mathbf{w} - \lambda \mathbf{1} = 0$, the analytical unconstrained solution is:
$$\mathbf{w}_{\text{min\_vol}} = \frac{\mathbf{\Sigma}^{-1} \mathbf{1}}{\mathbf{1}^T \mathbf{\Sigma}^{-1} \mathbf{1}}$$
The SLSQP solver enforces the non-negative constraint $w_i \ge 0$.

---

### 2.3 Equal Risk Parity (ERP) Formulation
Rather than allocating capital equally ($w_i = 1/N$), Risk Parity ensures that **each asset contributes identically to total portfolio volatility risk**.

The marginal risk contribution ($\text{MRC}_i$) and total risk contribution ($\text{RC}_i$) of asset $i$ are:
$$\text{MRC}_i = \frac{\partial \sigma_p}{\partial w_i} = \frac{(\mathbf{\Sigma} \mathbf{w})_i}{\sigma_p}$$
$$\text{RC}_i = w_i \cdot \text{MRC}_i = w_i \frac{(\mathbf{\Sigma} \mathbf{w})_i}{\sigma_p}$$

By Euler's homogeneous function theorem, $\sum_{i=1}^N \text{RC}_i = \sigma_p$. The Equal Risk Parity objective solves:
$$\min_{\mathbf{w}} \sum_{i=1}^N \sum_{j=1}^N \left( w_i (\mathbf{\Sigma} \mathbf{w})_i - w_j (\mathbf{\Sigma} \mathbf{w})_j \right)^2 \quad \text{s.t.} \quad \mathbf{w}^T \mathbf{1} = 1, \; w_i \ge 0$$

---

### 2.4 Monte Carlo Efficient Frontier Simulation
To visualize the concave opportunity set, the engine draws $M = 2,500$ random weight vectors $\mathbf{w}_k$ from a flat **Dirichlet distribution**:
$$\mathbf{w}_k \sim \text{Dirichlet}(\mathbf{\alpha} = \mathbf{1}_N)$$
This guarantees that each simulated portfolio satisfies $\sum w_i = 1$ and $w_i \ge 0$, plotting expected return vs. annual volatility to illustrate the Efficient Frontier curve.

---

## 3. Staged Rebalance Order Execution Engine

When a quantitative portfolio is optimized, the user must transition their current portfolio holdings $\mathbf{w}^{\text{current}}$ to target weights $\mathbf{w}^{\text{target}}$.

```
[ User Capital Input: V = $10,000 ]  ──┐
                                       ├─► [ Staged Rebalance Engine ]
[ Live Market Quotes: P_i via Feed ]  ─┤   ├─ Capital Delta: ΔC_i = V · (w_i^target - w_i^curr)
                                       │   ├─ Share Delta: ΔS_i = ⌊ΔC_i / P_i⌋
[ Target Weights: w_i^target (MPT) ] ──┘   ├─ Action Classification: BUY / SELL / HOLD
                                           └─ Rebalance Urgency Score Calculation
                                                       │
                                                       ▼
                                        [ Institutional Order Ticket ]
                                        - Ticker, Action, Shares, Est. Cost
                                        - One-Click Clipboard / CSV Export
```

### 3.1 Mathematical Order Sizing
Given total portfolio capital $V$, current live asset price $P_i$, current allocation $w_i^{\text{current}}$, and target allocation $w_i^{\text{target}}$:

1. **Capital Delta**:
   $$\Delta \text{Capital}_i = V \cdot \left( w_i^{\text{target}} - w_i^{\text{current}} \right)$$
2. **Discrete Share Delta**:
   $$\Delta \text{Shares}_i = \begin{cases}
   \left\lfloor \frac{\Delta \text{Capital}_i}{P_i} \right\rfloor & \text{if } \Delta \text{Capital}_i > 0 \quad (\text{BUY}) \\
   -\left\lfloor \frac{|\Delta \text{Capital}_i|}{P_i} \right\rfloor & \text{if } \Delta \text{Capital}_i < 0 \quad (\text{SELL}) \\
   0 & \text{if } |\Delta \text{Capital}_i| < P_i \quad (\text{HOLD})
   \end{cases}$$
3. **Execution Capital**:
   $$\text{Estimated Trade Value}_i = |\Delta \text{Shares}_i| \cdot P_i$$

### 3.2 Rebalance Urgency Score
Quantifies the drift between current portfolio structure and the optimal frontier:
$$\text{Urgency Score} = \frac{1}{2} \sum_{i=1}^N |w_i^{\text{target}} - w_i^{\text{current}}| \times 100\%$$
- $\text{Urgency} \le 5\%$: **Low Drift** (Portfolio is well-aligned; rebalance may not be worth transaction costs).
- $5\% < \text{Urgency} \le 20\%$: **Moderate Drift** (Standard quarterly rebalancing recommended).
- $\text{Urgency} > 20\%$: **High Drift** (Urgent rebalancing required to mitigate unhedged factor risks).

---

## 4. Dynamic Historical Stress Testing

The engine evaluates how the optimized portfolio would have performed during major historical market crashes:

1. **2008 Global Financial Crisis (Subprime Crash)**: $-48.5\%$ benchmark market collapse.
2. **2020 COVID-19 Liquidity Shock**: $-34.1\%$ rapid 30-day liquidity drawdown.
3. **2022 Tech Duration Shock**: $-28.2\%$ rate-hiking multiple contraction.

The estimated simulated portfolio drawdown $\text{DD}_p^{\text{scenario}}$ is conditioned by the portfolio's weighted systematic beta $\beta_p$:
$$\beta_p = \sum_{i=1}^N w_i \beta_i, \quad \text{where } \beta_i = \frac{\text{Cov}(r_i, r_{\text{SPY}})}{\text{Var}(r_{\text{SPY}})}$$
$$\text{Estimated Shock Drawdown} = \beta_p \cdot \text{Shock}_{\text{market}} \cdot \left( 1 - 0.2 \cdot \text{Diversification Ratio} \right)$$

---

## 5. API Specification

### Endpoint: `POST /api/portfolio/optimize`

**Request Body:**
```json
{
  "tickers": ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"],
  "period": "2y",
  "risk_free_rate": 0.04,
  "current_weights": [0.20, 0.20, 0.20, 0.20, 0.20]
}
```

**Response Payload (200 OK):**
```json
{
  "tickers": ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"],
  "max_sharpe": {
    "weights": [0.325, 0.281, 0.142, 0.052, 0.200],
    "expected_return": 0.245,
    "volatility": 0.182,
    "sharpe_ratio": 1.126
  },
  "min_volatility": {
    "weights": [0.240, 0.350, 0.210, 0.120, 0.080],
    "expected_return": 0.182,
    "volatility": 0.148,
    "sharpe_ratio": 0.959
  },
  "risk_parity": {
    "weights": [0.210, 0.250, 0.200, 0.180, 0.160],
    "volatility": 0.156
  },
  "correlation_matrix": [
    [1.00, 0.72, 0.65, 0.58, 0.68],
    [0.72, 1.00, 0.70, 0.62, 0.64]
  ],
  "stress_tests": {
    "2008_gfc": -42.8,
    "2020_covid": -31.2,
    "2022_rates": -24.5
  },
  "data_source": "live",
  "fetched_at": "2026-09-06T15:30:00.000Z"
}
```

---

## 6. Verification & Automated Test Suite

Tested in `tests/test_quant_math.py`:
- `test_max_sharpe_weights_sum_to_one`: Asserts $\sum w_i = 1.00 \pm 10^{-5}$.
- `test_min_volatility_weights_sum_to_one`: Asserts non-negativity and budget equality.
- `test_risk_parity_weights_sum_to_one`: Validates convergence of risk parity solver.
- `test_sharpe_ratio_with_risk_free_rate`: Validates Sharpe formula with custom risk-free rates.
- `test_divergent_weights_high_urgency`: Asserts high urgency score under substantial allocation drift.
- `test_stress_test_differs_by_basket`: Confirms dynamic scenario responsiveness.
- **Pass Rate**: 100% verified.
