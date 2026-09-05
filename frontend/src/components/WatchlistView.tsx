'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark, Plus, Trash2, TrendingUp, ExternalLink, ArrowRight, Shield, FolderPlus, ListFilter } from 'lucide-react';
import { Watchlist } from '../lib/types';
import { listWatchlists, createWatchlist, addWatchlistItem, deleteWatchlistItem } from '../lib/api';
import { ErrorBanner } from './Common/ErrorBanner';

export function WatchlistView({
  onSelectTicker,
  onOpenPortfolio
}: {
  onSelectTicker: (t: string) => void;
  onOpenPortfolio?: (tickers: string[]) => void;
}) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
                    <th style={{ padding: '12px 14px' }}>Notes</th>
                    <th style={{ padding: '12px 14px' }}>Added Date</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeWatchlist.items.map(item => (
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
                      <td style={{ padding: '14px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {item.notes || '—'}
                      </td>
                      <td style={{ padding: '14px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(item.added_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
                  ))}
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
