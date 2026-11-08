'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Phone,
  Mail,
  ShieldCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Save,
  RotateCw,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    phone?: string;
  }>({});

  const fetchProfile = useCallback(async () => {
    try {
      const data = await apiFetch<CustomerProfile>('/users/me');
      setProfile(data);
      setName(data.name || '');
      setPhone(data.phone || '');
      setError(null);
    } catch (err: unknown) {
      setError(
        (err as Error).message || 'Failed to load profile. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await apiFetch<CustomerProfile>('/users/me');
        if (!ignore) {
          setProfile(data);
          setName(data.name || '');
          setPhone(data.phone || '');
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(
            (err as Error).message || 'Failed to load profile. Please try again.'
          );
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

  const validate = () => {
    const errs: { name?: string; phone?: string } = {};
    if (!name.trim()) {
      errs.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters';
    }

    if (phone.trim()) {
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length < 7 || digitsOnly.length > 15) {
        errs.phone = 'Please enter a valid phone number (7-15 digits)';
      }
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setError(null);

    if (!validate()) return;

    setSaving(true);
    try {
      const updated = await apiFetch<CustomerProfile>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
        }),
      });
      setProfile(updated);
      setName(updated.name || '');
      setPhone(updated.phone || '');
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Account Profile
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your personal details and contact information.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchProfile()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-xs disabled:opacity-50 self-start sm:self-auto"
        >
          <RotateCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {error && !loading && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-rose-900">Profile Error</h3>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void fetchProfile()}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs shrink-0 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Success Banner */}
      {successMsg && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-bold text-emerald-900">{successMsg}</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="space-y-4">
            <div className="h-10 bg-slate-100 rounded-xl" />
            <div className="h-10 bg-slate-100 rounded-xl" />
            <div className="h-10 bg-slate-100 rounded-xl" />
          </div>
        </div>
      )}

      {/* Profile Form */}
      {!loading && profile && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* User Summary Header */}
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-700/20">
              {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {profile.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                  <ShieldCheck className="w-3 h-3" />
                  {profile.role}
                </span>
                {profile.createdAt && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <Calendar className="w-3 h-3" />
                    Member since {formatDate(profile.createdAt)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Email (Read Only) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Email address cannot be changed once registered.
              </p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (validationErrors.name) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        name: undefined,
                      }));
                    }
                  }}
                  disabled={saving}
                  placeholder="Your full name"
                  required
                  className={`w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border focus:outline-hidden transition-all ${
                    validationErrors.name
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                  }`}
                />
              </div>
              {validationErrors.name && (
                <p className="text-[11px] text-rose-600 mt-1">
                  {validationErrors.name}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (validationErrors.phone) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        phone: undefined,
                      }));
                    }
                  }}
                  disabled={saving}
                  placeholder="+1 (555) 000-0000"
                  className={`w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border focus:outline-hidden transition-all ${
                    validationErrors.phone
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                  }`}
                />
              </div>
              {validationErrors.phone ? (
                <p className="text-[11px] text-rose-600 mt-1">
                  {validationErrors.phone}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-1">
                  Used by delivery drivers for delivery coordination.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs tracking-wide shadow-md shadow-emerald-700/20 transition-all disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
