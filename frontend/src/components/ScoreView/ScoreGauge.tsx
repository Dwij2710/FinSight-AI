'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Award,
  Sparkles,
  BarChart2,
  Activity,
  DollarSign,
  Scale
} from 'lucide-react';
import { FinSightScoreData } from '../../lib/types';

interface ScoreGaugeProps {
  scoreData: FinSightScoreData;
  loading?: boolean;
}

export function ScoreGauge({ scoreData, loading }: ScoreGaugeProps) {
  const {
    ticker,
    overall_score,
    rating,
    rating_color,
    subscores,
    weights_used,
    top_positive_contributors,
    top_negative_detractors,
    synthesis,
    as_of_date
  } = scoreData;

  // SVG Circular Gauge calculation
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overall_score / 100) * circumference;

  const subscoreMeta = [
    {
      key: 'technical' as const,
      label: 'Technical Health',
      icon: Activity,
      score: subscores.technical,
      weight: weights_used.technical ? `${(weights_used.technical * 100).toFixed(0)}%` : '25%',
      color: '#00F2FE'
    },
    {
      key: 'momentum' as const,
      label: 'Momentum Dynamics',
      icon: TrendingUp,
      score: subscores.momentum,
      weight: weights_used.momentum ? `${(weights_used.momentum * 100).toFixed(0)}%` : '20%',
      color: '#A855F7'
    },
    {
      key: 'fundamental' as const,
      label: 'Fundamental Quality',
      icon: DollarSign,
      score: subscores.fundamental,
      weight: weights_used.fundamental ? `${(weights_used.fundamental * 100).toFixed(0)}%` : 'N/A',
      color: '#10B981',
      unavailable: subscores.fundamental === null
    },
    {
      key: 'sentiment' as const,
      label: 'News & Sentiment',
      icon: Sparkles,
      score: subscores.sentiment,
      weight: weights_used.sentiment ? `${(weights_used.sentiment * 100).toFixed(0)}%` : '15%',
      color: '#F59E0B'
    },
    {
      key: 'risk' as const,
      label: 'Risk & Capital Preservation',
      icon: Scale,
      score: subscores.risk,
      weight: weights_used.risk ? `${(weights_used.risk * 100).toFixed(0)}%` : '15%',
      color: '#38BDF8'
    }
  ];

  return (
    <div className="glass-panel" style={{ padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
      {/* Background ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${rating_color}1A 0%, transparent 70%)`,
          pointerEvents: 'none'
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 24,
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              padding: 8,
              borderRadius: 8,
              background: 'rgba(0, 242, 254, 0.12)',
              color: 'var(--accent-cyan)'
            }}
          >
            <Award size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              FinSight AI Composite Score
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: 'var(--text-muted)',
                  fontWeight: 500
                }}
              >
                SCORE-01
              </span>
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Explainable multi-factor quantitative equity rating ({as_of_date})
            </p>
          </div>
        </div>

        <div
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            background: `${rating_color}18`,
            border: `1px solid ${rating_color}40`,
            color: rating_color,
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: rating_color }} />
          {rating}
        </div>
      </div>

      {/* Main Grid: Left Gauge + Middle Subscores + Right Factor Attribution */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
          alignItems: 'center'
        }}
      >
        {/* Left: Circular SVG Gauge */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px 0'
          }}
        >
          <div style={{ position: 'relative', width: 170, height: 170 }}>
            <svg width="170" height="170" viewBox="0 0 170 170" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background Track */}
              <circle
                cx="85"
                cy="85"
                r={radius}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="12"
                fill="none"
              />
              {/* Animated Foreground Progress */}
              <circle
                cx="85"
                cy="85"
                r={radius}
                stroke={rating_color}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                style={{
                  transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
                  filter: `drop-shadow(0 0 8px ${rating_color}80)`
                }}
              />
            </svg>

            {/* Central Score Indicator */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  fontSize: '2.4rem',
                  fontWeight: 800,
                  color: rating_color,
                  lineHeight: 1,
                  fontFamily: 'monospace'
                }}
              >
                {overall_score.toFixed(0)}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>
                OUT OF 100
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              textAlign: 'center'
            }}
          >
            {ticker} Quantitative Rating
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Calibrated 5-Factor Institutional Matrix
          </div>
        </div>

        {/* Middle: 5 Subscores Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h4 style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Factor Dimension Subscores
          </h4>

          {subscoreMeta.map(sub => {
            const Icon = sub.icon;
            return (
              <div key={sub.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
                    <Icon size={14} color={sub.color} />
                    <span>{sub.label}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 2 }}>
                      ({sub.weight})
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, color: sub.unavailable ? 'var(--text-muted)' : sub.color, fontFamily: 'monospace' }}>
                    {sub.unavailable ? 'N/A' : `${sub.score?.toFixed(1)} / 100`}
                  </div>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.06)',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: sub.unavailable ? '0%' : `${sub.score || 0}%`,
                      background: sub.color,
                      borderRadius: 3,
                      transition: 'width 0.8s ease'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Factor Attribution (Top Contributors & Detractors) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Positive Contributors */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--accent-emerald)',
                marginBottom: 6,
                textTransform: 'uppercase'
              }}
            >
              <TrendingUp size={14} />
              <span>Top Positive Catalysts</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {top_positive_contributors && top_positive_contributors.length > 0 ? (
                top_positive_contributors.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 6,
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      fontSize: '0.75rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.35
                    }}
                  >
                    <strong style={{ color: 'var(--accent-emerald)', marginRight: 4 }}>
                      +{c.impact.toFixed(1)} pts ({c.dimension}):
                    </strong>
                    {c.factor}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  No significant positive catalyst outliers detected.
                </div>
              )}
            </div>
          </div>

          {/* Negative Detractors */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--accent-rose)',
                marginBottom: 6,
                textTransform: 'uppercase'
              }}
            >
              <AlertTriangle size={14} />
              <span>Key Risk Considerations</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {top_negative_detractors && top_negative_detractors.length > 0 ? (
                top_negative_detractors.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 6,
                      background: 'rgba(244, 63, 94, 0.08)',
                      border: '1px solid rgba(244, 63, 94, 0.2)',
                      fontSize: '0.75rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.35
                    }}
                  >
                    <strong style={{ color: 'var(--accent-rose)', marginRight: 4 }}>
                      -{d.impact.toFixed(1)} pts ({d.dimension}):
                    </strong>
                    {d.factor}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  No severe downside factor detractors identified.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Synthesis Narrative Footer */}
      {synthesis && (
        <div
          style={{
            marginTop: 20,
            padding: '12px 16px',
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10
          }}
        >
          <Sparkles size={16} color="var(--accent-cyan)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Quantitative Synthesis: </strong>
            {synthesis}
          </div>
        </div>
      )}
    </div>
  );
}
