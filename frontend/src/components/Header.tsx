'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Activity, RefreshCw, Server, Zap } from 'lucide-react';
import { checkBackendHealth } from '../lib/api';

export function Header({
  activeTicker,
  onSelectTicker
}: {
  activeTicker: string;
  onSelectTicker: (t: string) => void;
}) {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  const testConnection = async () => {
    setChecking(true);
    const res = await checkBackendHealth();
    setBackendOnline(res.online);
    setLatency(res.latencyMs || null);
    setChecking(false);
  };

  useEffect(() => {
    testConnection();
    const timer = setInterval(testConnection, 30000);
    return () => clearInterval(timer);
  }, []);

  const popularTickers = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'RELIANCE.NS', 'TCS.NS'];

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(8, 11, 17, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '16px 28px'
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'var(--grad-cyan-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 242, 254, 0.35)'
          }}>
            <TrendingUp size={24} color="#080B11" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                FinSight <span className="text-gradient">AI</span>
              </h1>
              <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>v2.0 Vercel</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              Quantitative Intelligence & Deep Learning Forecasting
            </p>
          </div>
        </div>

        {/* Quick Ticker Quick-Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Markets:</span>
          {popularTickers.map(t => (
            <button
              key={t}
              onClick={() => onSelectTicker(t)}
              style={{
                background: activeTicker === t ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: activeTicker === t ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                color: activeTicker === t ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                borderRadius: 8,
                padding: '5px 10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {t.replace('.NS', '')}
            </button>
          ))}
        </div>

        {/* Backend Connectivity Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            onClick={testConnection}
            title="Click to refresh backend health check"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: '0.78rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <span
              className="pulse-dot"
              style={{
                background: backendOnline ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                boxShadow: backendOnline ? '0 0 10px #10B981' : '0 0 10px #F59E0B'
              }}
            />
            <span>
              {backendOnline === null ? (
                'Checking Backend...'
              ) : backendOnline ? (
                `FastAPI Live (${latency || 45}ms)`
              ) : (
                'Simulation Engine'
              )}
            </span>
            <RefreshCw size={12} className={checking ? 'spin' : ''} style={{ opacity: 0.7 }} />
          </div>
        </div>
      </div>
    </header>
  );
}
