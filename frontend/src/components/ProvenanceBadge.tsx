'use client';

import React from 'react';
import { DataSourceType } from '../lib/types';
import { Activity, Clock, Database, AlertCircle } from 'lucide-react';

interface ProvenanceBadgeProps {
  source?: DataSourceType;
  fetchedAt?: string;
  isDemo?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function ProvenanceBadge({
  source,
  fetchedAt,
  isDemo,
  style,
  className = ''
}: ProvenanceBadgeProps) {
  // If no verified data has been loaded and not in demo mode, do not render a live badge
  if (!source && !isDemo) {
    return null;
  }

  // Determine effective source
  const effectiveSource: DataSourceType = isDemo ? 'simulated' : source!;

  // Format timestamp
  const formatTime = (ts?: string) => {
    if (!ts) return 'Just now';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC';
    } catch {
      return 'Just now';
    }
  };

  // Compute minutes ago if cache
  const computeMinsAgo = (ts?: string) => {
    if (!ts) return 0;
    try {
      const diffMs = Date.now() - new Date(ts).getTime();
      return Math.max(0, Math.floor(diffMs / 60000));
    } catch {
      return 0;
    }
  };

  if (effectiveSource === 'live') {
    return (
      <div
        className={`badge-provenance-live ${className}`}
        title={`Live market data retrieved from yfinance at ${fetchedAt || 'current session'}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 10px',
          borderRadius: 20,
          fontSize: '0.72rem',
          fontWeight: 600,
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          color: '#34D399',
          letterSpacing: '0.02em',
          ...style
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: '#10B981',
            boxShadow: '0 0 8px #10B981',
            display: 'inline-block',
            animation: 'pulse 1.8s infinite ease-in-out'
          }}
        />
        <span>Live (yfinance)</span>
        <span style={{ color: 'rgba(52, 211, 153, 0.7)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
          • {formatTime(fetchedAt)}
        </span>
      </div>
    );
  }

  if (effectiveSource === 'cache') {
    const mins = computeMinsAgo(fetchedAt);
    return (
      <div
        className={`badge-provenance-cache ${className}`}
        title={`In-memory cached market telemetry from ${fetchedAt || 'recent request'}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 10px',
          borderRadius: 20,
          fontSize: '0.72rem',
          fontWeight: 600,
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          color: '#FBBF24',
          letterSpacing: '0.02em',
          ...style
        }}
      >
        <Clock size={11} color="#F59E0B" />
        <span>Cache ({mins > 0 ? `${mins}m ago` : 'recent'})</span>
        <span style={{ color: 'rgba(251, 191, 36, 0.7)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
          • {formatTime(fetchedAt)}
        </span>
      </div>
    );
  }

  // Simulated / Fallback
  return (
    <div
      className={`badge-provenance-sim ${className}`}
      title="Zero-downtime offline fallback: Quantitative Monte Carlo / Brownian motion synthetic telemetry"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: '0.72rem',
        fontWeight: 600,
        background: 'rgba(99, 102, 241, 0.12)',
        border: '1px solid rgba(99, 102, 241, 0.35)',
        color: '#A5B4FC',
        letterSpacing: '0.02em',
        ...style
      }}
    >
      <Database size={11} color="#818CF8" />
      <span>Simulated/Fallback</span>
      <span style={{ color: 'rgba(165, 180, 252, 0.7)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
        • Offline Engine
      </span>
    </div>
  );
}
