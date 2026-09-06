'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, X, Building2, TrendingUp, ChevronRight, Globe, AlertCircle } from 'lucide-react';
import { searchTickers } from '../../lib/api';
import { TickerSearchResult } from '../../lib/types';
import { useTicker } from '../../context/TickerContext';

interface UniversalTickerSearchProps {
  onSelect?: (symbol: string) => void;
  className?: string;
  placeholder?: string;
}

export function UniversalTickerSearch({
  onSelect,
  className = '',
  placeholder
}: UniversalTickerSearchProps) {
  const { activeTicker, setActiveTicker } = useTicker();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<TickerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const searchResults = await searchTickers(trimmed);
      setResults(searchResults);
      setSelectedIndex(searchResults.length > 0 ? 0 : -1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length > 0) {
      setLoading(true);
      debounceTimerRef.current = setTimeout(() => {
        performSearch(val);
      }, 220);
    } else {
      setResults([]);
      setLoading(false);
    }
  };

  const handleSelectSymbol = (sym: string) => {
    const clean = sym.trim().toUpperCase();
    setActiveTicker(clean);
    if (onSelect) onSelect(clean);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && e.key === 'ArrowDown') {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelectSymbol(results[selectedIndex].symbol);
      } else if (query.trim()) {
        // Direct search input submitted as ticker
        handleSelectSymbol(query.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: 360 }} className={className}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
        border: isOpen ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
        borderRadius: 10,
        padding: '6px 12px',
        gap: 10,
        boxShadow: isOpen ? '0 0 12px rgba(0, 242, 254, 0.2)' : 'none',
        transition: 'all 0.2s ease'
      }}>
        {loading ? (
          <Loader2 size={15} color="var(--accent-cyan)" className="animate-spin" />
        ) : (
          <Search size={15} color={isOpen ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
        )}
        <input
          ref={inputRef}
          id="universal-ticker-search-input"
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (query.trim().length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || `Search stock or name (Active: ${activeTicker})`}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.84rem',
            outline: 'none',
            width: '100%',
            fontFamily: 'var(--font-sans)'
          }}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={14} />
          </button>
        )}
        <kbd style={{
          fontSize: '0.68rem',
          padding: '2px 6px',
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
          borderRadius: 4,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)'
        }}>
          Enter
        </kbd>
      </div>

      {/* Autocomplete Dropdown Overlay */}
      {isOpen && query.trim().length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          background: 'rgba(13, 17, 26, 0.98)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
          borderRadius: 12,
          boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.5))',
          zIndex: 9999,
          maxHeight: 380,
          overflowY: 'auto',
          padding: '6px 0'
        }}>
          {results.length > 0 ? (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${item.symbol}-${idx}`}
                  onClick={() => handleSelectSymbol(item.symbol)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 14px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--accent-cyan)' : '3px solid transparent',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)',
                      minWidth: 70
                    }}>
                      {item.symbol}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{
                        fontSize: '0.82rem',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 180
                      }}>
                        {item.name}
                      </span>
                      {item.sector && (
                        <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                          {item.sector}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: '0.68rem',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {item.exchange}
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: item.asset_type === 'ETF' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: item.asset_type === 'ETF' ? '#C084FC' : 'var(--accent-emerald)',
                      fontWeight: 600
                    }}>
                      {item.asset_type}
                    </span>
                  </div>
                </div>
              );
            })
          ) : !loading ? (
            <div style={{
              padding: '16px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.82rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6
            }}>
              <AlertCircle size={18} color="var(--accent-amber, #F59E0B)" />
              <span>We couldn&apos;t find a supported security for &quot;{query}&quot;.</span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Press <strong style={{ color: 'var(--accent-cyan)' }}>Enter</strong> to query &quot;{query.trim().toUpperCase()}&quot; directly.
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
