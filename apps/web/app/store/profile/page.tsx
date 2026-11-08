'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Phone,
  Mail,
  ShieldCheck,
  Calendar,
  Save,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../context/toast-context';
import FormField from '../../components/form-field';
import type { UserProfile, UpdateUserInput } from '../types';

export default function StoreProfilePage() {
  const toast = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    phone?: string;
  }>({});

  // Refresh Profile
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const data = await apiFetch<UserProfile>('/users/me');
      setProfile(data);
      setName(data.name || '');
      setPhone(data.phone || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await apiFetch<UserProfile>('/users/me');
        if (!ignore) {
          setProfile(data);
          setName(data.name || '');
          setPhone(data.phone || '');
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load profile');
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

  // Validate form
  const validate = (): boolean => {
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

  // Save changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      const payload: UpdateUserInput = {
        name: name.trim(),
        phone: phone.trim() || undefined,
      };

      const updated = await apiFetch<UserProfile>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setProfile(updated);
      toast.success('Profile updated successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Manager Profile</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your personal account credentials and store manager contact details.
          </p>
        </div>
        <button
          onClick={() => void refreshData()}
          disabled={loading}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition self-start sm:self-auto"
          title="Refresh"
          aria-label="Refresh profile"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && !profile && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-200" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-slate-200 rounded-lg w-48" />
              <div className="h-4 bg-slate-100 rounded-lg w-32" />
            </div>
          </div>
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="h-10 bg-slate-100 rounded-xl" />
            <div className="h-10 bg-slate-100 rounded-xl" />
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

      {/* Profile Form & Overview */}
      {!loading && profile && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Account Overview Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-2xl uppercase shadow-xs">
                {profile.name?.[0] || profile.email?.[0] || 'M'}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900 truncate">{profile.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Store Manager
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Read-only Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-slate-400 font-medium">Email Address</div>
                  <div className="font-semibold text-slate-800 truncate">{profile.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-slate-400 font-medium">Member Since</div>
                  <div className="font-semibold text-slate-800">{memberSince || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Information Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              Edit Personal Information
            </h3>

            {/* Name */}
            <FormField label="Full Name" required error={validationErrors.name}>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
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
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </FormField>

            {/* Phone */}
            <FormField
              label="Contact Phone Number"
              error={validationErrors.phone}
              hint="Optional direct line"
            >
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (validationErrors.phone) {
                      setValidationErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }}
                  placeholder="+1 (555) 012-3456"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </FormField>

            {/* Submit */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs transition disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
