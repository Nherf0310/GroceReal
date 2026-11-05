'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useAuth } from '../context/auth-context';
import { Product, BasketStore, BasketItem } from './types';
import { calculateItemPrice } from './lib/price-helper';
import { AlertTriangle } from 'lucide-react';

interface PendingStoreSwitch {
  targetStore: BasketStore;
  pendingItem: {
    product: Product;
    quantity: number;
  };
}

interface BasketContextType {
  store: BasketStore | null;
  items: Record<string, BasketItem>;
  itemCount: number;
  subtotalCents: number;
  hasWeightItems: boolean;
  addItem: (product: Product, store: BasketStore, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearBasket: () => void;
  pendingStoreSwitch: PendingStoreSwitch | null;
  confirmStoreSwitch: () => void;
  cancelStoreSwitch: () => void;
}

const BasketContext = createContext<BasketContextType | undefined>(undefined);

function getStorageKey(userId?: string | null): string {
  return `groceRealBasket_${userId || 'guest'}`;
}

export function BasketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [store, setStore] = useState<BasketStore | null>(null);
  const [items, setItems] = useState<Record<string, BasketItem>>({});
  const [pendingStoreSwitch, setPendingStoreSwitch] = useState<PendingStoreSwitch | null>(null);

  const prevUserIdRef = useRef<string | null | undefined>(user?.id);
  const isLoadedRef = useRef(false);

  // Load basket for active user
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const storageKey = getStorageKey(user?.id);
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            setStore(parsed.store || null);
            setItems(parsed.items || {});
          }
        } else {
          setStore(null);
          setItems({});
        }
      } catch (err) {
        console.warn('Failed to load basket from localStorage:', err);
      }
      isLoadedRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Handle logout (user was logged in, now null)
  useEffect(() => {
    if (prevUserIdRef.current && !user) {
      try {
        const oldKey = getStorageKey(prevUserIdRef.current);
        localStorage.removeItem(oldKey);
      } catch (err) {
        console.warn('Failed to clear basket on logout:', err);
      }
      void Promise.resolve().then(() => {
        setStore(null);
        setItems({});
        setPendingStoreSwitch(null);
      });
    }
    prevUserIdRef.current = user?.id;
  }, [user]);

  // Persist basket to localStorage
  useEffect(() => {
    if (!isLoadedRef.current) return;
    try {
      const storageKey = getStorageKey(user?.id);
      if (Object.keys(items).length === 0 && !store) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            store,
            items,
          })
        );
      }
    } catch (err) {
      console.warn('Failed to save basket to localStorage:', err);
    }
  }, [store, items, user]);

  const clearBasket = useCallback(() => {
    setItems({});
    setStore(null);
    setPendingStoreSwitch(null);
    try {
      localStorage.removeItem(getStorageKey(user?.id));
    } catch (err) {
      console.warn('Failed to remove basket from localStorage:', err);
    }
  }, [user]);

  const addItem = useCallback(
    (product: Product, targetStore: BasketStore, quantityToAdd?: number) => {
      const isWeight = product.unitType === 'WEIGHT';
      const defaultStep = isWeight ? 250 : 1;
      const step = quantityToAdd ?? defaultStep;

      // If switching stores with non-empty basket, ask for confirmation
      const hasExistingItems = Object.keys(items).length > 0;
      if (store && store.id !== targetStore.id && hasExistingItems) {
        setPendingStoreSwitch({
          targetStore,
          pendingItem: { product, quantity: step },
        });
        return;
      }

      setStore({
        id: targetStore.id,
        name: targetStore.name,
        deliveryFee: targetStore.deliveryFee,
        minOrderAmount: targetStore.minOrderAmount,
        address: targetStore.address,
      });

      setItems((prev) => {
        const existing = prev[product.id];
        const newQty = (existing?.quantity || 0) + step;
        return {
          ...prev,
          [product.id]: {
            product,
            quantity: newQty,
          },
        };
      });
    },
    [items, store]
  );

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      const existing = prev[productId];
      if (!existing) return prev;
      return {
        ...prev,
        [productId]: {
          ...existing,
          quantity,
        },
      };
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  const confirmStoreSwitch = useCallback(() => {
    if (!pendingStoreSwitch) return;
    const { targetStore, pendingItem } = pendingStoreSwitch;
    setStore(targetStore);
    setItems({
      [pendingItem.product.id]: {
        product: pendingItem.product,
        quantity: pendingItem.quantity,
      },
    });
    setPendingStoreSwitch(null);
  }, [pendingStoreSwitch]);

  const cancelStoreSwitch = useCallback(() => {
    setPendingStoreSwitch(null);
  }, []);

  const itemCount = useMemo(() => Object.keys(items).length, [items]);

  const subtotalCents = useMemo(() => {
    return Object.values(items).reduce((sum, item) => {
      return (
        sum +
        calculateItemPrice(
          item.product.price,
          item.quantity,
          item.product.unitType
        )
      );
    }, 0);
  }, [items]);

  const hasWeightItems = useMemo(() => {
    return Object.values(items).some(
      (item) => item.product.unitType === 'WEIGHT'
    );
  }, [items]);

  return (
    <BasketContext.Provider
      value={{
        store,
        items,
        itemCount,
        subtotalCents,
        hasWeightItems,
        addItem,
        updateQuantity,
        removeItem,
        clearBasket,
        pendingStoreSwitch,
        confirmStoreSwitch,
        cancelStoreSwitch,
      }}
    >
      {children}

      {/* Confirmation Modal for Store Switch */}
      {pendingStoreSwitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Switch grocery store?
            </h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Your basket already contains items from{' '}
              <span className="font-semibold text-slate-900">
                {store?.name || 'another store'}
              </span>
              . Each order can only be from one store at a time.
            </p>
            <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-3">
              Switching to{' '}
              <span className="font-bold">
                {pendingStoreSwitch.targetStore.name}
              </span>{' '}
              will clear your existing basket and add this item.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={cancelStoreSwitch}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Keep Current Basket
              </button>
              <button
                type="button"
                onClick={confirmStoreSwitch}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-colors"
              >
                Clear & Switch Store
              </button>
            </div>
          </div>
        </div>
      )}
    </BasketContext.Provider>
  );
}

export function useBasket() {
  const context = useContext(BasketContext);
  if (!context) {
    throw new Error('useBasket must be used within a BasketProvider');
  }
  return context;
}
