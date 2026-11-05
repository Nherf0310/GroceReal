'use client';

import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useBasket } from '../basket-context';
import { useCurrency } from '../../context/currency-context';
import { formatMoney } from '../../lib/currency';

interface StickyBasketBarProps {
  onOpenCheckout?: () => void;
}

export default function StickyBasketBar({ onOpenCheckout }: StickyBasketBarProps) {
  const { itemCount, subtotalCents, hasWeightItems, store } = useBasket();
  const { currency } = useCurrency();

  if (itemCount === 0 || !store) return null;

  const totalFormatted = formatMoney(subtotalCents, currency);

  return (
    <div className="fixed bottom-4 inset-x-4 max-w-xl mx-auto z-30 animate-in slide-in-from-bottom-4 duration-200">
      <div className="bg-emerald-950/95 backdrop-blur-md text-white rounded-2xl p-3.5 sm:p-4 shadow-2xl border border-emerald-800/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-emerald-200" />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-black flex items-center justify-center border-2 border-emerald-950">
              {itemCount}
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-medium text-emerald-300 truncate">
              {store.name}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-extrabold text-white">
                {totalFormatted}
              </span>
              {hasWeightItems && (
                <span className="text-[10px] text-emerald-300/80 uppercase font-semibold">
                  (Est.)
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenCheckout}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-emerald-950 text-xs font-black tracking-wide transition-all shadow-md shrink-0 cursor-pointer"
        >
          <span>View Basket</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

