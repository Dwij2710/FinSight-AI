'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { PriceAlert, LiveTickerQuote } from '../lib/types';
import { useMarketData } from './MarketDataContext';

interface ToastAlert {
  id: string;
  ticker: string;
  price: number;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  timestamp: string;
}

interface AlertContextType {
  alerts: PriceAlert[];
  addAlert: (ticker: string, targetPrice: number, condition: 'ABOVE' | 'BELOW') => boolean;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
  activeToast: ToastAlert | null;
  dismissToast: () => void;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  hasNotificationPermission: boolean;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

const ALERTS_STORAGE_KEY = 'finsight_price_alerts_v1';
const COOLDOWN_MS = 15 * 60 * 1000; // 15-minute cooldown between repeated alerts

export function AlertProvider({ children }: { children: ReactNode }) {
  const { quotes, freshnessState } = useMarketData();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [activeToast, setActiveToast] = useState<ToastAlert | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  // Load persisted alerts on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setAlerts(parsed);
          }
        }
      } catch (err) {
        console.warn('[AlertContext] Failed to load alerts from storage:', err);
      }

      if ('Notification' in window) {
        setHasPermission(Notification.permission === 'granted');
      }
    }
  }, []);

  const saveAlerts = (newAlerts: PriceAlert[]) => {
    setAlerts(newAlerts);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(newAlerts));
      } catch (err) {
        console.warn('[AlertContext] Failed to save alerts to storage:', err);
      }
    }
  };

  const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const perm = await Notification.requestPermission();
      setHasPermission(perm === 'granted');
      return perm;
    } catch {
      return 'denied';
    }
  };

  const addAlert = (ticker: string, targetPrice: number, condition: 'ABOVE' | 'BELOW'): boolean => {
    const sym = ticker.trim().toUpperCase();
    if (!sym || isNaN(targetPrice) || targetPrice <= 0) return false;

    // Check for duplicate alert
    const exists = alerts.some(
      a => a.ticker === sym && Math.abs(a.targetPrice - targetPrice) < 0.001 && a.condition === condition
    );
    if (exists) return false;

    const newAlert: PriceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      ticker: sym,
      targetPrice: Number(targetPrice.toFixed(2)),
      condition,
      enabled: true,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE'
    };

    saveAlerts([newAlert, ...alerts]);

    // Request notification permission if not yet decided
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      requestNotificationPermission();
    }

    return true;
  };

  const removeAlert = (id: string) => {
    saveAlerts(alerts.filter(a => a.id !== id));
  };

  const toggleAlert = (id: string) => {
    saveAlerts(
      alerts.map(a => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const dismissToast = () => {
    setActiveToast(null);
  };

  // Evaluate alerts against live quotes
  useEffect(() => {
    // Authenticity guard: Only evaluate against verified live market quotes
    if (freshnessState === 'BACKEND_STARTING' || freshnessState === 'PROVIDER_ERROR') {
      return;
    }

    const now = Date.now();
    let updatedAlerts: PriceAlert[] | null = null;

    alerts.forEach((alert, idx) => {
      if (!alert.enabled) return;

      const quote = quotes[alert.ticker];
      if (!quote || quote.price <= 0) return;

      // Cooldown check: if already triggered recently, do not re-trigger
      if (alert.lastTriggered) {
        const lastTriggeredTime = new Date(alert.lastTriggered).getTime();
        if (now - lastTriggeredTime < COOLDOWN_MS) return;
      }

      const isAboveMet = alert.condition === 'ABOVE' && quote.price >= alert.targetPrice;
      const isBelowMet = alert.condition === 'BELOW' && quote.price <= alert.targetPrice;

      if (isAboveMet || isBelowMet) {
        // Trigger alert!
        const triggeredAlert: ToastAlert = {
          id: alert.id,
          ticker: alert.ticker,
          price: quote.price,
          targetPrice: alert.targetPrice,
          condition: alert.condition,
          timestamp: new Date().toISOString()
        };

        setActiveToast(triggeredAlert);

        // Native OS browser notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`FinSight Target Hit: ${alert.ticker}`, {
              body: `${alert.ticker} reached $${quote.price.toFixed(2)} (${alert.condition === 'ABOVE' ? 'above' : 'below'} target $${alert.targetPrice.toFixed(2)})`,
              icon: '/favicon.ico'
            });
          } catch (err) {
            console.warn('[AlertContext] Native notification error:', err);
          }
        }

        // Update alert record with trigger timestamp
        if (!updatedAlerts) updatedAlerts = [...alerts];
        updatedAlerts[idx] = {
          ...alert,
          lastTriggered: new Date().toISOString(),
          status: 'TRIGGERED'
        };
      }
    });

    if (updatedAlerts) {
      saveAlerts(updatedAlerts);
    }
  }, [quotes, freshnessState]);

  return (
    <AlertContext.Provider
      value={{
        alerts,
        addAlert,
        removeAlert,
        toggleAlert,
        activeToast,
        dismissToast,
        requestNotificationPermission,
        hasNotificationPermission: hasPermission
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
}
