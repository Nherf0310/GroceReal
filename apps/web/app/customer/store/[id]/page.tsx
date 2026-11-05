'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  X,
  Store as StoreIcon,
  MapPin,
  Truck,
  ShieldCheck,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { useCurrency } from '../../../context/currency-context';
import { formatMoney } from '../../../lib/currency';
import { Store, Category, Product } from '../../types';
import ProductCard from '../../components/product-card';
import StickyBasketBar from '../../components/sticky-basket-bar';
import CheckoutDrawer from '../../components/checkout-drawer';

interface StoreDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ checkout?: string }>;
}

export default function StoreDetailPage({
  params,
  searchParams,
}: StoreDetailPageProps) {
  const resolvedParams = use(params);
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined;
  const storeId = resolvedParams.id;

  const { currency } = useCurrency();

  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingStore, setLoadingStore] = useState<boolean>(true);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(
    resolvedSearchParams?.checkout === 'true'
  );

  // Debounce search query by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load store info & categories
  const loadStoreData = useCallback(async () => {
    try {
      setLoadingStore(true);
      setError(null);
      const [fetchedStore, fetchedCategories] = await Promise.all([
        apiFetch<Store>(`/stores/${storeId}`),
        apiFetch<Category[]>(`/stores/${storeId}/categories`).catch(
          () => [] as Category[]
        ),
      ]);
      setStore(fetchedStore);
      setCategories(fetchedCategories);
    } catch (err: unknown) {
      setError(
        (err as Error).message ||
          'Failed to load store information. Please try again.'
      );
    } finally {
      setLoadingStore(false);
    }
  }, [storeId]);

  // Load products based on filters
  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const queryParams = new URLSearchParams();
      if (selectedCategoryId !== 'all') {
        queryParams.set('categoryId', selectedCategoryId);
      }
      if (debouncedSearch) {
        queryParams.set('search', debouncedSearch);
      }
      if (inStockOnly) {
        queryParams.set('inStockOnly', 'true');
      }

      const queryString = queryParams.toString();
      const url = `/stores/${storeId}/products${queryString ? `?${queryString}` : ''}`;
      const fetched = await apiFetch<Product[]>(url);
      setProducts(fetched);
    } catch (err: unknown) {
      setError(
        (err as Error).message || 'Failed to load products for this store.'
      );
    } finally {
      setLoadingProducts(false);
    }
  }, [storeId, selectedCategoryId, debouncedSearch, inStockOnly]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      await loadStoreData();
    });
    return () => {
      cancelled = true;
    };
  }, [loadStoreData]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      await loadProducts();
    });
    return () => {
      cancelled = true;
    };
  }, [loadProducts]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-28">
      {/* Back Navigation */}
      <div>
        <Link
          href="/customer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to all stores</span>
        </Link>
      </div>

      {/* Store Header Banner */}
      {loadingStore && (
        <div className="h-44 bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-3" />
      )}

      {!loadingStore && store && (
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 overflow-hidden text-emerald-600">
              {store.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={store.imageUrl}
                  alt={store.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <StoreIcon className="w-8 h-8 sm:w-10 sm:h-10 stroke-1" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {store.name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    store.isOpen
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${store.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}
                  />
                  {store.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>

              {store.address && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{store.address}</span>
                </p>
              )}

              {store.description && (
                <p className="text-xs text-slate-600 max-w-2xl pt-1">
                  {store.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-slate-600">
                <span className="flex items-center gap-1 font-medium">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  Delivery Fee:{' '}
                  <span className="font-bold text-slate-900">
                    {formatMoney(store.deliveryFee, currency)}
                  </span>
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  Min Order:{' '}
                  <span className="font-bold text-slate-900">
                    {formatMoney(store.minOrderAmount, currency)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products by name, description, brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-xs text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* In-Stock Only Toggle */}
          <label className="flex items-center gap-2.5 self-start sm:self-auto px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer select-none transition-colors">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 accent-emerald-600 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-700">
              In-stock only
            </span>
          </label>
        </div>

        {/* Category Tabs */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategoryId === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Products
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategoryId === cat.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-xs font-semibold text-rose-800">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadProducts()}
            className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons for Products */}
      {loadingProducts && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 animate-pulse"
            >
              <div className="h-44 bg-slate-100 rounded-xl" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
              </div>
              <div className="h-8 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loadingProducts && !error && products.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No products match your criteria
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms or clearing the category and
            in-stock filters.
          </p>
          {(searchQuery || selectedCategoryId !== 'all' || inStockOnly) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryId('all');
                setInStockOnly(false);
              }}
              className="mt-2 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Product Grid */}
      {!loadingProducts && !error && products.length > 0 && store && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              store={{
                id: store.id,
                name: store.name,
                deliveryFee: store.deliveryFee,
                minOrderAmount: store.minOrderAmount,
                address: store.address,
              }}
            />
          ))}
        </div>
      )}

      {/* Sticky Basket Bar */}
      <StickyBasketBar onOpenCheckout={() => setIsCheckoutOpen(true)} />

      {/* Checkout Drawer/Modal */}
      {store && (
        <CheckoutDrawer
          store={store}
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
        />
      )}
    </div>
  );
}
