'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Sliders,
  RefreshCw
} from 'lucide-react';
import { useAlerts } from '../../context/AlertContext';
import { useTicker } from '../../context/TickerContext';
import { AlertConditionType } from '../../lib/types';

interface AlertCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTicker?: string;
}

const CONDITION_PRESETS: { type: AlertConditionType; label: string; icon: string; defaultVal: number; hint: string }[] = [
  { type: 'PRICE_ABOVE', label: 'Price Above ($)', icon: '📈', defaultVal: 200, hint: 'Triggers when stock price reaches or exceeds target price' },
  { type: 'PRICE_BELOW', label: 'Price Below ($)', icon: '📉', defaultVal: 150, hint: 'Triggers when stock price drops to or below target price' },
  { type: 'PCT_CHANGE_ABOVE', label: '24h Change Above (%)', icon: '🚀', defaultVal: 3.0, hint: 'Triggers on intraday surge above threshold percentage' },
  { type: 'PCT_CHANGE_BELOW', label: '24h Change Below (%)', icon: '⚠️', defaultVal: -3.0, hint: 'Triggers on intraday plunge below threshold percentage' },
  { type: 'SCORE_ABOVE', label: 'FinSight Score Above', icon: '✨', defaultVal: 75, hint: 'Triggers when AI composite rating reaches high conviction' },
  { type: 'SCORE_BELOW', label: 'FinSight Score Below', icon: '🛑', defaultVal: 40, hint: 'Triggers when AI composite rating deteriorates into sell zone' },
  { type: 'RSI_OVERBOUGHT', label: 'RSI Overbought (>=)', icon: '🔥', defaultVal: 70, hint: 'Triggers when RSI indicates technical overbought exhaustion' },
  { type: 'RSI_OVERSOLD', label: 'RSI Oversold (<=)', icon: '❄️', defaultVal: 30, hint: 'Triggers when RSI indicates technical oversold bounce territory' },
];

export function AlertCenterModal({ isOpen, onClose, defaultTicker }: AlertCenterModalProps) {
  const { activeTicker } = useTicker();
  const {
    multiAlerts,
    addMultiConditionAlert,
    removeAlert,
    toggleAlert,
    checkAlertsNow,
    isChecking
  } = useAlerts();

  const effectiveDefault = (defaultTicker || activeTicker || 'AAPL').toUpperCase();
  const [activeTab, setActiveTab] = useState<'manage' | 'create'>('manage');
  const [ticker, setTicker] = useState(effectiveDefault);
  const [conditionType, setConditionType] = useState<AlertConditionType>('PRICE_ABOVE');
  const [thresholdValue, setThresholdValue] = useState<number>(200);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTicker(effectiveDefault);
    }
  }, [isOpen, effectiveDefault]);

  if (!isOpen) return null;

  const handlePresetSelect = (preset: typeof CONDITION_PRESETS[0]) => {
    setConditionType(preset.type);
    setThresholdValue(preset.defaultVal);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const sym = ticker.trim().toUpperCase();
    if (!sym) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid stock ticker symbol.' });
      return;
    }
    if (isNaN(thresholdValue)) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid numerical threshold.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await addMultiConditionAlert(sym, conditionType, thresholdValue);
      if (ok) {
        setStatusMsg({ type: 'success', text: `Alert successfully set for ${sym}!` });
        setTimeout(() => {
          setActiveTab('manage');
          setStatusMsg(null);
        }, 800);
      } else {
        setStatusMsg({ type: 'error', text: 'Alert already exists or invalid parameters.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to create alert.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCount = multiAlerts.filter(a => a.is_active).length;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 7, 15, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: 16
    }}
    onClick={onClose}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-active)',
        borderRadius: 16,
        width: '100%',
        maxWidth: 680,
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        animation: 'modalSlideIn 0.25s ease forwards'
      }}
      onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(0, 242, 254, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)'
            }}>
              <Bell size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Multi-Condition Alert Engine</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Real-time price thresholds, score regime changes & technical crossovers
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={checkAlertsNow}
              disabled={isChecking}
              className="btn-secondary"
              style={{
                fontSize: '0.78rem',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              title="Evaluate conditions against latest quotes"
            >
              <RefreshCw size={13} className={isChecking ? 'spin' : ''} />
              <span>{isChecking ? 'Checking...' : 'Check Now'}</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 4
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 24px',
          background: 'var(--bg-secondary)'
        }}>
          <button
            onClick={() => setActiveTab('manage')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'manage' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              color: activeTab === 'manage' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'manage' ? 600 : 400,
              padding: '12px 16px',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Active Alerts ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'create' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              color: activeTab === 'create' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'create' ? 600 : 400,
              padding: '12px 16px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Plus size={14} />
            <span>New Alert</span>
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {statusMsg && (
            <div style={{
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: statusMsg.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${statusMsg.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
              color: statusMsg.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)'
            }}>
              {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {activeTab === 'manage' ? (
            <div>
              {multiAlerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <Bell size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)' }}>No Alerts Configured</h4>
                  <p style={{ fontSize: '0.82rem', margin: '0 0 16px 0' }}>
                    Set condition alerts to receive instant notifications when price, AI score, or RSI criteria trigger.
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="btn-primary"
                    style={{ fontSize: '0.82rem', padding: '8px 18px' }}
                  >
                    Create First Alert
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {multiAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: 10,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        opacity: alert.is_active ? 1 : 0.6
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--accent-cyan)',
                          minWidth: 55
                        }}>
                          {alert.ticker}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: alert.condition_type.includes('ABOVE') || alert.condition_type.includes('OVERBOUGHT')
                                ? 'rgba(34, 197, 94, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                              color: alert.condition_type.includes('ABOVE') || alert.condition_type.includes('OVERBOUGHT')
                                ? 'var(--accent-emerald)'
                                : 'var(--accent-rose)',
                              fontWeight: 600
                            }}>
                              {alert.condition_type.replace(/_/g, ' ')}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem', fontFamily: 'var(--font-mono)' }}>
                              {alert.condition_type.includes('PRICE') ? `$${alert.threshold_value.toFixed(2)}` : alert.threshold_value}
                            </span>
                          </div>

                          {alert.triggered_at && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', marginTop: 4 }}>
                              Triggered: {new Date(alert.triggered_at).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                          onClick={() => toggleAlert(alert.id)}
                          style={{
                            background: alert.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                            color: alert.is_active ? 'var(--accent-emerald)' : 'var(--text-muted)',
                            border: 'none',
                            borderRadius: 6,
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          {alert.is_active ? 'Active' : 'Paused'}
                        </button>

                        <button
                          onClick={() => removeAlert(alert.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: 6,
                            borderRadius: 6
                          }}
                          title="Delete Alert"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit}>
              {/* Presets Selector */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Condition Type
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 8
                }}>
                  {CONDITION_PRESETS.map((p) => {
                    const isSelected = conditionType === p.type;
                    return (
                      <button
                        key={p.type}
                        type="button"
                        onClick={() => handlePresetSelect(p)}
                        style={{
                          background: isSelected ? 'rgba(0, 242, 254, 0.15)' : 'var(--bg-card)',
                          border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                          borderRadius: 8,
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{p.icon}</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                            {p.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ticker & Threshold Input */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                    Ticker Symbol
                  </label>
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    placeholder="e.g. AAPL"
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      padding: '10px 12px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                    Target Numerical Threshold
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={thresholdValue}
                    onChange={(e) => setThresholdValue(parseFloat(e.target.value))}
                    placeholder="e.g. 200.00"
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      padding: '10px 12px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                    required
                  />
                </div>
              </div>

              {/* Condition Explanation Banner */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                marginBottom: 20
              }}>
                💡 {CONDITION_PRESETS.find(p => p.type === conditionType)?.hint}
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('manage')}
                  className="btn-secondary"
                  style={{ padding: '9px 18px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{ padding: '9px 22px', fontSize: '0.85rem' }}
                >
                  {isSubmitting ? 'Saving...' : 'Set Alert'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
