'use client';

import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Award,
  SlidersHorizontal,
  RefreshCw,
  Clock,
  Sparkles,
  BarChart3,
  Layers,
  ArrowRight,
  HelpCircle,
  Percent,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ModelComparisonData } from '../../lib/types';
import { getModelComparison } from '../../lib/api';
import { ErrorBanner } from '../Common/ErrorBanner';
import { useMarketData } from '../../context/MarketDataContext';

interface ModelComparisonViewProps {
  ticker: string;
}

export function ModelComparisonView({ ticker }: ModelComparisonViewProps) {
  const { isDemoMode } = useMarketData();
  const [data, setData] = useState<ModelComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<number>(30);
  const [testDays, setTestDays] = useState<number>(60);

  const fetchComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getModelComparison(ticker, horizon, testDays);
      setData(res.data);
    } catch (err: any) {
      setError(err?.message || `Failed to evaluate models for ${ticker}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [ticker, horizon, testDays]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background: 'rgba(0, 242, 254, 0.15)',
              color: 'var(--accent-cyan)'
            }}
          >
            <GitCompare size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                Model Comparison Arena: {ticker}
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
                COMP-01
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Side-by-side empirical benchmark of SARIMAX, Quantile Multi-Factor ML, and Deep RL on matching out-of-sample data
            </p>
          </div>
        </div>

        {/* Horizon & Window Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Horizon:</span>
            {[14, 30, 60, 90].map(h => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: horizon === h ? 'rgba(0, 242, 254, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                  border: horizon === h ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  color: horizon === h ? 'var(--accent-cyan)' : 'var(--text-secondary)'
                }}
              >
                {h}D
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Test Window:</span>
            {[30, 60, 90].map(d => (
              <button
                key={d}
                onClick={() => setTestDays(d)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: testDays === d ? 'rgba(168, 85, 247, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                  border: testDays === d ? '1px solid #A855F7' : '1px solid var(--border-subtle)',
                  color: testDays === d ? '#A855F7' : 'var(--text-secondary)'
                }}
              >
                {d}D
              </button>
            ))}
          </div>

          <button
            onClick={fetchComparison}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Re-evaluate</span>
          </button>
        </div>
      </div>

      {error && (
        <ErrorBanner
          error={error}
          onRetry={fetchComparison}
        />
      )}

      {loading && !data && (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <RefreshCw size={32} className="animate-spin" color="var(--accent-cyan)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>
            Evaluating Multi-Model Matrix for {ticker}...
          </h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Fitting SARIMAX autoregressive Kalman filter, Quantile Gradient Boosting, and PPO RL policy on matching test window.
          </p>
        </div>
      )}

      {data && (
        <>
          {/* Consensus Outlook & Synthesis Banner */}
          <div
            className="glass-panel"
            style={{
              padding: '20px 24px',
              borderLeft: `4px solid ${data.consensus.outlook_color}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: `${data.consensus.outlook_color}22`,
                    border: `1px solid ${data.consensus.outlook_color}55`,
                    color: data.consensus.outlook_color,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: data.consensus.outlook_color }} />
                  Consensus: {data.consensus.outlook}
                </span>

                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Agreement: <strong>{data.consensus.agreement_ratio}</strong>
                </span>

                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Current Price: <strong style={{ color: 'var(--text-primary)' }}>${data.current_price.toFixed(2)}</strong>
                </span>
              </div>

              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Test Window: {data.evaluation_window.test_start_date} to {data.evaluation_window.test_end_date} ({data.evaluation_window.test_days} OOS Days)
              </div>
            </div>

            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {data.consensus.synthesis}
            </div>
          </div>

          {/* Category Winners Podium */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16
            }}
          >
            {/* Directional Accuracy Winner */}
            <div className="glass-panel" style={{ padding: '18px 20px', borderTop: '3px solid #00F2FE' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Directional Accuracy
                </span>
                <Award size={16} color="#00F2FE" />
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                {data.category_winners.directional_accuracy.winner}
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#00F2FE', fontFamily: 'monospace', marginBottom: 6 }}>
                {data.category_winners.directional_accuracy.score}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {data.category_winners.directional_accuracy.rationale}
              </div>
            </div>

            {/* Risk-Adjusted Performance Winner */}
            <div className="glass-panel" style={{ padding: '18px 20px', borderTop: '3px solid #10B981' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Risk-Adjusted Performance
                </span>
                <Award size={16} color="#10B981" />
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                {data.category_winners.risk_adjusted_performance.winner}
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10B981', fontFamily: 'monospace', marginBottom: 6 }}>
                {data.category_winners.risk_adjusted_performance.score}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {data.category_winners.risk_adjusted_performance.rationale}
              </div>
            </div>

            {/* Capital Preservation Winner */}
            <div className="glass-panel" style={{ padding: '18px 20px', borderTop: '3px solid #A855F7' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Capital Preservation
                </span>
                <Award size={16} color="#A855F7" />
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                {data.category_winners.capital_preservation.winner}
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#A855F7', fontFamily: 'monospace', marginBottom: 6 }}>
                {data.category_winners.capital_preservation.score}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {data.category_winners.capital_preservation.rationale}
              </div>
            </div>
          </div>

          {/* 3-Column Paradigm Deep Dive */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 20
            }}
          >
            {/* Card 1: SARIMAX */}
            <div className="glass-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    SARIMAX Time Series
                  </h3>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: data.models.sarimax.direction === 'BULLISH' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                      color: data.models.sarimax.direction === 'BULLISH' ? '#10B981' : '#F43F5E'
                    }}
                  >
                    {data.models.sarimax.direction}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {data.models.sarimax.category}
                </div>
              </div>

              {/* Target & Expected Return */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.03)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target {horizon}D Price</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    ${data.models.sarimax.target_price.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Expected Return</div>
                  <div
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: data.models.sarimax.expected_return_pct >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                      fontFamily: 'monospace'
                    }}
                  >
                    {data.models.sarimax.expected_return_pct >= 0 ? '+' : ''}
                    {data.models.sarimax.expected_return_pct.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Confidence Intervals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Uncertainty Bands:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  <span>80% Confidence Band:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    ${data.models.sarimax.confidence_bands.ci_80_lower} - ${data.models.sarimax.confidence_bands.ci_80_upper}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  <span>95% Confidence Band:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    ${data.models.sarimax.confidence_bands.ci_95_lower} - ${data.models.sarimax.confidence_bands.ci_95_upper}
                  </strong>
                </div>
              </div>

              {/* Out of Sample Metrics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Out-of-Sample Empirical Metrics:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Directional Accuracy:</span>
                  <strong style={{ color: '#00F2FE' }}>{data.models.sarimax.metrics.directional_accuracy_pct.toFixed(1)}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Root Mean Squared Error (RMSE):</span>
                  <strong style={{ color: 'var(--text-primary)' }}>${data.models.sarimax.metrics.rmse.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Mean Absolute Error (MAE):</span>
                  <strong style={{ color: 'var(--text-primary)' }}>${data.models.sarimax.metrics.mae.toFixed(2)}</strong>
                </div>
              </div>

              {/* Qualitative Notes */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 'auto' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Profile: </strong>
                {data.models.sarimax.strengths} {data.models.sarimax.limitations}
              </div>
            </div>

            {/* Card 2: Quantile ML */}
            <div className="glass-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    Quantile Multi-Factor ML
                  </h3>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: data.models.quantile_ml.direction === 'BULLISH' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                      color: data.models.quantile_ml.direction === 'BULLISH' ? '#10B981' : '#F43F5E'
                    }}
                  >
                    {data.models.quantile_ml.direction}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {data.models.quantile_ml.category}
                </div>
              </div>

              {/* Target & Expected Return */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.03)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Median (q50) Target</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    ${data.models.quantile_ml.target_price.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Expected Shift</div>
                  <div
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: data.models.quantile_ml.expected_return_pct >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                      fontFamily: 'monospace'
                    }}
                  >
                    {data.models.quantile_ml.expected_return_pct >= 0 ? '+' : ''}
                    {data.models.quantile_ml.expected_return_pct.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Quantile Envelope */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quantile Risk Envelope:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  <span>Downside Floor (q10):</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--accent-rose)' }}>
                    ${data.models.quantile_ml.confidence_bands.q10_lower}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  <span>Upside Ceiling (q90):</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--accent-emerald)' }}>
                    ${data.models.quantile_ml.confidence_bands.q90_upper}
                  </strong>
                </div>
              </div>

              {/* Out of Sample Metrics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Out-of-Sample Empirical Metrics:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Directional Accuracy:</span>
                  <strong style={{ color: '#00F2FE' }}>{data.models.quantile_ml.metrics.directional_accuracy_pct.toFixed(1)}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Root Mean Squared Error (RMSE):</span>
                  <strong style={{ color: 'var(--text-primary)' }}>${data.models.quantile_ml.metrics.rmse.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Mean Absolute Error (MAE):</span>
                  <strong style={{ color: 'var(--text-primary)' }}>${data.models.quantile_ml.metrics.mae.toFixed(2)}</strong>
                </div>
              </div>

              {/* Qualitative Notes */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 'auto' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Profile: </strong>
                {data.models.quantile_ml.strengths} {data.models.quantile_ml.limitations}
              </div>
            </div>

            {/* Card 3: Deep RL Policy */}
            <div className="glass-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    Deep RL Agent (PPO)
                  </h3>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: 'rgba(168, 85, 247, 0.15)',
                      color: '#A855F7'
                    }}
                  >
                    {data.models.rl_agent.current_action}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {data.models.rl_agent.category}
                </div>
              </div>

              {/* Target & Expected Return */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.03)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>OOS Cumulative Return</div>
                  <div
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: data.models.rl_agent.out_of_sample_return_pct >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                      fontFamily: 'monospace'
                    }}
                  >
                    {data.models.rl_agent.out_of_sample_return_pct >= 0 ? '+' : ''}
                    {data.models.rl_agent.out_of_sample_return_pct.toFixed(2)}%
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Benchmark Return</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {data.benchmark.return_pct >= 0 ? '+' : ''}
                    {data.benchmark.return_pct.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Position & Transaction Fees */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Allocation Stance:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  <span>Current Target Allocation:</span>
                  <strong style={{ color: 'var(--accent-cyan)' }}>{data.models.rl_agent.target_allocation}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  <span>Execution Fee Drag:</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {data.models.rl_agent.metrics.commission_drag_bps} bps fee + {data.models.rl_agent.metrics.slippage_drag_bps} bps slip
                  </span>
                </div>
              </div>

              {/* Out of Sample Metrics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Out-of-Sample Empirical Metrics:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Sharpe Ratio (Rf=4%):</span>
                  <strong style={{ color: '#10B981' }}>{data.models.rl_agent.metrics.sharpe_ratio.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Max Drawdown:</span>
                  <strong style={{ color: 'var(--accent-rose)' }}>-{data.models.rl_agent.metrics.max_drawdown_pct.toFixed(1)}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Trade Win Rate:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{data.models.rl_agent.metrics.win_rate_pct.toFixed(1)}%</strong>
                </div>
              </div>

              {/* Qualitative Notes */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 'auto' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Profile: </strong>
                {data.models.rl_agent.strengths} {data.models.rl_agent.limitations}
              </div>
            </div>
          </div>

          {/* Unified Comparison Scorecard Table */}
          <div className="glass-panel" style={{ padding: '24px 28px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} color="var(--accent-cyan)" />
              Unified Out-of-Sample Scorecard
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 12px' }}>Quantitative Model</th>
                    <th style={{ padding: '10px 12px' }}>Directional Signal</th>
                    <th style={{ padding: '10px 12px' }}>{horizon}D Expected Return</th>
                    <th style={{ padding: '10px 12px' }}>OOS Accuracy / Win Rate</th>
                    <th style={{ padding: '10px 12px' }}>OOS Error (RMSE)</th>
                    <th style={{ padding: '10px 12px' }}>Downside Risk</th>
                    <th style={{ padding: '10px 12px' }}>Optimal Application</th>
                  </tr>
                </thead>
                <tbody>
                  {/* SARIMAX */}
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      SARIMAX Autoregressive
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ color: data.models.sarimax.direction === 'BULLISH' ? '#10B981' : '#F43F5E', fontWeight: 700 }}>
                        {data.models.sarimax.direction}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 600 }}>
                      {data.models.sarimax.expected_return_pct >= 0 ? '+' : ''}
                      {data.models.sarimax.expected_return_pct.toFixed(1)}%
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                      {data.models.sarimax.metrics.directional_accuracy_pct.toFixed(1)}%
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                      ${data.models.sarimax.metrics.rmse.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      95% CI: ${data.models.sarimax.confidence_bands.ci_95_lower}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      Cyclical mean-reversion & seasonal cycles
                    </td>
                  </tr>

                  {/* Quantile ML */}
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Quantile Multi-Factor ML
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ color: data.models.quantile_ml.direction === 'BULLISH' ? '#10B981' : '#F43F5E', fontWeight: 700 }}>
                        {data.models.quantile_ml.direction}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 600 }}>
                      {data.models.quantile_ml.expected_return_pct >= 0 ? '+' : ''}
                      {data.models.quantile_ml.expected_return_pct.toFixed(1)}%
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                      {data.models.quantile_ml.metrics.directional_accuracy_pct.toFixed(1)}%
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                      ${data.models.quantile_ml.metrics.rmse.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--accent-rose)' }}>
                      q10 Floor: ${data.models.quantile_ml.confidence_bands.q10_lower}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      Multi-factor macro risk & asymmetric tails
                    </td>
                  </tr>

                  {/* RL Agent */}
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Deep RL Agent (PPO)
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ color: '#A855F7', fontWeight: 700 }}>
                        {data.models.rl_agent.current_action}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 600 }}>
                      {data.models.rl_agent.out_of_sample_return_pct >= 0 ? '+' : ''}
                      {data.models.rl_agent.out_of_sample_return_pct.toFixed(1)}% OOS
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                      {data.models.rl_agent.metrics.win_rate_pct.toFixed(1)}% Win Rate
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      Sharpe {data.models.rl_agent.metrics.sharpe_ratio.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--accent-rose)' }}>
                      -{data.models.rl_agent.metrics.max_drawdown_pct.toFixed(1)}% MDD
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      Dynamic active cash preservation & tactical timing
                    </td>
                  </tr>

                  {/* Passive Benchmark */}
                  <tr>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Passive Buy & Hold Benchmark
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>HOLD</td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {data.benchmark.return_pct >= 0 ? '+' : ''}
                      {data.benchmark.return_pct.toFixed(1)}%
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>N/A</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>N/A</td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--accent-rose)' }}>
                      -{data.benchmark.max_drawdown_pct.toFixed(1)}% MDD
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                      Low-turnover beta exposure
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
