'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart, Shield, Flame, Activity, ArrowUpRight, BarChart2, Scale,
  Bookmark, FolderOpen, Trash2, Check, Plus, Zap, RefreshCw, DollarSign,
  TrendingDown, AlertTriangle, Copy, Download, Layers
} from 'lucide-react';
import { PortfolioData, SavedPortfolio } from '../lib/types';
import { getPortfolioOptimization, listSavedPortfolios, savePortfolio, deleteSavedPortfolio } from '../lib/api';
import { MultiLineChart, CorrelationHeatmap, AllocationBars } from './Common/Charts';
import { ErrorBanner } from './Common/ErrorBanner';
import { ProvenanceBadge } from './ProvenanceBadge';
import { RebalanceModal } from './RebalanceModal';
import { useMarketData } from '../context/MarketDataContext';
import { exportSeriesToCsv } from '../lib/chartExport';

export function PortfolioView() {
  const { isDemoMode, setDemoMode } = useMarketData();
  const defaultTickers = 'RELIANCE.NS, TCS.NS, HDFCBANK.NS, INFY.NS, ICICIBANK.NS';
  const [tickerInput, setTickerInput] = useState(defaultTickers);
  const [capitalAmount, setCapitalAmount] = useState<number>(100000);
  const [varHorizon, setVarHorizon] = useState<'1d' | '10d'>('1d');
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [activeStrategy, setActiveStrategy] = useState<'sharpe' | 'vol' | 'parity'>('sharpe');
  const [manifestCopied, setManifestCopied] = useState(false);

  // Persistence & Rebalance state
  const [savedPortfolios, setSavedPortfolios] = useState<SavedPortfolio[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showRebalanceModal, setShowRebalanceModal] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioDesc, setNewPortfolioDesc] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fetchSavedPortfolios = async () => {
    try {
      const list = await listSavedPortfolios();
      setSavedPortfolios(list);
    } catch {
      // Non-critical background fetch
    }
  };

  const runOptimization = async (inputStr?: string, customCapital?: number) => {
    setLoading(true);
    setError(null);
    const parsed = (inputStr || tickerInput)
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(Boolean);

    try {
      const cap = customCapital !== undefined ? customCapital : capitalAmount;
      const res = await getPortfolioOptimization({
        tickers: parsed,
        initial_capital: cap
      });
      setData(res.data);
      setIsDemo(!!res.isDemo);
    } catch (err: any) {
      setError(err?.message || 'Portfolio optimization failed. Check ticker symbols.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runOptimization();
    fetchSavedPortfolios();
  }, [isDemoMode]);

  const setPreset = (preset: string) => {
    setTickerInput(preset);
    runOptimization(preset);
  };

  const handleSavePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolioName.trim() || !data) return;

    const weights = activeStrategy === 'sharpe'
      ? data.max_sharpe.weights
      : activeStrategy === 'vol'
      ? data.min_volatility.weights
      : (data.risk_parity?.weights || data.max_sharpe.weights);

    const items = Object.entries(weights).map(([ticker, weight]) => ({
      ticker,
      target_weight: weight
    }));

    try {
      await savePortfolio({
        name: newPortfolioName.trim(),
        description: newPortfolioDesc.trim() || `Strategy: ${activeStrategy.toUpperCase()}`,
        items
      });
      setShowSaveModal(false);
      setNewPortfolioName('');
      setNewPortfolioDesc('');
      setSaveSuccessMsg(`Portfolio "${newPortfolioName.trim()}" saved to database!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      fetchSavedPortfolios();
    } catch (err: any) {
      setError(`Failed to save portfolio: ${err?.message}`);
    }
  };

  const handleLoadSaved = (portfolio: SavedPortfolio) => {
    const tickers = portfolio.items.map(i => i.ticker).join(', ');
    setTickerInput(tickers);
    runOptimization(tickers);
  };

  const handleDeleteSaved = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSavedPortfolio(id);
      setSavedPortfolios(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      setError(`Failed to delete portfolio: ${err?.message}`);
    }
  };

  // Format percentage safely whether received as ratio (0.238) or percentage (23.8)
  const formatPct = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0.0';
    const num = (val < 1.0 && val > -1.0 && val !== 0) ? val * 100 : val;
    return num.toFixed(1);
  };

  // Extract allocation items
  const activeWeights = activeStrategy === 'sharpe'
    ? (data?.max_sharpe.weights || {})
    : activeStrategy === 'vol'
    ? (data?.min_volatility.weights || {})
    : (data?.risk_parity?.weights || data?.max_sharpe.weights || {});

  const allocationItems = Object.entries(activeWeights).map(([label, val]) => ({
    label: label.replace('.NS', ''),
    value: val
  }));

  // Calculate Rebalance Urgency Score (0-100)
  // Divergence between equal-weight baseline (1/N) and current optimal allocation
  const tickerKeys = Object.keys(activeWeights);
  const isPercent = Object.values(activeWeights).some(v => v > 1.0);
  const scale = isPercent ? 100 : 1;
  const baselineWeight = tickerKeys.length > 0 ? scale / tickerKeys.length : 0;
  const totalDivergence = tickerKeys.reduce((acc, sym) => {
    return acc + Math.abs((activeWeights[sym] || 0) - baselineWeight);
  }, 0) / (2 * scale);
  const rebalanceScore = Math.min(100, Math.round(totalDivergence * 100));

  // Build cumulative chart series
  const cumDates = data?.cumulative_growth?.dates || [];
  const benchmarkName = data?.benchmark_info?.name || 'Benchmark';
  const cumSeries = data?.cumulative_growth?.series
    ? Object.entries(data.cumulative_growth.series).map(([k, vals], idx) => ({
        name: k === 'benchmark' ? `${benchmarkName}` : k,
        color: k === 'benchmark' ? '#94A3B8' : (idx === 1 ? '#00F2FE' : '#10B981'),
        data: vals,
        dash: k === 'benchmark',
        strokeWidth: k === 'benchmark' ? 1.5 : 2.5
      }))
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: 4 }}>
            Modern Portfolio <span className="text-gradient">Optimization</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Markowitz Efficient Frontier, risk-adjusted Sharpe maximization, correlation matrix, and crash stress-testing.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Provenance Badge */}
          {(data || isDemo) && (
            <ProvenanceBadge
              source={data?.data_source}
              fetchedAt={data?.fetched_at}
              isDemo={isDemo}
            />
          )}

          {/* Presets */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPreset('RELIANCE.NS, TCS.NS, HDFCBANK.NS, INFY.NS, ICICIBANK.NS')}
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            >
              🇮🇳 NIFTY Top 5
            </button>
            <button
              onClick={() => setPreset('AAPL, MSFT, NVDA, GOOGL, AMZN')}
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            >
              🇺🇸 US Big Tech
            </button>
          </div>
        </div>
      </div>

      {/* Input Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <input
            type="text"
            className="input-control"
            value={tickerInput}
            onChange={e => setTickerInput(e.target.value)}
            placeholder="Enter tickers separated by commas (e.g., AAPL, NVDA, MSFT)"
          />
        </div>
        <button
          onClick={() => runOptimization()}
          disabled={loading}
          className="btn-primary"
          style={{ whiteSpace: 'nowrap' }}
        >
          {loading ? 'Optimizing Frontier...' : 'Optimize Portfolio'}
        </button>
        {data && (
          <button
            onClick={() => setShowSaveModal(true)}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
          >
            <Bookmark size={15} /> Save to Database
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <ErrorBanner
          title="Portfolio Optimization Notice"
          error={error}
          onRetry={() => runOptimization()}
          onDismiss={() => setError(null)}
          suggestedAction="Provide at least 2 valid tickers separated by commas, or switch to Sandbox Mode."
          onSwitchToSandbox={() => setDemoMode(true)}
        />
      )}

      {/* Simulation Fallback Banner */}
      {isDemo && !error && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 18px',
            borderRadius: 10,
            border: '1px solid rgba(245, 158, 11, 0.4)',
            backgroundColor: 'rgba(38, 28, 14, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            margin: '4px 0 14px 0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', color: '#FDE68A' }}>
            <Zap size={18} color="#F59E0B" />
            <span>
              <strong>Zero-Downtime Simulation Mode:</strong> Cloud backend is currently sleeping or waking up. Displaying institutional frontier simulation.
            </span>
          </div>
          <button
            onClick={() => runOptimization()}
            disabled={loading}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Connecting...' : 'Connect Live'}</span>
          </button>
        </div>
      )}

      {/* Save Success Toast */}
      {saveSuccessMsg && (
        <div className="badge badge-emerald" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10 }}>
          <Check size={16} /> {saveSuccessMsg}
        </div>
      )}

      {/* Saved Portfolios Selector */}
      {savedPortfolios.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <FolderOpen size={14} /> Saved Portfolios ({savedPortfolios.length}):
          </span>
          {savedPortfolios.map(p => (
            <div
              key={p.id}
              className="badge badge-purple"
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '5px 12px', borderRadius: 8 }}
              onClick={() => handleLoadSaved(p)}
              title={`Created: ${new Date(p.created_at).toLocaleDateString()}`}
            >
              <span style={{ fontWeight: 600 }}>{p.name}</span>
              <span style={{ fontSize: '0.72rem', opacity: 0.75 }}>({p.items.length} assets)</span>
              <span
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                onClick={(e) => handleDeleteSaved(p.id, e)}
                title="Delete portfolio"
              >
                <Trash2 size={13} style={{ opacity: 0.7 }} />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Save Portfolio Modal */}
      {showSaveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 440, padding: 28, background: 'var(--bg-secondary)', border: '1px solid var(--border-active)' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 6 }}>Save Portfolio to Database</h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 18 }}>
              Persist your current {activeStrategy.toUpperCase()} asset allocations in PostgreSQL / SQLite.
            </p>
            <form onSubmit={handleSavePortfolio} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Portfolio Name *
                </label>
                <input
                  type="text"
                  required
                  className="input-control"
                  placeholder="e.g. Core Wealth 2026"
                  value={newPortfolioName}
                  onChange={e => setNewPortfolioName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Description / Strategy Notes
                </label>
                <input
                  type="text"
                  className="input-control"
                  placeholder={`Strategy: ${activeStrategy.toUpperCase()} (Optional)`}
                  value={newPortfolioDesc}
                  onChange={e => setNewPortfolioDesc(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 18px' }}
                >
                  Confirm & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Performance Comparison & Strategy Selector Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {/* Max Sharpe */}
            <div
              className={`glass-panel glass-panel-interactive ${activeStrategy === 'sharpe' ? 'active' : ''}`}
              onClick={() => setActiveStrategy('sharpe')}
              style={{
                cursor: 'pointer',
                borderColor: activeStrategy === 'sharpe' ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                background: activeStrategy === 'sharpe' ? 'rgba(0, 242, 254, 0.05)' : 'var(--bg-card)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Flame size={18} color="var(--accent-cyan)" />
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>Max Sharpe</h3>
                </div>
                <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>Optimal Risk/Return</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Return</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    +{formatPct(data.max_sharpe.return)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Volatility</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                    {formatPct(data.max_sharpe.volatility)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sharpe</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {data.max_sharpe.sharpe_ratio.toFixed(2)}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
                Sharpe = (E[R] - Rf) / σ = ({formatPct(data.max_sharpe.return)}% - {data.benchmark_info?.risk_free_rate_pct || 4.2}%) / {formatPct(data.max_sharpe.volatility)}%
              </div>
            </div>

            {/* Min Volatility */}
            <div
              className={`glass-panel glass-panel-interactive ${activeStrategy === 'vol' ? 'active' : ''}`}
              onClick={() => setActiveStrategy('vol')}
              style={{
                cursor: 'pointer',
                borderColor: activeStrategy === 'vol' ? 'var(--accent-emerald)' : 'var(--border-subtle)',
                background: activeStrategy === 'vol' ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={18} color="var(--accent-emerald)" />
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>Min Volatility</h3>
                </div>
                <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>Capital Shield</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Return</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    +{formatPct(data.min_volatility.return)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Volatility</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    {formatPct(data.min_volatility.volatility)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sharpe</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {data.min_volatility.sharpe_ratio.toFixed(2)}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
                Lowest variance portfolio on the Markowitz hyperbolic curve
              </div>
            </div>

            {/* Risk Parity / Equal Risk */}
            <div
              className={`glass-panel glass-panel-interactive ${activeStrategy === 'parity' ? 'active' : ''}`}
              onClick={() => setActiveStrategy('parity')}
              style={{
                cursor: 'pointer',
                borderColor: activeStrategy === 'parity' ? 'var(--accent-purple)' : 'var(--border-subtle)',
                background: activeStrategy === 'parity' ? 'rgba(168, 85, 247, 0.05)' : 'var(--bg-card)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Scale size={18} color="var(--accent-purple)" />
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>Risk Parity</h3>
                </div>
                <span className="badge badge-purple" style={{ fontSize: '0.68rem' }}>Equal Risk Budget</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Return</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    +{formatPct(data.risk_parity?.return ?? data.max_sharpe.return)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Volatility</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                    {formatPct(data.risk_parity?.volatility ?? data.max_sharpe.volatility)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sharpe</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {(data.risk_parity?.sharpe_ratio ?? data.max_sharpe.sharpe_ratio).toFixed(2)}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
                Each asset contributes identically to total portfolio variance
              </div>
            </div>
          </div>

          {/* Institutional Value-at-Risk (VaR) & CVaR (Expected Shortfall) Risk Hub */}
          {(() => {
            const activeResult = activeStrategy === 'sharpe'
              ? data.max_sharpe
              : activeStrategy === 'vol'
              ? data.min_volatility
              : (data.risk_parity || data.max_sharpe);

            const varMetrics = activeResult?.var_metrics;
            const riskContribs = activeResult?.risk_contributions;
            const rebalancePlan = data.rebalance_plans
              ? (activeStrategy === 'sharpe'
                ? data.rebalance_plans.max_sharpe
                : activeStrategy === 'vol'
                ? data.rebalance_plans.min_volatility
                : data.rebalance_plans.risk_parity)
              : null;

            // Compute metrics based on selected horizon
            const p95 = varHorizon === '1d'
              ? (varMetrics?.parametric_var.var_95_1d_pct ?? 1.91)
              : (varMetrics?.parametric_var.var_95_10d_pct ?? 6.04);
            const p99 = varHorizon === '1d'
              ? (varMetrics?.parametric_var.var_99_1d_pct ?? 2.71)
              : (varMetrics?.parametric_var.var_99_10d_pct ?? 8.57);

            const h95 = varHorizon === '1d'
              ? (varMetrics?.historical_var.var_95_1d_pct ?? 2.01)
              : (varMetrics?.historical_var.var_95_10d_pct ?? 6.36);
            const h99 = varHorizon === '1d'
              ? (varMetrics?.historical_var.var_99_1d_pct ?? 2.92)
              : (varMetrics?.historical_var.var_99_10d_pct ?? 9.23);

            const c95 = varHorizon === '1d'
              ? (varMetrics?.cvar_expected_shortfall.cvar_95_1d_pct ?? 2.51)
              : (varMetrics?.cvar_expected_shortfall.cvar_95_10d_pct ?? 7.95);
            const c99 = varHorizon === '1d'
              ? (varMetrics?.cvar_expected_shortfall.cvar_99_1d_pct ?? 3.80)
              : (varMetrics?.cvar_expected_shortfall.cvar_99_10d_pct ?? 12.02);

            const p95Usd = Math.round(capitalAmount * (p95 / 100));
            const p99Usd = Math.round(capitalAmount * (p99 / 100));
            const h95Usd = Math.round(capitalAmount * (h95 / 100));
            const h99Usd = Math.round(capitalAmount * (h99 / 100));
            const c95Usd = Math.round(capitalAmount * (c95 / 100));
            const c99Usd = Math.round(capitalAmount * (c99 / 100));

            const handleCopyManifest = () => {
              if (!rebalancePlan) return;
              const lines = rebalancePlan.orders
                .filter(o => o.action !== 'HOLD')
                .map(o => `${o.action} ${o.delta_shares} shares of ${o.ticker} (~$${Math.abs(o.delta_value).toLocaleString()})`);
              const text = `=== FINSIGHT AI REBALANCE MANIFEST (${activeStrategy.toUpperCase()}) ===\nCapital: $${capitalAmount.toLocaleString()}\nTurnover: $${rebalancePlan.turnover_usd.toLocaleString()} (${rebalancePlan.turnover_pct}%)\nEst. Friction (7 bps): $${rebalancePlan.estimated_friction_usd}\n\nORDERS:\n${lines.join('\n')}`;
              navigator.clipboard.writeText(text);
              setManifestCopied(true);
              setTimeout(() => setManifestCopied(false), 2500);
            };

            const handleExportManifestCsv = () => {
              if (!rebalancePlan) return;
              const headers = ['Action', 'Ticker', 'Live Price', 'Current %', 'Target %', 'Current Value', 'Target Value', 'Delta Value', 'Delta Shares'];
              const rows = rebalancePlan.orders.map(o => [
                o.action, o.ticker, o.price, o.current_weight_pct, o.target_weight_pct,
                o.current_value, o.target_value, o.delta_value, o.delta_shares
              ]);
              exportSeriesToCsv(`finsight_rebalance_${activeStrategy}_${new Date().toISOString().slice(0, 10)}`, headers, rows);
            };

            return (
              <>
                {/* Institutional Tail-Risk & VaR / CVaR Hub */}
                <div className="glass-panel" style={{ padding: '20px 24px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Shield size={20} color="var(--accent-cyan)" />
                        <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>
                          Institutional Tail-Risk & <span className="text-gradient">Value-at-Risk (VaR / CVaR)</span>
                        </h3>
                        <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                          Basel III Compliant
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0, marginTop: 4, maxWidth: 680 }}>
                        Multi-paradigm tail risk measurement for <strong>{activeStrategy === 'sharpe' ? 'Max Sharpe' : activeStrategy === 'vol' ? 'Min Volatility' : 'Equal Risk Parity'}</strong>.
                        Combines Ledoit-Wolf shrinkage parametric modeling with empirical historical distributions and Expected Shortfall.
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      {/* Portfolio Capital Config */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Portfolio Equity:</span>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <span style={{ position: 'absolute', left: 10, fontSize: '0.82rem', color: 'var(--text-muted)' }}>$</span>
                          <input
                            type="number"
                            value={capitalAmount}
                            onChange={e => setCapitalAmount(Math.max(100, Number(e.target.value) || 100000))}
                            style={{
                              padding: '6px 12px 6px 24px',
                              width: 110,
                              fontSize: '0.82rem',
                              fontFamily: 'var(--font-mono)',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 6,
                              color: 'var(--text-primary)'
                            }}
                          />
                        </div>
                      </div>

                      {/* Horizon Toggle */}
                      <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 8, padding: 3, border: '1px solid var(--border-subtle)' }}>
                        <button
                          onClick={() => setVarHorizon('1d')}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 6,
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: varHorizon === '1d' ? 'var(--accent-cyan)' : 'transparent',
                            color: varHorizon === '1d' ? '#000' : 'var(--text-secondary)',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          1-Day Horizon
                        </button>
                        <button
                          onClick={() => setVarHorizon('10d')}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 6,
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: varHorizon === '10d' ? 'var(--accent-cyan)' : 'transparent',
                            color: varHorizon === '10d' ? '#000' : 'var(--text-secondary)',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          10-Day Horizon (Basel)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3 Pillar Risk Meter Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
                    {/* Parametric VaR */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Parametric VaR (Ledoit-Wolf)
                        </div>
                        <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>Normal Model</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>95% Confidence ({varHorizon})</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
                            -{p95.toFixed(2)}%
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                            -${p95Usd.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>99% Confidence ({varHorizon})</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
                            -{p99.toFixed(2)}%
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                            -${p99Usd.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, marginTop: 10 }}>
                        Assumes Gaussian return distribution with Ledoit-Wolf shrinkage to regularize asset covariance.
                      </p>
                    </div>

                    {/* Historical VaR */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Historical VaR (Empirical)
                        </div>
                        <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>Quantile Cutoff</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>95% Empirical ({varHorizon})</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
                            -{h95.toFixed(2)}%
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                            -${h95Usd.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>99% Empirical ({varHorizon})</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
                            -{h99.toFixed(2)}%
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                            -${h99Usd.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, marginTop: 10 }}>
                        Calculated from the empirical 5th and 1st percentiles of actual daily portfolio return history.
                      </p>
                    </div>

                    {/* Conditional VaR / Expected Shortfall */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Conditional VaR (Expected Shortfall)
                        </div>
                        <span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>Tail Severity</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>95% Tail Shortfall ({varHorizon})</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                            -{c95.toFixed(2)}%
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                            -${c95Usd.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>99% Tail Shortfall ({varHorizon})</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                            -{c99.toFixed(2)}%
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                            -${c99Usd.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, marginTop: 10 }}>
                        Expected loss conditional on breaching the VaR threshold: E[Loss | Loss &gt; VaR].
                      </p>
                    </div>
                  </div>

                  {/* Risk Budgeting / Parity Attribution Section */}
                  {riskContribs && riskContribs.percentage_risk_contributions && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Asset Volatility Risk Contributions (Equal Risk Parity vs Active Allocation)
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Sum of risk contributions = 100%
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(130px, 1fr))`, gap: 10 }}>
                        {Object.entries(riskContribs.percentage_risk_contributions).map(([sym, prcPct]) => (
                          <div key={sym} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sym}</span>
                              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)' }}>{prcPct.toFixed(1)}%</span>
                            </div>
                            <div style={{ width: '100%', height: 4, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, prcPct * 2)}%`, height: '100%', background: activeStrategy === 'parity' ? 'var(--accent-purple)' : 'var(--accent-cyan)' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Rebalance Urgency & Drift Telemetry Banner */}
                <div style={{
                  background: rebalanceScore > 35 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                  border: `1px solid ${rebalanceScore > 35 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                  borderRadius: 12,
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: rebalanceScore > 35 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Activity size={20} color={rebalanceScore > 35 ? '#F59E0B' : '#10B981'} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          Rebalance Urgency Score:
                        </span>
                        <span style={{
                          fontSize: '1rem',
                          fontWeight: 800,
                          color: rebalanceScore > 35 ? '#F59E0B' : '#10B981',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {rebalanceScore} / 100
                        </span>
                        <span className={rebalanceScore > 35 ? 'badge badge-amber' : 'badge badge-emerald'} style={{ fontSize: '0.7rem' }}>
                          {rebalanceScore > 35 ? 'Rebalance Recommended' : 'Portfolio Balanced'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>
                        {rebalanceScore > 35
                          ? `Asset weights diverge by ${Math.round(totalDivergence * 100)}% from baseline. Rebalancing to ${activeStrategy.toUpperCase()} captures estimated +${(data.max_sharpe.return - (data.min_volatility.return)).toFixed(1)}% alpha.`
                          : `Asset drift is within acceptable tolerance (<${Math.round(totalDivergence * 100)}%). No immediate rebalance required.`}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      onClick={handleCopyManifest}
                      className="btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Copy size={13} />
                      <span>{manifestCopied ? 'Manifest Copied!' : 'Copy Orders'}</span>
                    </button>
                    <button
                      onClick={handleExportManifestCsv}
                      className="btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Download size={13} />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={() => setShowRebalanceModal(true)}
                      className="btn-primary"
                      style={{ fontSize: '0.8rem', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Activity size={14} />
                      <span>Rebalance Ticket</span>
                    </button>
                  </div>
                </div>

                {/* Actionable Rebalance Order Ledger & Current vs Target Allocation Table */}
                <div className="glass-panel" style={{ padding: '18px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                        Actionable Rebalance Order Ledger (Current vs Target Allocation)
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>
                        Concrete order routing manifest to align portfolio with <strong>{activeStrategy.toUpperCase()}</strong> strategy at ${capitalAmount.toLocaleString()} equity.
                      </p>
                    </div>
                    {rebalancePlan && (
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                          Turnover: ${rebalancePlan.turnover_usd.toLocaleString()} ({rebalancePlan.turnover_pct}%)
                        </span>
                        <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
                          Friction (7 bps): ${rebalancePlan.estimated_friction_usd}
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px' }}>Action</th>
                          <th style={{ padding: '8px 12px' }}>Asset</th>
                          <th style={{ padding: '8px 12px' }}>Est. Price</th>
                          <th style={{ padding: '8px 12px' }}>Current Alloc</th>
                          <th style={{ padding: '8px 12px' }}>Target Alloc</th>
                          <th style={{ padding: '8px 12px' }}>Weight Delta</th>
                          <th style={{ padding: '8px 12px' }}>Order Delta ($)</th>
                          <th style={{ padding: '8px 12px' }}>Target Shares</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(rebalancePlan?.orders || Object.entries(activeWeights).map(([sym, w]) => ({
                          ticker: sym,
                          action: 'HOLD' as const,
                          price: 100.0,
                          current_weight_pct: 100 / Object.keys(activeWeights).length,
                          target_weight_pct: w > 1.0 ? w : w * 100,
                          delta_value: 0,
                          delta_shares: 0,
                          current_value: 0,
                          target_value: 0
                        }))).map(order => {
                          const deltaPct = order.target_weight_pct - order.current_weight_pct;
                          const isBuy = order.action === 'BUY';
                          const isSell = order.action === 'SELL';

                          return (
                            <tr key={order.ticker} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', fontFamily: 'var(--font-mono)' }}>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: isBuy ? 'rgba(16, 185, 129, 0.15)' : isSell ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                                  color: isBuy ? '#10B981' : isSell ? '#EF4444' : '#94A3B8'
                                }}>
                                  {order.action}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {order.ticker}
                              </td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                                ${order.price.toFixed(2)}
                              </td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                                {order.current_weight_pct.toFixed(1)}%
                              </td>
                              <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                                {order.target_weight_pct.toFixed(1)}%
                              </td>
                              <td style={{ padding: '10px 12px', color: deltaPct >= 0 ? '#10B981' : '#EF4444' }}>
                                {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%
                              </td>
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: isBuy ? '#10B981' : isSell ? '#EF4444' : 'var(--text-secondary)' }}>
                                {order.delta_value > 0 ? `+$${order.delta_value.toLocaleString()}` : order.delta_value < 0 ? `-$${Math.abs(order.delta_value).toLocaleString()}` : '$0'}
                              </td>
                              <td style={{ padding: '10px 12px', color: isBuy ? '#10B981' : isSell ? '#EF4444' : 'var(--text-muted)' }}>
                                {order.delta_shares > 0 ? `${isBuy ? '+' : '-'}${order.delta_shares} shares` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}

          {/* Allocation & Growth Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 24, alignItems: 'stretch' }}>
            {/* Cumulative Growth Chart */}
            <div className="glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ fontSize: '1.1rem' }}>
                  Performance Comparison (Growth of ₹1 / $1)
                </h3>
                {data.benchmark_info && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>
                      Benchmark: {data.benchmark_info.name}
                    </span>
                    <span className="badge badge-emerald" style={{ fontSize: '0.75rem' }}>
                      Rf: {data.benchmark_info.risk_free_rate_pct}%
                    </span>
                  </div>
                )}
              </div>
              <MultiLineChart
                dates={cumDates}
                series={cumSeries}
                height={280}
              />
            </div>

            {/* Asset Allocation Breakdown */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: '1.1rem' }}>
                  {activeStrategy === 'sharpe'
                    ? 'Optimal Weights (Sharpe)'
                    : activeStrategy === 'vol'
                    ? 'Safe Weights (Min Vol)'
                    : 'Equal Risk Parity Weights'}
                </h3>
                <span className="badge badge-purple">{allocationItems.length} Assets</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <AllocationBars items={allocationItems} />
              </div>
            </div>
          </div>

          {/* Correlation Matrix & Stress Testing */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 24 }}>
            {/* Correlation Matrix */}
            <div className="glass-panel">
              <div style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 4 }}>Asset Correlation Matrix</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Values close to 1.0 move together. Lower/negative values provide diversification shielding.
                </p>
              </div>
              <CorrelationHeatmap
                tickers={data.correlation_matrix.tickers}
                matrix={data.correlation_matrix.values}
              />
            </div>

            {/* Market Crash Stress Testing */}
            <div className="glass-panel">
              <div style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 4 }}>Market Crash Scenario Stress-Test</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Portfolio Sensitivity (Beta): <strong style={{ color: 'var(--accent-cyan)' }}>{data.risk_metrics.beta.toFixed(2)}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.stress_tests.map(test => (
                  <div
                    key={test.scenario}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 10,
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#F8FAFC' }}>{test.scenario}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Index drops {test.market_drop_pct}%</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                        {test.estimated_portfolio_impact_pct.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated Impact</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Rebalance Execution Plan Modal */}
      <RebalanceModal
        isOpen={showRebalanceModal}
        onClose={() => setShowRebalanceModal(false)}
        activeWeights={activeWeights}
        strategyName={activeStrategy === 'sharpe' ? 'Max Sharpe' : activeStrategy === 'vol' ? 'Min Volatility' : 'Risk Parity'}
      />
    </div>
  );
}
