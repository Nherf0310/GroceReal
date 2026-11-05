'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Package,
  AlertTriangle,
  Eye,
  EyeOff,
  Edit2,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { formatMoney } from '../../lib/currency';
import { useCurrency } from '../../context/currency-context';
import { useToast } from '../../context/toast-context';
import FormField from '../../components/form-field';
import MoneyInput from '../../components/money-input';
import Drawer from '../../components/drawer';
import { ActionConfirmModal } from '../components/action-confirm-modal';
import type {
  StoreProduct,
  Category,
  StoreProfile,
  CreateProductInput,
  UpdateProductInput,
} from '../types';

export default function StoreProductsPage() {
  const { currency } = useCurrency();
  const toast = useToast();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'HIDDEN'>('ALL');

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formUnitType, setFormUnitType] = useState<'EACH' | 'WEIGHT'>('EACH');
  const [formUnitLabel, setFormUnitLabel] = useState('pc');
  const [formPriceCents, setFormPriceCents] = useState(0);
  const [formInitialStock, setFormInitialStock] = useState('0'); // string for typing numbers/decimals
  const [formThreshold, setFormThreshold] = useState('10'); // string
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Confirm Modal for hiding product
  const [confirmHideProduct, setConfirmHideProduct] = useState<StoreProduct | null>(null);

  // Fetch helper for user actions (refresh, retry, after save)
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const [prods, storeProfile] = await Promise.all([
        apiFetch<StoreProduct[]>('/store/products'),
        apiFetch<StoreProfile>('/store/me').catch(() => null),
      ]);
      setProducts(prods);

      let fetchedCategories: Category[] = [];
      if (storeProfile?.id) {
        try {
          fetchedCategories = await apiFetch<Category[]>(`/stores/${storeProfile.id}/categories`);
        } catch {
          // ignore
        }
      }
      if (!fetchedCategories || fetchedCategories.length === 0) {
        const catMap = new Map<string, Category>();
        for (const p of prods) {
          if (p.category && !catMap.has(p.category.id)) {
            catMap.set(p.category.id, {
              id: p.category.id,
              name: p.category.name,
              sortOrder: p.category.sortOrder ?? 0,
            });
          }
        }
        fetchedCategories = Array.from(catMap.values());
      }
      setCategories(fetchedCategories);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial mount load
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const [prods, storeProfile] = await Promise.all([
          apiFetch<StoreProduct[]>('/store/products'),
          apiFetch<StoreProfile>('/store/me').catch(() => null),
        ]);
        if (!ignore) {
          setProducts(prods);

          let fetchedCategories: Category[] = [];
          if (storeProfile?.id) {
            try {
              fetchedCategories = await apiFetch<Category[]>(`/stores/${storeProfile.id}/categories`);
            } catch {
              // ignore
            }
          }
          if (!fetchedCategories || fetchedCategories.length === 0) {
            const catMap = new Map<string, Category>();
            for (const p of prods) {
              if (p.category && !catMap.has(p.category.id)) {
                catMap.set(p.category.id, {
                  id: p.category.id,
                  name: p.category.name,
                  sortOrder: p.category.sortOrder ?? 0,
                });
              }
            }
            fetchedCategories = Array.from(catMap.values());
          }
          setCategories(fetchedCategories);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load products');
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

  // Open Drawer for Create
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName('');
    setFormDescription('');
    setFormBrand('');
    setFormSku('');
    setFormImageUrl('');
    setFormCategoryId(categories[0]?.id || '');
    setFormUnitType('EACH');
    setFormUnitLabel('pc');
    setFormPriceCents(0);
    setFormInitialStock('10');
    setFormThreshold('5');
    setFormErrors({});
    setIsDrawerOpen(true);
  };

  // Open Drawer for Edit
  const handleOpenEdit = (p: StoreProduct) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormDescription(p.description || '');
    setFormBrand(p.brand || '');
    setFormSku(p.sku || '');
    setFormImageUrl(p.imageUrl || '');
    setFormCategoryId(p.categoryId);
    setFormUnitType(p.unitType);
    setFormUnitLabel(p.unitLabel);
    setFormPriceCents(p.price);
    setFormThreshold(
      p.unitType === 'WEIGHT'
        ? ((p.inventory?.lowStockThreshold ?? 0) / 1000).toString()
        : (p.inventory?.lowStockThreshold ?? 10).toString()
    );
    setFormErrors({});
    setIsDrawerOpen(true);
  };

  // Validate Form
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) {
      errors.name = 'Product name is required';
    }
    if (!editingProduct && !formCategoryId) {
      errors.categoryId = 'Please select a category';
    }
    if (!formPriceCents || formPriceCents <= 0) {
      errors.price = 'Price must be greater than zero';
    }
    if (!editingProduct) {
      const stockVal = parseFloat(formInitialStock);
      if (isNaN(stockVal) || stockVal < 0) {
        errors.initialStock = 'Initial stock cannot be negative';
      }
    }
    const threshVal = parseFloat(formThreshold);
    if (isNaN(threshVal) || threshVal < 0) {
      errors.threshold = 'Threshold cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Drawer Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      if (editingProduct) {
        // Edit product
        const payload: UpdateProductInput = {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          brand: formBrand.trim() || undefined,
          imageUrl: formImageUrl.trim() || undefined,
          price: formPriceCents,
        };

        const updated = await apiFetch<StoreProduct>(`/store/products/${editingProduct.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        // Also update low stock threshold if changed
        const threshNum = parseFloat(formThreshold) || 0;
        const threshGrams = formUnitType === 'WEIGHT' ? Math.round(threshNum * 1000) : Math.round(threshNum);
        if (threshGrams !== (editingProduct.inventory?.lowStockThreshold ?? 0)) {
          await apiFetch(`/store/inventory/${editingProduct.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              quantityInStock: editingProduct.inventory?.quantityInStock ?? 0,
              lowStockThreshold: threshGrams,
            }),
          });
        }

        toast.success(`Updated "${updated.name}"`);
      } else {
        // Create product
        const stockNum = parseFloat(formInitialStock) || 0;
        const threshNum = parseFloat(formThreshold) || 0;

        const initialStockValue =
          formUnitType === 'WEIGHT' ? Math.round(stockNum * 1000) : Math.round(stockNum);
        const thresholdValue =
          formUnitType === 'WEIGHT' ? Math.round(threshNum * 1000) : Math.round(threshNum);

        const payload: CreateProductInput = {
          categoryId: formCategoryId,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          brand: formBrand.trim() || undefined,
          sku: formSku.trim() || undefined,
          imageUrl: formImageUrl.trim() || undefined,
          price: formPriceCents,
          unitType: formUnitType,
          unitLabel: formUnitLabel.trim() || (formUnitType === 'WEIGHT' ? 'kg' : 'pc'),
          initialStock: initialStockValue,
          lowStockThreshold: thresholdValue,
        };

        const created = await apiFetch<StoreProduct>('/store/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        toast.success(`Created product "${created.name}"`);
      }

      setIsDrawerOpen(false);
      void refreshData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  // Availability Toggle Handler
  const handleToggleAvailability = async (product: StoreProduct) => {
    if (product.isAvailable) {
      // Prompt confirmation before hiding
      setConfirmHideProduct(product);
    } else {
      // Direct activation
      try {
        await apiFetch(`/store/products/${product.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ isAvailable: true }),
        });
        toast.success(`"${product.name}" is now available`);
        void refreshData();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to update availability');
      }
    }
  };

  const handleConfirmHide = async () => {
    if (!confirmHideProduct) return;
    try {
      await apiFetch(`/store/products/${confirmHideProduct.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable: false }),
      });
      toast.success(`"${confirmHideProduct.name}" is now hidden from customers`);
      setConfirmHideProduct(null);
      void refreshData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to hide product');
    }
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search filter
      const term = search.toLowerCase().trim();
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.brand && p.brand.toLowerCase().includes(term)) ||
        (p.sku && p.sku.toLowerCase().includes(term));

      // Category filter
      const matchesCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory;

      // Availability filter
      const matchesAvail =
        availabilityFilter === 'ALL' ||
        (availabilityFilter === 'AVAILABLE' && p.isAvailable) ||
        (availabilityFilter === 'HIDDEN' && !p.isAvailable);

      return matchesSearch && matchesCat && matchesAvail;
    });
  }, [products, search, selectedCategory, availabilityFilter]);

  // Format stock display
  const formatStock = (p: StoreProduct) => {
    const qty = p.inventory?.quantityInStock ?? 0;
    if (p.unitType === 'WEIGHT') {
      const kg = qty / 1000;
      return `${kg % 1 === 0 ? kg.toString() : kg.toFixed(2)} kg`;
    }
    return `${qty} ${p.unitLabel || 'units'}`;
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Products</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your catalog, pricing, availability and stock.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void refreshData()}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
            title="Refresh"
            aria-label="Refresh product list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand, or SKU..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-48 py-2 px-3 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Availability Filter */}
        <div className="w-full md:w-40">
          <select
            value={availabilityFilter}
            onChange={(e) =>
              setAvailabilityFilter(e.target.value as 'ALL' | 'AVAILABLE' | 'HIDDEN')
            }
            className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="ALL">All Status</option>
            <option value="AVAILABLE">Available Only</option>
            <option value="HIDDEN">Hidden Only</option>
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && products.length === 0 && (
        <div className="space-y-3 animate-pulse">
          <div className="h-10 bg-slate-200 rounded-xl w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl w-full" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-rose-900">{error}</p>
          <button
            onClick={() => void refreshData()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-xl transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {search || selectedCategory !== 'ALL' || availabilityFilter !== 'ALL'
                ? 'No matching products found'
                : 'No products yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search || selectedCategory !== 'ALL' || availabilityFilter !== 'ALL'
                ? 'Try adjusting your search or category filters to find what you are looking for.'
                : 'Get started by adding your first product to the catalog so customers can order.'}
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Add Your First Product
          </button>
        </div>
      )}

      {/* Products Content */}
      {!loading && !error && filteredProducts.length > 0 && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const qty = p.inventory?.quantityInStock ?? 0;
                  const thresh = p.inventory?.lowStockThreshold ?? 10;
                  const isOut = qty <= 0;
                  const isLow = !isOut && qty <= thresh;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      {/* Product Name & Image */}
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
                            <div className="text-xs text-slate-400 flex items-center gap-2">
                              {p.brand && <span>{p.brand}</span>}
                              {p.sku && <span>SKU: {p.sku}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {p.category?.name || 'Uncategorized'}
                        </span>
                      </td>

                      {/* Pricing Type */}
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-500">
                        {p.unitType === 'WEIGHT' ? 'By Weight' : 'Per Unit'}
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {formatMoney(p.price, currency)}
                        <span className="text-xs font-normal text-slate-400 ml-1">
                          /{p.unitLabel || (p.unitType === 'WEIGHT' ? 'kg' : 'pc')}
                        </span>
                      </td>

                      {/* Stock & Low Stock Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{formatStock(p)}</span>
                          {isOut ? (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-700">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Low Stock
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Availability Toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleAvailability(p)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                            p.isAvailable
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {p.isAvailable ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              Available
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              Hidden
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredProducts.map((p) => {
              const qty = p.inventory?.quantityInStock ?? 0;
              const thresh = p.inventory?.lowStockThreshold ?? 10;
              const isOut = qty <= 0;
              const isLow = !isOut && qty <= thresh;

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
                        <div className="font-bold text-slate-900 leading-tight">{p.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {p.brand && `${p.brand} • `}
                          {p.category?.name}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-2 rounded-xl text-slate-500 bg-slate-50 hover:bg-slate-100 transition"
                      aria-label="Edit product"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <div>
                      <div className="text-slate-400">Price</div>
                      <div className="font-bold text-sm text-slate-900">
                        {formatMoney(p.price, currency)}
                        <span className="text-xs font-normal text-slate-500">
                          /{p.unitLabel || (p.unitType === 'WEIGHT' ? 'kg' : 'pc')}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-400">Stock</div>
                      <div className="font-semibold text-slate-800">{formatStock(p)}</div>
                    </div>

                    <div>
                      <div className="text-slate-400">Status</div>
                      <button
                        onClick={() => handleToggleAvailability(p)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold mt-0.5 ${
                          p.isAvailable
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {p.isAvailable ? 'Available' : 'Hidden'}
                      </button>
                    </div>
                  </div>

                  {(isOut || isLow) && (
                    <div className="pt-2 border-t border-slate-100">
                      {isOut ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-700">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3" />
                          Low Stock Alert
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add / Edit Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        description={
          editingProduct
            ? 'Update product details and pricing. Categorization cannot be changed.'
            : 'Fill in the information to add a fresh product to your catalog.'
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <FormField label="Product Name" required error={formErrors.name}>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Fresh Organic Bananas"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
            />
          </FormField>

          {/* Category */}
          <FormField
            label="Category"
            required={!editingProduct}
            error={formErrors.categoryId}
            hint={
              categories.length === 0 ? (
                <Link href="/store/categories" className="text-emerald-600 hover:underline">
                  Create category
                </Link>
              ) : null
            }
          >
            {editingProduct ? (
              <input
                type="text"
                disabled
                value={editingProduct.category?.name || 'Uncategorized'}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            ) : categories.length === 0 ? (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                No categories available.{' '}
                <Link href="/store/categories" className="font-bold underline">
                  Add a category first
                </Link>
                .
              </div>
            ) : (
              <select
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500 bg-white"
              >
                <option value="">Select a category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          {/* Pricing Type & Unit Label */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Pricing Type" required>
              <select
                value={formUnitType}
                disabled={!!editingProduct}
                onChange={(e) => {
                  const val = e.target.value as 'EACH' | 'WEIGHT';
                  setFormUnitType(val);
                  setFormUnitLabel(val === 'WEIGHT' ? 'kg' : 'pc');
                }}
                className={`w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:border-emerald-500 ${
                  editingProduct ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                }`}
              >
                <option value="EACH">Per Unit (EACH)</option>
                <option value="WEIGHT">By Weight (WEIGHT)</option>
              </select>
            </FormField>

            <FormField
              label="Unit Label"
              required
              hint={formUnitType === 'WEIGHT' ? 'e.g. kg' : 'e.g. pc, pack, bag'}
            >
              <input
                type="text"
                value={formUnitLabel}
                disabled={!!editingProduct}
                onChange={(e) => setFormUnitLabel(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500 ${
                  editingProduct ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                }`}
              />
            </FormField>
          </div>

          {/* Price (Money Input) */}
          <MoneyInput
            label="Price (USD)"
            required
            value={formPriceCents}
            onChange={(cents) => setFormPriceCents(cents)}
            error={formErrors.price}
            hint={formUnitType === 'WEIGHT' ? 'Price per kg' : 'Price per unit'}
          />

          {/* Initial Stock (Only on Add) */}
          {!editingProduct && (
            <FormField
              label={`Initial Stock (${formUnitType === 'WEIGHT' ? 'kg' : 'units'})`}
              required
              error={formErrors.initialStock}
              hint={formUnitType === 'WEIGHT' ? 'Enter in kg (e.g. 5.5)' : 'Whole units'}
            >
              <input
                type="number"
                step={formUnitType === 'WEIGHT' ? '0.01' : '1'}
                min="0"
                value={formInitialStock}
                onChange={(e) => setFormInitialStock(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
              />
            </FormField>
          )}

          {/* Low Stock Threshold */}
          <FormField
            label={`Low Stock Threshold (${formUnitType === 'WEIGHT' ? 'kg' : 'units'})`}
            required
            error={formErrors.threshold}
            hint="Trigger alert when stock drops to or below"
          >
            <input
              type="number"
              step={formUnitType === 'WEIGHT' ? '0.01' : '1'}
              min="0"
              value={formThreshold}
              onChange={(e) => setFormThreshold(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
            />
          </FormField>

          {/* Brand & SKU */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Brand (Optional)">
              <input
                type="text"
                value={formBrand}
                onChange={(e) => setFormBrand(e.target.value)}
                placeholder="e.g. Dole"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
              />
            </FormField>

            <FormField label="SKU (Optional)">
              <input
                type="text"
                value={formSku}
                disabled={!!editingProduct}
                onChange={(e) => setFormSku(e.target.value)}
                placeholder="e.g. BAN-ORG-01"
                className={`w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500 ${
                  editingProduct ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                }`}
              />
            </FormField>
          </div>

          {/* Image URL & Preview */}
          <FormField label="Image URL (Optional)">
            <input
              type="url"
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
            />
            {formImageUrl && (
              <div className="mt-2 flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-12 h-12 rounded-lg bg-white overflow-hidden border border-slate-200 shrink-0">
                  <img
                    src={formImageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <span className="text-xs text-slate-500">Image preview</span>
              </div>
            )}
          </FormField>

          {/* Description */}
          <FormField label="Description (Optional)">
            <textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Detailed description of the product..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
            />
          </FormField>
        </form>
      </Drawer>

      {/* Confirmation Modal for Hiding Product */}
      {confirmHideProduct && (
        <ActionConfirmModal
          title="Hide Product?"
          message={`Are you sure you want to hide "${confirmHideProduct.name}"? Customers will no longer be able to browse or order this product until you make it available again.`}
          confirmLabel="Hide Product"
          confirmVariant="danger"
          onConfirm={handleConfirmHide}
          onCancel={() => setConfirmHideProduct(null)}
        />
      )}
    </div>
  );
}
