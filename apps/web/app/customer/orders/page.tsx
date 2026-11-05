'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Clock,
  AlertCircle,
  RotateCw,
  ArrowRight,
  Store as StoreIcon,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useCurrency } from '../../context/currency-context';
import { formatMoney } from '../../lib/currency';
import { usePolling } from '../../lib/use-polling';
import { Order, OrderStatus } from '../types';
import StatusBadge from '../../components/status-badge';
import { formatSlotDisplay } from '../lib/format-slot';

const FINAL_STATUSES = new Set<OrderStatus>([
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
  'DELIVERY_FAILED',
]);

type Tab = 'active' | 'past';

export default function CustomerOrdersPage() {
  const { currency } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('active');

  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      const fetched = await apiFetch<Order[]>('/orders');
      // Sort newest first
      const sorted = [...fetched].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setOrders(sorted);
    } catch (err: unknown) {
      setError(
        (err as Error).message || 'Failed to load orders. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const { isRefreshing, refresh } = usePolling(loadOrders, {
    intervalMs: 10000,
  });

  const activeOrders = orders.filter((o) => !FINAL_STATUSES.has(o.status));
  const pastOrders = orders.filter((o) => FINAL_STATUSES.has(o.status));
  const displayOrders = activeTab === 'active' ? activeOrders : pastOrders;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track your grocery deliveries and order history.
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

      {/* Error State */}
      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-rose-900">
                Unable to load orders
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

      {/* Tabs */}
      {!error && (
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'active'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Active
            {activeOrders.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                {activeOrders.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'past'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Past
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && !error && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 bg-slate-200 rounded w-1/3" />
                <div className="h-6 bg-slate-100 rounded-full w-20" />
              </div>
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && displayOrders.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            {activeTab === 'active'
              ? 'No active orders'
              : 'No past orders yet'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {activeTab === 'active'
              ? 'You have no ongoing deliveries. Browse stores to place an order.'
              : 'Your completed and cancelled orders will appear here.'}
          </p>
          <Link
            href="/customer"
            className="inline-flex items-center gap-2 mt-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition-colors"
          >
            <StoreIcon className="w-4 h-4" />
            Browse Stores
          </Link>
        </div>
      )}

      {/* Order List */}
      {!loading && !error && displayOrders.length > 0 && (
        <div className="space-y-4">
          {displayOrders.map((order) => {
            const itemCount = order.items?.length ?? 0;
            const date = new Date(order.createdAt);
            const dateStr = date.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <Link
                key={order.id}
                href={`/customer/orders/${order.id}`}
                className="group block bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-400 hover:shadow-lg transition-all duration-200"
              >
                <div className="p-5 space-y-3">
                  {/* Order Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-slate-500">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                      <h2 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition-colors mt-1 truncate">
                        {order.store?.name || 'Grocery Order'}
                      </h2>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-emerald-700">
                        {formatMoney(order.total, currency)}
                      </p>
                    </div>
                  </div>

                  {/* Order Meta */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {dateStr}
                    </span>
                    {order.deliverySlot && (
                      <span className="flex items-center gap-1 text-slate-400">
                        Slot: {formatSlotDisplay(order.deliverySlot)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-800 rounded-b-2xl">
                  <span>View Order Details</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
