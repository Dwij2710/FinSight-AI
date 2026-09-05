'use client';

import React, { useState, useEffect } from 'react';
import { Cpu, Play, Award, ArrowUpRight, TrendingDown, Target, Zap, ShieldAlert, Info } from 'lucide-react';
import { RlSimulationData } from '../lib/types';
import { simulateRlAgent } from '../lib/api';
import { MultiLineChart } from './Common/Charts';
import { ErrorBanner } from './Common/ErrorBanner';
import { ProvenanceBadge } from './ProvenanceBadge';

export function RlAgentView({ ticker }: { ticker: string }) {
  const [data, setData] = useState<RlSimulationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  // Settings
  const [initialBalance, setInitialBalance] = useState(10000);
  const [algoType, setAlgoType] = useState('PPO');
  const [actionType, setActionType] = useState('Continuous');
  const [riskProfile, setRiskProfile] = useState('Aggressive');

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await simulateRlAgent({
        ticker,
        initial_balance: initialBalance,
        algo_type: algoType,
        action_type: actionType,
        risk_profile: riskProfile
      });
      setData(res.data);
      setIsDemo(Boolean(res.isDemo));
    } catch (err: any) {
      setError(err?.message || 'Reinforcement learning trading simulation failed.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [ticker]);

  // Chart series
  const dates = data?.history.map(h => h.date) || [];
  const agentSeries = data?.history.map(h => h.agent_net_worth) || [];
  const benchSeries = data?.history.map(h => h.benchmark_net_worth) || [];
  const latestPrice = data?.history && data.history.length > 0 ? data.history[data.history.length - 1].price : undefined;
  const alpha = data ? Number((data.profit_pct - data.benchmark_profit_pct).toFixed(1)) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h2 style={{ fontSize: '1.6rem', margin: 0 }}>
              Reinforcement Learning <span className="text-gradient">Trading Agent</span>
            </h2>
            {latestPrice && (
              <span style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                padding: '3px 10px',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                fontWeight: 600
              }}>
                {ticker} ${latestPrice.toFixed(2)}
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Deep RL policy networks (PPO / A2C / DQN) trained in Gymnasium environment to optimize Sharpe and maximize portfolio net worth.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {data && (
            <span className="badge badge-cyan" style={{ padding: '6px 14px' }}>
              <Cpu size={14} /> Engine: {data.engine}
            </span>
          )}
          <ProvenanceBadge
            source={data?.data_source}
            fetchedAt={data?.fetched_at}
            isDemo={isDemo}
          />
        </div>
      </div>

      {error && (
        <ErrorBanner
          title="RL Simulation Pipeline Notice"
          error={error}
          onRetry={runSimulation}
          onDismiss={() => setError(null)}
          suggestedAction="Verify that the ticker has sufficient historical price bars."
        />
      )}

      {/* Quant Metric Cards */}
      {data && (
        <div className="metric-grid">
          <div className="metric-card cyan">
            <div className="metric-label">
              <span>Final Net Worth</span>
              <Award size={16} color="var(--accent-cyan)" />
            </div>
            <div className="metric-value">${data.final_balance.toLocaleString()}</div>
            <div className="metric-subtext">
              Profit: <strong style={{ color: data.profit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                {data.profit >= 0 ? `+$${data.profit.toLocaleString()}` : `-$${Math.abs(data.profit).toLocaleString()}`} ({data.profit_pct > 0 ? `+${data.profit_pct}%` : `${data.profit_pct}%`})
              </strong>
            </div>
          </div>

          <div className="metric-card emerald">
            <div className="metric-label">
              <span>Win Rate</span>
              <Target size={16} color="var(--accent-emerald)" />
            </div>
            <div className="metric-value">{data.win_rate_pct.toFixed(1)}%</div>
            <div className="metric-subtext">{data.total_trades} executed round-trip trades</div>
          </div>

          <div className="metric-card rose">
            <div className="metric-label">
              <span>Max Drawdown</span>
              <TrendingDown size={16} color="var(--accent-rose)" />
            </div>
            <div className="metric-value">{data.max_drawdown_pct.toFixed(1)}%</div>
            <div className="metric-subtext">Worst peak-to-trough drop</div>
          </div>

          <div className="metric-card purple">
            <div className="metric-label">
              <span>Buy & Hold Benchmark</span>
              <ArrowUpRight size={16} color="var(--accent-purple)" />
            </div>
            <div className="metric-value">
              {data.benchmark_profit_pct > 0 ? `+${data.benchmark_profit_pct}%` : `${data.benchmark_profit_pct}%`}
            </div>
            <div className="metric-subtext">
              Alpha: <strong style={{ color: alpha >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>{alpha >= 0 ? `+${alpha}%` : `${alpha}%`}</strong> vs Passive
            </div>
          </div>
        </div>
      )}

      {/* Main Trajectory and Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24, alignItems: 'start' }}>
        {/* Chart Panel */}
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Portfolio Net Worth Trajectory</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Comparing active Deep RL agent execution against passive Buy & Hold.
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ height: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div className="pulse-dot" style={{ width: 14, height: 14, background: 'var(--accent-cyan)' }} />
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Training RL policy agent...</div>
            </div>
          ) : data ? (
            <div>
              <MultiLineChart
                dates={dates}
                height={320}
                series={[
                  { name: `${data.algo_type} Agent Net Worth`, color: '#00F2FE', data: agentSeries, strokeWidth: 2.5 },
                  { name: 'Passive Buy & Hold', color: '#94A3B8', data: benchSeries, dash: true, strokeWidth: 1.5 }
                ]}
              />

              {/* Recent Actions Feed */}
              <div style={{ marginTop: 24, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                <h4 style={{ fontSize: '0.9rem', color: '#F8FAFC', marginBottom: 10 }}>Recent Agent Decision Log</h4>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
                  {data.history.slice(-8).map((h, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        minWidth: 110,
                        fontSize: '0.78rem'
                      }}
                    >
                      <div style={{ color: 'var(--text-muted)' }}>{h.date}</div>
                      <div style={{ fontWeight: 700, color: h.action.includes('Buy') ? 'var(--accent-emerald)' : (h.action.includes('Sell') || h.action.includes('Trim') ? 'var(--accent-rose)' : '#94A3B8'), marginTop: 2 }}>
                        {h.action}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', color: '#F8FAFC', marginTop: 2 }}>${h.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Hyperparameter Controls */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
            RL Architecture & Risk
          </h3>

          <div>
            <label className="input-label">Algorithm Architecture</label>
            <select
              className="input-control"
              value={algoType}
              onChange={e => setAlgoType(e.target.value)}
            >
              <option value="PPO">PPO (Stable & Robust)</option>
              <option value="A2C">A2C (Fast Multi-Sync)</option>
              <option value="DQN">DQN (Deep Q-Network)</option>
            </select>
          </div>

          <div>
            <label className="input-label">Action Space Execution</label>
            <select
              className="input-control"
              value={actionType}
              onChange={e => setActionType(e.target.value)}
            >
              <option value="Continuous">Continuous (Fractional Sizing)</option>
              <option value="Discrete">Discrete (Buy/Sell/Hold)</option>
            </select>
          </div>

          <div>
            <label className="input-label">Risk Appetite Penalty</label>
            <select
              className="input-control"
              value={riskProfile}
              onChange={e => setRiskProfile(e.target.value)}
            >
              <option value="Aggressive">Aggressive (Max Capital Growth)</option>
              <option value="Conservative">Conservative (Penalize Drawdowns)</option>
            </select>
          </div>

          <div>
            <label className="input-label">Starting Capital ($)</label>
            <input
              type="number"
              className="input-control"
              value={initialBalance}
              step="1000"
              onChange={e => setInitialBalance(Number(e.target.value))}
            />
          </div>

          <button
            onClick={runSimulation}
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: 8 }}
          >
            <Play size={16} />
            {loading ? 'Simulating RL Agent...' : 'Train & Simulate Agent'}
          </button>
        </div>
      </div>
    </div>
  );
}
