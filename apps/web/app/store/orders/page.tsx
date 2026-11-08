'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { RefreshCw, AlertTriangle, Search } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { usePolling } from '../../lib/use-polling';
import { useCurrency } from '../../context/currency-context';
import { formatMoney, convert, BASE_CURRENCY } from '../../lib/currency';
import StatusBadge from '../../components/status-badge';
import type { StoreOrderListItem, OrderStatus } from '../types';
import { timeAgo } from '../lib/time-ago';

type TabKey =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PICKING'
  | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CLOSED';

const TABS: { key: TabKey; label: string; statuses: OrderStatus[] }[] = [
  { key: 'PENDING', label: 'New', statuses: ['PENDING'] },
  { key: 'CONFIRMED', label: 'Confirmed', statuses: ['CONFIRMED'] },
  { key: 'PICKING', label: 'Picking', statuses: ['PICKING'] },
  { key: 'READY_FOR_DELIVERY', label: 'Ready', statuses: ['READY_FOR_DELIVERY'] },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', statuses: ['OUT_FOR_DELIVERY'] },
  { key: 'DELIVERED', label: 'Completed', statuses: ['DELIVERED'] },
  { key: 'CLOSED', label: 'Closed', statuses: ['REJECTED', 'CANCELLED', 'DELIVERY_FAILED'] },
];

export default function StoreOrdersPage() {
  const { currency } = useCurrency();
  const [orders, setOrders] = useState<StoreOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('PENDING');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const data = await apiFetch<StoreOrderListItem[]>('/store/orders');
      setOrders(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  const { isRefreshing, refresh } = usePolling(fetchData);

  const tabStatuses = useMemo(
    () => TABS.find((t) => t.key === activeTab)?.statuses ?? [],
    [activeTab]
  );

  const filtered = useMemo(() => {
    let list = orders.filter((o) => tabStatuses.includes(o.status));

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.customer?.name ? o.customer.name.toLowerCase().includes(q) : false)
      );
    }

    // PENDING: oldest first; others: newest first
    if (activeTab === 'PENDING') {
      list = [...list].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return list;
  }, [orders, tabStatuses, search, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = {} as Record<TabKey, number>;
    for (const tab of TABS) {
      counts[tab.key] = orders.filter((o) => tab.statuses.includes(o.status)).length;
    }
    return counts;
  }, [orders]);

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-7 bg-slate-200 rounded-xl w-32" />
        <div className="h-10 bg-slate-100 rounded-xl" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm text-rose-700">{error}</p>
          <button
            onClick={() => { void refresh(); }}
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">{orders.length} total orders</p>
        </div>
        <button
          onClick={() => { void refresh(); }}
          disabled={isRefreshing}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition disabled:opacity-40"
          aria-label="Refresh orders"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
              activeTab === tab.key
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
            {tabCounts[tab.key] > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tabCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by order ID or customer name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <p className="text-slate-400 text-sm">No orders in this category</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {filtered.map((order) => {
              const total = convert(order.total, BASE_CURRENCY, currency);
              const slot = order.deliverySlot;
              const slotStr = slot
                ? `${slot.date ? new Date(slot.date).toLocaleDateString() : ''} ${slot.startTime || ''}–${slot.endTime || ''}`.trim() || '—'
                : '—';
              const itemCount = order.items?.length ?? 0;
              return (
                <li key={order.id}>
                  <Link
                    href={`/store/orders/${order.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 gap-2 hover:bg-slate-50 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-slate-900">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {order.customer?.name || 'Customer'} · {itemCount} item{itemCount !== 1 ? 's' : ''} · {slotStr}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900">{formatMoney(total, currency)}</div>
                        <div className="text-xs text-slate-400">{timeAgo(order.createdAt)}</div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
