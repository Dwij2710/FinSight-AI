'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  AlertTriangle,
  Sliders,
  RotateCcw,
  TrendingDown,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  FileSpreadsheet,
  RefreshCw,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import {
  StressMacroShockParams,
  StressTestResponseData,
  CrisisReplayResult
} from '../../lib/types';
import { runPortfolioStressTest } from '../../lib/api';
import { ErrorBanner } from '../Common/ErrorBanner';
import { ProvenanceBadge } from '../ProvenanceBadge';
import { exportSeriesToCsv } from '../../lib/chartExport';
import { useTheme } from '../../context/ThemeContext';

export function StressTestingView() {
  const { isDark } = useTheme();
  const [tickerInput, setTickerInput] = useState<string>('AAPL, MSFT, NVDA, GOOGL, AMZN');
  const [capital, setCapital] = useState<number>(100000);

  // Interactive Macro Sliders
  const [marketShockPct, setMarketShockPct] = useState<number>(-20);
  const [rateShockBps, setRateShockBps] = useState<number>(150);
  const [commShockPct, setCommShockPct] = useState<number>(15);
  const [vixShockPct, setVixShockPct] = useState<number>(60);

  // Active View Tab: 'interactive' | 'historical'
  const [activeMode, setActiveMode] = useState<'interactive' | 'historical'>('interactive');

  // API State
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<StressTestResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(false);

  const parsedTickers = tickerInput
    .split(',')
    .map(t => t.trim().toUpperCase())
    .filter(Boolean);

  const fetchStressResults = async () => {
    if (parsedTickers.length === 0) {
      setError('Please provide at least 1 valid stock ticker.');
      return;
    }

    setLoading(true);
    setError(null);

    const defaultW = 100 / parsedTickers.length;
    const weights = parsedTickers.reduce((acc, t) => ({ ...acc, [t]: defaultW }), {});

    const payload: StressMacroShockParams = {
      tickers: parsedTickers,
      weights,
      initial_capital: capital,
      market_shock_pct: marketShockPct,
      rate_shock_bps: rateShockBps,
      commodity_shock_pct: commShockPct,
      vix_shock_pct: vixShockPct
    };

    try {
      const res = await runPortfolioStressTest(payload);
      setData(res.data);
      setIsDemo(!!res.isDemo);
    } catch (err: any) {
      setError(err?.message || 'Failed to simulate scenario stress test.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStressResults();
  }, [marketShockPct, rateShockBps, commShockPct, vixShockPct, capital]);

  const handleResetSliders = () => {
    setMarketShockPct(-20);
    setRateShockBps(150);
    setCommShockPct(15);
    setVixShockPct(60);
  };

  const handleExportCsv = () => {
    if (!data || !data.custom_simulation.asset_breakdown) return;
    const headers = ['Ticker', 'Weight (%)', 'Beta', 'Asset Shock (%)', 'Pre-Shock ($)', 'Post-Shock ($)', 'Dollar Loss ($)'];
    const rows = data.custom_simulation.asset_breakdown.map(a => [
      a.ticker,
      a.weight_pct.toFixed(2),
      a.beta.toFixed(2),
      a.asset_shock_pct.toFixed(2),
      a.pre_shock_value.toFixed(2),
      a.post_shock_value.toFixed(2),
      a.dollar_loss.toFixed(2)
    ]);
    exportSeriesToCsv(`stress_test_breakdown_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const sim = data?.custom_simulation;

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
              background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(245, 158, 11, 0.2))',
              color: 'var(--accent-rose)'
            }}
          >
            <Flame size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: '1.45rem', color: 'var(--text-primary)' }}>
                Scenario Stress Testing & Crisis Replay Studio
              </h2>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(244, 63, 94, 0.12)',
                  color: 'var(--accent-rose)',
                  fontWeight: 600
                }}
              >
                STRESS-01
              </span>
              <ProvenanceBadge source={isDemo ? 'simulated' : 'live'} />
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Evaluate portfolio capital preservation under historical systemic crises and interactive multi-variable macro shocks
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setActiveMode('interactive')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeMode === 'interactive' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              border: activeMode === 'interactive' ? '1px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
              color: activeMode === 'interactive' ? 'var(--accent-rose)' : 'var(--text-secondary)'
            }}
          >
            Interactive Macro Sliders
          </button>
          <button
            onClick={() => setActiveMode('historical')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeMode === 'historical' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              border: activeMode === 'historical' ? '1px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
              color: activeMode === 'historical' ? 'var(--accent-rose)' : 'var(--text-secondary)'
            }}
          >
            Historical Crisis Replays
          </button>
        </div>
      </div>

      {/* Institutional Simulation Disclaimer Banner */}
      <div
        style={{
          background: 'rgba(245, 158, 11, 0.10)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: 10,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}
      >
        <AlertTriangle size={18} color="#F59E0B" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.78rem', color: isDark ? '#FDE68A' : '#92400E', lineHeight: 1.4 }}>
          <strong>INSTITUTIONAL SIMULATION NOTICE:</strong> Stressed valuations are mathematically projected using asset covariance and historical factor sensitivities. Market liquidity freezes and regime breaks during tail events may cause realized drawdowns to exceed modeled parameters.
        </span>
      </div>

      {error && (
        <ErrorBanner
          title="Stress Testing Error"
          error={error}
          onRetry={fetchStressResults}
        />
      )}

      {/* Portfolio Config Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            Portfolio Tickers:
          </label>
          <input
            type="text"
            value={tickerInput}
            onChange={e => setTickerInput(e.target.value)}
            onBlur={fetchStressResults}
            style={{
              flex: 1,
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              padding: '6px 12px',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            Portfolio Capital ($):
          </label>
          <input
            type="number"
            value={capital}
            onChange={e => setCapital(Math.max(1000, Number(e.target.value)))}
            style={{
              width: 140,
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              padding: '6px 10px',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)'
            }}
          />
          <button onClick={fetchStressResults} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Apply</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Interactive Macro Sliders */}
      {activeMode === 'interactive' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 400px) 1fr', gap: 24 }}>
          {/* Controls Panel */}
          <div className="glass-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={18} color="var(--accent-rose)" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Macro Factor Shocks
                </h3>
              </div>
              <button
                onClick={handleResetSliders}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.74rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            </div>

            {/* Slider 1: Equity Market Shock */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Equity Market Shock (S&P / Nifty)
                </label>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                  {marketShockPct}%
                </span>
              </div>
              <input
                type="range"
                min={-50}
                max={0}
                step={1}
                value={marketShockPct}
                onChange={e => setMarketShockPct(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-rose)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>-50% (Systemic Crash)</span>
                <span>0% (Flat)</span>
              </div>
            </div>

            {/* Slider 2: Interest Rate Shock */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Interest Rate Shift (10Y Yield)
                </label>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: rateShockBps >= 0 ? '#F59E0B' : 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                  {rateShockBps >= 0 ? '+' : ''}{rateShockBps} bps
                </span>
              </div>
              <input
                type="range"
                min={-200}
                max={400}
                step={25}
                value={rateShockBps}
                onChange={e => setRateShockBps(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#F59E0B' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>-200 bps (Aggressive Cut)</span>
                <span>+400 bps (Severe Tightening)</span>
              </div>
            </div>

            {/* Slider 3: Commodity / Oil Shock */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Commodity & Oil Spike
                </label>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>
                  {commShockPct >= 0 ? '+' : ''}{commShockPct}%
                </span>
              </div>
              <input
                type="range"
                min={-40}
                max={100}
                step={5}
                value={commShockPct}
                onChange={e => setCommShockPct(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#38BDF8' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>-40% (Deflationary Drop)</span>
                <span>+100% (Supply Shock)</span>
              </div>
            </div>

            {/* Slider 4: VIX Volatility Surge */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  VIX Volatility Surge
                </label>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#A855F7', fontFamily: 'var(--font-mono)' }}>
                  +{vixShockPct}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={300}
                step={10}
                value={vixShockPct}
                onChange={e => setVixShockPct(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#A855F7' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>0% (Normal Vol)</span>
                <span>+300% (Panic Liquidation)</span>
              </div>
            </div>
          </div>

          {/* Results Summary and Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Impact Metric Cards */}
            {sim && (
              <div className="metric-grid">
                <div className="metric-card rose">
                  <div className="metric-label">
                    <span>Portfolio Net Drawdown</span>
                    <TrendingDown size={16} color="var(--accent-rose)" />
                  </div>
                  <div className="metric-value" style={{ fontSize: '1.45rem' }}>
                    {sim.portfolio_impact_pct.toFixed(2)}%
                  </div>
                  <div className="metric-subtext">
                    Total loss: ${Math.abs(sim.dollar_drawdown).toLocaleString()}
                  </div>
                </div>

                <div className="metric-card cyan">
                  <div className="metric-label">
                    <span>Post-Shock Capital</span>
                    <DollarSign size={16} color="var(--accent-cyan)" />
                  </div>
                  <div className="metric-value" style={{ fontSize: '1.45rem' }}>
                    ${sim.post_shock_capital.toLocaleString()}
                  </div>
                  <div className="metric-subtext">
                    From ${sim.initial_capital.toLocaleString()} initial
                  </div>
                </div>

                <div className="metric-card purple">
                  <div className="metric-label">
                    <span>Most Vulnerable Asset</span>
                    <ShieldAlert size={16} color="var(--accent-purple)" />
                  </div>
                  <div className="metric-value" style={{ fontSize: '1.25rem' }}>
                    {sim.worst_asset || '—'}
                  </div>
                  <div className="metric-subtext">
                    Highest downside covariance
                  </div>
                </div>

                <div className="metric-card emerald">
                  <div className="metric-label">
                    <span>Most Resilient Asset</span>
                    <ShieldCheck size={16} color="var(--accent-emerald)" />
                  </div>
                  <div className="metric-value" style={{ fontSize: '1.25rem' }}>
                    {sim.most_resilient_asset || '—'}
                  </div>
                  <div className="metric-subtext">
                    Strongest defensive buffer
                  </div>
                </div>
              </div>
            )}

            {/* Asset-Level Stress Sensitivity Table */}
            {sim && sim.asset_breakdown && (
              <div className="glass-panel" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Asset-Level Stress Breakdown & Covariance Loss
                  </h4>
                  <button
                    onClick={handleExportCsv}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', padding: '4px 10px' }}
                  >
                    <FileSpreadsheet size={13} />
                    <span>Export Breakdown CSV</span>
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px 10px' }}>Ticker</th>
                        <th style={{ padding: '8px 10px' }}>Weight</th>
                        <th style={{ padding: '8px 10px' }}>Beta</th>
                        <th style={{ padding: '8px 10px' }}>Shock (%)</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Pre-Shock ($)</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Post-Shock ($)</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Dollar Loss ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sim.asset_breakdown.map((a, i) => (
                        <tr key={`asset-${i}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                            {a.ticker}
                          </td>
                          <td style={{ padding: '8px 10px' }}>{a.weight_pct.toFixed(1)}%</td>
                          <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>{a.beta.toFixed(2)}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: a.asset_shock_pct < 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                            {a.asset_shock_pct.toFixed(2)}%
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            ${a.pre_shock_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            ${a.post_shock_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent-rose)', fontWeight: 600 }}>
                            ${a.dollar_loss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
      )}

      {/* Mode 2: Historical Crisis Replays */}
      {activeMode === 'historical' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {data && data.crisis_replays && data.crisis_replays.map((crisis, i) => (
              <div
                key={`crisis-${i}`}
                className="glass-panel"
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  borderLeft: '4px solid var(--accent-rose)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {crisis.crisis_name}
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {crisis.date_range}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {crisis.description}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'rgba(255, 255, 255, 0.03)', padding: 12, borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Market Shock</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {crisis.benchmark_shock_pct.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Portfolio Impact</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                      {crisis.portfolio_impact_pct.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Estimated Loss</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                      ${Math.abs(crisis.dollar_drawdown).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Post-Crash Value</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      ${crisis.post_shock_capital.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                  <span>Worst Asset: <strong style={{ color: 'var(--accent-rose)' }}>{crisis.worst_asset || '—'}</strong></span>
                  <span>Resilient: <strong style={{ color: 'var(--accent-emerald)' }}>{crisis.most_resilient_asset || '—'}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
