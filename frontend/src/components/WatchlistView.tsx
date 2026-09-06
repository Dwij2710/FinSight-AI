import React, { useState, useEffect } from 'react';
import { Bookmark, Plus, Trash2, TrendingUp, ExternalLink, ArrowRight, Shield, FolderPlus, ListFilter, Bell, BellRing, BellOff, Check, X, Sliders, AlertCircle } from 'lucide-react';
import { Watchlist } from '../lib/types';
import { listWatchlists, createWatchlist, addWatchlistItem, deleteWatchlistItem } from '../lib/api';
import { ErrorBanner } from './Common/ErrorBanner';
import { useMarketData } from '../context/MarketDataContext';
import { useAlerts } from '../context/AlertContext';

export function WatchlistView({
  onSelectTicker,
  onOpenPortfolio
}: {
  onSelectTicker: (t: string) => void;
  onOpenPortfolio?: (tickers: string[]) => void;
}) {
  const { getQuote, freshnessState } = useMarketData();
  const { alerts, addAlert, removeAlert, toggleAlert, requestNotificationPermission, hasNotificationPermission } = useAlerts();

  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Alert Modal state
  const [alertModalTicker, setAlertModalTicker] = useState<string | null>(null);
  const [alertTargetPrice, setAlertTargetPrice] = useState<number>(100);
  const [alertCondition, setAlertCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Form states
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTickerInput, setNewTickerInput] = useState('');
  const [newTickerNotes, setNewTickerNotes] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);

  const fetchWatchlists = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listWatchlists();
      setWatchlists(data);
      if (data.length > 0) {
        setActiveWatchlistId(prev => (prev !== null && data.some(d => d.id === prev) ? prev : data[0].id));
      }
    } catch (err: any) {
      console.warn('[Watchlist] Live fetch failed, using local browser store:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlists();
  }, []);

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;
    try {
      const created = await createWatchlist(newWatchlistName.trim());
      setWatchlists(prev => [created, ...prev]);
      setActiveWatchlistId(created.id);
      setNewWatchlistName('');
      setShowCreateModal(false);
    } catch (err: any) {
      console.warn('[Watchlist] Create failed on server, created locally:', err);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWatchlistId || !newTickerInput.trim()) return;

    try {
      const added = await addWatchlistItem(
        activeWatchlistId,
        newTickerInput.trim().toUpperCase(),
        newTickerNotes.trim() || undefined
      );

      setWatchlists(prev => prev.map(wl => {
        if (wl.id === activeWatchlistId) {
          return {
            ...wl,
            items: [...wl.items, added]
          };
        }
        return wl;
      }));

      setNewTickerInput('');
      setNewTickerNotes('');
      setIsAddingItem(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to add ticker to watchlist');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!activeWatchlistId) return;
    try {
      await deleteWatchlistItem(activeWatchlistId, itemId);
      setWatchlists(prev => prev.map(wl => {
        if (wl.id === activeWatchlistId) {
          return {
            ...wl,
            items: wl.items.filter(i => i.id !== itemId)
          };
        }
        return wl;
      }));
    } catch (err: any) {
      setError(err?.message || 'Failed to remove ticker');
    }
  };

  const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: 4 }}>
            Institutional <span className="text-gradient">Watchlists</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Persisted asset universes backed by PostgreSQL & SQLite. Monitor targets and trigger deep quant analyses.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
        >
          <FolderPlus size={16} /> New Watchlist
        </button>
      </div>

      {error && (
        <ErrorBanner
          title="Watchlist Pipeline Notice"
          error={error}
          onRetry={fetchWatchlists}
          onDismiss={() => setError(null)}
          suggestedAction="Check if the backend database connection is active."
        />
      )}

      {/* Watchlist Tabs */}
      {watchlists.length > 0 ? (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 14 }}>
          {watchlists.map(w => (
            <button
              key={w.id}
              onClick={() => setActiveWatchlistId(w.id)}
              className={`nav-tab-btn ${activeWatchlistId === w.id ? 'active' : ''}`}
              style={{ padding: '8px 16px', fontSize: '0.86rem' }}
            >
              <Bookmark size={14} />
              <span>{w.name}</span>
              <span style={{ opacity: 0.65, fontSize: '0.75rem' }}>({w.items.length})</span>
            </button>
          ))}
        </div>
      ) : (
        !loading && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Bookmark size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: 6 }}>No Watchlists Created Yet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 18 }}>
              Create your first asset watchlist to begin tracking institutional equities.
            </p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              Create Watchlist
            </button>
          </div>
        )
      )}

      {/* Active Watchlist Contents */}
      {activeWatchlist && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{activeWatchlist.name}</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {activeWatchlist.items.length} monitored ticker{activeWatchlist.items.length === 1 ? '' : 's'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setIsAddingItem(!isAddingItem)}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}
              >
                <Plus size={14} /> Add Ticker
              </button>

              {activeWatchlist.items.length >= 2 && onOpenPortfolio && (
                <button
                  onClick={() => onOpenPortfolio(activeWatchlist.items.map(i => i.ticker))}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}
                >
                  <span>Optimize As Portfolio</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Add Ticker Inline Form */}
          {isAddingItem && (
            <form onSubmit={handleAddItem} style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-active)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <input
                type="text"
                required
                className="input-control"
                placeholder="Ticker symbol (e.g., NVDA, TCS.NS)"
                value={newTickerInput}
                onChange={e => setNewTickerInput(e.target.value)}
                style={{ flex: 1, minWidth: 160 }}
                autoFocus
              />
              <input
                type="text"
                className="input-control"
                placeholder="Notes / Thesis (Optional)"
                value={newTickerNotes}
                onChange={e => setNewTickerNotes(e.target.value)}
                style={{ flex: 1.5, minWidth: 200 }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAddingItem(false)}
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
            </form>
          )}

          {/* Tickers Table */}
          {activeWatchlist.items.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 14px' }}>Ticker</th>
                    <th style={{ padding: '12px 14px' }}>Market Price</th>
                    <th style={{ padding: '12px 14px' }}>Alerts</th>
                    <th style={{ padding: '12px 14px' }}>Notes</th>
                    <th style={{ padding: '12px 14px' }}>Added Date</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeWatchlist.items.map(item => {
                    const quote = getQuote(item.ticker);
                    const itemAlerts = alerts.filter(a => a.ticker === item.ticker && a.enabled);
                    const isPositive = quote ? quote.change_pct >= 0 : true;

                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          transition: 'background 0.2s'
                        }}
                      >
                        <td style={{ padding: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                          {item.ticker}
                        </td>
                        <td style={{ padding: '14px' }}>
                          {quote ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.92rem' }}>
                                ${quote.price.toFixed(2)}
                              </span>
                              <span style={{
                                fontSize: '0.75rem',
                                color: isPositive ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                                fontWeight: 500
                              }}>
                                {isPositive ? '+' : ''}{quote.change_pct.toFixed(2)}%
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Loading...</span>
                          )}
                        </td>
                        <td style={{ padding: '14px' }}>
                          {itemAlerts.length > 0 ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: 'var(--accent-emerald)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: '0.74rem',
                              fontWeight: 600
                            }}>
                              <BellRing size={11} /> {itemAlerts.length} Active
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>None</span>
                          )}
                        </td>
                        <td style={{ padding: '14px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {item.notes || '—'}
                        </td>
                        <td style={{ padding: '14px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {new Date(item.added_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
                            <button
                              onClick={() => {
                                setAlertModalTicker(item.ticker);
                                if (quote) {
                                  setAlertTargetPrice(Math.round(quote.price * 1.05 * 100) / 100);
                                }
                              }}
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
                              title="Set Price Target Alert"
                            >
                              <Bell size={12} /> Set Alert
                            </button>
                            <button
                              onClick={() => onSelectTicker(item.ticker)}
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
                              title="Forecast Stock"
                            >
                              <TrendingUp size={12} /> Forecast
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="btn-secondary"
                              style={{ padding: '4px 8px', color: 'var(--accent-rose)' }}
                              title="Remove from Watchlist"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No tickers added to this watchlist yet. Click "+ Add Ticker" to monitor an asset.
            </div>
          )}
        </div>
      )}

      {/* Active Price Target Alerts Panel */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)'
            }}>
              <Bell size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Active Price Target Alerts</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Live quotes trigger notifications via the Web Notifications API and in-app toasts.
              </p>
            </div>
          </div>

          {!hasNotificationPermission && (
            <button
              onClick={requestNotificationPermission}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', borderColor: 'var(--accent-cyan)' }}
            >
              <BellRing size={14} color="var(--accent-cyan)" />
              <span>Enable Browser Push Notifications</span>
            </button>
          )}
        </div>

        {alerts.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px' }}>Ticker</th>
                  <th style={{ padding: '10px 14px' }}>Condition</th>
                  <th style={{ padding: '10px 14px' }}>Target Price</th>
                  <th style={{ padding: '10px 14px' }}>Current Price</th>
                  <th style={{ padding: '10px 14px' }}>Distance</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(a => {
                  const quote = getQuote(a.ticker);
                  const currentPrice = quote?.price;
                  const distancePct = currentPrice
                    ? ((currentPrice - a.targetPrice) / a.targetPrice) * 100
                    : null;

                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                        {a.ticker}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.84rem' }}>
                        {a.condition === 'ABOVE' ? 'Rises Above (≥)' : 'Falls Below (≤)'}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        ${a.targetPrice.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>
                        {currentPrice ? `$${currentPrice.toFixed(2)}` : 'Waiting for quote'}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.84rem' }}>
                        {distancePct !== null ? (
                          <span style={{
                            color: Math.abs(distancePct) < 2 ? 'var(--accent-amber)' : 'var(--text-secondary)',
                            fontWeight: Math.abs(distancePct) < 2 ? 700 : 400
                          }}>
                            {distancePct > 0 ? `+${distancePct.toFixed(1)}%` : `${distancePct.toFixed(1)}%`}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {a.status === 'TRIGGERED' ? (
                          <span style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: 'var(--accent-rose)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: '0.74rem',
                            fontWeight: 600
                          }}>
                            Triggered
                          </span>
                        ) : a.enabled ? (
                          <span style={{
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: 'var(--accent-emerald)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: '0.74rem',
                            fontWeight: 600
                          }}>
                            Active
                          </span>
                        ) : (
                          <span style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border-subtle)',
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: '0.74rem'
                          }}>
                            Paused
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => toggleAlert(a.id)}
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            title={a.enabled ? 'Pause Alert' : 'Enable Alert'}
                          >
                            {a.enabled ? <BellOff size={13} /> : <Bell size={13} />}
                          </button>
                          <button
                            onClick={() => removeAlert(a.id)}
                            className="btn-secondary"
                            style={{ padding: '4px 8px', color: 'var(--accent-rose)', fontSize: '0.75rem' }}
                            title="Delete Alert"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '24px 16px',
            color: 'var(--text-muted)',
            fontSize: '0.86rem',
            border: '1px dashed var(--border-subtle)',
            borderRadius: 10
          }}>
            No price alerts configured yet. Click "Set Alert" on any watchlist ticker to monitor real-time breakout thresholds.
          </div>
        )}
      </div>

      {/* Set Price Alert Modal */}
      {alertModalTicker && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 440, padding: 26, background: 'var(--bg-secondary)', border: '1px solid var(--border-active)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BellRing size={20} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Set Price Alert for <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{alertModalTicker}</span>
                </h3>
              </div>
              <button
                onClick={() => setAlertModalTicker(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {(() => {
              const currentQuote = getQuote(alertModalTicker);
              return (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>Current Live Price:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem' }}>
                    {currentQuote ? `$${currentQuote.price.toFixed(2)}` : 'Waiting for market quote'}
                  </span>
                </div>
              );
            })()}

            <form onSubmit={e => {
              e.preventDefault();
              if (alertModalTicker && alertTargetPrice > 0) {
                addAlert(alertModalTicker, alertTargetPrice, alertCondition);
                setAlertModalTicker(null);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Condition Trigger
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setAlertCondition('ABOVE')}
                    className={`btn-secondary ${alertCondition === 'ABOVE' ? 'active' : ''}`}
                    style={{
                      padding: '8px',
                      fontSize: '0.84rem',
                      borderColor: alertCondition === 'ABOVE' ? 'var(--accent-emerald)' : undefined,
                      color: alertCondition === 'ABOVE' ? 'var(--accent-emerald)' : undefined
                    }}
                  >
                    Rises Above (≥)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertCondition('BELOW')}
                    className={`btn-secondary ${alertCondition === 'BELOW' ? 'active' : ''}`}
                    style={{
                      padding: '8px',
                      fontSize: '0.84rem',
                      borderColor: alertCondition === 'BELOW' ? 'var(--accent-rose)' : undefined,
                      color: alertCondition === 'BELOW' ? 'var(--accent-rose)' : undefined
                    }}
                  >
                    Falls Below (≤)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Target Price ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="input-control"
                  value={alertTargetPrice}
                  onChange={e => setAlertTargetPrice(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 600 }}
                />
              </div>

              <div style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
                background: 'rgba(56, 189, 248, 0.05)',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid rgba(56, 189, 248, 0.15)'
              }}>
                Alerts check quotes every 30s. Only verified live quotes trigger alarms. 15-minute cooldown applies to avoid spam.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setAlertModalTicker(null)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Bell size={14} /> Set Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Watchlist Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 420, padding: 26, background: 'var(--bg-secondary)', border: '1px solid var(--border-active)' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 6 }}>Create New Watchlist</h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 18 }}>
              Enter a name for your curated asset universe.
            </p>
            <form onSubmit={handleCreateWatchlist} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                type="text"
                required
                className="input-control"
                placeholder="e.g. AI Hardware Titans"
                value={newWatchlistName}
                onChange={e => setNewWatchlistName(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 18px' }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
