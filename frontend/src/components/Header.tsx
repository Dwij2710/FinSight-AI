'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Activity, RefreshCw, Server, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { checkBackendHealth } from '../lib/api';
import { BackendHealthStatus } from '../lib/types';
import { TickerBanner } from './TickerBanner';

export function Header({
  activeTicker,
  onSelectTicker
}: {
  activeTicker: string;
  onSelectTicker: (t: string) => void;
}) {
  const [healthInfo, setHealthInfo] = useState<BackendHealthStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const testConnection = async () => {
    setChecking(true);
    const res = await checkBackendHealth();
    setHealthInfo(res);
    setChecking(false);
  };

  useEffect(() => {
    testConnection();
    const timer = setInterval(testConnection, 30000);
    return () => clearInterval(timer);
  }, []);

  const popularTickers = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'RELIANCE.NS', 'TCS.NS'];

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      <header style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(8, 11, 17, 0.90)',
        backdropFilter: 'blur(20px)',
        padding: '14px 28px'
      }}>
        <div style={{
          maxWidth: 1440,
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
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'var(--grad-cyan-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0, 242, 254, 0.35)'
            }}>
              <TrendingUp size={22} color="#080B11" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                  FinSight <span className="text-gradient">AI</span>
                </h1>
                <span className="badge badge-cyan" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>v2.0 Vercel</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                Quantitative Intelligence & Deep Learning Forecasting
              </p>
            </div>
          </div>

          {/* Quick Ticker Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Markets:</span>
            {popularTickers.map(t => (
              <button
                key={t}
                onClick={() => onSelectTicker(t)}
                style={{
                  background: activeTicker === t ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: activeTicker === t ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  color: activeTicker === t ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  borderRadius: 8,
                  padding: '4px 9px',
                  fontSize: '0.75rem',
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
              title={
                healthInfo?.online
                  ? `FastAPI Uptime: ${healthInfo.uptime_seconds ? Math.round(healthInfo.uptime_seconds / 60) + 'm' : 'Active'} | YFinance: ${healthInfo.yfinance_reachable ? 'Reachable' : 'Cached/Limited'} | Click to recheck`
                  : 'Backend offline or spinning up. Running browser simulation engine. Click to retry.'
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 20,
                padding: '5px 13px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              <span
                className="pulse-dot"
                style={{
                  background: healthInfo?.online ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                  boxShadow: healthInfo?.online ? '0 0 10px #10B981' : '0 0 10px #F59E0B'
                }}
              />
              <span>
                {healthInfo === null ? (
                  'Checking Backend...'
                ) : healthInfo.online ? (
                  `FastAPI Live (${healthInfo.latencyMs || 45}ms${healthInfo.yfinance_reachable === false ? ' • cached' : ''})`
                ) : (
                  'Simulation Engine'
                )}
              </span>
              <RefreshCw size={11} className={checking ? 'spin' : ''} style={{ opacity: 0.7 }} />
            </div>
          </div>
        </div>
      </header>

      {/* Live Market Ticker Banner */}
      <TickerBanner activeTicker={activeTicker} onSelectTicker={onSelectTicker} />
    </div>
  );
}
