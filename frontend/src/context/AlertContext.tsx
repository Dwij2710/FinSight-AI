'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  PriceAlert,
  MultiConditionAlert,
  AlertConditionType,
  AlertTriggerEvent
} from '../lib/types';
import { useMarketData } from './MarketDataContext';
import {
  getUserAlerts,
  createUserAlert,
  deleteUserAlert,
  toggleUserAlert,
  evaluateUserAlerts,
  isExplicitDemoMode
} from '../lib/api';

export interface ToastAlert {
  id: string | number;
  ticker: string;
  price?: number;
  targetPrice?: number;
  condition?: string;
  trigger_message?: string;
  timestamp: string;
}

interface AlertContextType {
  // Legacy support
  alerts: PriceAlert[];
  addAlert: (ticker: string, targetPrice: number, condition: 'ABOVE' | 'BELOW') => boolean;

  // Multi-condition alerts
  multiAlerts: MultiConditionAlert[];
  addMultiConditionAlert: (
    ticker: string,
    condition_type: AlertConditionType,
    threshold_value: number
  ) => Promise<boolean>;
  removeAlert: (id: string | number) => Promise<void>;
  toggleAlert: (id: string | number) => Promise<void>;
  checkAlertsNow: () => Promise<void>;
  isChecking: boolean;

  // Modal UI State
  isAlertCenterOpen: boolean;
  openAlertCenter: () => void;
  closeAlertCenter: () => void;

  // Toast UI State
  activeToast: ToastAlert | null;
  dismissToast: () => void;

  // Browser Notifications
  requestNotificationPermission: () => Promise<NotificationPermission>;
  hasNotificationPermission: boolean;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

const ALERTS_STORAGE_KEY = 'finsight_multi_alerts_v2';
const COOLDOWN_MS = 5 * 60 * 1000; // 5-minute cooldown between repeated notifications

export function AlertProvider({ children }: { children: ReactNode }) {
  const { quotes, freshnessState } = useMarketData();
  const [multiAlerts, setMultiAlerts] = useState<MultiConditionAlert[]>([]);
  const [activeToast, setActiveToast] = useState<ToastAlert | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isAlertCenterOpen, setIsAlertCenterOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<number>(0);

  // Load alerts from backend or local cache on mount
  useEffect(() => {
    let isMounted = true;

    async function loadAlerts() {
      try {
        if (!isExplicitDemoMode()) {
          const { data } = await getUserAlerts();
          if (isMounted && data && Array.isArray(data)) {
            setMultiAlerts(data);
            return;
          }
        }
      } catch (err) {
        console.warn('[AlertContext] Backend alerts fetch fallback to localStorage:', err);
      }

      // Local storage fallback
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
          if (stored && isMounted) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setMultiAlerts(parsed);
            }
          }
        } catch (e) {
          console.warn('[AlertContext] Failed to parse cached alerts:', e);
        }
      }
    }

    loadAlerts();

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Save to local storage for instant offline access
  const persistLocal = (newAlerts: MultiConditionAlert[]) => {
    setMultiAlerts(newAlerts);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(newAlerts));
      } catch (err) {
        console.warn('[AlertContext] LocalStorage save error:', err);
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

  // Add Multi-Condition Alert
  const addMultiConditionAlert = async (
    ticker: string,
    condition_type: AlertConditionType,
    threshold_value: number
  ): Promise<boolean> => {
    const sym = ticker.trim().toUpperCase();
    if (!sym || isNaN(thresholdValueClean(threshold_value))) return false;

    try {
      if (!isExplicitDemoMode()) {
        const res = await createUserAlert({
          ticker: sym,
          condition_type,
          threshold_value
        });
        if (res.data) {
          persistLocal([res.data, ...multiAlerts.filter(a => a.id !== res.data.id)]);
          return true;
        }
      }
    } catch (err: any) {
      console.warn('[AlertContext] Backend alert creation error, saving locally:', err);
    }

    // Local / Offline fallback creation
    const newAlert: MultiConditionAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ticker: sym,
      condition_type,
      threshold_value,
      is_active: true,
      created_at: new Date().toISOString()
    };

    persistLocal([newAlert, ...multiAlerts]);

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      requestNotificationPermission();
    }

    return true;
  };

  function thresholdValueClean(val: number): number {
    return typeof val === 'number' ? val : parseFloat(val);
  }

  // Legacy addAlert wrapper
  const addAlert = (ticker: string, targetPrice: number, condition: 'ABOVE' | 'BELOW'): boolean => {
    const condType: AlertConditionType = condition === 'ABOVE' ? 'PRICE_ABOVE' : 'PRICE_BELOW';
    addMultiConditionAlert(ticker, condType, targetPrice);
    return true;
  };

  // Remove Alert
  const removeAlert = async (id: string | number) => {
    persistLocal(multiAlerts.filter(a => a.id !== id));
    try {
      if (!isExplicitDemoMode() && typeof id === 'number') {
        await deleteUserAlert(id);
      }
    } catch (err) {
      console.warn('[AlertContext] Backend delete alert error:', err);
    }
  };

  // Toggle Alert
  const toggleAlert = async (id: string | number) => {
    const updated = multiAlerts.map(a =>
      a.id === id ? { ...a, is_active: !a.is_active } : a
    );
    persistLocal(updated);

    try {
      if (!isExplicitDemoMode() && typeof id === 'number') {
        await toggleUserAlert(id);
      }
    } catch (err) {
      console.warn('[AlertContext] Backend toggle alert error:', err);
    }
  };

  const dismissToast = () => {
    setActiveToast(null);
  };

  // Active check / evaluation function
  const checkAlertsNow = useCallback(async () => {
    setIsChecking(true);
    try {
      if (!isExplicitDemoMode()) {
        const evalRes = await evaluateUserAlerts();
        if (evalRes?.data?.triggered_events && evalRes.data.triggered_events.length > 0) {
          const firstEv = evalRes.data.triggered_events[0];
          setActiveToast({
            id: firstEv.alert_id,
            ticker: firstEv.ticker,
            condition: firstEv.condition_type,
            trigger_message: firstEv.trigger_message,
            timestamp: firstEv.triggered_at
          });

          // Native OS notification
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`FinSight Alert: ${firstEv.ticker}`, {
                body: firstEv.trigger_message,
                icon: '/favicon.ico'
              });
            } catch (e) {
              console.warn('[AlertContext] Native notification error:', e);
            }
          }

          // Refresh alerts to reflect triggered_at timestamps
          const { data } = await getUserAlerts();
          if (data && Array.isArray(data)) {
            persistLocal(data);
          }
          return;
        }
      }
    } catch (err) {
      console.warn('[AlertContext] Evaluate API fallback to client check:', err);
    } finally {
      setIsChecking(false);
      setLastChecked(Date.now());
    }

    // Client-side fallback evaluation against current quotes
    const now = Date.now();
    let triggeredAny = false;
    const updatedAlerts = multiAlerts.map(alert => {
      if (!alert.is_active) return alert;
      const quote = quotes[alert.ticker];
      if (!quote || quote.price <= 0) return alert;

      if (alert.triggered_at) {
        const lastTrig = new Date(alert.triggered_at).getTime();
        if (now - lastTrig < COOLDOWN_MS) return alert;
      }

      let isTriggered = false;
      let msg = '';

      if (alert.condition_type === 'PRICE_ABOVE' && quote.price >= alert.threshold_value) {
        isTriggered = true;
        msg = `${alert.ticker} reached $${quote.price.toFixed(2)} (target $${alert.threshold_value.toFixed(2)})`;
      } else if (alert.condition_type === 'PRICE_BELOW' && quote.price <= alert.threshold_value) {
        isTriggered = true;
        msg = `${alert.ticker} dropped to $${quote.price.toFixed(2)} (target $${alert.threshold_value.toFixed(2)})`;
      } else if (alert.condition_type === 'PCT_CHANGE_ABOVE' && quote.change_pct >= alert.threshold_value) {
        isTriggered = true;
        msg = `${alert.ticker} surged +${quote.change_pct.toFixed(2)}% (threshold +${alert.threshold_value.toFixed(2)}%)`;
      } else if (alert.condition_type === 'PCT_CHANGE_BELOW' && quote.change_pct <= alert.threshold_value) {
        isTriggered = true;
        msg = `${alert.ticker} dropped ${quote.change_pct.toFixed(2)}% (threshold ${alert.threshold_value.toFixed(2)}%)`;
      }

      if (isTriggered) {
        triggeredAny = true;
        setActiveToast({
          id: alert.id,
          ticker: alert.ticker,
          price: quote.price,
          targetPrice: alert.threshold_value,
          condition: alert.condition_type,
          trigger_message: msg,
          timestamp: new Date().toISOString()
        });

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`FinSight Alert: ${alert.ticker}`, {
              body: msg,
              icon: '/favicon.ico'
            });
          } catch (e) {
            console.warn('[AlertContext] Native notification error:', e);
          }
        }

        return {
          ...alert,
          triggered_at: new Date().toISOString()
        };
      }

      return alert;
    });

    if (triggeredAny) {
      persistLocal(updatedAlerts);
    }
  }, [multiAlerts, quotes]);

  // Periodic check when quotes update
  useEffect(() => {
    if (freshnessState === 'BACKEND_STARTING' || freshnessState === 'PROVIDER_ERROR') {
      return;
    }
    const now = Date.now();
    if (now - lastChecked > 30000 && multiAlerts.some(a => a.is_active)) {
      checkAlertsNow();
    }
  }, [quotes, freshnessState, lastChecked, multiAlerts, checkAlertsNow]);

  // Convert multiAlerts to legacy PriceAlert format for components that still consume it
  const legacyAlerts: PriceAlert[] = multiAlerts.map(a => ({
    id: String(a.id),
    ticker: a.ticker,
    targetPrice: a.threshold_value,
    condition: a.condition_type === 'PRICE_BELOW' ? 'BELOW' : 'ABOVE',
    enabled: a.is_active,
    createdAt: a.created_at,
    lastTriggered: a.triggered_at || undefined,
    status: a.triggered_at ? 'TRIGGERED' : 'ACTIVE'
  }));

  return (
    <AlertContext.Provider
      value={{
        alerts: legacyAlerts,
        addAlert,
        multiAlerts,
        addMultiConditionAlert,
        removeAlert,
        toggleAlert,
        checkAlertsNow,
        isChecking,
        isAlertCenterOpen,
        openAlertCenter: () => setIsAlertCenterOpen(true),
        closeAlertCenter: () => setIsAlertCenterOpen(false),
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
