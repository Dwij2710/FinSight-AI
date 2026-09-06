'use client';

import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, AlertTriangle, BarChart3, TrendingUp, Info } from 'lucide-react';
import { ForecastData } from '../lib/types';
import { getForecast } from '../lib/api';
import { MultiLineChart } from './Common/Charts';
import { ProvenanceBadge } from './ProvenanceBadge';
import { ErrorBanner } from './Common/ErrorBanner';

export function ForecastView({ ticker }: { ticker: string }) {
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

  const runModel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getForecast({
        ticker,
        p,
        d,
        q,
        forecast_period: forecastDays,
        run_backtest: runBacktest
      });
      setData(res.data);
      setIsDemo(!!res.isDemo);
    } catch (err: any) {
      setError(err?.message || 'SARIMAX quantitative forecast failed.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runModel();
  }, [ticker]);

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
        <ProvenanceBadge
          source={data?.data_source}
          fetchedAt={data?.fetched_at}
          isDemo={isDemo}
        />
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
          suggestedAction="Verify that the ticker symbol exists or try smaller (p, d, q) orders."
        />
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
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24, alignItems: 'start' }}>
        {/* Visualizer Panel */}
        <div className="glass-panel" style={{ minHeight: 460 }}>
          {/* Sub Tab Switcher */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
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
                cursor: 'pointer'
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
                cursor: 'pointer'
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
                cursor: 'pointer'
              }}
            >
              🎯 Backtest Validation
            </button>
          </div>

          {loading ? (
            <div style={{ height: 350, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div className="pulse-dot" style={{ width: 14, height: 14, background: 'var(--accent-cyan)' }} />
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Training SARIMAX & fitting curves...</div>
            </div>
          ) : data ? (
            activeSubTab === 'forecast' ? (
              <div>
                <MultiLineChart
                  title={`${ticker} Actual History vs Model Fit vs Future Forecast`}
                  dates={allDates}
                  height={380}
                  series={[
                    { name: 'Actual Price', color: '#3B82F6', data: actualSeries, strokeWidth: 2 },
                    { name: 'Model Fit', color: '#10B981', data: fittedSeries, dash: true, strokeWidth: 1.5 },
                    { name: 'Future Prediction', color: '#00F2FE', data: futureSeries, strokeWidth: 2.5 }
                  ]}
                  confidenceBounds={{ lower: lowerBounds, upper: upperBounds }}
                />
                <div style={{ marginTop: 20, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>* Shaded cyan area represents 95% forecast confidence interval.</span>
                  <span>* Model auto-regularized against overfitting.</span>
                </div>
              </div>
            ) : activeSubTab === 'decomp' ? (
              data.decomposition && data.decomposition.trend && data.decomposition.trend.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <MultiLineChart
                    title="Underlying Macro Trend"
                    dates={data.decomposition.dates?.slice(-100) || []}
                    height={150}
                    series={[{ name: 'Trend', color: '#00F2FE', data: data.decomposition.trend?.slice(-100) || [] }]}
                  />
                  <MultiLineChart
                    title="Seasonal Cycles"
                    dates={data.decomposition.dates?.slice(-100) || []}
                    height={120}
                    series={[{ name: 'Seasonality', color: '#10B981', data: data.decomposition.seasonal?.slice(-100) || [] }]}
                  />
                  <MultiLineChart
                    title="Residual Noise"
                    dates={data.decomposition.dates?.slice(-100) || []}
                    height={120}
                    series={[{ name: 'Residual', color: '#F43F5E', data: data.decomposition.resid?.slice(-100) || [], dash: true }]}
                  />
                </div>
              ) : (
                <div className="glass-panel" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                  <Info size={32} style={{ marginBottom: 12, opacity: 0.6 }} />
                  <h4 style={{ color: '#F8FAFC', marginBottom: 6 }}>Seasonal Decomposition Unavailable</h4>
                  <p style={{ fontSize: '0.88rem', maxWidth: 460, margin: '8px auto 0' }}>
                    {data.decomposition?.error || 'Seasonal decomposition requires at least 2 complete seasonal cycles (24+ trading days) of price history.'}
                  </p>
                </div>
              )
            ) : (
              data.backtest && data.backtest.actual && data.backtest.actual.length > 0 ? (
                <div>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                    <div className="badge badge-emerald">Backtest Accuracy: {data.backtest.accuracy.toFixed(1)}%</div>
                    <div className="badge badge-purple">Hold-Out RMSE: ${data.backtest.rmse.toFixed(2)}</div>
                  </div>
                  <MultiLineChart
                    title="Out-of-Sample 30-Day Blind Backtest"
                    dates={data.backtest.dates}
                    height={320}
                    series={[
                      { name: 'Real Actual Price', color: '#3B82F6', data: data.backtest.actual, strokeWidth: 2.5 },
                      { name: 'Model Blind Prediction', color: '#F43F5E', data: data.backtest.predicted, dash: true, strokeWidth: 2 }
                    ]}
                  />
                </div>
              ) : (
                <div className="glass-panel" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                  <Info size={32} style={{ marginBottom: 12, opacity: 0.6 }} />
                  <h4 style={{ color: '#F8FAFC', marginBottom: 6 }}>Hold-Out Backtest Validation Unavailable</h4>
                  <p style={{ fontSize: '0.88rem', maxWidth: 460, margin: '8px auto 0' }}>
                    {data.backtest?.error || 'Hold-out backtest validation requires at least 40 trading days of historical data for blind testing.'}
                  </p>
                </div>
              )
            )
          ) : null}
        </div>

        {/* Hyperparameter Controls Sidebar */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
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
            disabled={loading}
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
