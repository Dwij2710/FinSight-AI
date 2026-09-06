'use client';

import React from 'react';
import { ShieldAlert, Scale, AlertTriangle, FileText } from 'lucide-react';

interface DisclaimerProps {
  compact?: boolean;
}

export function Disclaimer({ compact = false }: DisclaimerProps) {
  if (compact) {
    return (
      <div
        className="glass-panel"
        style={{
          border: '1px solid rgba(245, 158, 11, 0.25)',
          background: 'rgba(38, 28, 14, 0.65)',
          padding: '10px 16px',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: '0.76rem',
          color: 'var(--text-secondary)'
        }}
      >
        <ShieldAlert size={16} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
        <span>
          <strong style={{ color: 'var(--accent-amber)' }}>Institutional Disclaimer:</strong> Not financial advice.
          Simulations, statistical models, and quantitative forecasts are for informational and educational purposes only.
          No forward returns are guaranteed.
        </span>
      </div>
    );
  }

  return (
    <section
      aria-label="Regulatory and Financial Disclaimer"
      style={{
        borderTop: '1px solid rgba(245, 158, 11, 0.2)',
        background: 'linear-gradient(180deg, rgba(14, 18, 28, 0.85) 0%, rgba(8, 11, 17, 0.98) 100%)',
        padding: '24px 28px',
        margin: '32px 0 0 0'
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              padding: '6px',
              borderRadius: 8,
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--accent-amber)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Scale size={18} />
          </div>
          <div>
            <h4
              style={{
                fontSize: '0.88rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--accent-amber)',
                margin: 0
              }}
            >
              Regulatory & Quantitative Methodology Disclosure
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Non-dismissible compliance disclosure for algorithmic intelligence tools
            </span>
          </div>
        </div>

        <p
          style={{
            fontSize: '0.78rem',
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            margin: 0
          }}
        >
          <strong>NOT FINANCIAL ADVICE:</strong> FinSight AI is an engineering and quantitative research platform designed
          for informational, analytical, and academic purposes. FinSight AI, its creators, contributors, and hosting
          operators are not registered investment advisers, broker-dealers, or certified financial analysts under any
          jurisdiction (including the U.S. Securities and Exchange Commission or SEBI). Nothing contained herein constitutes
          a solicitation, recommendation, endorsement, or offer to buy or sell any security, derivative, or financial
          instrument.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            paddingTop: 8,
            borderTop: '1px solid var(--border-subtle)'
          }}
        >
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>Model Approximations:</strong> SARIMAX, Quantile Regressors,
            Deep Reinforcement Learning policies, and Modern Portfolio Theory optimizers are statistical abstractions.
            They operate on historical observations subject to regime shifts, black-swan shocks, and structural breaks.
          </div>
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>Execution Realism:</strong> Simulation outputs incorporate
            assumed transaction costs (5 bps commission, 2 bps slippage) and out-of-sample holdout partitions, but cannot
            reproduce real-world order book liquidity, market impact, or latency.
          </div>
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>Capital at Risk:</strong> Trading in financial markets carries
            inherent risk of substantial or total capital loss. You should consult a licensed financial advisor before making
            any capital deployment decisions.
          </div>
        </div>
      </div>
    </section>
  );
}
