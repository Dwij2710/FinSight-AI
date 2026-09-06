'use client';

import React, { useState } from 'react';
import { X, Check, Copy, Download, AlertCircle, ArrowRight, DollarSign, Activity } from 'lucide-react';
import { useMarketData } from '../context/MarketDataContext';
import { exportSeriesToCsv } from '../lib/chartExport';

interface RebalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWeights: Record<string, number>;
  strategyName: string;
}

export function RebalanceModal({
  isOpen,
  onClose,
  activeWeights,
  strategyName
}: RebalanceModalProps) {
  const { getQuote } = useMarketData();
  const [totalCapital, setTotalCapital] = useState<number>(100000);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const tickers = Object.keys(activeWeights);
  const n = Math.max(1, tickers.length);
  const baselineWeightPct = 100 / n;

  // Calculate order routing staging items
  let totalBuys = 0;
  let totalSells = 0;

  const orders = tickers.map(sym => {
    const quote = getQuote(sym);
    const livePrice = quote?.price || 100.0;
    const targetPct = activeWeights[sym] || 0;
    const currentPct = baselineWeightPct; // Divergence from equal-weight baseline

    const currentVal = (totalCapital * currentPct) / 100;
    const targetVal = (totalCapital * targetPct) / 100;
    const deltaDollars = targetVal - currentVal;
    const deltaShares = Math.round(deltaDollars / livePrice);

    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (deltaDollars > 50 && deltaShares > 0) {
      action = 'BUY';
      totalBuys += deltaDollars;
    } else if (deltaDollars < -50 && deltaShares < 0) {
      action = 'SELL';
      totalSells += Math.abs(deltaDollars);
    }

    return {
      ticker: sym,
      livePrice,
      currentPct,
      targetPct,
      currentVal,
      targetVal,
      deltaDollars,
      deltaShares: Math.abs(deltaShares),
      action
    };
  });

  const estimatedTurnover = totalBuys + totalSells;
  const estimatedFriction = estimatedTurnover * 0.0005; // 5 bps slippage/commissions

  const handleCopyClipboard = () => {
    const textLines = orders
      .filter(o => o.action !== 'HOLD')
      .map(o => `${o.action} ${o.deltaShares} ${o.ticker} @ ~$${o.livePrice.toFixed(2)} ($${Math.abs(o.deltaDollars).toFixed(2)})`)
      .join('\n');

    const payload = `=== FINSIGHT AI REBALANCE PLAN (${strategyName.toUpperCase()}) ===\nTotal Capital: $${totalCapital.toLocaleString()}\nEst. Turnover: $${estimatedTurnover.toLocaleString()}\n\nSTAGED ORDERS:\n${textLines}\n\nDisclaimer: Institutional staging sheet. Submit orders through your authorized broker.`;
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCsv = () => {
    const headers = ['Action', 'Ticker', 'Target Shares', 'Est. Price', 'Current Alloc ($)', 'Target Alloc ($)', 'Delta ($)'];
    const rows = orders.map(o => [
      o.action,
      o.ticker,
      o.deltaShares,
      o.livePrice.toFixed(2),
      o.currentVal.toFixed(2),
      o.targetVal.toFixed(2),
      o.deltaDollars.toFixed(2)
    ]);
    exportSeriesToCsv(`rebalance_staging_${strategyName}_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>
                Portfolio <span className="text-gradient">Rebalance Plan</span>
              </h3>
              <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                {strategyName.toUpperCase()} STRATEGY
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0, marginTop: 4 }}>
              Calculates order routing deltas to align current holdings with optimized weights.
            </p>
          </div>
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

        {/* Capital Controls */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 18,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
              PORTFOLIO CAPITAL BASE ($)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '1.1rem' }}>$</span>
              <input
                type="number"
                min={1000}
                step={5000}
                value={totalCapital}
                onChange={e => setTotalCapital(Math.max(100, Number(e.target.value)))}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  width: 140
                }}
              />
            </div>
          </div>

          {/* Quick presets */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[25000, 50000, 100000, 250000, 1000000].map(val => (
              <button
                key={val}
                onClick={() => setTotalCapital(val)}
                style={{
                  background: totalCapital === val ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: totalCapital === val ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  color: totalCapital === val ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                ${val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}K`}
              </button>
            ))}
          </div>
        </div>

        {/* Telemetry Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '10px 12px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Buys</span>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10B981', fontFamily: 'var(--font-mono)' }}>
              +${Math.round(totalBuys).toLocaleString()}
            </div>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '10px 12px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Sells</span>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#EF4444', fontFamily: 'var(--font-mono)' }}>
              -${Math.round(totalSells).toLocaleString()}
            </div>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '10px 12px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Estimated Friction</span>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              ~${Math.round(estimatedFriction).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Staged Order Routing Table */}
        <div className="table-responsive" style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 18 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                <th style={{ padding: '8px 10px' }}>ACTION</th>
                <th style={{ padding: '8px 10px' }}>TICKER</th>
                <th style={{ padding: '8px 10px' }}>TARGET SHARES</th>
                <th style={{ padding: '8px 10px' }}>CURRENT &rarr; TARGET</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>DELTA ($)</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.ticker} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', fontFamily: 'var(--font-mono)' }}>
                  <td style={{ padding: '10px 10px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: o.action === 'BUY' ? 'rgba(16, 185, 129, 0.15)' : o.action === 'SELL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: o.action === 'BUY' ? '#10B981' : o.action === 'SELL' ? '#EF4444' : 'var(--text-muted)'
                    }}>
                      {o.action}
                    </span>
                  </td>
                  <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {o.ticker}
                  </td>
                  <td style={{ padding: '10px 10px', color: 'var(--text-primary)' }}>
                    {o.action === 'HOLD' ? '—' : `${o.deltaShares} shs`}
                  </td>
                  <td style={{ padding: '10px 10px', color: 'var(--text-secondary)' }}>
                    {o.currentPct.toFixed(1)}% &rarr; <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{o.targetPct.toFixed(1)}%</span>
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: o.deltaDollars >= 0 ? '#10B981' : '#EF4444' }}>
                    {o.deltaDollars >= 0 ? '+' : ''}${Math.round(o.deltaDollars).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Institutional Non-Custodial Disclaimer */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.025)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          marginBottom: 18,
          fontSize: '0.74rem',
          color: 'var(--text-muted)'
        }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent-cyan)' }} />
          <span>
            <strong>Non-Custodial Staging Protocol:</strong> FinSight AI does not connect to personal brokerage accounts or execute orders directly. Use this order staging sheet to balance positions with your registered broker (Interactive Brokers, Charles Schwab, Fidelity, Zerodha).
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={handleExportCsv}
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '8px 14px' }}
          >
            <Download size={14} />
            <span>Export Orders CSV</span>
          </button>
          <button
            onClick={handleCopyClipboard}
            className="btn-primary"
            style={{ fontSize: '0.82rem', padding: '8px 16px' }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Staged Orders'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
