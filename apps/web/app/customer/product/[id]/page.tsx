'use client';

import React, { useState, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShoppingBag,
  Tag,
  Package,
  AlertCircle,
  CheckCircle,
  XCircle,
  Store as StoreIcon,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { useCurrency } from '../../../context/currency-context';
import { usePolling } from '../../../lib/use-polling';
import { Product } from '../../types';
import QuantityStepper from '../../components/quantity-stepper';
import { useBasket } from '../../basket-context';
import StickyBasketBar from '../../components/sticky-basket-bar';
import { useRouter } from 'next/navigation';
import {
  formatUnitPrice,
  formatEstimatedPrice,
  formatQuantity,
} from '../../lib/price-helper';
import { formatMoney } from '../../../lib/currency';

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id;

  const { currency } = useCurrency();
  const { items, addItem, updateQuantity, store: basketStore } = useBasket();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProduct = useCallback(async () => {
    try {
      setError(null);
      const fetched = await apiFetch<Product>(`/products/${productId}`);
      setProduct(fetched);
    } catch (err: unknown) {
      setError(
        (err as Error).message || 'Failed to load product. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const { isRefreshing, refresh } = usePolling(loadProduct, {
    intervalMs: 30000,
  });

  const basketItem = product ? items[product.id] : undefined;
  const basketQty = basketItem?.quantity ?? 0;

  const isOutOfStock =
    product?.inventory != null
      ? product.inventory.quantityInStock <= 0
      : !product?.isAvailable;

  const isLowStock =
    product?.inventory != null &&
    product.inventory.quantityInStock > 0 &&
    product.inventory.quantityInStock <= product.inventory.lowStockThreshold;

  const stock = product?.inventory?.quantityInStock ?? 9999;

  const handleAddToBasket = () => {
    if (!product || !product.store || isOutOfStock) return;
    const store = {
      id: product.store.id,
      name: product.store.name,
      deliveryFee: product.store.deliveryFee,
      minOrderAmount: product.store.minOrderAmount,
      address: product.store.address ?? null,
    };
    const step = product.unitType === 'WEIGHT' ? 250 : 1;
    addItem(product, store, step);
  };

  const handleOpenCheckout = () => {
    if (basketStore) {
      router.push(`/customer/store/${basketStore.id}?checkout=true`);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-28">
      {/* Back Navigation */}
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-6">
          <div className="h-72 bg-slate-100 rounded-2xl" />
          <div className="space-y-3">
            <div className="h-6 bg-slate-200 rounded w-1/3" />
            <div className="h-8 bg-slate-200 rounded w-1/2" />
            <div className="h-4 bg-slate-100 rounded w-full" />
            <div className="h-4 bg-slate-100 rounded w-3/4" />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-rose-900">
                Unable to load product
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

      {/* Product Detail */}
      {!loading && !error && product && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Product Image */}
          <div className="h-72 sm:h-96 bg-gradient-to-br from-slate-100 to-slate-50 relative overflow-hidden">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-200">
                <ShoppingBag className="w-24 h-24 stroke-1" />
              </div>
            )}

            {/* Stock Badges */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {isOutOfStock && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-slate-900/90 text-slate-200 backdrop-blur-sm">
                  <XCircle className="w-3.5 h-3.5" />
                  Out of Stock
                </span>
              )}
              {isLowStock && !isOutOfStock && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-500 text-white shadow-md">
                  Low Stock
                </span>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="p-6 space-y-6">
            {/* Category & Brand */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {product.category && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold">
                  <Tag className="w-3 h-3" />
                  {typeof product.category === 'object' && 'name' in product.category
                    ? product.category.name
                    : ''}
                </span>
              )}
              {product.brand && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 font-medium">
                  <Package className="w-3 h-3" />
                  {product.brand}
                </span>
              )}
              {product.sku && (
                <span className="text-slate-400 font-mono">
                  SKU: {product.sku}
                </span>
              )}
            </div>

            {/* Name & Price */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {product.name}
              </h1>
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-2xl font-black text-emerald-700">
                  {formatUnitPrice(
                    product.price,
                    product.unitType,
                    product.unitLabel,
                    currency
                  )}
                </span>
                {product.unitType === 'WEIGHT' && (
                  <span className="text-xs text-slate-500 italic">
                    Estimated price shown per kg
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-sm text-slate-600 leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Availability Row */}
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              {!isOutOfStock ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle className="w-4 h-4" />
                  In Stock
                  {product.inventory && (
                    <span className="text-slate-500 font-normal">
                      (
                      {formatQuantity(
                        product.inventory.quantityInStock,
                        product.unitType,
                        product.unitLabel
                      )}{' '}
                      available)
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <XCircle className="w-4 h-4" />
                  Currently Out of Stock
                </span>
              )}
            </div>

            {/* Store Info */}
            {product.store && (
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <StoreIcon className="w-4 h-4" />
                  <Link
                    href={`/customer/store/${product.store.id}`}
                    className="hover:underline"
                  >
                    {product.store.name}
                  </Link>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    Delivery:{' '}
                    <span className="font-bold text-slate-800">
                      {formatMoney(product.store.deliveryFee, currency)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    Min Order:{' '}
                    <span className="font-bold text-slate-800">
                      {formatMoney(product.store.minOrderAmount, currency)}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Add to Basket */}
            <div className="pt-2">
              {basketQty > 0 ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Quantity in basket</p>
                    <QuantityStepper
                      quantity={basketQty}
                      unitType={product.unitType}
                      unitLabel={product.unitLabel}
                      onChange={(newQty) => updateQuantity(product.id, newQty)}
                      max={stock}
                      size="md"
                    />
                  </div>
                  <div className="sm:ml-auto text-right">
                    <p className="text-xs text-slate-500">Basket item total</p>
                    <p className="text-lg font-black text-emerald-700">
                      {formatEstimatedPrice(
                        product.price,
                        basketQty,
                        product.unitType,
                        currency
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToBasket}
                  disabled={isOutOfStock || !product.isAvailable}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-sm tracking-wide shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {isOutOfStock ? 'Out of Stock' : 'Add to Basket'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sticky Basket Bar */}
      <StickyBasketBar onOpenCheckout={handleOpenCheckout} />
    </div>
  );
}
