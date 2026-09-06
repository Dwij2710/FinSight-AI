'use client';

import React, { useState } from 'react';
import { TrendingUp, RefreshCw, AlertTriangle, ShieldCheck, Database, Radio } from 'lucide-react';
import { TickerBanner } from './TickerBanner';
import { useMarketData } from '../context/MarketDataContext';

export function Header({
  activeTicker,
  onSelectTicker
}: {
  activeTicker: string;
  onSelectTicker: (t: string) => void;
}) {
  const {
    backendHealth,
    freshnessState,
    refreshQuotes,
    isDemoMode,
    setDemoMode,
    lastUpdated
  } = useMarketData();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshQuotes();
    setRefreshing(false);
  };

  const popularTickers = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'RELIANCE.NS', 'TCS.NS'];

  const getStatusDisplay = () => {
    if (isDemoMode) {
      return {
        text: 'Demo Sandbox (Manual)',
        color: '#A855F7',
        glow: '0 0 10px rgba(168, 85, 247, 0.5)',
        tooltip: 'Explicit demo sandbox mode activated by user. Real live data is disabled.'
      };
    }
    if (freshnessState === 'LIVE') {
      return {
        text: `FastAPI Live (${backendHealth?.latencyMs || 45}ms)`,
        color: 'var(--accent-emerald)',
        glow: '0 0 10px #10B981',
        tooltip: 'Connected to live FastAPI backend and market data providers.'
      };
    }
    if (freshnessState === 'LIVE_DELAYED') {
      return {
        text: 'Live (Delayed / Cached)',
        color: 'var(--accent-amber)',
        glow: '0 0 10px #F59E0B',
        tooltip: 'Data is being served from fresh server-side cache.'
      };
    }
    if (freshnessState === 'BACKEND_STARTING') {
      return {
        text: 'Backend Starting... (Retry)',
        color: 'var(--accent-amber)',
        glow: '0 0 10px #F59E0B',
        tooltip: 'Backend is waking up from idle cold start. Click to check status.'
      };
    }
    if (freshnessState === 'PROVIDER_ERROR') {
      return {
        text: 'Provider Offline (Retry)',
        color: '#EF4444',
        glow: '0 0 10px #EF4444',
        tooltip: 'Live market provider connection timed out. Click to retry.'
      };
    }
    return {
      text: 'Checking Connectivity...',
      color: 'var(--text-muted)',
      glow: 'none',
      tooltip: 'Probing FastAPI /health endpoint...'
    };
  };

  const status = getStatusDisplay();

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
                <span className="badge badge-cyan" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>v2.0 Production</span>
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

          {/* Backend Connectivity Status & Sandbox Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Demo Sandbox Toggle */}
            <button
              onClick={() => setDemoMode(!isDemoMode)}
              title={isDemoMode ? "Click to switch to Live Market Data" : "Click to enable offline Sandbox Simulation"}
              style={{
                background: isDemoMode ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: isDemoMode ? '1px solid #A855F7' : '1px solid var(--border-subtle)',
                color: isDemoMode ? '#D8B4FE' : 'var(--text-muted)',
                borderRadius: 20,
                padding: '5px 11px',
                fontSize: '0.72rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
            >
              <Database size={11} />
              <span>{isDemoMode ? 'Sandbox Active' : 'Sandbox Mode'}</span>
            </button>

            {/* Live Connection Pill */}
            <div
              onClick={handleRefresh}
              title={status.tooltip}
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
                  background: status.color,
                  boxShadow: status.glow
                }}
              />
              <span>{status.text}</span>
              <RefreshCw size={11} className={refreshing ? 'spin' : ''} style={{ opacity: 0.7 }} />
            </div>
          </div>
        </div>
      </header>

      {/* Backend Waking State Alert Banner */}
      {freshnessState === 'BACKEND_STARTING' && !isDemoMode && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.35)',
          padding: '8px 24px',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          color: '#FDE68A'
        }}>
          <AlertTriangle size={15} color="#F59E0B" />
          <span>
            <strong>Connecting to live financial API:</strong> If the cloud backend is cold-starting, please allow ~30–45s for the container to initialize.
          </span>
          <button
            onClick={handleRefresh}
            style={{
              background: '#F59E0B',
              color: '#080B11',
              border: 'none',
              borderRadius: 6,
              padding: '2px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Retry Now
          </button>
        </div>
      )}

      {/* Explicit Demo Sandbox Warning Banner */}
      {isDemoMode && (
        <div style={{
          background: 'rgba(168, 85, 247, 0.14)',
          borderBottom: '1px solid rgba(168, 85, 247, 0.4)',
          padding: '7px 24px',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          color: '#E9D5FF'
        }}>
          <Radio size={14} color="#C084FC" />
          <span>
            <strong>DEMO / SIMULATION SANDBOX ACTIVE:</strong> Values shown are generated for offline development and testing.
          </span>
          <button
            onClick={() => setDemoMode(false)}
            style={{
              background: 'transparent',
              border: '1px solid #C084FC',
              color: '#C084FC',
              borderRadius: 6,
              padding: '1px 8px',
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            Switch to Live Data
          </button>
        </div>
      )}

      {/* Live Market Ticker Banner */}
      <TickerBanner activeTicker={activeTicker} onSelectTicker={onSelectTicker} />
    </div>
  );
}
