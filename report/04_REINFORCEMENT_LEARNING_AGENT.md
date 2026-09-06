# Module 04: Deep Reinforcement Learning Trading Agent

**Module Owner:** Quantitative Algorithmic Trading  
**File Path:** `backend/app/routes/rl_agent.py` & `frontend/src/components/RlAgentView.tsx`  
**Status:** Production Ready  

---

## 1. Executive Brief (High-Level Summary)

The **Reinforcement Learning Trading Module** trains autonomous policy agents to optimize continuous equity allocation under realistic market constraints. Built on the **Proximal Policy Optimization (PPO)** algorithm and a custom Gymnasium market environment, the agent learns to balance return maximization against drawdown penalties and execution transaction friction.

---

## 2. Markov Decision Process (MDP) Specification

The trading environment is formulated as a discrete-time Markov Decision Process $\langle \mathcal{S}, \mathcal{A}, \mathcal{P}, \mathcal{R}, \gamma \rangle$:

### 2.1 State Space ($\mathcal{S} \in \mathbb{R}^{10}$)
At trading period $t$, the agent observes:
$$s_t = \begin{bmatrix}
r_t & \text{Daily logarithmic return } \ln(P_t / P_{t-1}) \\
\text{SMA}_{10} / P_t - 1 & \text{10-day moving average distance} \\
\text{SMA}_{30} / P_t - 1 & \text{30-day moving average distance} \\
\text{RSI}_{14} / 100 & \text{Normalized Relative Strength Index} \\
\text{MACD}_t / P_t & \text{Normalized MACD signal line} \\
\sigma_{20} & \text{20-day annualized realized volatility} \\
\text{Pos}_{t-1} & \text{Previous allocation fraction } \in [-1, 1] \\
\text{Cash}_t / V_t & \text{Portfolio cash ratio} \\
\Delta \text{Volume}_t & \text{Normalized volume delta} \\
\text{Drawdown}_t & \text{Current drawdown from peak equity}
\end{bmatrix}$$

### 2.2 Action Space ($\mathcal{A}$)
Continuous portfolio allocation action $a_t \in [-1.0, 1.0]$:
- $a_t \in (0, 1.0]$: Long equity target fraction.
- $a_t = 0.0$: 100% Cash / Flat position.
- $a_t \in [-1.0, 0)$: Short equity target fraction.

---

## 3. Reward Function with Realistic Friction

Unlike naive simulations that omit transaction costs, FinSight AI incorporates proportional execution friction ($c = 10\text{ bps} = 0.0010$) and volatility penalization:

$$R_t = \frac{V_t - V_{t-1}}{V_{t-1}} - c \cdot |a_t - a_{t-1}| - \lambda \cdot \sigma_{20, t}^2$$

Where:
- $V_t$: Portfolio net asset value at time $t$.
- $|a_t - a_{t-1}|$: Trading turnover volume between consecutive steps.
- $\lambda$: Risk-aversion penalty coefficient discouraging erratic turnover.

---

## 4. Policy Architecture (PPO Clipped Objective)

The policy network $\pi_\theta(a|s)$ and value network $V_\phi(s)$ are trained using the Clipped Surrogate PPO objective:

$$L^{CLIP}(\theta) = \hat{\mathbb{E}}_t \left[ \min\left( \rho_t(\theta) \hat{A}_t, \, \text{clip}(\rho_t(\theta), 1-\epsilon, 1+\epsilon) \hat{A}_t \right) \right]$$

Where:
- $\rho_t(\theta) = \frac{\pi_\theta(a_t|s_t)}{\pi_{\theta_{\text{old}}}(a_t|s_t)}$: Probability ratio.
- $\hat{A}_t$: Generalized Advantage Estimator (GAE-$\lambda$).
- $\epsilon = 0.2$: Policy clipping threshold.

---

## 5. Performance Metrics & Output

The simulation evaluates:
- **Cumulative Portfolio Return**: $\frac{V_T - V_0}{V_0} \times 100\%$
- **Benchmark Return (Buy & Hold)**: $\frac{P_T - P_0}{P_0} \times 100\%$
- **Sharpe Ratio**: $\frac{\bar{R}_p - R_f}{\sigma_p} \cdot \sqrt{252}$
- **Maximum Drawdown (MDD)**: $\max_{\tau \le t} \frac{\max_{s \le \tau} V_s - V_\tau}{\max_{s \le \tau} V_s}$
- **Win Rate**: Percentage of profitable trading days.

---

## 6. Verification & Unit Tests
Tested in `tests/test_data_integrity.py`:
- `test_rl_agent_simulation_realism`: Confirms non-zero realistic trading activity, valid Sharpe calculation, and portfolio equity series starting at initial capital ($10,000).
