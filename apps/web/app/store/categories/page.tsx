'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Tag,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  RefreshCw,
  AlertCircle,
  Loader2,
  Check,
  X,
  Package,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../context/toast-context';
import FormField from '../../components/form-field';
import Drawer from '../../components/drawer';
import type { Category, StoreProduct, StoreProfile } from '../types';

export default function StoreCategoriesPage() {
  const toast = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Category Drawer
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Rename modal/inline state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Reordering in progress
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  // Fetch categories & product counts
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const [prods, storeProfile] = await Promise.all([
        apiFetch<StoreProduct[]>('/store/products'),
        apiFetch<StoreProfile>('/store/me').catch(() => null),
      ]);

      // Calculate product counts
      const counts: Record<string, number> = {};
      for (const p of prods) {
        if (p.categoryId) {
          counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
        }
      }
      setProductCounts(counts);

      let fetchedCats: Category[] = [];
      if (storeProfile?.id) {
        try {
          fetchedCats = await apiFetch<Category[]>(`/stores/${storeProfile.id}/categories`);
        } catch {
          // ignore
        }
      }

      if (!fetchedCats || fetchedCats.length === 0) {
        // Derive from products
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
        fetchedCats = Array.from(catMap.values());
      }

      // Sort by sortOrder ascending, then name
      fetchedCats.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
      setCategories(fetchedCats);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const [prods, storeProfile] = await Promise.all([
          apiFetch<StoreProduct[]>('/store/products'),
          apiFetch<StoreProfile>('/store/me').catch(() => null),
        ]);
        if (!ignore) {
          const counts: Record<string, number> = {};
          for (const p of prods) {
            if (p.categoryId) {
              counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
            }
          }
          setProductCounts(counts);

          let fetchedCats: Category[] = [];
          if (storeProfile?.id) {
            try {
              fetchedCats = await apiFetch<Category[]>(`/stores/${storeProfile.id}/categories`);
            } catch {
              // ignore
            }
          }

          if (!fetchedCats || fetchedCats.length === 0) {
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
            fetchedCats = Array.from(catMap.values());
          }

          fetchedCats.sort(
            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)
          );
          setCategories(fetchedCats);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load categories');
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

  // Create Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setAddError('Category name is required');
      return;
    }

    try {
      setAddSaving(true);
      setAddError(null);
      const maxSort = categories.reduce((max, c) => Math.max(max, c.sortOrder ?? 0), 0);
      const created = await apiFetch<Category>('/store/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: newCatName.trim(),
          sortOrder: maxSort + 1,
        }),
      });

      toast.success(`Category "${created.name}" created`);
      setNewCatName('');
      setIsAddOpen(false);
      void refreshData();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setAddSaving(false);
    }
  };

  // Start Inline Rename
  const handleStartRename = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditName(cat.name);
  };

  // Save Inline Rename
  const handleSaveRename = async (catId: string) => {
    if (!editName.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    try {
      setEditSaving(true);
      await apiFetch<Category>(`/store/categories/${catId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName.trim() }),
      });
      toast.success('Category renamed');
      setEditingCatId(null);
      void refreshData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to rename category');
    } finally {
      setEditSaving(false);
    }
  };

  // Reorder Categories (Swap sort orders)
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const currentCat = categories[index];
    const targetCat = categories[targetIndex];

    try {
      setReorderingId(currentCat.id);

      // Current values
      const currentSort = currentCat.sortOrder ?? index;
      const targetSort = targetCat.sortOrder ?? targetIndex;

      // Assign distinct sort orders
      const newCurrentSort = targetSort === currentSort ? (direction === 'up' ? currentSort - 1 : currentSort + 1) : targetSort;
      const newTargetSort = currentSort;

      await Promise.all([
        apiFetch(`/store/categories/${currentCat.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ sortOrder: newCurrentSort }),
        }),
        apiFetch(`/store/categories/${targetCat.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ sortOrder: newTargetSort }),
        }),
      ]);

      toast.success('Category order updated');
      void refreshData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reorder categories');
    } finally {
      setReorderingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Categories</h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize products into categories and customize the display order.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void refreshData()}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
            title="Refresh"
            aria-label="Refresh categories"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setNewCatName('');
              setAddError(null);
              setIsAddOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && categories.length === 0 && (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
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
            onClick={() => void refreshData()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-xl transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && categories.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <Tag className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No categories yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create your first product category (e.g. Fruits & Vegetables, Dairy, Bakery) to organize your store catalog.
            </p>
          </div>
          <button
            onClick={() => {
              setNewCatName('');
              setAddError(null);
              setIsAddOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      )}

      {/* Categories List */}
      {!loading && !error && categories.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-100">
          {categories.map((cat, index) => {
            const count = productCounts[cat.id] || 0;
            const isEditing = editingCatId === cat.id;
            const isReordering = reorderingId === cat.id;

            return (
              <div
                key={cat.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition"
              >
                {/* Left side: Icon, Name, Count */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Tag className="w-5 h-5" />
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1 max-w-sm">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm rounded-xl border border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleSaveRename(cat.id);
                          if (e.key === 'Escape') setEditingCatId(null);
                        }}
                      />
                      <button
                        onClick={() => void handleSaveRename(cat.id)}
                        disabled={editSaving}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                        title="Save name"
                        aria-label="Save name"
                      >
                        {editSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition"
                        title="Cancel"
                        aria-label="Cancel editing"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-semibold text-slate-900 text-sm truncate">
                        {cat.name}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 shrink-0">
                        <Package className="w-3 h-3 text-slate-400" />
                        {count} {count === 1 ? 'product' : 'products'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right side: Reordering & Edit buttons */}
                {!isEditing && (
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {/* Move Up */}
                    <button
                      onClick={() => void handleMove(index, 'up')}
                      disabled={index === 0 || isReordering}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
                      title="Move up"
                      aria-label="Move category up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    {/* Move Down */}
                    <button
                      onClick={() => void handleMove(index, 'down')}
                      disabled={index === categories.length - 1 || isReordering}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
                      title="Move down"
                      aria-label="Move category down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    {/* Rename */}
                    <button
                      onClick={() => handleStartRename(cat)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition ml-1"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      Rename
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Category Drawer */}
      <Drawer
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Category"
        description="Create a new product category for your store."
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddCategory}
              disabled={addSaving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {addSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Category
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddCategory} className="space-y-4">
          <FormField label="Category Name" required error={addError}>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => {
                setNewCatName(e.target.value);
                setAddError(null);
              }}
              placeholder="e.g. Fresh Produce, Dairy & Eggs..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
              autoFocus
            />
          </FormField>
        </form>
      </Drawer>
    </div>
  );
}
