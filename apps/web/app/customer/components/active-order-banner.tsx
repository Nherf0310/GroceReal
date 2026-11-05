'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, Clock } from 'lucide-react';
import { Order } from '../types';
import StatusBadge from '../../components/status-badge';
import { useCurrency } from '../../context/currency-context';
import { formatMoney } from '../../lib/currency';
import { formatSlotDisplay } from '../lib/format-slot';

interface ActiveOrderBannerProps {
  order: Order;
}

export default function ActiveOrderBanner({ order }: ActiveOrderBannerProps) {
  const { currency } = useCurrency();
  const itemCount = order.items?.length || 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-5 sm:p-6 shadow-xl border border-emerald-800/40">
      {/* Decorative gradient overlay */}
      <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Active Order in Progress
            </span>
            <StatusBadge status={order.status} />
          </div>

          <div className="flex flex-wrap items-baseline gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {order.store?.name || 'Grocery Order'}
            </h2>
            <span className="text-xs font-mono text-emerald-200/80">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-emerald-100/80">
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-300" />
              {itemCount} {itemCount === 1 ? 'item' : 'items'} •{' '}
              <span className="font-bold text-white">
                {formatMoney(order.total, currency)}
              </span>
            </span>

            {order.deliverySlot && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-300" />
                Slot: {formatSlotDisplay(order.deliverySlot)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0">
          <Link
            href={`/customer/orders/${order.id}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/40"
          >
            <span>Track Order</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

