'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  Plus,
  Calendar,
  AlertCircle,
  RefreshCw,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../context/toast-context';
import FormField from '../../components/form-field';
import Drawer from '../../components/drawer';
import { ActionConfirmModal } from '../components/action-confirm-modal';
import type { DeliverySlot } from '../types';

interface GroupedSlots {
  dateKey: string;
  displayDate: string;
  isToday: boolean;
  isPast: boolean;
  slots: DeliverySlot[];
}

export default function StoreDeliverySlotsPage() {
  const toast = useToast();

  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Single Slot Create Drawer
  const [isSingleOpen, setIsSingleOpen] = useState(false);
  const [singleDate, setSingleDate] = useState('');
  const [singleStart, setSingleStart] = useState('08:00');
  const [singleEnd, setSingleEnd] = useState('10:00');
  const [singleCapacity, setSingleCapacity] = useState('10');
  const [singleErrors, setSingleErrors] = useState<Record<string, string>>({});
  const [singleSaving, setSingleSaving] = useState(false);

  // Daily Slots Generator Drawer
  const [isDailyOpen, setIsDailyOpen] = useState(false);
  const [dailyDate, setDailyDate] = useState('');
  const [dailyCapacity, setDailyCapacity] = useState('10');
  const [dailyIntervalHours, setDailyIntervalHours] = useState('2');
  const [dailyStartHour, setDailyStartHour] = useState('08:00');
  const [dailyEndHour, setDailyEndHour] = useState('20:00');
  const [confirmDailyBatch, setConfirmDailyBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Today's YYYY-MM-DD in local time
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Fetch slots
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const data = await apiFetch<DeliverySlot[]>('/store/delivery-slots');
      setSlots(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load delivery slots');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await apiFetch<DeliverySlot[]>('/store/delivery-slots');
        if (!ignore) {
          setSlots(data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load delivery slots');
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

  // Validate Single Slot
  const validateSingle = (): boolean => {
    const errs: Record<string, string> = {};
    if (!singleDate) {
      errs.date = 'Date is required';
    } else if (singleDate < todayStr) {
      errs.date = 'Date cannot be in the past';
    }

    if (!singleStart) {
      errs.startTime = 'Start time is required';
    }
    if (!singleEnd) {
      errs.endTime = 'End time is required';
    } else if (singleStart && singleEnd <= singleStart) {
      errs.endTime = 'End time must be after start time';
    }

    const cap = parseInt(singleCapacity, 10);
    if (isNaN(cap) || cap < 1) {
      errs.capacity = 'Capacity must be at least 1';
    }

    setSingleErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Single Slot
  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSingle()) return;

    try {
      setSingleSaving(true);
      await apiFetch<DeliverySlot>('/store/delivery-slots', {
        method: 'POST',
        body: JSON.stringify({
          date: singleDate,
          startTime: singleStart,
          endTime: singleEnd,
          capacity: parseInt(singleCapacity, 10),
        }),
      });

      toast.success(`Slot created for ${singleDate} (${singleStart} - ${singleEnd})`);
      setIsSingleOpen(false);
      void refreshData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create slot');
    } finally {
      setSingleSaving(false);
    }
  };

  // Generated preview for daily slots
  const previewDailySlots = useMemo(() => {
    if (!dailyDate) return [];
    const interval = parseInt(dailyIntervalHours, 10) || 2;
    const startH = parseInt(dailyStartHour.split(':')[0] || '8', 10);
    const endH = parseInt(dailyEndHour.split(':')[0] || '20', 10);

    const generated: { startTime: string; endTime: string }[] = [];
    for (let h = startH; h + interval <= endH; h += interval) {
      const s = `${String(h).padStart(2, '0')}:00`;
      const e = `${String(h + interval).padStart(2, '0')}:00`;
      generated.push({ startTime: s, endTime: e });
    }
    return generated;
  }, [dailyDate, dailyIntervalHours, dailyStartHour, dailyEndHour]);

  // Execute Daily Slots Batch
  const handleExecuteDailyBatch = async () => {
    if (previewDailySlots.length === 0 || !dailyDate) return;
    setConfirmDailyBatch(false);

    const cap = parseInt(dailyCapacity, 10) || 10;
    let successCount = 0;
    let failCount = 0;

    setBatchProgress({ current: 0, total: previewDailySlots.length });

    for (let i = 0; i < previewDailySlots.length; i++) {
      const slot = previewDailySlots[i];
      setBatchProgress({ current: i + 1, total: previewDailySlots.length });
      try {
        await apiFetch('/store/delivery-slots', {
          method: 'POST',
          body: JSON.stringify({
            date: dailyDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            capacity: cap,
          }),
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    setBatchProgress(null);
    setIsDailyOpen(false);

    if (failCount === 0) {
      toast.success(`Successfully created all ${successCount} delivery slots for ${dailyDate}`);
    } else {
      toast.info(`Created ${successCount} slots, ${failCount} slots failed or already existed.`);
    }

    void refreshData();
  };

  // Calculate Slot Status
  const getSlotStatus = (slot: DeliverySlot) => {
    // 1. Full Check
    if (slot.bookedCount >= slot.capacity) {
      return { label: 'Full', color: 'bg-rose-100 text-rose-800 border-rose-200', isClosed: true };
    }

    // 2. Closed Check (passed or under 60 minutes)
    const slotDateStr = typeof slot.date === 'string' ? slot.date.split('T')[0] : '';
    if (slotDateStr < todayStr) {
      return { label: 'Closed', color: 'bg-slate-100 text-slate-600 border-slate-200', isClosed: true };
    }

    if (slotDateStr === todayStr) {
      const now = new Date();
      const [sh, sm] = slot.startTime.split(':').map((x) => parseInt(x, 10));
      const slotStartTime = new Date();
      slotStartTime.setHours(sh || 0, sm || 0, 0, 0);

      const diffMs = slotStartTime.getTime() - now.getTime();
      const diffMins = diffMs / (1000 * 60);

      if (diffMins < 60) {
        return { label: 'Closed', color: 'bg-slate-100 text-slate-600 border-slate-200', isClosed: true };
      }
    }

    // 3. Open
    return { label: 'Open', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', isClosed: false };
  };

  // Grouped Slots by Day
  const groupedSlots = useMemo((): GroupedSlots[] => {
    const map = new Map<string, DeliverySlot[]>();

    for (const slot of slots) {
      const dateKey = typeof slot.date === 'string' ? slot.date.split('T')[0] : '';
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(slot);
    }

    // Sort dates descending
    const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((dateKey) => {
      const daySlots = map.get(dateKey)!;
      // Sort slots in day by startTime ascending
      daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

      const isToday = dateKey === todayStr;
      const isPast = dateKey < todayStr;

      let displayDate = dateKey;
      try {
        const parts = dateKey.split('-');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          displayDate = d.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        }
      } catch {
        // fallback
      }

      return {
        dateKey,
        displayDate: isToday ? `Today (${displayDate})` : displayDate,
        isToday,
        isPast,
        slots: daySlots,
      };
    });
  }, [slots, todayStr]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Delivery Slots</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage daily delivery windows, booking capacity and reservation states.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => void refreshData()}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
            title="Refresh"
            aria-label="Refresh slots"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setDailyDate(todayStr);
              setDailyCapacity('10');
              setIsDailyOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs sm:text-sm transition"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Create Daily Slots
          </button>
          <button
            onClick={() => {
              setSingleDate(todayStr);
              setSingleStart('08:00');
              setSingleEnd('10:00');
              setSingleCapacity('10');
              setSingleErrors({});
              setIsSingleOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Add Single Slot
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && slots.length === 0 && (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
              <div className="h-6 bg-slate-200 rounded-xl w-48" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-28 bg-slate-100 rounded-xl" />
                ))}
              </div>
            </div>
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
      {!loading && !error && slots.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No delivery slots scheduled</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Customers need open delivery slots to choose delivery windows during checkout. Generate daily slots to get started.
            </p>
          </div>
          <button
            onClick={() => {
              setDailyDate(todayStr);
              setIsDailyOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
          >
            <Sparkles className="w-4 h-4" />
            Generate Slots for Today
          </button>
        </div>
      )}

      {/* Slots Grouped by Day */}
      {!loading && !error && groupedSlots.length > 0 && (
        <div className="space-y-6">
          {groupedSlots.map((group) => (
            <div
              key={group.dateKey}
              className={`bg-white border rounded-2xl p-5 shadow-xs transition ${
                group.isToday
                  ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                  : group.isPast
                  ? 'border-slate-200 opacity-75'
                  : 'border-slate-200'
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                    {group.displayDate}
                  </h2>
                  {group.isToday && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                      Today
                    </span>
                  )}
                  {group.isPast && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-500">
                      Past
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {group.slots.length} {group.slots.length === 1 ? 'window' : 'windows'}
                </span>
              </div>

              {/* Slots Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.slots.map((slot) => {
                  const status = getSlotStatus(slot);
                  const percent = Math.min(
                    100,
                    Math.round((slot.bookedCount / Math.max(1, slot.capacity)) * 100)
                  );

                  return (
                    <div
                      key={slot.id}
                      className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition space-y-2.5"
                    >
                      {/* Time and State Chip */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {slot.startTime} – {slot.endTime}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      {/* Capacity & Progress */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Booked</span>
                          <span className="font-semibold text-slate-800">
                            {slot.bookedCount} / {slot.capacity}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              percent >= 100
                                ? 'bg-rose-500'
                                : percent >= 80
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer: Add Single Slot */}
      <Drawer
        isOpen={isSingleOpen}
        onClose={() => setIsSingleOpen(false)}
        title="Add Delivery Slot"
        description="Schedule an individual delivery slot window for your store."
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsSingleOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateSingle}
              disabled={singleSaving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {singleSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Slot
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateSingle} className="space-y-4">
          <FormField label="Date" required error={singleErrors.date}>
            <input
              type="date"
              min={todayStr}
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start Time" required error={singleErrors.startTime}>
              <input
                type="time"
                value={singleStart}
                onChange={(e) => setSingleStart(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
              />
            </FormField>

            <FormField label="End Time" required error={singleErrors.endTime}>
              <input
                type="time"
                value={singleEnd}
                onChange={(e) => setSingleEnd(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
              />
            </FormField>
          </div>

          <FormField
            label="Slot Capacity"
            required
            error={singleErrors.capacity}
            hint="Max orders allowed"
          >
            <input
              type="number"
              min="1"
              value={singleCapacity}
              onChange={(e) => setSingleCapacity(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
            />
          </FormField>
        </form>
      </Drawer>

      {/* Drawer: Create Daily Slots Shortcut */}
      <Drawer
        isOpen={isDailyOpen}
        onClose={() => setIsDailyOpen(false)}
        title="Create Daily Slots"
        description="Quickly generate a standard schedule of delivery windows for a selected date."
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDailyOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={previewDailySlots.length === 0 || !dailyDate || !!batchProgress}
              onClick={() => setConfirmDailyBatch(true)}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {batchProgress ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    Creating {batchProgress.current}/{batchProgress.total}...
                  </span>
                </>
              ) : (
                <span>Generate {previewDailySlots.length} Slots</span>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Target Date" required hint="Must not be in the past">
            <input
              type="date"
              min={todayStr}
              value={dailyDate}
              onChange={(e) => setDailyDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Window Interval">
              <select
                value={dailyIntervalHours}
                onChange={(e) => setDailyIntervalHours(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:border-emerald-500"
              >
                <option value="1">Every 1 hour</option>
                <option value="2">Every 2 hours</option>
                <option value="3">Every 3 hours</option>
                <option value="4">Every 4 hours</option>
              </select>
            </FormField>

            <FormField label="Capacity per Slot">
              <input
                type="number"
                min="1"
                value={dailyCapacity}
                onChange={(e) => setDailyCapacity(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Operating Start">
              <input
                type="time"
                value={dailyStartHour}
                onChange={(e) => setDailyStartHour(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
              />
            </FormField>

            <FormField label="Operating End">
              <input
                type="time"
                value={dailyEndHour}
                onChange={(e) => setDailyEndHour(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
              />
            </FormField>
          </div>

          {/* Preview List */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Preview of Generated Slots ({previewDailySlots.length}):</span>
              <span>Capacity: {dailyCapacity} orders/slot</span>
            </div>
            {previewDailySlots.length === 0 ? (
              <p className="text-xs text-rose-500">
                Operating end time must be after operating start time.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50 p-2">
                {previewDailySlots.map((s, idx) => (
                  <div
                    key={idx}
                    className="py-1.5 px-2 flex items-center justify-between text-xs text-slate-700 font-medium"
                  >
                    <span>
                      Slot #{idx + 1}: {s.startTime} – {s.endTime}
                    </span>
                    <span className="text-slate-400 font-normal">{dailyDate}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Drawer>

      {/* Confirmation Modal for Daily Batch Creation */}
      {confirmDailyBatch && (
        <ActionConfirmModal
          title="Confirm Daily Slots Creation"
          message={`Are you sure you want to create ${previewDailySlots.length} delivery slots for ${dailyDate} with capacity ${dailyCapacity} each?`}
          confirmLabel="Create All Slots"
          confirmVariant="primary"
          onConfirm={handleExecuteDailyBatch}
          onCancel={() => setConfirmDailyBatch(false)}
        />
      )}
    </div>
  );
}
