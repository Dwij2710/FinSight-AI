'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Clock, Globe, ChevronRight } from 'lucide-react';
import { getLiveTickerQuotes } from '../lib/api';
import { LiveTickerQuote, DataSourceType } from '../lib/types';

interface TickerBannerProps {
  activeTicker: string;
  onSelectTicker: (ticker: string) => void;
}

export function TickerBanner({ activeTicker, onSelectTicker }: TickerBannerProps) {
  const [quotes, setQuotes] = useState<LiveTickerQuote[]>([]);
  const [dataSource, setDataSource] = useState<DataSourceType>('live');
  const [hoveredTicker, setHoveredTicker] = useState<string | null>(null);
  const [flashTickers, setFlashTickers] = useState<Record<string, boolean>>({});
  const prevPrices = useRef<Record<string, number>>({});

  const targetSymbols = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'MSFT', 'RELIANCE.NS', 'TCS.NS', '^NSEI'];

  const fetchQuotes = async () => {
    try {
      const res = await getLiveTickerQuotes(targetSymbols);
      if (res && res.quotes && res.quotes.length > 0) {
        // Check for price changes to trigger subtle pulse
        const flashes: Record<string, boolean> = {};
        res.quotes.forEach(q => {
          if (prevPrices.current[q.ticker] !== undefined && prevPrices.current[q.ticker] !== q.price) {
            flashes[q.ticker] = true;
          }
          prevPrices.current[q.ticker] = q.price;
        });

        if (Object.keys(flashes).length > 0) {
          setFlashTickers(flashes);
          setTimeout(() => setFlashTickers({}), 1200);
        }

        setQuotes(res.quotes);
        setDataSource(res.dataSource);
      }
    } catch (e) {
      console.warn('[TickerBanner] Failed to refresh quotes:', e);
    }
  };

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 20000); // 20s polling interval
    return () => clearInterval(interval);
  }, []);

  // Compute exchange market open status based on current UTC time
  const getExchangeStatus = () => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMins = now.getUTCMinutes();
    const utcDay = now.getUTCDay(); // 0 is Sun, 6 is Sat

    const isWeekend = utcDay === 0 || utcDay === 6;

    // NYSE: 13:30 to 20:00 UTC (09:30 to 16:00 ET)
    const nyseTotalMins = utcHours * 60 + utcMins;
    const nyseOpen = !isWeekend && nyseTotalMins >= 810 && nyseTotalMins <= 1200;

    // NSE: 03:45 to 10:00 UTC (09:15 to 15:30 IST)
    const nseTotalMins = utcHours * 60 + utcMins;
    const nseOpen = !isWeekend && nseTotalMins >= 225 && nseTotalMins <= 600;

    return { nyseOpen, nseOpen };
  };

  const { nyseOpen, nseOpen } = getExchangeStatus();

  const formatLargeNum = (num?: number) => {
    if (!num) return 'N/A';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  return (
    <div style={{
      background: 'rgba(5, 7, 12, 0.95)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
      padding: '7px 24px',
      fontSize: '0.78rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      overflowX: 'auto',
      whiteSpace: 'nowrap',
      scrollbarWidth: 'none',
      position: 'relative',
      zIndex: 40
    }}>
      {/* Exchange Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* NYSE Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 6,
          padding: '2px 8px',
          fontSize: '0.72rem',
          fontWeight: 600
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: nyseOpen ? '#10B981' : '#6B7280',
            boxShadow: nyseOpen ? '0 0 8px #10B981' : 'none',
            animation: nyseOpen ? 'pulse 2s infinite ease-in-out' : 'none'
          }} />
          <span style={{ color: 'var(--text-muted)' }}>NYSE:</span>
          <span style={{ color: nyseOpen ? '#34D399' : '#9CA3AF' }}>{nyseOpen ? 'Open' : 'Closed'}</span>
        </div>

        {/* NSE Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 6,
          padding: '2px 8px',
          fontSize: '0.72rem',
          fontWeight: 600
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: nseOpen ? '#10B981' : '#6B7280',
            boxShadow: nseOpen ? '0 0 8px #10B981' : 'none',
            animation: nseOpen ? 'pulse 2s infinite ease-in-out' : 'none'
          }} />
          <span style={{ color: 'var(--text-muted)' }}>NSE:</span>
          <span style={{ color: nseOpen ? '#34D399' : '#9CA3AF' }}>{nseOpen ? 'Open' : 'Closed'}</span>
        </div>
      </div>

      {/* Rolling Ticker Items */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {quotes.map((q) => {
          const isUp = q.change >= 0;
          const isSelected = activeTicker === q.ticker;
          const isFlashing = flashTickers[q.ticker];
          const isHovered = hoveredTicker === q.ticker;

          return (
            <div
              key={q.ticker}
              style={{ position: 'relative' }}
              onMouseEnter={() => setHoveredTicker(q.ticker)}
              onMouseLeave={() => setHoveredTicker(null)}
            >
              <button
                onClick={() => onSelectTicker(q.ticker)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: isSelected
                    ? 'rgba(0, 242, 254, 0.12)'
                    : isFlashing
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(255, 255, 255, 0.02)',
                  border: isSelected
                    ? '1px solid rgba(0, 242, 254, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.07)',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.75rem', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                  {q.ticker.replace('.NS', '')}
                </span>

                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                  ${q.price.toFixed(2)}
                </span>

                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: isUp ? '#10B981' : '#EF4444'
                }}>
                  {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {isUp ? '+' : ''}{q.change_pct.toFixed(2)}%
                </span>
              </button>

              {/* Hover Card / Popover */}
              {isHovered && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%) translateY(8px)',
                  background: 'rgba(12, 16, 24, 0.96)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(0, 242, 254, 0.15)',
                  zIndex: 100,
                  minWidth: 210,
                  pointerEvents: 'none'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.82rem' }}>{q.ticker}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{q.market_state}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: '0.7rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Day Range</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        ${q.day_low?.toFixed(2) || '—'} - ${q.day_high?.toFixed(2) || '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Volume</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {formatLargeNum(q.volume)}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>52-Wk Range</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        ${q.year_low?.toFixed(2) || '—'} - ${q.year_high?.toFixed(2) || '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Prev Close</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        ${q.prev_close?.toFixed(2) || '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Open Price</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        ${q.open_price?.toFixed(2) || '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Net Delta</div>
                      <div style={{ fontWeight: 600, color: isUp ? '#10B981' : '#EF4444' }}>
                        {isUp ? '+' : ''}${q.change.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Auto-refresh interval note */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        color: 'var(--text-muted)',
        fontSize: '0.68rem',
        flexShrink: 0
      }}>
        <Clock size={11} style={{ opacity: 0.7 }} />
        <span>20s Refresh</span>
      </div>
    </div>
  );
}
