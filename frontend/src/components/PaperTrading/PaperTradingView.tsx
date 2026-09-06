'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Shield, RefreshCw, AlertCircle, CheckCircle2, History, Briefcase,
  Layers, ShoppingCart, Percent, RotateCcw, Download, Sparkles
} from 'lucide-react';
import { PaperAccountData, PaperOrderPayload } from '../../lib/types';
import { getPaperAccount, placePaperOrder, resetPaperAccount } from '../../lib/api';
import { useMarketData } from '../../context/MarketDataContext';
import { useTicker } from '../../context/TickerContext';
import { ProvenanceBadge } from '../ProvenanceBadge';
import { exportSeriesToCsv } from '../../lib/chartExport';

export function PaperTradingView() {
  const { isDemoMode, getQuote } = useMarketData();
  const { activeTicker } = useTicker();
  const [account, setAccount] = useState<PaperAccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  // Order Ticket State (pre-filled with active platform ticker, freely editable)
  const [ticker, setTicker] = useState(activeTicker);
  const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');

  useEffect(() => {
    if (activeTicker) {
      setTicker(activeTicker);
    }
  }, [activeTicker]);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [shares, setShares] = useState<number>(20);
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchAccount = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getPaperAccount();
      setAccount(res.data);
      setIsDemo(!!res.isDemo);
    } catch (err: any) {
      setError(err?.message || 'Failed to load paper trading account.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccount();
  }, [isDemoMode]);

  // Derive live price for the selected ticker
  const quote = getQuote(ticker);
  const livePrice = quote?.price && quote.price > 0 ? quote.price : 185.0;

  // Order Ticket Calculations
  const slippageBps = 0.0002;
  const commissionRate = 0.0005;
  const estimatedExecPrice = action === 'BUY'
    ? Number((livePrice * (1 + slippageBps)).toFixed(2))
    : Number((livePrice * (1 - slippageBps)).toFixed(2));
  const grossValue = Number((shares * estimatedExecPrice).toFixed(2));
  const estimatedCommission = Math.max(1.0, Number((grossValue * commissionRate).toFixed(2)));
  const estimatedTotalCost = action === 'BUY'
    ? Number((grossValue + estimatedCommission).toFixed(2))
    : Number((grossValue - estimatedCommission).toFixed(2));

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (shares <= 0 || !ticker.trim()) return;

    setOrderSubmitting(true);
    setError(null);

    const payload: PaperOrderPayload = {
      ticker: ticker.trim().toUpperCase(),
      action,
      shares: Number(shares),
      order_type: orderType,
      limit_price: orderType === 'LIMIT' && limitPrice ? Number(limitPrice) : undefined
    };

    try {
      const res = await placePaperOrder(payload);
      setOrderSuccessMsg(
        `Successfully executed ${action} ${shares} shares of ${payload.ticker} @ ~$${estimatedExecPrice.toFixed(2)}`
      );
      setTimeout(() => setOrderSuccessMsg(null), 4000);
      await fetchAccount();
    } catch (err: any) {
      setError(err?.message || 'Order submission failed.');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleReset = async () => {
    try {
      setResetting(true);
      await resetPaperAccount();
      setShowResetModal(false);
      setOrderSuccessMsg('Account successfully reset to $100,000.00 cash.');
      setTimeout(() => setOrderSuccessMsg(null), 4000);
      await fetchAccount();
    } catch (err: any) {
      setError(err?.message || 'Failed to reset account.');
    } finally {
      setResetting(false);
    }
  };

  const handleClosePosition = (posTicker: string, posShares: number) => {
    setTicker(posTicker);
    setAction('SELL');
    setShares(posShares);
    setOrderType('MARKET');
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleExportTradesCsv = () => {
    if (!account || !account.recent_trades.length) return;
    const headers = ['Trade ID', 'Executed At', 'Ticker', 'Action', 'Type', 'Shares', 'Fill Price', 'Commission', 'Slippage', 'Realized PnL'];
    const rows = account.recent_trades.map(t => [
      t.id, t.executed_at, t.ticker, t.action, t.order_type, t.shares,
      t.execution_price, t.commission, t.slippage, t.realized_pnl
    ]);
    exportSeriesToCsv(`finsight_paper_trades_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const totalEquity = account?.total_portfolio_value ?? 100000;
  const cashBalance = account?.cash_balance ?? 100000;
  const investedValue = account?.positions_market_value ?? 0;
  const totalPnl = account?.total_pnl ?? 0;
  const totalReturnPct = account?.total_return_pct ?? 0;
  const isPnlPositive = totalPnl >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: '1.6rem', margin: 0, fontWeight: 800 }}>
              Paper Trading <span className="text-gradient">Terminal</span>
            </h2>
            <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
              $100k Virtual Capital
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, marginTop: 4 }}>
            Simulate real-world equities execution with strict 5 bps commission, 2 bps slippage friction, and real-time position tracking.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <ProvenanceBadge source={isDemo ? 'simulated' : 'live'} isDemo={isDemo} />
          <button
            onClick={() => fetchAccount()}
            className="btn-secondary"
            disabled={loading}
            style={{ fontSize: '0.8rem', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-rose)' }}
          >
            <RotateCcw size={13} />
            <span>Reset Account</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="glass-panel" style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={18} color="#EF4444" />
          <span style={{ fontSize: '0.86rem', color: '#FCA5A5' }}>{error}</span>
        </div>
      )}

      {orderSuccessMsg && (
        <div className="glass-panel" style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={18} color="#10B981" />
          <span style={{ fontSize: '0.86rem', color: '#6EE7B7', fontWeight: 600 }}>{orderSuccessMsg}</span>
        </div>
      )}

      {/* Account Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {/* Total Equity */}
        <div className="glass-panel" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Net Portfolio Equity</span>
            <DollarSign size={16} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
            ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Cash + Open Market Positions
          </div>
        </div>

        {/* Buying Power / Cash */}
        <div className="glass-panel" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Available Cash Balance</span>
            <Briefcase size={16} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
            ${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Uncommitted purchasing power
          </div>
        </div>

        {/* Market Value Invested */}
        <div className="glass-panel" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Open Positions Value</span>
            <Layers size={16} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
            ${investedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {account?.positions.length || 0} active equity holdings
          </div>
        </div>

        {/* Total Return & P&L */}
        <div className="glass-panel" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total Cumulative Return</span>
            {isPnlPositive ? <TrendingUp size={16} color="#10B981" /> : <TrendingDown size={16} color="#EF4444" />}
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: isPnlPositive ? '#10B981' : '#EF4444', fontFamily: 'var(--font-mono)' }}>
            {isPnlPositive ? '+' : ''}${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isPnlPositive ? '#10B981' : '#EF4444', marginTop: 4 }}>
            {isPnlPositive ? '+' : ''}{totalReturnPct.toFixed(2)}% vs $100k starting basis
          </div>
        </div>
      </div>

      {/* Main Trading Area: Order Placement & Open Positions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 380px) minmax(0, 1fr)', gap: 20, alignItems: 'flex-start' }}>
        {/* Order Placement Ticket */}
        <div className="glass-panel" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>Order Ticket</h3>
            </div>
            <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>Live Routing</span>
          </div>

          <form onSubmit={handleOrderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Action Toggle: BUY vs SELL */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'rgba(255, 255, 255, 0.04)', padding: 4, borderRadius: 8 }}>
              <button
                type="button"
                onClick={() => setAction('BUY')}
                style={{
                  padding: '8px',
                  borderRadius: 6,
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  background: action === 'BUY' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: action === 'BUY' ? '#10B981' : 'var(--text-secondary)',
                  border: action === 'BUY' ? '1px solid rgba(16, 185, 129, 0.5)' : 'none',
                  cursor: 'pointer'
                }}
              >
                BUY (Long)
              </button>
              <button
                type="button"
                onClick={() => setAction('SELL')}
                style={{
                  padding: '8px',
                  borderRadius: 6,
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  background: action === 'SELL' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                  color: action === 'SELL' ? '#EF4444' : 'var(--text-secondary)',
                  border: action === 'SELL' ? '1px solid rgba(239, 68, 68, 0.5)' : 'none',
                  cursor: 'pointer'
                }}
              >
                SELL (Short / Close)
              </button>
            </div>

            {/* Ticker Input with Live Price Preview */}
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Ticker Symbol
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={ticker}
                  onChange={e => setTicker(e.target.value.toUpperCase())}
                  placeholder="e.g. AAPL, NVDA, RELIANCE.NS"
                  className="input-control"
                  style={{ flex: 1, textTransform: 'uppercase' }}
                  required
                />
                <div style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 6, border: '1px solid var(--border-subtle)', textAlign: 'right', minWidth: 90 }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Market</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    ${livePrice.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Type: Market vs Limit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Order Type
                </label>
                <select
                  value={orderType}
                  onChange={e => setOrderType(e.target.value as any)}
                  className="input-control"
                >
                  <option value="MARKET">Market Order</option>
                  <option value="LIMIT">Limit Order</option>
                </select>
              </div>

              {orderType === 'LIMIT' && (
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Limit Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={limitPrice}
                    onChange={e => setLimitPrice(e.target.value)}
                    placeholder={livePrice.toFixed(2)}
                    className="input-control"
                    required
                  />
                </div>
              )}
            </div>

            {/* Shares Input & Quick Buttons */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Quantity (Shares)</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[10, 25, 50, 100].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setShares(cnt)}
                      style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: '0.7rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                min="1"
                step="1"
                value={shares}
                onChange={e => setShares(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-control"
                required
              />
            </div>

            {/* Order Preview / Friction Card */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '12px 14px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Estimated Fill Price:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>${estimatedExecPrice.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Slippage Drag (2 bps):</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  ${(shares * livePrice * slippageBps).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Commission (5 bps, min $1):</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  ${estimatedCommission.toFixed(2)}
                </span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>{action === 'BUY' ? 'Total Required Cash:' : 'Est. Net Proceeds:'}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: action === 'BUY' ? 'var(--accent-cyan)' : 'var(--accent-emerald)', fontSize: '0.95rem' }}>
                  ${estimatedTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={orderSubmitting}
              className={action === 'BUY' ? 'btn-primary' : 'btn-secondary'}
              style={{
                padding: '10px 16px',
                fontSize: '0.9rem',
                fontWeight: 700,
                background: action === 'BUY' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                borderColor: action === 'BUY' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              {orderSubmitting ? 'Routing Order...' : `Submit ${action} Order (${shares} Shares)`}
            </button>
          </form>
        </div>

        {/* Open Positions Portfolio */}
        <div className="glass-panel" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Briefcase size={18} color="var(--accent-emerald)" />
              <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>Open Equity Positions</h3>
            </div>
            <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
              {account?.positions.length || 0} Holdings
            </span>
          </div>

          {!account?.positions || account.positions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Sparkles size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
              <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>No Open Positions</div>
              <div style={{ fontSize: '0.82rem' }}>
                Use the Order Ticket on the left to purchase shares with your virtual cash balance.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px' }}>Ticker</th>
                    <th style={{ padding: '8px 10px' }}>Shares</th>
                    <th style={{ padding: '8px 10px' }}>Avg Cost</th>
                    <th style={{ padding: '8px 10px' }}>Current</th>
                    <th style={{ padding: '8px 10px' }}>Market Value</th>
                    <th style={{ padding: '8px 10px' }}>Unrealized P&L</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {account.positions.map(pos => {
                    const isPosPositive = pos.unrealized_pnl >= 0;
                    return (
                      <tr key={pos.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', fontFamily: 'var(--font-mono)' }}>
                        <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {pos.ticker}
                        </td>
                        <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>
                          {pos.shares}
                        </td>
                        <td style={{ padding: '10px', color: 'var(--text-muted)' }}>
                          ${pos.average_entry_price.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px', fontWeight: 600, color: '#F8FAFC' }}>
                          ${pos.current_price.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                          ${pos.market_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px', color: isPosPositive ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                          {isPosPositive ? '+' : ''}${pos.unrealized_pnl.toFixed(2)} ({isPosPositive ? '+' : ''}{pos.unrealized_pnl_pct.toFixed(2)}%)
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleClosePosition(pos.ticker, pos.shares)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 4,
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              color: '#EF4444',
                              cursor: 'pointer'
                            }}
                          >
                            Close Position
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Trade Execution Ledger */}
      <div className="glass-panel" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={18} color="var(--accent-purple)" />
            <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>Execution Ledger & Trade Manifest</h3>
          </div>
          {account?.recent_trades && account.recent_trades.length > 0 && (
            <button
              onClick={handleExportTradesCsv}
              className="btn-secondary"
              style={{ fontSize: '0.78rem', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={13} />
              <span>Export Ledger CSV</span>
            </button>
          )}
        </div>

        {!account?.recent_trades || account.recent_trades.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
            No trades executed yet. Place an order to see your trade audit trail.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>Timestamp</th>
                  <th style={{ padding: '8px 10px' }}>Action</th>
                  <th style={{ padding: '8px 10px' }}>Ticker</th>
                  <th style={{ padding: '8px 10px' }}>Shares</th>
                  <th style={{ padding: '8px 10px' }}>Exec Price</th>
                  <th style={{ padding: '8px 10px' }}>Comm (5 bps)</th>
                  <th style={{ padding: '8px 10px' }}>Slippage (2 bps)</th>
                  <th style={{ padding: '8px 10px' }}>Realized P&L</th>
                </tr>
              </thead>
              <tbody>
                {account.recent_trades.map(t => {
                  const isBuy = t.action === 'BUY';
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', fontFamily: 'var(--font-mono)' }}>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                        {new Date(t.executed_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: isBuy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: isBuy ? '#10B981' : '#EF4444'
                        }}>
                          {t.action}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {t.ticker}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>
                        {t.shares}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#F8FAFC' }}>
                        ${t.execution_price.toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                        ${t.commission.toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                        ${t.slippage.toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 10px', color: t.realized_pnl > 0 ? '#10B981' : (t.realized_pnl < 0 ? '#EF4444' : 'var(--text-muted)'), fontWeight: 600 }}>
                        {t.realized_pnl !== 0 ? `${t.realized_pnl > 0 ? '+' : ''}$${t.realized_pnl.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 420, padding: 24, background: 'var(--bg-secondary)', border: '1px solid var(--border-active)' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: 8, fontWeight: 700 }}>Reset Paper Account?</h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              This will reset your cash balance to <strong>$100,000.00</strong>, close all open positions, and clear execution logs. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="btn-secondary"
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="btn-primary"
                style={{ background: 'var(--accent-rose)', borderColor: 'var(--accent-rose)', color: '#fff' }}
              >
                {resetting ? 'Resetting...' : 'Confirm Reset to $100k'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
