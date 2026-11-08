'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Save,
  Loader2,
  RefreshCw,
  AlertCircle,
  Phone,
  MapPin,
  DollarSign,
  Power,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../context/toast-context';
import FormField from '../../components/form-field';
import MoneyInput from '../../components/money-input';
import { ActionConfirmModal } from '../components/action-confirm-modal';
import type { StoreProfile, UpdateStoreInput } from '../types';

export default function StoreSettingsPage() {
  const toast = useToast();

  const [store, setStore] = useState<StoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [minOrderAmount, setMinOrderAmount] = useState(0); // in cents
  const [deliveryFee, setDeliveryFee] = useState(0); // in cents
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Confirmation Modal for closing store
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Refresh / Fetch data
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const data = await apiFetch<StoreProfile>('/store/me');
      setStore(data);
      setName(data.name || '');
      setDescription(data.description || '');
      setAddress(data.address || '');
      setPhone(data.phone || '');
      setImageUrl(data.imageUrl || '');
      setIsOpen(data.isOpen ?? true);
      setMinOrderAmount(data.minOrderAmount ?? 0);
      setDeliveryFee(data.deliveryFee ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load store settings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await apiFetch<StoreProfile>('/store/me');
        if (!ignore) {
          setStore(data);
          setName(data.name || '');
          setDescription(data.description || '');
          setAddress(data.address || '');
          setPhone(data.phone || '');
          setImageUrl(data.imageUrl || '');
          setIsOpen(data.isOpen ?? true);
          setMinOrderAmount(data.minOrderAmount ?? 0);
          setDeliveryFee(data.deliveryFee ?? 0);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load store settings');
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

  // Form Validation
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = 'Store name is required';
    }
    if (!address.trim()) {
      errs.address = 'Store address is required';
    }
    if (!phone.trim()) {
      errs.phone = 'Contact phone number is required';
    } else {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        errs.phone = 'Please enter a valid phone number (7-15 digits)';
      }
    }

    if (minOrderAmount < 0) {
      errs.minOrderAmount = 'Minimum order amount cannot be negative';
    }
    if (deliveryFee < 0) {
      errs.deliveryFee = 'Delivery fee cannot be negative';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save Store Settings
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      const payload: UpdateStoreInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        address: address.trim(),
        phone: phone.trim(),
        imageUrl: imageUrl.trim() || undefined,
        isOpen,
        minOrderAmount,
        deliveryFee,
      };

      const updated = await apiFetch<StoreProfile>('/store/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setStore(updated);
      toast.success('Store settings saved successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save store settings');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Store Open / Closed
  const handleToggleOpen = () => {
    if (isOpen) {
      // Prompt confirmation before closing store
      setShowCloseModal(true);
    } else {
      setIsOpen(true);
      toast.info('Store marked as Open. Click "Save Changes" to apply.');
    }
  };

  const handleConfirmClose = () => {
    setIsOpen(false);
    setShowCloseModal(false);
    toast.info('Store marked as Closed. Click "Save Changes" to apply.');
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Store Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your store information, operating status, fees and customer policies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Read-only Approval Status Badge */}
          {store && (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                store.isApproved
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {store.isApproved ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Approved Store</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Pending Approval</span>
                </>
              )}
            </div>
          )}

          <button
            onClick={() => void refreshData()}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
            title="Refresh"
            aria-label="Refresh settings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && !store && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 animate-pulse">
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="space-y-4">
            <div className="h-10 bg-slate-100 rounded-xl" />
            <div className="h-20 bg-slate-100 rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-slate-100 rounded-xl" />
              <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
          </div>
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

      {/* Main Settings Form */}
      {!loading && store && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Open / Closed Banner Switch */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              isOpen
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                : 'bg-rose-50/60 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-bold flex items-center gap-2">
                    <span>Store Status:</span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs uppercase font-extrabold ${
                        isOpen
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {isOpen ? 'Open for Orders' : 'Closed'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-lg">
                    {isOpen
                      ? 'Customers can browse and place orders for your scheduled delivery windows.'
                      : 'Store is temporarily closed. Customers cannot place new orders until you reopen.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleOpen}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition self-start sm:self-auto shadow-xs ${
                  isOpen
                    ? 'bg-white border border-rose-300 text-rose-700 hover:bg-rose-50'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {isOpen ? 'Close Store' : 'Open Store'}
              </button>
            </div>
          </div>

          {/* Store Profile Details Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              General Store Information
            </h2>

            {/* Store Name */}
            <FormField label="Store Name" required error={errors.name}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Metro Fresh Market"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
              />
            </FormField>

            {/* Description */}
            <FormField label="Description (Optional)" hint="Short overview for customers">
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Fresh local groceries, organic produce and pantry essentials..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
              />
            </FormField>

            {/* Address & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Physical Address" required error={errors.address}>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Market St, City"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </FormField>

              <FormField label="Store Contact Phone" required error={errors.phone}>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 012-3456"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </FormField>
            </div>

            {/* Image URL & Live Preview */}
            <FormField label="Store Banner / Logo URL (Optional)">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
              />
              {imageUrl && (
                <div className="mt-3 flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-16 h-12 rounded-lg bg-white overflow-hidden border border-slate-200 shrink-0">
                    <img
                      src={imageUrl}
                      alt="Store Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">Store image preview</span>
                </div>
              )}
            </FormField>
          </div>

          {/* Pricing & Order Policies Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Pricing & Order Policies
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MoneyInput
                label="Minimum Order Amount (USD)"
                required
                value={minOrderAmount}
                onChange={setMinOrderAmount}
                error={errors.minOrderAmount}
                hint="Minimum cart subtotal to checkout"
              />

              <MoneyInput
                label="Delivery Fee (USD)"
                required
                value={deliveryFee}
                onChange={setDeliveryFee}
                error={errors.deliveryFee}
                hint="Flat fee charged per delivery"
              />
            </div>
          </div>

          {/* Save Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Confirmation Modal when Closing Store */}
      {showCloseModal && (
        <ActionConfirmModal
          title="Close Store?"
          message="Are you sure you want to mark the store as closed? Customers will not be able to place new orders while closed. You can reopen the store at any time."
          confirmLabel="Close Store"
          confirmVariant="danger"
          onConfirm={handleConfirmClose}
          onCancel={() => setShowCloseModal(false)}
        />
      )}
    </div>
  );
}
