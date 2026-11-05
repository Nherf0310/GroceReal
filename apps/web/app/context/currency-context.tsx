'use client';

import React, { createContext, useContext, useSyncExternalStore, useCallback } from 'react';
import { Currency, BASE_CURRENCY, SUPPORTED } from '../lib/currency';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: BASE_CURRENCY,
  setCurrency: () => {},
});

const STORAGE_KEY = 'groceRealCurrency';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot(): Currency {
  if (typeof window === 'undefined') return BASE_CURRENCY;
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Currency | null;
    if (saved && SUPPORTED.includes(saved)) {
      return saved;
    }
  } catch {
    // localStorage may fail in restricted environments
  }
  return BASE_CURRENCY;
}

function getServerSnapshot(): Currency {
  return BASE_CURRENCY;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const currency = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setCurrency = useCallback((c: Currency) => {
    try {
      localStorage.setItem(STORAGE_KEY, c);
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore storage error
    }
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
