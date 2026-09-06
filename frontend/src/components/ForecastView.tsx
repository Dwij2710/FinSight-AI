'use client';

import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, AlertTriangle, BarChart3, TrendingUp, Info } from 'lucide-react';
import { ForecastData } from '../lib/types';
import { getForecast } from '../lib/api';
import { MultiLineChart } from './Common/Charts';
import { ProvenanceBadge } from './ProvenanceBadge';
import { ErrorBanner } from './Common/ErrorBanner';
import { useMarketData } from '../context/MarketDataContext';

export function ForecastView({ ticker }: { ticker: string }) {
  const { isDemoMode, setDemoMode } = useMarketData();
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'forecast' | 'decomp' | 'backtest'>('forecast');

  // SARIMAX Parameters
  const [p, setP] = useState(2);
  const [d, setD] = useState(1);
  const [q, setQ] = useState(2);
  const [forecastDays, setForecastDays] = useState(14);
  const [runBacktest, setRunBacktest] = useState(true);

  // Date Range Controls
  const todayStr = new Date().toISOString().slice(0, 10);
  const oneYearAgoStr = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const [startDate, setStartDate] = useState(oneYearAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [datePreset, setDatePreset] = useState<'6M' | '1Y' | '2Y' | '5Y' | 'custom'>('1Y');

  const setPreset = (preset: '6M' | '1Y' | '2Y' | '5Y') => {
    setDatePreset(preset);
    const d = new Date();
    if (preset === '6M') d.setMonth(d.getMonth() - 6);
    else if (preset === '1Y') d.setFullYear(d.getFullYear() - 1);
    else if (preset === '2Y') d.setFullYear(d.getFullYear() - 2);
    else if (preset === '5Y') d.setFullYear(d.getFullYear() - 5);
    setStartDate(d.toISOString().slice(0, 10));
    setEndDate(todayStr);
  };

  const isDateRangeValid = startDate < endDate && endDate <= todayStr;

  useEffect(() => {
    let isCurrent = true;
    const currentTicker = ticker.trim().toUpperCase();

    // Reset previous stock data immediately to prevent showing stale results
    setData(null);
    setError(null);
    setLoading(true);

    const executeRun = async () => {
      if (!isDateRangeValid) {
        if (isCurrent) {
          setError('Invalid date range: Start date must be before end date and not in the future.');
          setLoading(false);
        }
        return;
      }

      try {
        const res = await getForecast({
          ticker: currentTicker,
          start_date: startDate,
          end_date: endDate,
          p,
          d,
          q,
          forecast_period: forecastDays,
          run_backtest: runBacktest
        });

        if (!isCurrent) return;

        // Discard response if user already switched to another ticker
        if (res.data?.ticker && res.data.ticker.toUpperCase() !== currentTicker) {
          return;
        }

        setData(res.data);
        setIsDemo(!!res.isDemo);
      } catch (err: any) {
        if (isCurrent) {
          setError(err?.message || `SARIMAX quantitative forecast failed for ${currentTicker}.`);
          setData(null);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    executeRun();

    return () => {
      isCurrent = false;
    };
  }, [ticker, isDemoMode, startDate, endDate, p, d, q, forecastDays, runBacktest]);

  const runModel = async () => {
    if (!isDateRangeValid) {
      setError('Invalid date range: Start date must be before end date and not in the future.');
      return;
    }

    setLoading(true);
    setError(null);
    const currentTicker = ticker.trim().toUpperCase();
    try {
      const res = await getForecast({
        ticker: currentTicker,
        start_date: startDate,
        end_date: endDate,
        p,
        d,
        q,
        forecast_period: forecastDays,
        run_backtest: runBacktest
      });
      if (res.data?.ticker && res.data.ticker.toUpperCase() !== currentTicker) {
        return;
      }
      setData(res.data);
      setIsDemo(!!res.isDemo);
    } catch (err: any) {
      setError(err?.message || `SARIMAX quantitative forecast failed for ${currentTicker}.`);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Derive price metrics
  const lastActual = data?.history && data.history.length > 0
    ? data.history.filter(h => h.actual !== undefined).slice(-1)[0]?.actual
    : undefined;
  const lastPredicted = data?.predictions && data.predictions.length > 0
    ? data.predictions[data.predictions.length - 1].predicted_mean
    : undefined;
  const projectedChangePct = (lastActual && lastPredicted)
    ? ((lastPredicted - lastActual) / lastActual) * 100
    : 0;

  // Prepare chart series for Forecast
  const historyDates = data?.history.map(h => h.date) || [];
  const predDates = data?.predictions.map(p => p.date) || [];
  const allDates = [...historyDates, ...predDates];

  const actualSeries = [
    ...(data?.history.map(h => h.actual ?? null) || []),
    ...predDates.map(() => null)
  ];

  const fittedSeries = [
    ...(data?.history.map(h => h.fitted ?? null) || []),
    ...predDates.map(() => null)
  ];

  const futureSeries = [
    ...historyDates.map(() => null),
    ...(data?.predictions.map(p => p.predicted_mean) || [])
  ];

  const lowerBounds = [
    ...historyDates.map(() => null),
    ...(data?.predictions.map(p => p.lower_bound) || [])
  ];

  const upperBounds = [
    ...historyDates.map(() => null),
    ...(data?.predictions.map(p => p.upper_bound) || [])
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner / Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h2 style={{ fontSize: '1.6rem', margin: 0 }}>
              Stock Price <span className="text-gradient">Forecasting</span>
            </h2>
            {lastActual && (
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
                {ticker} ${lastActual.toFixed(2)}
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Autoregressive integrated moving average (SARIMAX) with seasonal decomposition & backtest validation.
          </p>
        </div>

        {/* Provenance Badge */}
        {(data || isDemo) && (
          <ProvenanceBadge
            source={data?.data_source}
            fetchedAt={data?.fetched_at}
            isDemo={isDemo}
          />
        )}
      </div>

      {/* Model Agreement & Consensus Banner */}
      {data && (
        <div style={{
          background: Math.abs(projectedChangePct) > 1.2
            ? (projectedChangePct > 0 ? 'rgba(16, 185, 129, 0.07)' : 'rgba(239, 68, 68, 0.07)')
            : 'rgba(59, 130, 246, 0.07)',
          border: `1px solid ${
            Math.abs(projectedChangePct) > 1.2
              ? (projectedChangePct > 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)')
              : 'rgba(59, 130, 246, 0.25)'
          }`,
          borderRadius: 12,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: projectedChangePct >= 0 ? '#10B981' : '#EF4444',
              boxShadow: projectedChangePct >= 0 ? '0 0 8px #10B981' : '0 0 8px #EF4444'
            }} />
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              Model Agreement & Projection:
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {Math.abs(projectedChangePct) > 1.0
                ? (projectedChangePct > 0
                    ? `High Confidence Bullish — Projected +${projectedChangePct.toFixed(2)}% over next ${forecastDays} trading sessions (Fit Accuracy: ${data.metrics.accuracy.toFixed(1)}%)`
                    : `Bearish Divergence — Projected ${projectedChangePct.toFixed(2)}% downward consolidation over next ${forecastDays} sessions (Fit Accuracy: ${data.metrics.accuracy.toFixed(1)}%)`)
                : `Neutral Consolidation — Projected within tight range (${projectedChangePct >= 0 ? '+' : ''}${projectedChangePct.toFixed(2)}%)`}
            </span>
          </div>

          <span style={{
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)'
          }}>
            Confidence: 95% Interval [${data.predictions[0]?.lower_bound.toFixed(2) || '—'} - ${data.predictions[data.predictions.length - 1]?.upper_bound.toFixed(2) || '—'}]
          </span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <ErrorBanner
          title="Forecasting Pipeline Notice"
          error={error}
          onRetry={runModel}
          onDismiss={() => setError(null)}
          suggestedAction="Verify that the ticker symbol exists or switch to Sandbox Mode to test the UI."
          onSwitchToSandbox={() => setDemoMode(true)}
        />
      )}

      {/* Loading Transition Indicator */}
      {loading && !data && (
        <div
          className="glass-panel"
          style={{
            padding: '36px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(0, 242, 254, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)'
            }}
          >
            <TrendingUp size={22} />
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>
            Computing SARIMAX Quantitative Forecast for <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{ticker}</span>...
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            Fitting autoregressive polynomials, calculating confidence intervals, and running holdout backtest.
          </div>
        </div>
      )}

      {/* Metrics Row */}
      {data && (
        <div className="metric-grid">
          <div className="metric-card cyan">
            <div className="metric-label">
              <span>Fit Accuracy</span>
              <TrendingUp size={16} color="var(--accent-cyan)" />
            </div>
            <div className="metric-value">{data.metrics.accuracy.toFixed(1)}%</div>
            <div className="metric-subtext">In-sample historical fit score</div>
          </div>

          <div className="metric-card emerald">
            <div className="metric-label">
              <span>Stationarity (ADF)</span>
              <CheckCircle size={16} color="var(--accent-emerald)" />
            </div>
            <div className="metric-value" style={{ fontSize: '1.4rem', marginTop: 4 }}>
              {data.adf_test.is_stationary ? 'Stationary ✅' : 'Non-Stationary ⚠️'}
            </div>
            <div className="metric-subtext">p-value: {data.adf_test.p_value ? data.adf_test.p_value.toFixed(4) : '<0.05'}</div>
          </div>

          <div className="metric-card purple">
            <div className="metric-label">
              <span>Avg Error (RMSE)</span>
              <BarChart3 size={16} color="var(--accent-purple)" />
            </div>
            <div className="metric-value">${data.metrics.rmse.toFixed(2)}</div>
            <div className="metric-subtext">Root mean squared deviation</div>
          </div>

          <div className="metric-card rose">
            <div className="metric-label">
              <span>Forecast Horizon</span>
              <Info size={16} color="var(--accent-rose)" />
            </div>
            <div className="metric-value">{forecastDays} Days</div>
            <div className="metric-subtext">Next business days projection</div>
          </div>
        </div>
      )}

      {/* Main Panel & Controls Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
        {/* Visualizer Panel */}
        <div className="glass-panel" style={{ minHeight: 460 }}>
          {/* Sub Tab Switcher */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, overflowX: 'auto' }}>
            <button
              onClick={() => setActiveSubTab('forecast')}
              style={{
                background: activeSubTab === 'forecast' ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
                border: activeSubTab === 'forecast' ? '1px solid var(--accent-cyan)' : 'none',
                color: activeSubTab === 'forecast' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                padding: '7px 16px',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              📈 Price Forecast
            </button>
            <button
              onClick={() => setActiveSubTab('decomp')}
              style={{
                background: activeSubTab === 'decomp' ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
                border: activeSubTab === 'decomp' ? '1px solid var(--accent-cyan)' : 'none',
                color: activeSubTab === 'decomp' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                padding: '7px 16px',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🔬 Decomposition (Trend/Season)
            </button>
            <button
              onClick={() => setActiveSubTab('backtest')}
              style={{
                background: activeSubTab === 'backtest' ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
                border: activeSubTab === 'backtest' ? '1px solid var(--accent-cyan)' : 'none',
                color: activeSubTab === 'backtest' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                padding: '7px 16px',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🎯 Hold-Out Backtest Validation
            </button>
          </div>

          {/* Sub Views Content */}
          {activeSubTab === 'forecast' && (
            <MultiLineChart
              dates={allDates}
              series={[
                { name: 'Actual Price', color: '#00F2FE', data: actualSeries, strokeWidth: 2 },
                { name: 'Fitted SARIMAX', color: '#8B5CF6', data: fittedSeries, dash: true },
                { name: `Forecast (${forecastDays}D)`, color: '#10B981', data: futureSeries, strokeWidth: 2.5 }
              ]}
              confidenceBounds={{
                lower: lowerBounds,
                upper: upperBounds,
                color: '#00F2FE'
              }}
              title={`${ticker} Quantitative Price Trajectory`}
              height={360}
            />
          )}

          {activeSubTab === 'decomp' && (
            data?.decomposition && data.decomposition.trend && data.decomposition.trend.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <MultiLineChart
                  dates={data.decomposition.dates || historyDates}
                  series={[
                    { name: 'Underlying Trend', color: '#00F2FE', data: data.decomposition.trend || [], strokeWidth: 2 }
                  ]}
                  title="Underlying Macro Trend Component (Centered Moving Average)"
                  height={190}
                />
                <MultiLineChart
                  dates={data.decomposition.dates || historyDates}
                  series={[
                    { name: 'Seasonal Cycle', color: '#8B5CF6', data: data.decomposition.seasonal || [] }
                  ]}
                  title="Cyclical Seasonal Component"
                  height={150}
                />
                <MultiLineChart
                  dates={data.decomposition.dates || historyDates}
                  series={[
                    { name: 'Residual Noise', color: '#F43F5E', data: data.decomposition.resid || [] }
                  ]}
                  title="Stationary Residual Noise Component"
                  height={150}
                />
              </div>
            ) : (
              <div className="glass-panel" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                <Info size={32} style={{ marginBottom: 12, opacity: 0.6 }} />
                <h4 style={{ color: '#F8FAFC', marginBottom: 6 }}>Seasonal Decomposition Unavailable</h4>
                <p style={{ fontSize: '0.88rem', maxWidth: 460, margin: '8px auto 0' }}>
                  {data?.decomposition?.error || 'Decomposition requires at least 2 seasonal cycles (24 trading observations) to isolate cyclical momentum.'}
                </p>
              </div>
            )
          )}

          {activeSubTab === 'backtest' && (
            data?.backtest && data.backtest.actual && data.backtest.actual.length > 0 ? (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '10px 16px',
                  marginBottom: 16,
                  flexWrap: 'wrap',
                  gap: 12
                }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Holdout Accuracy</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                      {data.backtest.accuracy.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Validation RMSE</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                      ${data.backtest.rmse.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Validation MAPE</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)' }}>
                      {data.backtest.mape.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Test Window</span>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {data.backtest.dates.length} Days Blind
                    </div>
                  </div>
                </div>

                <MultiLineChart
                  dates={data.backtest.dates}
                  series={[
                    { name: 'Actual Price (Blind Test)', color: '#00F2FE', data: data.backtest.actual, strokeWidth: 2 },
                    { name: 'Model Prediction', color: '#10B981', data: data.backtest.predicted, dash: true, strokeWidth: 2 }
                  ]}
                  title="Blind Hold-Out Validation: Actual vs Out-of-Sample Predictions"
                  height={320}
                />
              </div>
            ) : (
              <div className="glass-panel" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                <Info size={32} style={{ marginBottom: 12, opacity: 0.6 }} />
                <h4 style={{ color: '#F8FAFC', marginBottom: 6 }}>Hold-Out Backtest Validation Unavailable</h4>
                <p style={{ fontSize: '0.88rem', maxWidth: 460, margin: '8px auto 0' }}>
                  {data?.backtest?.error || 'Hold-out backtest validation requires at least 40 trading days of historical data for blind testing.'}
                </p>
              </div>
            )
          )}
        </div>

        {/* Hyperparameter & Date Horizon Controls Sidebar */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360, width: '100%' }}>
          {/* Historical Training Horizon */}
          <div>
            <h3 style={{ fontSize: '1.05rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, marginBottom: 12 }}>
              Historical Date Horizon
            </h3>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {(['6M', '1Y', '2Y', '5Y'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  style={{
                    flex: 1,
                    background: datePreset === p ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: datePreset === p ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    color: datePreset === p ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    borderRadius: 6,
                    padding: '5px 0',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Date Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 3 }}>
                  START DATE
                </label>
                <input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 3 }}>
                  END DATE
                </label>
                <input
                  type="date"
                  value={endDate}
                  max={todayStr}
                  min={startDate}
                  onChange={e => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>
            </div>

            {!isDateRangeValid && (
              <span style={{ fontSize: '0.72rem', color: '#EF4444', display: 'block', marginTop: 4 }}>
                Start date must be before end date.
              </span>
            )}
          </div>

          <h3 style={{ fontSize: '1.05rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, marginTop: 4 }}>
            Model Hyperparameters
          </h3>

          <div>
            <label className="input-label">AutoRegressive lag (p): {p}</label>
            <input
              type="range"
              min="0"
              max="5"
              value={p}
              onChange={e => setP(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
          </div>

          <div>
            <label className="input-label">Differencing degree (d): {d}</label>
            <input
              type="range"
              min="0"
              max="2"
              value={d}
              onChange={e => setD(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
          </div>

          <div>
            <label className="input-label">Moving Average lag (q): {q}</label>
            <input
              type="range"
              min="0"
              max="5"
              value={q}
              onChange={e => setQ(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
          </div>

          <div>
            <label className="input-label">Forecast Horizon (Days): {forecastDays}</label>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={forecastDays}
              onChange={e => setForecastDays(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <input
              type="checkbox"
              id="backtestCheck"
              checked={runBacktest}
              onChange={e => setRunBacktest(e.target.checked)}
              style={{ accentColor: 'var(--accent-cyan)' }}
            />
            <label htmlFor="backtestCheck" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Run 30-day blind backtest
            </label>
          </div>

          <button
            onClick={runModel}
            disabled={loading || !isDateRangeValid}
            className="btn-primary"
            style={{ width: '100%', marginTop: 8 }}
          >
            <Play size={16} />
            {loading ? 'Fitting SARIMAX...' : 'Re-run Forecast'}
          </button>
        </div>
      </div>
    </div>
  );
}
