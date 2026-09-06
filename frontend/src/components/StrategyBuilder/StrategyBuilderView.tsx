'use client';

import React, { useState, useEffect } from 'react';
import {
  Wand2,
  SlidersHorizontal,
  Play,
  TrendingUp,
  Shield,
  Layers,
  Clock,
  DollarSign,
  BarChart3,
  RefreshCw,
  Plus,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import {
  StrategyTemplate,
  StrategyBacktestParams,
  StrategyBacktestResult
} from '../../lib/types';
import { getStrategyTemplates, runStrategyBacktest } from '../../lib/api';
import { ErrorBanner } from '../Common/ErrorBanner';
import { ProvenanceBadge } from '../ProvenanceBadge';
import { exportSeriesToCsv } from '../../lib/chartExport';
import { useTheme } from '../../context/ThemeContext';

export function StrategyBuilderView() {
  const { isDark } = useTheme();
  const [templates, setTemplates] = useState<StrategyTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tech_momentum_alpha');
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(true);

  // Strategy Parameters
  const [strategyName, setStrategyName] = useState<string>('Tech Momentum Alpha');
  const [universe, setUniverse] = useState<string[]>(['AAPL', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META']);
  const [tickerInput, setTickerInput] = useState<string>('');
  const [defensiveAsset, setDefensiveAsset] = useState<string>('SHY');
  const [allocationType, setAllocationType] = useState<'EQUAL_WEIGHT' | 'MOMENTUM_TOP_N' | 'INVERSE_VOLATILITY'>('MOMENTUM_TOP_N');
  const [topN, setTopN] = useState<number>(3);
  const [rebalanceDays, setRebalanceDays] = useState<number>(21);
  const [regimeFilter, setRegimeFilter] = useState<'NONE' | 'SMA200_BENCHMARK'>('NONE');
  const [initialCapital, setInitialCapital] = useState<number>(100000);
  const [period, setPeriod] = useState<'1y' | '2y' | '5y'>('2y');

  // Backtest state
  const [backtesting, setBacktesting] = useState<boolean>(false);
  const [backtestResult, setBacktestResult] = useState<StrategyBacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Load strategy templates
  useEffect(() => {
    async function loadTemplates() {
      try {
        setLoadingTemplates(true);
        const res = await getStrategyTemplates();
        setTemplates(res.templates);
        if (res.templates.length > 0) {
          applyTemplate(res.templates[0]);
        }
      } catch (err: any) {
        console.warn('Failed to load strategy templates:', err);
      } finally {
        setLoadingTemplates(false);
      }
    }
    loadTemplates();
  }, []);

  const applyTemplate = (tmpl: StrategyTemplate) => {
    setSelectedTemplateId(tmpl.id);
    setStrategyName(tmpl.name);
    setUniverse(tmpl.universe);
    setDefensiveAsset(tmpl.defensive_asset);
    setAllocationType(tmpl.allocation_type);
    setTopN(tmpl.top_n);
    setRebalanceDays(tmpl.rebalance_frequency_days);
    setRegimeFilter(tmpl.regime_filter);
  };

  const handleAddTicker = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = tickerInput.trim().toUpperCase();
    if (sym && !universe.includes(sym) && universe.length < 10) {
      setUniverse([...universe, sym]);
      setTickerInput('');
    }
  };

  const handleRemoveTicker = (sym: string) => {
    if (universe.length > 2) {
      setUniverse(universe.filter(t => t !== sym));
    }
  };

  const handleRunBacktest = async () => {
    if (universe.length < 2) {
      setError('Universe must contain at least 2 tickers.');
      return;
    }

    setBacktesting(true);
    setError(null);

    const params: StrategyBacktestParams = {
      universe,
      defensive_asset: defensiveAsset,
      allocation_type: allocationType,
      top_n: topN,
      rebalance_frequency_days: rebalanceDays,
      regime_filter: regimeFilter,
      initial_capital: initialCapital,
      period
    };

    try {
      const res = await runStrategyBacktest(params);
      setBacktestResult(res.data);
      setIsDemo(!!res.isDemo);
    } catch (err: any) {
      setError(err?.message || 'Failed to simulate strategy backtest.');
      setBacktestResult(null);
    } finally {
      setBacktesting(false);
    }
  };

  // Run backtest automatically on initial load when templates are ready
  useEffect(() => {
    if (!backtestResult && !backtesting && universe.length >= 2) {
      handleRunBacktest();
    }
  }, [selectedTemplateId]);

  const handleExportRebalanceCsv = () => {
    if (!backtestResult || !backtestResult.rebalance_log) return;
    const headers = ['Date', 'Selected Assets', 'Turnover ($)', 'Fees & Slippage ($)'];
    const rows = backtestResult.rebalance_log.map(r => [
      r.date,
      r.selected_assets.join('; '),
      r.turnover_dollars.toFixed(2),
      r.fees_dollars.toFixed(2)
    ]);
    exportSeriesToCsv(`strategy_rebalances_${strategyName.replace(/\s+/g, '_')}`, headers, rows);
  };

  // Chart coordinate calculations
  const eqCurve = backtestResult?.equity_curve || [];
  const bmCurve = backtestResult?.benchmark_curve || [];
  const chartPoints = eqCurve.length;

  const width = 860;
  const height = 320;
  const padLeft = 70;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 30;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const allVals = [...eqCurve.map(p => p.value), ...bmCurve.map(p => p.value)];
  const minVal = allVals.length > 0 ? Math.min(...allVals) * 0.95 : initialCapital * 0.8;
  const maxVal = allVals.length > 0 ? Math.max(...allVals) * 1.05 : initialCapital * 1.3;
  const valRange = maxVal - minVal || 1;

  const getX = (i: number) => padLeft + (i / Math.max(1, chartPoints - 1)) * plotWidth;
  const getY = (v: number) => padTop + (1 - (v - minVal) / valRange) * plotHeight;

  const eqPath = eqCurve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.value).toFixed(1)}`).join(' ');
  const bmPath = bmCurve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.value).toFixed(1)}`).join(' ');

  const activeEq = hoverIndex !== null && eqCurve[hoverIndex] ? eqCurve[hoverIndex] : eqCurve[eqCurve.length - 1];
  const activeBm = hoverIndex !== null && bmCurve[hoverIndex] ? bmCurve[hoverIndex] : bmCurve[bmCurve.length - 1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Panel */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(168, 85, 247, 0.2))',
              color: 'var(--accent-cyan)'
            }}
          >
            <Wand2 size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: '1.45rem', color: 'var(--text-primary)' }}>
                AI Strategy Builder & Rules Engine
              </h2>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(0, 242, 254, 0.12)',
                  color: 'var(--accent-cyan)',
                  fontWeight: 600
                }}
              >
                STRAT-01
              </span>
              <ProvenanceBadge source={isDemo ? 'simulated' : 'live'} />
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Deterministic quantitative rule construction with walk-forward backtesting and execution friction (5 bps fee + 2 bps slippage)
            </p>
          </div>
        </div>

        {/* Template Quick Selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Presets:
          </span>
          {templates.map(tmpl => (
            <button
              key={tmpl.id}
              onClick={() => applyTemplate(tmpl)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: selectedTemplateId === tmpl.id ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: selectedTemplateId === tmpl.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                color: selectedTemplateId === tmpl.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              {tmpl.name}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <ErrorBanner
          title="Strategy Engine Notice"
          error={error}
          onRetry={handleRunBacktest}
        />
      )}

      {/* Main Layout: Configuration & Rules Ticket (Left) + Performance Studio (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: 24 }}>
        {/* Left Column: Configuration Controls */}
        <div className="glass-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
            <SlidersHorizontal size={18} color="var(--accent-cyan)" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Strategy Logic & Universe
            </h3>
          </div>

          {/* Universe Management */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Asset Universe ({universe.length}/10 assets)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {universe.map(sym => (
                <span
                  key={sym}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: 'rgba(0, 242, 254, 0.12)',
                    border: '1px solid rgba(0, 242, 254, 0.25)',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {sym}
                  <X
                    size={12}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleRemoveTicker(sym)}
                  />
                </span>
              ))}
            </div>

            <form onSubmit={handleAddTicker} style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="Add symbol (e.g. TSLA)"
                value={tickerInput}
                onChange={e => setTickerInput(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)'
                }}
              />
              <button type="submit" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                <Plus size={14} />
              </button>
            </form>
          </div>

          {/* Safe Haven Asset */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Safe Haven / Defensive Asset
            </label>
            <select
              value={defensiveAsset}
              onChange={e => setDefensiveAsset(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
                padding: '7px 10px',
                color: 'var(--text-primary)',
                fontSize: '0.8rem'
              }}
            >
              <option value="SHY">SHY — 1-3Y Short-Term Treasury (Cash Proxy)</option>
              <option value="TLT">TLT — 20+ Year Long-Term Treasury Bond</option>
              <option value="GLD">GLD — SPDR Gold Trust</option>
              <option value="IEF">IEF — 7-10 Year Intermediate Treasury</option>
            </select>
          </div>

          {/* Allocation Algorithm */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Weight Allocation Rule
            </label>
            <select
              value={allocationType}
              onChange={e => setAllocationType(e.target.value as any)}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
                padding: '7px 10px',
                color: 'var(--text-primary)',
                fontSize: '0.8rem'
              }}
            >
              <option value="MOMENTUM_TOP_N">Momentum Top N (Equal Weight across Leaders)</option>
              <option value="INVERSE_VOLATILITY">Inverse Volatility (Risk Parity Equalizer)</option>
              <option value="EQUAL_WEIGHT">Equal Weight across Full Universe (1/N)</option>
            </select>
          </div>

          {/* Top N Selector (conditional) */}
          {allocationType === 'MOMENTUM_TOP_N' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Selected Leader Count (Top N)
                </label>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  {topN} of {universe.length} assets
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={Math.min(10, universe.length)}
                value={topN}
                onChange={e => setTopN(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
              />
            </div>
          )}

          {/* Rebalance Frequency */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Rebalance Cadence
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {[
                { label: 'Weekly', days: 5 },
                { label: 'Bi-Wk', days: 10 },
                { label: 'Monthly', days: 21 },
                { label: 'Quarterly', days: 63 }
              ].map(opt => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setRebalanceDays(opt.days)}
                  style={{
                    padding: '6px 4px',
                    borderRadius: 6,
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: rebalanceDays === opt.days ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: rebalanceDays === opt.days ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    color: rebalanceDays === opt.days ? 'var(--accent-cyan)' : 'var(--text-secondary)'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Market Regime Filter */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Macro Regime Filter
            </label>
            <select
              value={regimeFilter}
              onChange={e => setRegimeFilter(e.target.value as any)}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
                padding: '7px 10px',
                color: 'var(--text-primary)',
                fontSize: '0.8rem'
              }}
            >
              <option value="NONE">None — Stay 100% Invested</option>
              <option value="SMA200_BENCHMARK">SPY &gt; 200 SMA — Switch to Defensive in Downtrends</option>
            </select>
          </div>

          {/* Horizon & Capital */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Horizon
              </label>
              <select
                value={period}
                onChange={e => setPeriod(e.target.value as any)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: '6px 8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem'
                }}
              >
                <option value="1y">1 Year</option>
                <option value="2y">2 Years</option>
                <option value="5y">5 Years</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Initial Capital ($)
              </label>
              <input
                type="number"
                value={initialCapital}
                onChange={e => setInitialCapital(Math.max(1000, Number(e.target.value)))}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: '6px 8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>
          </div>

          {/* Execution Button */}
          <button
            onClick={handleRunBacktest}
            disabled={backtesting}
            className="btn-primary"
            style={{
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 16px',
              fontSize: '0.88rem'
            }}
          >
            {backtesting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Simulating Walk-Forward Backtest...</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Run Walk-Forward Backtest</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Performance Studio & Walk-Forward Equity Curve */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Key Metrics Row */}
          {backtestResult && (
            <div className="metric-grid">
              <div className="metric-card cyan">
                <div className="metric-label">
                  <span>CAGR (Annualized)</span>
                  <TrendingUp size={16} color="var(--accent-cyan)" />
                </div>
                <div className="metric-value" style={{ fontSize: '1.4rem' }}>
                  {backtestResult.cagr_pct >= 0 ? '+' : ''}{backtestResult.cagr_pct.toFixed(1)}%
                </div>
                <div className="metric-subtext">
                  Total Return: {backtestResult.total_return_pct >= 0 ? '+' : ''}{backtestResult.total_return_pct.toFixed(1)}%
                </div>
              </div>

              <div className="metric-card purple">
                <div className="metric-label">
                  <span>Sharpe Ratio (Rf=4%)</span>
                  <BarChart3 size={16} color="var(--accent-purple)" />
                </div>
                <div className="metric-value" style={{ fontSize: '1.4rem' }}>
                  {backtestResult.sharpe_ratio.toFixed(2)}
                </div>
                <div className="metric-subtext">
                  Benchmark (SPY): {backtestResult.benchmark_total_return_pct >= 0 ? '+' : ''}{backtestResult.benchmark_total_return_pct.toFixed(1)}%
                </div>
              </div>

              <div className="metric-card rose">
                <div className="metric-label">
                  <span>Max Drawdown</span>
                  <ShieldAlert size={16} color="var(--accent-rose)" />
                </div>
                <div className="metric-value" style={{ fontSize: '1.4rem' }}>
                  {backtestResult.max_drawdown_pct.toFixed(1)}%
                </div>
                <div className="metric-subtext">
                  Peak-to-trough drop
                </div>
              </div>

              <div className="metric-card emerald">
                <div className="metric-label">
                  <span>Friction Accounting</span>
                  <DollarSign size={16} color="var(--accent-emerald)" />
                </div>
                <div className="metric-value" style={{ fontSize: '1.25rem' }}>
                  ${(backtestResult.total_commission_paid + backtestResult.total_slippage_paid).toFixed(2)}
                </div>
                <div className="metric-subtext">
                  {backtestResult.rebalances_count} rebalances (5 bps fee, 2 bps slip)
                </div>
              </div>
            </div>
          )}

          {/* Equity Curve SVG Chart */}
          <div className="glass-panel" style={{ padding: '22px 26px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Walk-Forward Capital Growth vs S&P 500 Benchmark
                </h3>
                {activeEq && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                    <span>Date: {activeEq.date} | </span>
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                      Strategy: ${activeEq.value.toLocaleString()} | 
                    </span>
                    <span style={{ color: '#A855F7', fontWeight: 600 }}>
                      {' '}SPY: ${activeBm?.value.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-cyan)' }}>
                  <span style={{ width: 12, height: 3, background: '#00F2FE', borderRadius: 2 }} />
                  {strategyName}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#A855F7' }}>
                  <span style={{ width: 12, height: 2, borderTop: '2px dashed #A855F7' }} />
                  S&P 500 (SPY)
                </span>
              </div>
            </div>

            {/* SVG Chart Canvas */}
            {backtesting ? (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ marginRight: 10 }} />
                <span>Simulating chronological trade rebalances...</span>
              </div>
            ) : eqCurve.length > 0 ? (
              <svg
                viewBox={`0 0 ${width} ${height}`}
                style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
              >
                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                  const val = minVal + frac * valRange;
                  const y = getY(val);
                  return (
                    <g key={`grid-${idx}`}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={width - padRight}
                        y2={y}
                        stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.08)'}
                        strokeDasharray="3 3"
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 4}
                        textAnchor="end"
                        fill="#64748B"
                        fontSize="10"
                        fontFamily="var(--font-mono)"
                      >
                        ${Math.round(val).toLocaleString()}
                      </text>
                    </g>
                  );
                })}

                {/* Benchmark SPY Path */}
                <path
                  d={bmPath}
                  fill="none"
                  stroke="#A855F7"
                  strokeWidth="1.6"
                  strokeDasharray="4 3"
                  opacity="0.8"
                />

                {/* Strategy Equity Curve Path */}
                <path
                  d={eqPath}
                  fill="none"
                  stroke="#00F2FE"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />

                {/* Hover Crosshair */}
                {hoverIndex !== null && (
                  <line
                    x1={getX(hoverIndex)}
                    y1={padTop}
                    x2={getX(hoverIndex)}
                    y2={height - padBottom}
                    stroke="rgba(0, 242, 254, 0.45)"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Interactive Mouse Capture */}
                <rect
                  x={padLeft}
                  y={padTop}
                  width={plotWidth}
                  height={plotHeight}
                  fill="transparent"
                  onMouseMove={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const relX = (e.clientX - rect.left) / rect.width;
                    const idx = Math.min(chartPoints - 1, Math.max(0, Math.round(relX * (chartPoints - 1))));
                    setHoverIndex(idx);
                  }}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              </svg>
            ) : (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No backtest simulation available. Click "Run Walk-Forward Backtest".
              </div>
            )}
          </div>

          {/* Rebalance Transaction Ledger Table */}
          {backtestResult && backtestResult.rebalance_log && backtestResult.rebalance_log.length > 0 && (
            <div className="glass-panel" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Rebalance Event Audit Log ({backtestResult.rebalance_log.length} executions)
                </h4>
                <button
                  onClick={handleExportRebalanceCsv}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', padding: '4px 10px' }}
                >
                  <FileSpreadsheet size={13} />
                  <span>Export Log CSV</span>
                </button>
              </div>

              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '6px 8px' }}>Date</th>
                      <th style={{ padding: '6px 8px' }}>Selected Holdings</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Turnover ($)</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Fees + Slip (7 bps)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backtestResult.rebalance_log.map((log, i) => (
                      <tr key={`log-${i}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{log.date}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                            {log.selected_assets.join(', ')}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          ${log.turnover_dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          ${log.fees_dollars.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
