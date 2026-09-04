'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Shield, Flame, Activity, ArrowUpRight, BarChart2 } from 'lucide-react';
import { PortfolioData } from '../lib/types';
import { getPortfolioOptimization } from '../lib/api';
import { MultiLineChart, CorrelationHeatmap, AllocationBars } from './Common/Charts';

export function PortfolioView() {
  const defaultTickers = 'RELIANCE.NS, TCS.NS, HDFCBANK.NS, INFY.NS, ICICIBANK.NS';
  const [tickerInput, setTickerInput] = useState(defaultTickers);
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStrategy, setActiveStrategy] = useState<'sharpe' | 'vol'>('sharpe');

  const runOptimization = async (inputStr?: string) => {
    setLoading(true);
    const parsed = (inputStr || tickerInput)
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(Boolean);

    const res = await getPortfolioOptimization({ tickers: parsed });
    setData(res.data);
    setLoading(false);
  };

  useEffect(() => {
    runOptimization();
  }, []);

  const setPreset = (preset: string) => {
    setTickerInput(preset);
    runOptimization(preset);
  };

  // Extract allocation items
  const activeWeights = activeStrategy === 'sharpe'
    ? (data?.max_sharpe.weights || {})
    : (data?.min_volatility.weights || {});

  const allocationItems = Object.entries(activeWeights).map(([label, val]) => ({
    label: label.replace('.NS', ''),
    value: val
  }));

  // Build cumulative chart series
  const cumDates = data?.cumulative_growth?.dates || [];
  const cumSeries = data?.cumulative_growth?.series
    ? Object.entries(data.cumulative_growth.series).map(([k, vals], idx) => ({
        name: k === 'benchmark' ? 'NIFTY 50 (Benchmark)' : k,
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
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Markowitz Efficient Frontier, risk-adjusted Sharpe maximization, correlation matrix, and crash stress-testing.
          </p>
        </div>

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
      </div>

      {data && (
        <>
          {/* Performance Comparison Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Flame size={20} color="var(--accent-cyan)" />
                  <h3 style={{ fontSize: '1.1rem' }}>Max Sharpe Portfolio</h3>
                </div>
                <span className="badge badge-cyan">Optimal Return</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Expected Return</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    +{data.max_sharpe.return.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Volatility</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#F8FAFC' }}>
                    {data.max_sharpe.volatility.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sharpe Ratio</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {data.max_sharpe.sharpe_ratio.toFixed(2)}
                  </div>
                </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={20} color="var(--accent-emerald)" />
                  <h3 style={{ fontSize: '1.1rem' }}>Minimum Volatility</h3>
                </div>
                <span className="badge badge-emerald">Safest Defense</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Expected Return</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    +{data.min_volatility.return.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Volatility</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#F8FAFC' }}>
                    {data.min_volatility.volatility.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sharpe Ratio</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    {data.min_volatility.sharpe_ratio.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Allocation & Growth Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 24, alignItems: 'stretch' }}>
            {/* Cumulative Growth Chart */}
            <div className="glass-panel">
              <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>
                Performance Comparison (Growth of ₹1 / $1)
              </h3>
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
                  {activeStrategy === 'sharpe' ? 'Optimal Weights (Sharpe)' : 'Safe Weights (Min Vol)'}
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
    </div>
  );
}
