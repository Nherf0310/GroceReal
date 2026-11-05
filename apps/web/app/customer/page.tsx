'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Store as StoreIcon,
  MapPin,
  Clock,
  Truck,
  RotateCw,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { usePolling } from '../lib/use-polling';
import { useCurrency } from '../context/currency-context';
import { formatMoney } from '../lib/currency';
import { Store, Order, DeliverySlot } from './types';
import ActiveOrderBanner from './components/active-order-banner';
import { formatSlotDisplay } from './lib/format-slot';
import { useBasket } from './basket-context';
import StickyBasketBar from './components/sticky-basket-bar';
import { useRouter } from 'next/navigation';

const FINAL_STATUSES = new Set([
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
  'DELIVERY_FAILED',
]);

export default function CustomerShopPage() {
  const { currency } = useCurrency();
  const { store: basketStore } = useBasket();
  const router = useRouter();

  const [stores, setStores] = useState<Store[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [fetchedStores, fetchedOrders] = await Promise.all([
        apiFetch<Store[]>('/stores'),
        apiFetch<Order[]>('/orders').catch(() => [] as Order[]),
      ]);

      // Find active order (not in a final status)
      const currentActive =
        fetchedOrders.find((o) => !FINAL_STATUSES.has(o.status)) || null;
      setActiveOrder(currentActive);

      // Concurrently fetch next delivery slot for each store
      const storesWithSlots = await Promise.all(
        fetchedStores.map(async (st) => {
          try {
            const slots = await apiFetch<DeliverySlot[]>(
              `/stores/${st.id}/delivery-slots`
            );
            const nextSlot =
              Array.isArray(slots) && slots.length > 0 ? slots[0] : null;
            return { ...st, nextSlot };
          } catch {
            return { ...st, nextSlot: null };
          }
        })
      );

      setStores(storesWithSlots);
    } catch (err: unknown) {
      setError(
        (err as Error).message ||
          'Failed to load stores. Please check your connection.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const { isRefreshing, refresh } = usePolling(loadData, {
    intervalMs: 15000,
  });

  const handleOpenCheckout = () => {
    if (basketStore) {
      router.push(`/customer/store/${basketStore.id}?checkout=true`);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Grocery Stores
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Choose a nearby store to start your grocery delivery order.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isRefreshing}
          className="inline-flex items-center self-start sm:self-auto gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-xs disabled:opacity-50"
        >
          <RotateCw
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`}
          />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Active Order Banner */}
      {activeOrder && <ActiveOrderBanner order={activeOrder} />}

      {/* Error State */}
      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-rose-900">
                Unable to load stores
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isRefreshing}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs shrink-0 transition-colors disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 animate-pulse"
            >
              <div className="h-44 bg-slate-100 rounded-xl" />
              <div className="space-y-2">
                <div className="h-5 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-full" />
              </div>
              <div className="h-8 bg-slate-50 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && stores.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <StoreIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            No Grocery Stores Available
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            There are currently no approved stores open in your area. Please
            check back later.
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-2 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors"
          >
            Check Again
          </button>
        </div>
      )}

      {/* Store Grid */}
      {!loading && !error && stores.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((st) => {
            const deliveryFeeFormatted = formatMoney(st.deliveryFee, currency);
            const minOrderFormatted = formatMoney(st.minOrderAmount, currency);
            const nextSlotText = formatSlotDisplay(st.nextSlot);

            return (
              <Link
                key={st.id}
                href={`/customer/store/${st.id}`}
                className="group bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-400 hover:shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer"
              >
                <div>
                  {/* Store Header Image */}
                  <div className="relative h-44 bg-gradient-to-br from-emerald-900 to-slate-900 overflow-hidden">
                    {st.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={st.imageUrl}
                        alt={st.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-emerald-200/30">
                        <StoreIcon className="w-20 h-20 stroke-1" />
                      </div>
                    )}

                    {/* Open/Closed Badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider shadow-md backdrop-blur-md ${
                          st.isOpen
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-900/80 text-slate-300 border border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${st.isOpen ? 'bg-white animate-pulse' : 'bg-slate-400'}`}
                        />
                        {st.isOpen ? 'Open' : 'Closed'}
                      </span>
                    </div>
                  </div>

                  {/* Store Content */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                        {st.name}
                      </h2>
                      {st.address && (
                        <p className="text-xs text-slate-500 mt-1 flex items-start gap-1.5 line-clamp-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{st.address}</span>
                        </p>
                      )}
                    </div>

                    {st.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {st.description}
                      </p>
                    )}

                    {/* Store Meta Row */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Truck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Delivery:</span>
                        <span className="font-bold text-slate-900">
                          {deliveryFeeFormatted}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>Min Order:</span>
                        <span className="font-bold text-slate-900">
                          {minOrderFormatted}
                        </span>
                      </div>
                    </div>

                    {/* Next Available Slot */}
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-[11px] text-slate-500">
                        Next slot:
                      </span>
                      <span className="font-semibold text-slate-800 truncate">
                        {nextSlotText}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
                  <span>Browse catalog</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Sticky Basket Bar */}
      <StickyBasketBar onOpenCheckout={handleOpenCheckout} />
    </div>
  );
}
