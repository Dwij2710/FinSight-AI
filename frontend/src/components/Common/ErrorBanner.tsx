'use client';

import React, { useState } from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, XCircle, Info } from 'lucide-react';

interface ErrorBannerProps {
  title?: string;
  error: string | null | Error;
  onRetry?: () => void | Promise<void>;
  onDismiss?: () => void;
  variant?: 'error' | 'warning' | 'info';
  suggestedAction?: string;
}

export function ErrorBanner({
  title = 'Institutional Pipeline Notice',
  error,
  onRetry,
  onDismiss,
  variant = 'error',
  suggestedAction
}: ErrorBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);

  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;
  const isMultiLine = errorMessage.includes('\n') || errorMessage.length > 180;
  const firstLine = errorMessage.split('\n')[0];

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  const colors = {
    error: {
      border: 'rgba(244, 63, 94, 0.4)',
      bg: 'rgba(38, 14, 22, 0.75)',
      accent: 'var(--accent-rose, #F43F5E)',
      badge: 'rgba(244, 63, 94, 0.15)'
    },
    warning: {
      border: 'rgba(245, 158, 11, 0.4)',
      bg: 'rgba(38, 28, 14, 0.75)',
      accent: 'var(--accent-amber, #F59E0B)',
      badge: 'rgba(245, 158, 11, 0.15)'
    },
    info: {
      border: 'rgba(0, 242, 254, 0.4)',
      bg: 'rgba(14, 26, 38, 0.75)',
      accent: 'var(--accent-cyan, #00F2FE)',
      badge: 'rgba(0, 242, 254, 0.15)'
    }
  }[variant];

  return (
    <div
      className="glass-panel"
      style={{
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bg,
        padding: '16px 20px',
        borderRadius: '12px',
        margin: '12px 0 20px 0',
        backdropFilter: 'blur(16px)',
        boxShadow: `0 8px 24px -6px ${colors.badge}`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: colors.badge,
              color: colors.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <AlertCircle size={20} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                {title}
              </h4>
              <span
                style={{
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  backgroundColor: colors.badge,
                  color: colors.accent
                }}
              >
                {variant}
              </span>
            </div>

            <p style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: '0.86rem', margin: 0, lineHeight: 1.4 }}>
              {isMultiLine && !expanded ? `${firstLine.slice(0, 160)}...` : errorMessage}
            </p>

            {suggestedAction && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-muted, #64748B)' }}>
                <Info size={13} color={colors.accent} />
                <span>Tip: {suggestedAction}</span>
              </div>
            )}

            {isMultiLine && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.accent,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 0',
                  marginTop: '4px',
                  fontWeight: 500
                }}
              >
                {expanded ? (
                  <>
                    <ChevronUp size={14} /> Collapse diagnostics
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} /> View full traceback diagnostics
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {onRetry && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                borderRadius: '8px'
              }}
            >
              <RefreshCw size={13} className={retrying ? 'animate-spin' : ''} />
              <span>{retrying ? 'Retrying...' : 'Retry'}</span>
            </button>
          )}

          {onDismiss && (
            <button
              onClick={onDismiss}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #64748B)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Dismiss"
            >
              <XCircle size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
