'use client';

import React, { useState, useEffect } from 'react';
import { Globe, AlertTriangle, Layers, Compass, BarChart, History, CheckCircle } from 'lucide-react';
import { TftData } from '../lib/types';
import { analyzeTft } from '../lib/api';
import { RiskGauge, AllocationBars, MultiLineChart } from './Common/Charts';
import { ErrorBanner } from './Common/ErrorBanner';

export function TftView({ ticker }: { ticker: string }) {
  const [data, setData] = useState<TftData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTft = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeTft(ticker);
      setData(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to compute multivariate factor regime model.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTft();
  }, [ticker]);

  const attentionItems = (data?.attention_weights || []).map(a => ({
    label: a.factor,
    value: a.weight_pct
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.6rem', marginBottom: 4 }}>
          Multi-Variate <span className="text-gradient">Transformer (TFT)</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Correlates multiple macroeconomic factors simultaneously: S&P 500, VIX, 10Y Yields, Crude Oil, and Gold.
        </p>
      </div>

      {error && (
        <ErrorBanner
          title="Macro Multi-Factor Pipeline Notice"
          error={error}
          onRetry={fetchTft}
          onDismiss={() => setError(null)}
          suggestedAction="Ensure the backend service has network connectivity to download macro factor series."
        />
      )}

      {/* Top Regime & Macro State Bar */}
      {data && (
        <div className="glass-panel" style={{ padding: '18px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>AI-Detected Market Regime</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: 4 }}>
                {data.regime}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{data.regime_desc}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>S&P 500 Macro Level</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC', marginTop: 4 }}>
                {data.sp500_price.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>Broad market trend</div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>VIX Volatility Index</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: data.vix > 20 ? 'var(--accent-rose)' : 'var(--accent-emerald)', marginTop: 4 }}>
                {data.vix.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>Market fear & implied volatility</div>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Anomaly Risk Gauge & Attention Weights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 24 }}>
        {/* Isolation Forest Macro Anomaly */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={20} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1.15rem' }}>Macro Anomaly Risk (Isolation Forest)</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', alignSelf: 'flex-start', marginBottom: 16 }}>
            Scans multi-variate signatures for Black Swan environment deviations.
          </p>

          {data ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <RiskGauge
                value={data.anomaly_analysis.risk_score}
                label="Macro Environment Risk"
                sublabel={data.anomaly_analysis.message}
              />
              <div style={{ marginTop: 12 }}>
                <span className={`badge ${data.anomaly_analysis.is_anomaly ? 'badge-rose' : 'badge-emerald'}`}>
                  {data.anomaly_analysis.is_anomaly ? '🚨 Anomalous State Detected' : '✅ Normal Equilibrium'}
                </span>
              </div>
            </div>
          ) : (
            <div className="pulse-dot" style={{ background: 'var(--accent-cyan)' }} />
          )}
        </div>

        {/* Transformer Attention Weights */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={20} color="var(--accent-cyan)" />
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Transformer Factor Attention Weights</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Relative mathematical importance assigned to each global macro variable.
              </p>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <AllocationBars items={attentionItems} />
          </div>
        </div>
      </div>

      {/* Grid: Historical Lookalike & Custom Macro Shocks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: 24 }}>
        {/* Historical Lookalike */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <History size={20} color="var(--accent-purple)" />
            <h3 style={{ fontSize: '1.15rem' }}>Historical Macro Lookalike (KNN)</h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            K-Nearest Neighbors search for the past historical day with the highest multi-variate similarity to today.
          </p>

          {data?.lookalike ? (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Closest Historical Match:</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.95rem' }}>
                  {data.lookalike.matched_date}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Similarity Score:</span>
                <span style={{ fontWeight: 700, color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
                  {data.lookalike.similarity.toFixed(1)}%
                </span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Follow-up 30-Day Move Then:</span>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: data.lookalike.future_return >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                }}>
                  {data.lookalike.future_return >= 0 ? `+${data.lookalike.future_return.toFixed(1)}%` : `${data.lookalike.future_return.toFixed(1)}%`}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Scanning historical nearest neighbors...</div>
          )}
        </div>

        {/* Custom Macro Shocks Simulation */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Compass size={20} color="var(--accent-emerald)" />
            <h3 style={{ fontSize: '1.15rem' }}>Macro Shock Simulation Scenarios</h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Predicted asset response under hypothetical macroeconomic shocks.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data?.scenarios.map(sc => (
              <div
                key={sc.scenario}
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
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#F8FAFC' }}>{sc.scenario}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Projected Price: ${sc.projected_price}</div>
                </div>
                <div style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: sc.impact_pct >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                }}>
                  {sc.impact_pct >= 0 ? `+${sc.impact_pct.toFixed(1)}%` : `${sc.impact_pct.toFixed(1)}%`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
