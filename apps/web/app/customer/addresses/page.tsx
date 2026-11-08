'use client';

import React, { useState, useCallback } from 'react';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  RotateCw,
  Home,
  Building,
  CheckCircle2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { usePolling } from '../../lib/use-polling';
import { Address } from '../types';

interface AddressFormData {
  label: string;
  street: string;
  city: string;
  postalCode: string;
  isDefault: boolean;
}

const INITIAL_FORM: AddressFormData = {
  label: 'Home',
  street: '',
  city: '',
  postalCode: '',
  isDefault: false,
};

export default function CustomerAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AddressFormData>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Set default in-flight state
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const loadAddresses = useCallback(async () => {
    try {
      setError(null);
      const data = await apiFetch<Address[]>('/addresses');
      // Sort default first
      const sorted = [...data].sort((a, b) =>
        a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1
      );
      setAddresses(sorted);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load delivery addresses.');
    } finally {
      setLoading(false);
    }
  }, []);

  const { isRefreshing, refresh } = usePolling(loadAddresses, {
    intervalMs: 30000,
  });

  const openAddForm = () => {
    setEditingId(null);
    setFormData({
      ...INITIAL_FORM,
      isDefault: addresses.length === 0, // auto default if first address
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (addr: Address) => {
    setEditingId(addr.id);
    setFormData({
      label: addr.label,
      street: addr.street,
      city: addr.city,
      postalCode: addr.postalCode,
      isDefault: addr.isDefault,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.label.trim()) {
      setFormError('Please provide a label (e.g. Home, Work).');
      return;
    }
    if (!formData.street.trim()) {
      setFormError('Street address is required.');
      return;
    }
    if (!formData.city.trim()) {
      setFormError('City is required.');
      return;
    }
    if (!formData.postalCode.trim()) {
      setFormError('Postal code is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        label: formData.label.trim(),
        street: formData.street.trim(),
        city: formData.city.trim(),
        postalCode: formData.postalCode.trim(),
        isDefault: formData.isDefault,
      };

      if (editingId) {
        await apiFetch(`/addresses/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/addresses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsFormOpen(false);
      await loadAddresses();
    } catch (err: unknown) {
      setFormError((err as Error).message || 'Failed to save address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (addr: Address) => {
    if (addr.isDefault) return;
    try {
      setSettingDefaultId(addr.id);
      await apiFetch(`/addresses/${addr.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isDefault: true }),
      });
      await loadAddresses();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to update default address.');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await apiFetch(`/addresses/${deletingId}`, {
        method: 'DELETE',
      });
      setDeletingId(null);
      await loadAddresses();
    } catch (err: unknown) {
      setDeleteError((err as Error).message || 'Failed to delete address.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Delivery Addresses
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your saved delivery locations for fast grocery checkout.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-xs disabled:opacity-50"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`}
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs tracking-wide shadow-md shadow-emerald-700/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Address</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && !loading && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-rose-900">
                Error Loading Addresses
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadAddresses()}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs shrink-0 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && addresses.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <MapPin className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            No delivery addresses saved
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Add your home, work, or apartment address to easily select it during grocery checkout.
          </p>
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Address
          </button>
        </div>
      )}

      {/* Address Cards Grid */}
      {!loading && !error && addresses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => {
            const isHome = addr.label.toLowerCase().includes('home');
            const isWork =
              addr.label.toLowerCase().includes('work') ||
              addr.label.toLowerCase().includes('office');

            return (
              <div
                key={addr.id}
                className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 shadow-xs ${
                  addr.isDefault
                    ? 'border-emerald-500 ring-2 ring-emerald-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                        {isHome ? (
                          <Home className="w-4 h-4 text-emerald-700" />
                        ) : isWork ? (
                          <Building className="w-4 h-4 text-slate-700" />
                        ) : (
                          <MapPin className="w-4 h-4 text-emerald-700" />
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {addr.label}
                      </h3>
                    </div>

                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Default
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 leading-relaxed pl-1">
                    <p className="font-semibold text-slate-800">{addr.street}</p>
                    <p>
                      {addr.city}, {addr.postalCode}
                    </p>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <div>
                    {!addr.isDefault ? (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(addr)}
                        disabled={settingDefaultId === addr.id}
                        className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {settingDefaultId === addr.id ? (
                          <>
                            <RotateCw className="w-3 h-3 animate-spin" />
                            <span>Setting...</span>
                          </>
                        ) : (
                          <span>Set as Default</span>
                        )}
                      </button>
                    ) : (
                      <span className="text-slate-400 font-medium">Default location</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(addr)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title="Edit Address"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(addr.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                      title="Delete Address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900">
                {editingId ? 'Edit Address' : 'Add Delivery Address'}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Label */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Address Label *
                </label>
                <div className="flex gap-2">
                  {['Home', 'Work', 'Other'].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          label: lbl === 'Other' && prev.label !== 'Home' && prev.label !== 'Work' ? prev.label : lbl,
                        }))
                      }
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        formData.label === lbl || (lbl === 'Other' && formData.label !== 'Home' && formData.label !== 'Work')
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                {formData.label !== 'Home' && formData.label !== 'Work' && (
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, label: e.target.value }))
                    }
                    placeholder="e.g. Vacation Home, Mom's House"
                    className="mt-2 w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                )}
              </div>

              {/* Street Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, street: e.target.value }))
                  }
                  placeholder="e.g. 123 Main St, Apt 4B"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* City & Postal Code */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, city: e.target.value }))
                    }
                    placeholder="e.g. Springfield"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        postalCode: e.target.value,
                      }))
                    }
                    placeholder="e.g. 90210"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {/* Set as default checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isDefault: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Set as my primary delivery address
                </span>
              </label>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingId ? 'Update Address' : 'Save Address'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Delete Address?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to remove this delivery address? Existing
                  active orders will not be affected.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Address</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
