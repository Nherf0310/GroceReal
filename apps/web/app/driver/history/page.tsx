'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../../lib/api';
import { useCurrency } from '../../context/currency-context';
import { formatMoney } from '../../lib/currency';
import { usePolling } from '../../lib/use-polling';
import StatusBadge from '../../components/status-badge';
import { HistoryDelivery } from '../../lib/driver-types';
import {
  RotateCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  DollarSign,
  PackageCheck,
  Store,
  MapPin,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

export default function DriverHistoryPage() {
  const { currency } = useCurrency();

  const [history, setHistory] = useState<HistoryDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await apiFetch<HistoryDelivery[]>('/driver/deliveries/history');
      setHistory(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load delivery history';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await apiFetch<HistoryDelivery[]>('/driver/deliveries/history');
        if (!ignore) {
          setHistory(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to load delivery history';
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const { refresh, isRefreshing } = usePolling(fetchHistory, { intervalMs: 10000 });

  // Summary row statistics
  const { completedCount, failedCount, cashCollected } = useMemo(() => {
    let completed = 0;
    let failed = 0;
    let cash = 0;

    for (const item of history) {
      if (item.order?.status === 'DELIVERED') {
        completed += 1;
        cash += item.order?.total || 0;
      } else if (item.order?.status === 'DELIVERY_FAILED') {
        failed += 1;
      }
    }

    return {
      completedCount: completed,
      failedCount: failed,
      cashCollected: cash,
    };
  }, [history]);

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Date unknown';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Delivery History</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Review all completed and unfulfilled deliveries assigned to you.
          </p>
        </div>
        <button
          onClick={() => refresh()}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50 self-start sm:self-auto"
        >
          <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Summary Row Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Completed
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {loading ? (
                <span className="inline-block w-8 h-6 bg-slate-200 rounded animate-pulse" />
              ) : (
                completedCount
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Failed
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {loading ? (
                <span className="inline-block w-8 h-6 bg-slate-200 rounded animate-pulse" />
              ) : (
                failedCount
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Cash Collected
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {loading ? (
                <span className="inline-block w-20 h-6 bg-slate-200 rounded animate-pulse" />
              ) : (
                formatMoney(cashCollected, currency)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Error State ── */}
      {error && !loading && (
        <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Failed to load delivery history</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{error}</p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchHistory();
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
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="h-6 bg-slate-200 rounded w-20" />
              </div>
              <div className="h-3.5 bg-slate-100 rounded w-1/2" />
              <div className="h-3.5 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && !error && history.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <PackageCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">No delivery history yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Your completed or reported deliveries will be recorded here for tracking.
            </p>
          </div>
        </div>
      )}

      {/* ── History List ── */}
      {!loading && !error && history.length > 0 && (
        <div className="space-y-3">
          {history.map((item) => {
            const isDelivered = item.order?.status === 'DELIVERED';
            const dropOff = item.order?.address
              ? `${item.order.address.street}, ${item.order.address.city}`
              : 'Address not available';

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 transition-all p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left: Date, Store, Drop-off, Reason */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.order?.status || 'UNKNOWN'} />
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(item.deliveredAt || item.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{item.order?.store?.name || 'Partner Store'}</span>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="truncate">{dropOff}</span>
                  </div>

                  {/* Failure reason details */}
                  {!isDelivered && (item.failureReason || item.failureNote) && (
                    <div className="bg-rose-50 border border-rose-200/60 rounded-xl p-2.5 text-xs text-rose-800 flex items-start gap-2 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        {item.failureReason && (
                          <div className="font-bold">
                            Reason: {item.failureReason.replace(/_/g, ' ')}
                          </div>
                        )}
                        {item.failureNote && (
                          <div className="text-rose-700 text-[11px] mt-0.5">
                            Note: {item.failureNote}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Order Total Amount */}
                <div className="sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex sm:flex-col justify-between items-center sm:items-end">
                  <span className="text-xs font-semibold text-slate-400">Order Amount</span>
                  <span className="text-lg font-black text-slate-900 mt-0.5">
                    {formatMoney(item.order?.total || 0, currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
