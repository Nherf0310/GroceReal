'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  RefreshCw,
  AlertCircle,
  Loader2,
  Info,
  Check,
  Edit2,
  Package,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../context/toast-context';
import type { StoreProduct } from '../types';

export default function StoreInventoryPage() {
  const toast = useToast();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Row-level action state
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  // Local draft inputs for "Set stock" and "Edit threshold"
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [editingThresholdId, setEditingThresholdId] = useState<string | null>(null);
  const [thresholdDrafts, setThresholdDrafts] = useState<Record<string, string>>({});

  // Refresh data
  const refreshData = useCallback(async (filterLow = lowStockOnly) => {
    setLoading(true);
    try {
      setError(null);
      if (filterLow) {
        const lowProducts = await apiFetch<StoreProduct[]>('/store/inventory/low-stock');
        setProducts(lowProducts);
      } else {
        const allProducts = await apiFetch<StoreProduct[]>('/store/products');
        setProducts(allProducts);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [lowStockOnly]);

  // Initial load
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const prods = await apiFetch<StoreProduct[]>('/store/products');
        if (!ignore) {
          setProducts(prods);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load inventory');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  // Handle toggling low stock filter
  const handleToggleLowStockFilter = async (checked: boolean) => {
    setLowStockOnly(checked);
    void refreshData(checked);
  };

  // Adjust Stock (absolute or relative delta)
  const handleUpdateStock = async (
    product: StoreProduct,
    targetValue: number, // units or kg depending on unitType
    isDelta = false
  ) => {
    const isWeight = product.unitType === 'WEIGHT';
    const currentRaw = product.inventory?.quantityInStock ?? 0;
    const currentConverted = isWeight ? currentRaw / 1000 : currentRaw;

    let newConverted = isDelta ? currentConverted + targetValue : targetValue;
    if (newConverted < 0) newConverted = 0;

    const newRaw = isWeight ? Math.round(newConverted * 1000) : Math.round(newConverted);

    try {
      setSavingProductId(product.id);
      await apiFetch(`/store/inventory/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          quantityInStock: newRaw,
        }),
      });

      const displayUnit = isWeight ? 'kg' : product.unitLabel || 'units';
      toast.success(
        `Updated stock for "${product.name}" to ${
          isWeight ? newConverted.toFixed(2) : newConverted
        } ${displayUnit}`
      );

      // Clear draft
      setStockDrafts((prev) => {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      });

      // Refetch
      await refreshData(lowStockOnly);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update stock');
    } finally {
      setSavingProductId(null);
    }
  };

  // Update Low Stock Threshold
  const handleSaveThreshold = async (product: StoreProduct) => {
    const draft = thresholdDrafts[product.id];
    if (draft === undefined) return;

    const parsed = parseFloat(draft);
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Threshold must be a non-negative number');
      return;
    }

    const isWeight = product.unitType === 'WEIGHT';
    const newGramsOrUnits = isWeight ? Math.round(parsed * 1000) : Math.round(parsed);

    try {
      setSavingProductId(product.id);
      await apiFetch(`/store/inventory/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          quantityInStock: product.inventory?.quantityInStock ?? 0,
          lowStockThreshold: newGramsOrUnits,
        }),
      });

      toast.success(`Threshold updated for "${product.name}"`);
      setEditingThresholdId(null);
      await refreshData(lowStockOnly);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update threshold');
    } finally {
      setSavingProductId(null);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const term = search.toLowerCase().trim();
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        (p.brand && p.brand.toLowerCase().includes(term)) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.category && p.category.name.toLowerCase().includes(term))
      );
    });
  }, [products, search]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track stock levels in real time and adjust quantities or alert thresholds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void refreshData(lowStockOnly)}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
            title="Refresh"
            aria-label="Refresh inventory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/store/products"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs transition"
          >
            <Package className="w-4 h-4" />
            Manage Products
          </Link>
        </div>
      </div>

      {/* Immediate Real-time Customer Impact Alert Banner */}
      <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900">
        <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm">
          <span className="font-bold">Real-time inventory notice:</span> Any stock adjustments you save here immediately update customer availability in the store. Out of stock items are automatically prevented from being added to baskets.
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inventory by product name, SKU, or category..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
          />
        </div>

        {/* Low Stock Toggle Button */}
        <button
          onClick={() => handleToggleLowStockFilter(!lowStockOnly)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition shrink-0 w-full sm:w-auto justify-center ${
            lowStockOnly
              ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${lowStockOnly ? 'text-amber-700' : 'text-slate-400'}`} />
          <span>Low Stock Only</span>
          {lowStockOnly && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && products.length === 0 && (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-2xl w-full" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-rose-900">{error}</p>
          <button
            onClick={() => void refreshData(lowStockOnly)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-xl transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <Boxes className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {lowStockOnly ? 'No low stock products' : 'No inventory items found'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {lowStockOnly
                ? 'All of your products currently have healthy stock levels above their thresholds.'
                : search
                ? 'No products matched your search term.'
                : 'Add products to your catalog to begin tracking stock.'}
            </p>
          </div>
          {lowStockOnly && (
            <button
              onClick={() => handleToggleLowStockFilter(false)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
            >
              Show All Products
            </button>
          )}
        </div>
      )}

      {/* Products Table & Mobile Cards */}
      {!loading && !error && filteredProducts.length > 0 && (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Low Stock Threshold</th>
                  <th className="py-3 px-4">Quick Adjust</th>
                  <th className="py-3 px-4 text-right">Set Exact Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isWeight = p.unitType === 'WEIGHT';
                  const qtyRaw = p.inventory?.quantityInStock ?? 0;
                  const threshRaw = p.inventory?.lowStockThreshold ?? 10;
                  const qtyDisplay = isWeight ? qtyRaw / 1000 : qtyRaw;
                  const threshDisplay = isWeight ? threshRaw / 1000 : threshRaw;

                  const isOut = qtyRaw <= 0;
                  const isLow = !isOut && qtyRaw <= threshRaw;
                  const isSaving = savingProductId === p.id;
                  const isEditingThresh = editingThresholdId === p.id;

                  const stepUnit = isWeight ? 0.5 : 1;
                  const stepUnit5 = isWeight ? 2 : 5;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      {/* Product Name & Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center text-slate-400">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{p.name}</div>
                            <div className="text-xs text-slate-400">
                              {p.category?.name} • {isWeight ? 'By Weight (kg)' : `Per Unit (${p.unitLabel || 'pc'})`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status Chip */}
                      <td className="py-3.5 px-4">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            OK / In Stock
                          </span>
                        )}
                      </td>

                      {/* Current Stock */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-base">
                        {isWeight ? `${qtyDisplay.toFixed(2)} kg` : `${qtyDisplay} ${p.unitLabel || 'pc'}`}
                      </td>

                      {/* Low Stock Threshold */}
                      <td className="py-3.5 px-4">
                        {isEditingThresh ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step={isWeight ? '0.1' : '1'}
                              min="0"
                              value={
                                thresholdDrafts[p.id] !== undefined
                                  ? thresholdDrafts[p.id]
                                  : threshDisplay.toString()
                              }
                              onChange={(e) =>
                                setThresholdDrafts((prev) => ({
                                  ...prev,
                                  [p.id]: e.target.value,
                                }))
                              }
                              className="w-20 px-2 py-1 text-xs rounded-lg border border-emerald-500 focus:outline-hidden"
                              autoFocus
                            />
                            <button
                              onClick={() => void handleSaveThreshold(p)}
                              disabled={isSaving}
                              className="p-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition"
                              title="Save threshold"
                              aria-label="Save threshold"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingThresholdId(null)}
                              className="p-1 rounded-md text-slate-400 hover:bg-slate-200 transition"
                              title="Cancel"
                              aria-label="Cancel editing threshold"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-700 font-medium">
                              ≤ {isWeight ? `${threshDisplay} kg` : `${threshDisplay} ${p.unitLabel || 'pc'}`}
                            </span>
                            <button
                              onClick={() => {
                                setEditingThresholdId(p.id);
                                setThresholdDrafts((prev) => ({
                                  ...prev,
                                  [p.id]: threshDisplay.toString(),
                                }));
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                              title="Edit threshold"
                              aria-label="Edit low stock threshold"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Quick Adjust Buttons */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => void handleUpdateStock(p, -stepUnit5, true)}
                            disabled={isSaving || qtyRaw <= 0}
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 transition"
                            title={`Decrease by ${stepUnit5}`}
                          >
                            -{stepUnit5}
                          </button>
                          <button
                            onClick={() => void handleUpdateStock(p, -stepUnit, true)}
                            disabled={isSaving || qtyRaw <= 0}
                            className="p-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 transition"
                            title={`Decrease by ${stepUnit}`}
                            aria-label={`Decrease by ${stepUnit}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => void handleUpdateStock(p, stepUnit, true)}
                            disabled={isSaving}
                            className="p-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 transition"
                            title={`Increase by ${stepUnit}`}
                            aria-label={`Increase by ${stepUnit}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => void handleUpdateStock(p, stepUnit5, true)}
                            disabled={isSaving}
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 transition"
                            title={`Increase by ${stepUnit5}`}
                          >
                            +{stepUnit5}
                          </button>
                        </div>
                      </td>

                      {/* Set Exact Stock Input */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <input
                            type="number"
                            step={isWeight ? '0.01' : '1'}
                            min="0"
                            placeholder={qtyDisplay.toString()}
                            value={stockDrafts[p.id] ?? ''}
                            onChange={(e) =>
                              setStockDrafts((prev) => ({
                                ...prev,
                                [p.id]: e.target.value,
                              }))
                            }
                            className="w-24 px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
                          />
                          <button
                            onClick={() => {
                              const draft = stockDrafts[p.id];
                              const val = parseFloat(draft ?? '');
                              if (!isNaN(val) && val >= 0) {
                                void handleUpdateStock(p, val, false);
                              }
                            }}
                            disabled={
                              isSaving ||
                              stockDrafts[p.id] === undefined ||
                              stockDrafts[p.id] === '' ||
                              isNaN(parseFloat(stockDrafts[p.id])) ||
                              parseFloat(stockDrafts[p.id]) < 0
                            }
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs disabled:opacity-40 transition flex items-center gap-1"
                          >
                            {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                            Set
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {filteredProducts.map((p) => {
              const isWeight = p.unitType === 'WEIGHT';
              const qtyRaw = p.inventory?.quantityInStock ?? 0;
              const threshRaw = p.inventory?.lowStockThreshold ?? 10;
              const qtyDisplay = isWeight ? qtyRaw / 1000 : qtyRaw;
              const threshDisplay = isWeight ? threshRaw / 1000 : threshRaw;

              const isOut = qtyRaw <= 0;
              const isLow = !isOut && qtyRaw <= threshRaw;
              const isSaving = savingProductId === p.id;
              const stepUnit = isWeight ? 0.5 : 1;
              const stepUnit5 = isWeight ? 2 : 5;

              return (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center text-slate-400">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm leading-tight">
                          {p.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {p.category?.name} • {isWeight ? 'kg' : p.unitLabel || 'pc'}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isOut ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800">
                          Out
                        </span>
                      ) : isLow ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">
                          Low
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          OK
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stock Details */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <div>
                      <div className="text-slate-400">Current Stock</div>
                      <div className="text-base font-extrabold text-slate-900">
                        {isWeight ? `${qtyDisplay.toFixed(2)} kg` : `${qtyDisplay} ${p.unitLabel || 'pc'}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Threshold</div>
                      <div className="font-semibold text-slate-700">
                        ≤ {isWeight ? `${threshDisplay} kg` : `${threshDisplay} ${p.unitLabel || 'pc'}`}
                      </div>
                    </div>
                  </div>

                  {/* Quick Adjust Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-medium text-slate-500">Quick adjust:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => void handleUpdateStock(p, -stepUnit5, true)}
                        disabled={isSaving || qtyRaw <= 0}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 disabled:opacity-30"
                      >
                        -{stepUnit5}
                      </button>
                      <button
                        onClick={() => void handleUpdateStock(p, -stepUnit, true)}
                        disabled={isSaving || qtyRaw <= 0}
                        className="p-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 disabled:opacity-30"
                        aria-label={`Decrease by ${stepUnit}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => void handleUpdateStock(p, stepUnit, true)}
                        disabled={isSaving}
                        className="p-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 disabled:opacity-30"
                        aria-label={`Increase by ${stepUnit}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => void handleUpdateStock(p, stepUnit5, true)}
                        disabled={isSaving}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 disabled:opacity-30"
                      >
                        +{stepUnit5}
                      </button>
                    </div>
                  </div>

                  {/* Set Exact Stock Input */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <input
                      type="number"
                      step={isWeight ? '0.01' : '1'}
                      min="0"
                      placeholder={`New stock in ${isWeight ? 'kg' : 'units'}`}
                      value={stockDrafts[p.id] ?? ''}
                      onChange={(e) =>
                        setStockDrafts((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
                    />
                    <button
                      onClick={() => {
                        const draft = stockDrafts[p.id];
                        const val = parseFloat(draft ?? '');
                        if (!isNaN(val) && val >= 0) {
                          void handleUpdateStock(p, val, false);
                        }
                      }}
                      disabled={
                        isSaving ||
                        stockDrafts[p.id] === undefined ||
                        stockDrafts[p.id] === '' ||
                        isNaN(parseFloat(stockDrafts[p.id])) ||
                        parseFloat(stockDrafts[p.id]) < 0
                      }
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs disabled:opacity-40 transition shrink-0"
                    >
                      Set Stock
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
