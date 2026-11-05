'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../lib/api';
import { UserProfile } from '../../lib/driver-types';
import {
  User,
  Phone,
  Mail,
  ShieldCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  RotateCw,
} from 'lucide-react';

export default function DriverProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ name?: string; phone?: string }>({});

  const fetchProfile = useCallback(async () => {
    try {
      const data = await apiFetch<UserProfile>('/users/me');
      setProfile(data);
      setName(data.name || '');
      setPhone(data.phone || '');
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load driver profile';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await apiFetch<UserProfile>('/users/me');
        if (!ignore) {
          setProfile(data);
          setName(data.name || '');
          setPhone(data.phone || '');
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to load driver profile';
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const validate = () => {
    const errs: { name?: string; phone?: string } = {};
    if (!name.trim()) {
      errs.name = 'Name is required';
    } else if (name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters';
    }

    if (phone.trim()) {
      // Basic phone format check: must contain only digits, spaces, plus, hyphens, and at least 7 digits
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
      const updated = await apiFetch<UserProfile>('/users/me', {
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setError(msg);
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

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-xl w-1/3" />
        <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6">
          <div className="h-6 bg-slate-200 rounded-md w-1/2" />
          <div className="space-y-4">
            <div className="h-10 bg-slate-100 rounded-xl w-full" />
            <div className="h-10 bg-slate-100 rounded-xl w-full" />
            <div className="h-10 bg-slate-100 rounded-xl w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="p-4 md:p-8 max-w-xl mx-auto">
        <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Failed to load profile</h3>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchProfile();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition"
          >
            <RotateCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Driver Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your contact information and personal account details.
        </p>
      </div>

      {/* ── Success Banner ── */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-800 shadow-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* ── Profile Form Card ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-xs space-y-6">
        {/* Top Profile Summary */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white text-2xl font-black shadow-xs">
            {profile?.name?.[0] || profile?.email?.[0] || 'D'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{profile?.name || 'Driver'}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                Driver
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {profile?.email}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (validationErrors.name) {
                    setValidationErrors((prev) => ({ ...prev, name: undefined }));
                  }
                }}
                placeholder="Your full name"
                className={`w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border bg-white text-slate-900 focus:outline-none transition ${
                  validationErrors.name
                    ? 'border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                    : 'border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                }`}
              />
            </div>
            {validationErrors.name && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{validationErrors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (validationErrors.phone) {
                    setValidationErrors((prev) => ({ ...prev, phone: undefined }));
                  }
                }}
                placeholder="+1 555-0199"
                className={`w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border bg-white text-slate-900 focus:outline-none transition ${
                  validationErrors.phone
                    ? 'border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                    : 'border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                }`}
              />
            </div>
            {validationErrors.phone ? (
              <p className="text-xs text-rose-600 mt-1 font-medium">{validationErrors.phone}</p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1">
                Used by customers and store staff for delivery coordination.
              </p>
            )}
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Email Address <span className="text-slate-400 font-normal">(Read-only)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                disabled
                value={profile?.email || ''}
                className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Account Meta Badges */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900">Account Status: </span>
                <span className="text-emerald-700 font-medium">Active</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900">Member since: </span>
                <span>{formatDate(profile?.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition shadow-xs disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
