'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, AlertTriangle, Package, Clock, TrendingUp, Layers } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { usePolling } from '../lib/use-polling';
import { useCurrency } from '../context/currency-context';
import { formatMoney, convert, BASE_CURRENCY } from '../lib/currency';
import StatusBadge from '../components/status-badge';
import type { StoreOverview, LowStockProduct } from './types';
import { timeAgo } from './lib/time-ago';

interface PendingOrder {
  id: string;
  status: string;
  createdAt: string;
  total: number;
  customer: { name: string };
}

function StatCard({
  label,
  value,
  icon,
  href,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href?: string;
  highlight?: boolean;
}) {
  const inner = (
    <div
      className={`bg-white rounded-2xl border p-4 flex items-center gap-4 ${
        highlight ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
      } ${href ? 'hover:shadow-md transition cursor-pointer' : ''}`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          highlight ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'
        }`}
      >
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold text-slate-900">{value}</div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

export default function StoreOverviewPage() {
  const { currency } = useCurrency();

  const [overview, setOverview] = useState<StoreOverview | null>(null);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [ov, orders, ls] = await Promise.all([
        apiFetch<StoreOverview>('/store/overview'),
        apiFetch<PendingOrder[]>('/store/orders?status=PENDING'),
        apiFetch<LowStockProduct[]>('/store/inventory/low-stock'),
      ]);
      setOverview(ov);
      // Oldest first for "needs attention"
      setPendingOrders(
        [...orders].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      );
      setLowStock(ls);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load overview');
    } finally {
      setLoading(false);
    }
  }, []);

  const { isRefreshing, refresh } = usePolling(fetchData);

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-7 bg-slate-200 rounded-xl w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl" />
          ))}
        </div>
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

  if (!overview) return null;

  const c = overview.orderCountsByStatus;
  const revenue = convert(overview.todayRevenue, BASE_CURRENCY, currency);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Store dashboard</p>
        </div>
        <button
          onClick={() => { void refresh(); }}
          disabled={isRefreshing}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition disabled:opacity-40"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="New Orders"
          value={c.PENDING ?? 0}
          icon={<Package className="w-5 h-5" />}
          href="/store/orders"
          highlight={(c.PENDING ?? 0) > 0}
        />
        <StatCard
          label="Being Picked"
          value={c.PICKING ?? 0}
          icon={<Layers className="w-5 h-5" />}
          href="/store/orders"
        />
        <StatCard
          label="Ready for Driver"
          value={c.READY_FOR_DELIVERY ?? 0}
          icon={<Clock className="w-5 h-5" />}
          href="/store/orders"
        />
        <StatCard
          label="Today's Orders"
          value={overview.todayOrdersCount}
          icon={<TrendingUp className="w-5 h-5" />}
          href="/store/orders"
        />
        <StatCard
          label="Today's Revenue"
          value={formatMoney(revenue, currency)}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="Low-Stock Items"
          value={overview.lowStockCount}
          icon={<AlertTriangle className="w-5 h-5" />}
          href="/store/inventory"
          highlight={overview.lowStockCount > 0}
        />
        <StatCard
          label="Open Slots Today"
          value={overview.openSlotsToday}
          icon={<Clock className="w-5 h-5" />}
          href="/store/slots"
        />
      </div>

      {/* Needs Attention */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Pending Orders */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Oldest Pending Orders</h2>
            <Link href="/store/orders" className="text-xs text-emerald-600 hover:underline font-medium">
              View all
            </Link>
          </div>
          {pendingOrders.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-slate-400">
              No pending orders 🎉
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pendingOrders.slice(0, 5).map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/store/orders/${order.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition"
                  >
                    <div>
                      <span className="text-sm font-medium text-slate-900 font-mono">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">{order.customer.name}</span>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={order.status} />
                      <div className="text-xs text-slate-400 mt-0.5">{timeAgo(order.createdAt)}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Low-Stock Items</h2>
            <Link href="/store/inventory" className="text-xs text-emerald-600 hover:underline font-medium">
              View all
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-slate-400">
              All items are well-stocked 🎉
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStock.slice(0, 5).map((p) => (
                <li key={p.id} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm text-slate-900 truncate max-w-[180px]">{p.name}</span>
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {p.inventory?.quantityInStock ?? 0} {p.unitLabel} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
