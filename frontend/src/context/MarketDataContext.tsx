'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { LiveTickerQuote, BackendHealthStatus, DataSourceType } from '../lib/types';
import { getLiveTickerQuotes, checkBackendHealth } from '../lib/api';

export type FreshnessState =
  | 'LIVE'
  | 'LIVE_DELAYED'
  | 'LOADING'
  | 'BACKEND_STARTING'
  | 'PROVIDER_ERROR'
  | 'DEMO_SIMULATION';

interface MarketDataContextType {
  quotes: Record<string, LiveTickerQuote>;
  getQuote: (ticker: string) => LiveTickerQuote | undefined;
  freshnessState: FreshnessState;
  backendHealth: BackendHealthStatus | null;
  refreshQuotes: () => Promise<void>;
  isDemoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  lastUpdated: string | null;
  activeTickerPrice: (ticker: string) => number | undefined;
  wakingStartedAt: number | null;
}

const MarketDataContext = createContext<MarketDataContextType | undefined>(undefined);

const DEFAULT_SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'MSFT', 'TSLA', 'RELIANCE.NS', 'TCS.NS', '^NSEI'];

export function MarketDataProvider({ children }: { children: ReactNode }) {
  const [quotes, setQuotes] = useState<Record<string, LiveTickerQuote>>({});
  const [freshnessState, setFreshnessState] = useState<FreshnessState>('LOADING');
  const [backendHealth, setBackendHealth] = useState<BackendHealthStatus | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isDemoMode, setIsDemoModeState] = useState<boolean>(false);
  const [wakingStartedAt, setWakingStartedAt] = useState<number | null>(null);

  // Initialize demo mode state from localStorage if explicitly set
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const explicitDemo = localStorage.getItem('finsight_explicit_demo_mode') === 'true';
      setIsDemoModeState(explicitDemo);
    }
  }, []);

  const setDemoMode = (enabled: boolean) => {
    setIsDemoModeState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('finsight_explicit_demo_mode', enabled ? 'true' : 'false');
    }
  };

  const refreshQuotes = useCallback(async () => {
    try {
      // 1. Probe backend health
      const health = await checkBackendHealth();
      setBackendHealth(health);

      if (!health.online) {
        if (isDemoMode) {
          setFreshnessState('DEMO_SIMULATION');
        } else if (health.httpStatus === 404) {
          // 404 is NOT a cold start: endpoint does not exist or service was removed
          setFreshnessState('PROVIDER_ERROR');
          setWakingStartedAt(null);
        } else {
          // Render cold start takes ~35-45s. If it exceeds 75s, transition to PROVIDER_ERROR
          setWakingStartedAt(prev => {
            const start = prev || Date.now();
            const elapsed = (Date.now() - start) / 1000;
            if (elapsed > 75) {
              setFreshnessState('PROVIDER_ERROR');
            } else {
              setFreshnessState('BACKEND_STARTING');
            }
            return start;
          });
        }
        return;
      } else {
        setWakingStartedAt(null);
      }

      // 2. Fetch live quotes for default watchlist
      const res = await getLiveTickerQuotes(DEFAULT_SYMBOLS);
      if (res && res.quotes && res.quotes.length > 0) {
        const quoteMap: Record<string, LiveTickerQuote> = {};
        res.quotes.forEach(q => {
          quoteMap[q.ticker.toUpperCase()] = q;
        });
        setQuotes(quoteMap);
        setLastUpdated(res.fetchedAt);

        if (res.dataSource === 'simulated' || isDemoMode) {
          setFreshnessState('DEMO_SIMULATION');
        } else {
          // Check if data is fresh (< 5 minutes old)
          const fetchTime = new Date(res.fetchedAt).getTime();
          const ageSec = (Date.now() - fetchTime) / 1000;
          setFreshnessState(ageSec > 300 ? 'LIVE_DELAYED' : 'LIVE');
        }
      }
    } catch (err) {
      console.warn('[MarketDataProvider] Quote synchronization failed:', err);
      if (isDemoMode) {
        setFreshnessState('DEMO_SIMULATION');
      } else {
        setFreshnessState('PROVIDER_ERROR');
      }
    }
  }, [isDemoMode]);

  useEffect(() => {
    refreshQuotes();
    // Fast 5s polling when waking up, 20s when live
    const pollInterval = freshnessState === 'BACKEND_STARTING' ? 5000 : 20000;
    const interval = setInterval(refreshQuotes, pollInterval);
    return () => clearInterval(interval);
  }, [refreshQuotes, freshnessState]);

  const getQuote = (ticker: string): LiveTickerQuote | undefined => {
    const clean = ticker.trim().toUpperCase();
    return quotes[clean];
  };

  const activeTickerPrice = (ticker: string): number | undefined => {
    const q = getQuote(ticker);
    return q?.price;
  };

  return (
    <MarketDataContext.Provider
      value={{
        quotes,
        getQuote,
        freshnessState,
        backendHealth,
        refreshQuotes,
        isDemoMode,
        setDemoMode,
        lastUpdated,
        wakingStartedAt,
        activeTickerPrice
      }}
    >
      {children}
    </MarketDataContext.Provider>
  );
}

export function useMarketData() {
  const context = useContext(MarketDataContext);
  if (!context) {
    throw new Error('useMarketData must be used within a MarketDataProvider');
  }
  return context;
}
