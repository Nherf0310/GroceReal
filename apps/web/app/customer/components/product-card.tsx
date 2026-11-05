'use client';

import React from 'react';
import Link from 'next/link';
import { Package, Plus } from 'lucide-react';
import { Product, BasketStore } from '../types';
import { useCurrency } from '../../context/currency-context';
import { useBasket } from '../basket-context';
import {
  formatUnitPrice,
  formatEstimatedPrice,
  formatQuantity,
} from '../lib/price-helper';
import QuantityStepper from './quantity-stepper';

interface ProductCardProps {
  product: Product;
  store: BasketStore;
}

export default function ProductCard({ product, store }: ProductCardProps) {
  const { currency } = useCurrency();
  const { items, addItem, updateQuantity } = useBasket();

  const isWeight = product.unitType === 'WEIGHT';
  const stock = product.inventory?.quantityInStock ?? 0;
  const lowThreshold = product.inventory?.lowStockThreshold ?? 5;
  const isOutOfStock = stock <= 0;
  const isLowStock = !isOutOfStock && stock <= lowThreshold;

  const basketItem = items[product.id];
  const currentQty = basketItem?.quantity || 0;

  const categoryName =
    typeof product.category === 'object' && product.category?.name
      ? product.category.name
      : null;

  const handleAddInitial = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isOutOfStock) return;
    const initialStep = isWeight ? 250 : 1;
    addItem(product, store, initialStep);
  };

  const handleQuantityChange = (newQty: number) => {
    updateQuantity(product.id, newQty);
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden">
      {/* Product Image & Badges */}
      <Link
        href={`/customer/product/${product.id}`}
        className="block relative h-48 bg-slate-50 overflow-hidden cursor-pointer"
      >
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-300">
            <Package className="w-12 h-12 stroke-[1.5]" />
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mt-1">
              GroceReal
            </span>
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs ${
              isWeight
                ? 'bg-amber-100/90 text-amber-900 border border-amber-200 backdrop-blur-xs'
                : 'bg-emerald-100/90 text-emerald-900 border border-emerald-200 backdrop-blur-xs'
            }`}
          >
            {isWeight ? 'By Weight' : 'Per Unit'}
          </span>

          {isOutOfStock ? (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 shadow-xs">
              Out of Stock
            </span>
          ) : isLowStock ? (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 shadow-xs">
              Low Stock ({formatQuantity(stock, product.unitType, product.unitLabel)} left)
            </span>
          ) : null}
        </div>
      </Link>

      {/* Product Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {categoryName && (
            <span className="text-[11px] font-semibold text-emerald-700 tracking-wide uppercase">
              {categoryName}
            </span>
          )}
          <Link
            href={`/customer/product/${product.id}`}
            className="block mt-0.5 hover:text-emerald-700 transition-colors"
          >
            <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">
              {product.name}
            </h3>
          </Link>

          {product.brand && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              {product.brand}
            </p>
          )}
        </div>

        {/* Pricing & Cart Action */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-base font-extrabold text-slate-900 truncate">
              {formatUnitPrice(
                product.price,
                product.unitType,
                product.unitLabel,
                currency
              )}
            </div>

            {isWeight && currentQty > 0 && (
              <div className="text-[11px] text-emerald-700 font-semibold truncate">
                {formatEstimatedPrice(
                  product.price,
                  currentQty,
                  'WEIGHT',
                  currency
                )}
              </div>
            )}
          </div>

          <div>
            {isOutOfStock ? (
              <button
                type="button"
                disabled
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 font-semibold text-xs border border-slate-200 cursor-not-allowed"
              >
                Unavailable
              </button>
            ) : currentQty === 0 ? (
              <button
                type="button"
                onClick={handleAddInitial}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white font-bold text-xs border border-emerald-200 hover:border-transparent transition-all active:scale-95 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add {isWeight ? '(250g)' : ''}</span>
              </button>
            ) : (
              <QuantityStepper
                quantity={currentQty}
                unitType={product.unitType}
                unitLabel={product.unitLabel}
                onChange={handleQuantityChange}
                max={stock}
                size="sm"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
