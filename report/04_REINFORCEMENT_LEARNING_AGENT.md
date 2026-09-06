# Module 04: Deep Reinforcement Learning Trading Agent

**Module Identifier:** `MOD-04-RL-AGENT`  
**Core Components:** `backend/app/routes/rl_agent.py`, `backend/app/models/rl_env.py`, `frontend/src/components/RlAgentView.tsx`  
**Quantitative Discipline:** Deep Reinforcement Learning, Algorithmic Execution & Markov Decision Processes (MDP)  
**Production Status:** Production Ready (Verified Live & Seeded Sandbox Modes)  

---

## 1. Executive Brief (High-Level Summary)

The **Reinforcement Learning Trading Agent Module** trains autonomous sequential decision-making policies to optimize portfolio capital allocation over time. Built upon the **Proximal Policy Optimization (PPO)** actor-critic algorithm and a custom Gymnasium-compliant market environment (**FinRL** architecture), the agent learns an optimal continuous allocation strategy balancing capital growth against execution friction (transaction costs) and downside volatility penalties.

### Key Capabilities at a Glance:
- **Continuous Portfolio Action Space**: Unlike naive binary buy/sell models, the agent outputs a continuous target weight $a_t \in [-1.0, 1.0]$ representing dynamic position sizing and cash allocation.
- **Realistic Transaction Friction**: Explicitly penalizes portfolio turnover by deducting realistic brokerage friction ($c = 10\text{ bps} = 0.0010$) on every position change.
- **Sharpe-Adjusted Reward Shaping**: The reward function penalizes portfolio return variance and maximum drawdown, discouraging high-churn gambling behaviors.
- **Actor-Critic Policy Architecture**: Utilizes deep multi-layer perceptron (MLP) networks with Generalized Advantage Estimation ($\text{GAE}-\lambda$) and clipped surrogate loss.
- **Out-of-Sample Performance Analytics**: Compares the trained agent directly against a static Buy & Hold benchmark, reporting Cumulative Return, Sharpe Ratio, Sortino Ratio, and Maximum Drawdown.

---

## 2. Markov Decision Process (MDP) Formalization

The financial trading simulation is formalized as a discrete-time Markov Decision Process defined by the 5-tuple $\langle \mathcal{S}, \mathcal{A}, \mathcal{P}, \mathcal{R}, \gamma \rangle$:

```
                    +---------------------------------------------+
                    │           Agent (Policy Network)            │
                    │        π_θ(a_t | s_t) - Actor / Critic       │
                    +----------------------+----------------------+
                                           │ Action a_t ∈ [-1.0, 1.0]
                                           │ (Target Asset Allocation)
                                           ▼
+-----------------------------------------------------------------------------------+
|                     Gymnasium Market Environment (FinRL)                          |
|  1. Execute Position Rebalance: Δa_t = a_t - a_{t-1}                              |
|  2. Deduct Transaction Cost: Cost_t = c · |Δa_t| · V_t                            |
|  3. Advance Price to P_{t+1} via Historical OHLCV Feed                            |
|  4. Update Portfolio Net Asset Value: V_{t+1} = Cash_{t+1} + Position_{t+1}       |
|  5. Compute Reward: R_t = ΔV/V - Friction - Volatility Penalty                    |
|  6. Construct Next State Observation: s_{t+1} ∈ ℝ^10                              |
+------------------------------------------+----------------------------------------+
                                           │
                                           ▼ State s_{t+1}, Reward R_t
                    +----------------------+----------------------+
                    │           Agent Update (PPO Step)           │
                    │  Maximize L^CLIP(θ) via Generalized GAE     │
                    +---------------------------------------------+
```

---

### 2.1 State Space ($\mathcal{S} \subset \mathbb{R}^{10}$)
At trading bar $t$, the observation vector $\mathbf{s}_t \in \mathbb{R}^{10}$ provides the agent with a normalized representation of price momentum, volatility, trend, and internal portfolio state:

$$\mathbf{s}_t = \begin{bmatrix}
r_t = \ln(P_t / P_{t-1}) & \text{Daily logarithmic asset return} \\
\frac{\text{SMA}_{10}(P)_t}{P_t} - 1 & \text{Normalized 10-day moving average distance} \\
\frac{\text{SMA}_{30}(P)_t}{P_t} - 1 & \text{Normalized 30-day moving average distance} \\
\frac{\text{RSI}_{14}(t)}{100} & \text{14-period Relative Strength Index } \in [0, 1] \\
\frac{\text{MACD}_t}{P_t} & \text{Normalized Moving Average Convergence Divergence} \\
\sigma_{20, t} \cdot \sqrt{252} & \text{Annualized 20-day realized historical volatility} \\
a_{t-1} & \text{Previous allocation target fraction } \in [-1.0, 1.0] \\
\frac{\text{Cash}_t}{V_t} & \text{Current portfolio cash ratio } \in [0.0, 1.0] \\
\frac{\text{Volume}_t}{\text{SMA}_{20}(\text{Volume})_t} - 1 & \text{Volume anomaly ratio} \\
\text{Drawdown}_t = \frac{\max_{\tau \le t} V_\tau - V_t}{\max_{\tau \le t} V_\tau} & \text{Current drawdown from all-time portfolio high}
\end{bmatrix}$$

---

### 2.2 Action Space ($\mathcal{A}$)
The action space is continuous:
$$\mathcal{A} = \{ a_t \in \mathbb{R} \mid -1.0 \le a_t \le 1.0 \}$$

- $a_t > 0$: Long position allocating $a_t \times V_t$ of portfolio capital into the asset.
- $a_t < 0$: Short position allocating $|a_t| \times V_t$ into short equity.
- $a_t = 0$: 100% Risk-free cash preservation.

---

### 2.3 Reward Function with Realistic Friction Penalization
A naive reward of raw returns leads to high-churn, unexecutable trading strategies that collapse under broker commissions. FinSight AI formulates a friction-penalized, risk-adjusted reward:

$$R_t = \underbrace{\frac{V_t - V_{t-1}}{V_{t-1}}}_{\text{Capital Return}} - \underbrace{c \cdot |a_t - a_{t-1}|}_{\text{Turnover Friction}} - \underbrace{\lambda_1 \cdot \sigma_{20, t}^2}_{\text{Variance Penalty}} - \underbrace{\lambda_2 \cdot \max(0, \text{Drawdown}_t - 0.10)}_{\text{Tail Drawdown Penalty}}$$

Where:
- $V_t = \text{Cash}_t + \text{Shares}_t \cdot P_t$ is total portfolio Net Asset Value (NAV).
- $c = 0.0010$ represents 10 basis points of execution slippage and exchange fees.
- $|a_t - a_{t-1}|$ is total portfolio turnover between consecutive days.
- $\lambda_1 = 0.5$ penalizes excess portfolio variance.
- $\lambda_2 = 1.0$ imposes an asymmetric penalty whenever portfolio drawdown exceeds 10%.

---

## 3. Policy Optimization Mechanics (PPO Actor-Critic)

The agent policy is parameterized by an Actor network $\pi_\theta(a|s)$ and a Critic baseline network $V_\phi(s)$.

### 3.1 Generalized Advantage Estimation ($\text{GAE}-\lambda$)
The temporal difference (TD) residual at step $t$ is:
$$\delta_t^V = R_t + \gamma V_\phi(\mathbf{s}_{t+1}) - V_\phi(\mathbf{s}_t)$$

The generalized advantage estimate $\hat{A}_t^{\text{GAE}(\gamma, \lambda)}$ is:
$$\hat{A}_t = \sum_{l=0}^\infty (\gamma \lambda)^l \delta_{t+l}^V$$
Where discount factor $\gamma = 0.99$ and GAE smoothing parameter $\lambda = 0.95$.

### 3.2 Clipped Surrogate Objective
To prevent destabilizing policy updates, PPO clips the probability ratio $\rho_t(\theta) = \frac{\pi_\theta(a_t|\mathbf{s}_t)}{\pi_{\theta_{\text{old}}}(a_t|\mathbf{s}_t)}$:

$$L^{\text{CLIP}}(\theta) = \hat{\mathbb{E}}_t \left[ \min\left( \rho_t(\theta) \hat{A}_t, \, \text{clip}(\rho_t(\theta), 1 - \epsilon, 1 + \epsilon) \hat{A}_t \right) \right]$$

With clipping parameter $\epsilon = 0.20$.

The total joint objective optimized via Adam ($\alpha = 3 \times 10^{-4}$) is:
$$L^{\text{TOTAL}}(\theta, \phi) = L^{\text{CLIP}}(\theta) - c_1 \cdot \left( V_\phi(\mathbf{s}_t) - V_t^{\text{target}} \right)^2 + c_2 \cdot \mathcal{H}\left( \pi_\theta(\cdot \mid \mathbf{s}_t) \right)$$

Where $\mathcal{H}$ is policy entropy encouraging exploration.

---

## 4. Performance Metrics & Comparative Benchmarking

During simulation over the test window ($T$ days), the engine computes:

1. **Cumulative Portfolio Return**:
   $$\text{Return}_{\text{agent}} = \frac{V_T - V_0}{V_0} \times 100\%$$
2. **Buy & Hold Benchmark Return**:
   $$\text{Return}_{\text{bench}} = \frac{P_T - P_0}{P_0} \times 100\%$$
3. **Annualized Sharpe Ratio**:
   $$\text{Sharpe} = \frac{\bar{r}_{\text{daily}} - \frac{R_f}{252}}{\sigma_{\text{daily}}} \cdot \sqrt{252}$$
4. **Sortino Ratio (Downside Risk Adjusted)**:
   $$\text{Sortino} = \frac{\bar{r}_{\text{daily}} - \frac{R_f}{252}}{\sqrt{\frac{1}{T}\sum_{t=1}^T \min(0, r_t)^2}} \cdot \sqrt{252}$$
5. **Maximum Drawdown (MDD)**:
   $$\text{MDD} = \max_{t \in [0, T]} \left( \frac{\max_{\tau \le t} V_\tau - V_t}{\max_{\tau \le t} V_\tau} \right) \times 100\%$$
6. **Win Rate Percentage**:
   $$\text{Win Rate} = \frac{\sum_{t=1}^T \mathbf{1}_{\{ V_t > V_{t-1} \}}}{T} \times 100\%$$

---

## 5. API Specification

### Endpoint: `POST /api/rl/simulate`

**Request Body:**
```json
{
  "ticker": "TSLA",
  "initial_capital": 10000.0,
  "transaction_cost_bps": 10.0,
  "lookback_window": 252,
  "episodes": 50
}
```

**Response Payload (200 OK):**
```json
{
  "ticker": "TSLA",
  "engine": "PPO-FinRL-Continuous",
  "initial_capital": 10000.0,
  "final_capital": 13420.50,
  "total_return_pct": 34.21,
  "benchmark_return_pct": 18.50,
  "sharpe_ratio": 1.68,
  "sortino_ratio": 2.14,
  "max_drawdown_pct": 12.80,
  "win_rate_pct": 58.4,
  "history": [
    {
      "date": "2026-08-31",
      "portfolio_value": 13350.20,
      "benchmark_value": 11820.00,
      "action": 0.85,
      "position": "LONG",
      "cash": 2002.53
    },
    {
      "date": "2026-09-01",
      "portfolio_value": 13420.50,
      "benchmark_value": 11850.00,
      "action": 0.60,
      "position": "LONG",
      "cash": 5368.20
    }
  ],
  "data_source": "live",
  "fetched_at": "2026-09-06T15:30:00.000Z"
}
```

---

## 6. Verification & Automated Test Suite

Tested in `tests/test_data_integrity.py`:
- `test_rl_agent_simulation_realism`:
  - Confirms non-zero realistic trading behavior (actions fluctuate between long, neutral, and short).
  - Asserts that initial portfolio value exactly matches `initial_capital` ($10,000.00).
  - Asserts that Sharpe ratio calculation handles zero variance without division by zero errors.
- **Pass Rate**: 100% verified.
