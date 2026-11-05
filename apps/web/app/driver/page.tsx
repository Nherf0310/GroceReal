'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '../lib/api';
import { useCurrency } from '../context/currency-context';
import { formatMoney } from '../lib/currency';
import { usePolling } from '../lib/use-polling';
import {
  AvailableDelivery,
  ActiveDelivery,
  HistoryDelivery,
  DeliverySlot,
} from '../lib/driver-types';
import {
  Package,
  Store,
  MapPin,
  Clock,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Loader2,
} from 'lucide-react';

function formatSlot(slot?: DeliverySlot | null): string {
  if (!slot) return 'Flexible Delivery Window';
  try {
    const start = new Date(slot.startTime);
    const end = new Date(slot.endTime);
    const dateStr = start.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    const timeStart = start.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    const timeEnd = end.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${dateStr}, ${timeStart} – ${timeEnd}`;
  } catch {
    return 'Scheduled slot';
  }
}

export default function DriverAvailablePage() {
  const router = useRouter();
  const { currency } = useCurrency();

  const [available, setAvailable] = useState<AvailableDelivery[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<ActiveDelivery | null>(null);
  const [todayCompletedCount, setTodayCompletedCount] = useState<number>(0);
  const [todayCashCollected, setTodayCashCollected] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [availableData, activeData, historyData] = await Promise.all([
        apiFetch<AvailableDelivery[]>('/driver/deliveries/available'),
        apiFetch<ActiveDelivery | null>('/driver/deliveries/active').catch(() => null),
        apiFetch<HistoryDelivery[]>('/driver/deliveries/history').catch(() => []),
      ]);

      setAvailable(availableData || []);
      setActiveDelivery(activeData || null);

      // Compute stats for today
      const todayStr = new Date().toDateString();
      let completedToday = 0;
      let cashToday = 0;

      if (Array.isArray(historyData)) {
        for (const item of historyData) {
          if (
            item.order?.status === 'DELIVERED' &&
            item.deliveredAt &&
            new Date(item.deliveredAt).toDateString() === todayStr
          ) {
            completedToday += 1;
            cashToday += item.order?.total || 0;
          }
        }
      }

      setTodayCompletedCount(completedToday);
      setTodayCashCollected(cashToday);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load available deliveries';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadInitial() {
      try {
        const [availableData, activeData, historyData] = await Promise.all([
          apiFetch<AvailableDelivery[]>('/driver/deliveries/available'),
          apiFetch<ActiveDelivery | null>('/driver/deliveries/active').catch(() => null),
          apiFetch<HistoryDelivery[]>('/driver/deliveries/history').catch(() => []),
        ]);
        if (ignore) return;
        setAvailable(availableData || []);
        setActiveDelivery(activeData || null);

        const todayStr = new Date().toDateString();
        let completedToday = 0;
        let cashToday = 0;

        if (Array.isArray(historyData)) {
          for (const item of historyData) {
            if (
              item.order?.status === 'DELIVERED' &&
              item.deliveredAt &&
              new Date(item.deliveredAt).toDateString() === todayStr
            ) {
              completedToday += 1;
              cashToday += item.order?.total || 0;
            }
          }
        }

        setTodayCompletedCount(completedToday);
        setTodayCashCollected(cashToday);
        setError(null);
      } catch (err) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to load available deliveries';
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadInitial();
    return () => {
      ignore = true;
    };
  }, []);

  const { refresh, isRefreshing } = usePolling(fetchData, { intervalMs: 10000 });

  const handleAccept = async (deliveryId: string) => {
    setAcceptingId(deliveryId);
    setActionError(null);
    try {
      await apiFetch(`/driver/deliveries/${deliveryId}/accept`, {
        method: 'POST',
      });
      router.push('/driver/active');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setActionError('Another driver took this delivery');
        await refresh();
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to accept delivery';
        setActionError(msg);
      }
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* ── Top Header & Manual Refresh ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Available Deliveries</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Claim available orders ready for pickup across partner stores.
          </p>
        </div>
        <button
          onClick={() => refresh()}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Deliveries Completed Today
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {loading ? (
                <span className="inline-block w-8 h-6 bg-slate-200 rounded animate-pulse" />
              ) : (
                todayCompletedCount
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Cash Collected Today
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {loading ? (
                <span className="inline-block w-20 h-6 bg-slate-200 rounded animate-pulse" />
              ) : (
                formatMoney(todayCashCollected, currency)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Delivery In-Progress Notice ── */}
      {activeDelivery && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm">You have an active delivery in progress</p>
              <p className="text-xs text-amber-700">
                Finish delivering your ongoing order before accepting new orders.
              </p>
            </div>
          </div>
          <Link
            href="/driver/active"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition shrink-0 self-start sm:self-auto"
          >
            Go to Active Delivery
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* ── Action Error Banner (e.g. 409 Conflict) ── */}
      {actionError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-rose-800 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Error State with Retry ── */}
      {error && !loading && (
        <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Failed to load deliveries</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{error}</p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition"
          >
            <RotateCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4 animate-pulse"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2 w-3/4">
                  <div className="h-5 bg-slate-200 rounded-md w-1/2" />
                  <div className="h-3.5 bg-slate-100 rounded-md w-3/4" />
                </div>
                <div className="h-6 bg-slate-200 rounded-md w-16" />
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="h-3.5 bg-slate-100 rounded-md w-2/3" />
                <div className="h-3.5 bg-slate-100 rounded-md w-1/2" />
              </div>
              <div className="h-10 bg-slate-200 rounded-xl w-full pt-2" />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && !error && available.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">No deliveries available</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              There are currently no orders ready for pickup. New orders will appear here automatically.
            </p>
          </div>
          <button
            onClick={() => refresh()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Check again
          </button>
        </div>
      )}

      {/* ── Deliveries List Cards ── */}
      {!loading && !error && available.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {available.map((delivery) => {
            const hasActive = activeDelivery !== null;
            const isAccepting = acceptingId === delivery.id;

            return (
              <div
                key={delivery.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 transition-all p-5 flex flex-col justify-between shadow-xs gap-4"
              >
                <div className="space-y-3.5">
                  {/* Store Info & Total */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900 truncate">
                          {delivery.storeName || delivery.order?.store?.name || 'Partner Store'}
                        </h3>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {delivery.storeAddress || delivery.order?.store?.address || 'Store location'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-extrabold text-emerald-600">
                        {formatMoney(delivery.total ?? delivery.order?.total ?? 0, currency)}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">Order Total</span>
                    </div>
                  </div>

                  {/* Route & Delivery details */}
                  <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100 text-xs">
                    <div className="flex items-start gap-2 text-slate-700">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900">Drop-off: </span>
                        <span>
                          {delivery.dropOffAddress ||
                            (delivery.order?.address
                              ? `${delivery.order.address.street}, ${delivery.order.address.city}`
                              : 'Customer address')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {delivery.itemCount ?? delivery.order?.items?.length ?? 0} items
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatSlot(delivery.order?.deliverySlot)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Accept Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleAccept(delivery.id)}
                    disabled={hasActive || isAccepting}
                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                      hasActive
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : isAccepting
                        ? 'bg-emerald-600/70 text-white cursor-wait'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    {isAccepting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Accepting...
                      </>
                    ) : hasActive ? (
                      'Finish current delivery first'
                    ) : (
                      'Accept Delivery'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
