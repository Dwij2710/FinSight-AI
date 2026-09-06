'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Shield, Flame, Activity, ArrowUpRight, BarChart2, Scale, Bookmark, FolderOpen, Trash2, Check, Plus, Zap, RefreshCw } from 'lucide-react';
import { PortfolioData, SavedPortfolio } from '../lib/types';
import { getPortfolioOptimization, listSavedPortfolios, savePortfolio, deleteSavedPortfolio } from '../lib/api';
import { MultiLineChart, CorrelationHeatmap, AllocationBars } from './Common/Charts';
import { ErrorBanner } from './Common/ErrorBanner';
import { ProvenanceBadge } from './ProvenanceBadge';
import { RebalanceModal } from './RebalanceModal';

export function PortfolioView() {
  const defaultTickers = 'RELIANCE.NS, TCS.NS, HDFCBANK.NS, INFY.NS, ICICIBANK.NS';
  const [tickerInput, setTickerInput] = useState(defaultTickers);
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [activeStrategy, setActiveStrategy] = useState<'sharpe' | 'vol' | 'parity'>('sharpe');

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

  const runOptimization = async (inputStr?: string) => {
    setLoading(true);
    setError(null);
    const parsed = (inputStr || tickerInput)
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(Boolean);

    try {
      const res = await getPortfolioOptimization({ tickers: parsed });
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
  }, []);

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
          <ProvenanceBadge
            source={data?.data_source}
            fetchedAt={data?.fetched_at}
            isDemo={isDemo}
          />

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
          suggestedAction={
            error.toLowerCase().includes('connect') ||
            error.toLowerCase().includes('fetch') ||
            error.toLowerCase().includes('timeout') ||
            error.toLowerCase().includes('offline')
              ? 'The backend may be spinning up on Render free tier. Please wait ~30-45s and click Retry.'
              : 'Provide at least 2 valid tickers separated by commas (e.g., AAPL, MSFT).'
          }
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
                    ? `Asset weights diverge by ${Math.round(totalDivergence * 100)}% from equal baseline. Aligning with ${activeStrategy.toUpperCase()} captures estimated +${(data.max_sharpe.return - (data.min_volatility.return)).toFixed(1)}% alpha.`
                    : `Asset drift is within acceptable tolerance (<${Math.round(totalDivergence * 100)}%). No immediate rebalance required.`}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowRebalanceModal(true)}
                className="btn-primary"
                style={{ fontSize: '0.8rem', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Activity size={14} />
                <span>Generate Rebalance Plan</span>
              </button>

              <button
                onClick={() => setShowSaveModal(true)}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '7px 14px' }}
              >
                Lock Allocation
              </button>
            </div>
          </div>

          {/* Holdings Breakdown Table */}
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Holdings Breakdown & Allocation Deltas</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>
                  Optimal weights for active strategy ({activeStrategy.toUpperCase()}) vs equal-weighted baseline.
                </p>
              </div>
              <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                {Object.keys(activeWeights).length} Equities Analyzed
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Asset</th>
                    <th style={{ padding: '8px 12px' }}>Baseline (1/N)</th>
                    <th style={{ padding: '8px 12px' }}>Target Weight</th>
                    <th style={{ padding: '8px 12px' }}>Rebalance Delta</th>
                    <th style={{ padding: '8px 12px' }}>Recommended Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(activeWeights).map(([sym, targetWeight]) => {
                    const baseline = baselineWeight > 1.0 ? baselineWeight : baselineWeight * 100;
                    const target = targetWeight > 1.0 ? targetWeight : targetWeight * 100;
                    const delta = target - baseline;
                    const action = delta > 3
                      ? 'Accumulate'
                      : delta < -3
                      ? 'Trim'
                      : 'Hold';
                    const actionColor = delta > 3 ? '#10B981' : delta < -3 ? '#EF4444' : '#94A3B8';

                    return (
                      <tr key={sym} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', fontFamily: 'var(--font-mono)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {sym}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                          {baseline.toFixed(1)}%
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                          {target.toFixed(1)}%
                        </td>
                        <td style={{ padding: '10px 12px', color: delta >= 0 ? '#10B981' : '#EF4444' }}>
                          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: delta > 3 ? 'rgba(16, 185, 129, 0.12)' : delta < -3 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                            color: actionColor
                          }}>
                            {action}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

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
