'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface TickerContextType {
  activeTicker: string;
  setActiveTicker: (ticker: string) => void;
  popularTickers: string[];
}

const TickerContext = createContext<TickerContextType | undefined>(undefined);

export const POPULAR_SHORTCUT_TICKERS = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'RELIANCE.NS', 'TCS.NS'];
export const INITIAL_DEFAULT_TICKER = 'AAPL';

export function TickerProvider({ children }: { children: ReactNode }) {
  const [activeTicker, setActiveTickerState] = useState<string>(INITIAL_DEFAULT_TICKER);

  // Initialize from URL parameter or localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTicker = params.get('ticker');
      if (urlTicker && urlTicker.trim()) {
        const clean = urlTicker.trim().toUpperCase();
        setActiveTickerState(clean);
        localStorage.setItem('finsight_active_ticker', clean);
      } else {
        const saved = localStorage.getItem('finsight_active_ticker');
        if (saved && saved.trim()) {
          const clean = saved.trim().toUpperCase();
          setActiveTickerState(clean);
          syncUrlTicker(clean);
        }
      }

      // Handle browser forward/back navigation
      const handlePopState = () => {
        const currentParams = new URLSearchParams(window.location.search);
        const navTicker = currentParams.get('ticker');
        if (navTicker && navTicker.trim()) {
          setActiveTickerState(navTicker.trim().toUpperCase());
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  const syncUrlTicker = (ticker: string) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('ticker', ticker);
      window.history.replaceState({ ticker }, '', url.toString());
    }
  };

  const setActiveTicker = useCallback((ticker: string) => {
    const clean = ticker.trim().toUpperCase();
    if (!clean) return;

    setActiveTickerState(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem('finsight_active_ticker', clean);
      syncUrlTicker(clean);
    }
  }, []);

  return (
    <TickerContext.Provider
      value={{
        activeTicker,
        setActiveTicker,
        popularTickers: POPULAR_SHORTCUT_TICKERS
      }}
    >
      {children}
    </TickerContext.Provider>
  );
}

export function useTicker(): TickerContextType {
  const context = useContext(TickerContext);
  if (!context) {
    throw new Error('useTicker must be used within a TickerProvider');
  }
  return context;
}
