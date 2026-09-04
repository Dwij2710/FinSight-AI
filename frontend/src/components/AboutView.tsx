'use client';

import React from 'react';
import { ShieldCheck, Server, Cpu, ExternalLink, Code2, AlertTriangle, Layers } from 'lucide-react';

export function AboutView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1000, margin: '0 auto' }}>
      {/* Hero */}
      <div className="glass-panel" style={{ textAlign: 'center', padding: '36px 24px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: 10 }}>
          About <span className="text-gradient">FinSight AI</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: 700, margin: '0 auto 20px', lineHeight: 1.6 }}>
          An advanced quantitative intelligence platform unifying time-series econometrics, Modern Portfolio Theory, FinBERT natural language sentiment, and deep reinforcement learning trading agents.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className="badge badge-cyan">Next.js 14 on Vercel</span>
          <span className="badge badge-emerald">FastAPI on Render</span>
          <span className="badge badge-purple">PyTorch & Stable-Baselines3</span>
        </div>
      </div>

      {/* Architecture Breakdown */}
      <div className="glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Server size={22} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.25rem' }}>Decoupled Production Architecture</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '18px 20px' }}>
            <h4 style={{ color: 'var(--accent-cyan)', fontSize: '1rem', marginBottom: 6 }}>1. Edge Frontend (Vercel)</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              React 18 & Next.js delivering instant sub-second global responses, custom responsive SVG charting, dark-mode glassmorphic aesthetics, and offline demo fallback.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '18px 20px' }}>
            <h4 style={{ color: 'var(--accent-emerald)', fontSize: '1rem', marginBottom: 6 }}>2. AI Engine (FastAPI on Render)</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Containerized Python runtime hosting heavy machine learning workloads, PyTorch tensor calculations, yfinance live ingestion, and RL policy simulations.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '18px 20px' }}>
            <h4 style={{ color: 'var(--accent-purple)', fontSize: '1rem', marginBottom: 6 }}>3. Quantitative Core</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Statistical modeling using statsmodels SARIMAX, scipy portfolio optimization, scikit-learn isolation forests, and gymnasium trading environments.
            </p>
          </div>
        </div>
      </div>

      {/* Author & Disclaimer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {/* Author Card */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Code2 size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.15rem' }}>Author</h3>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC', marginBottom: 4 }}>
            Dwij Prajapati
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Quantitative developer passionate about applying machine learning and reinforcement learning to algorithmic trading and modern web experiences.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="glass-panel" style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <AlertTriangle size={20} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1.15rem', color: 'var(--accent-amber)' }}>Academic Disclaimer</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            This application is built strictly for educational, research, and academic demonstration purposes.
            Stock market predictions, AI trade signals, and portfolio optimizations should not be construed as investment or financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
