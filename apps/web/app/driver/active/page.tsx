'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api';
import { useCurrency } from '../../context/currency-context';
import { formatMoney, convert } from '../../lib/currency';
import { usePolling } from '../../lib/use-polling';
import StatusBadge from '../../components/status-badge';
import { ActiveDelivery } from '../../lib/driver-types';
import { DeliveryFailureReason } from '@grocereal/shared';
import {
  Package,
  Store,
  MapPin,
  Phone,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCw,
  Loader2,
  ArrowRight,
  DollarSign,
  AlertCircle,
  FileText,
} from 'lucide-react';

const FINAL_STATUSES = ['DELIVERED', 'DELIVERY_FAILED', 'CANCELLED', 'REJECTED'];

export default function DriverActivePage() {
  const { currency } = useCurrency();

  const [delivery, setDelivery] = useState<ActiveDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals & Confirmations
  const [showDeliverConfirm, setShowDeliverConfirm] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureReason, setFailureReason] = useState<DeliveryFailureReason>(
    DeliveryFailureReason.CUSTOMER_UNAVAILABLE
  );
  const [failureNote, setFailureNote] = useState('');

  // Result state after transition
  const [completionResult, setCompletionResult] = useState<
    'DELIVERED' | 'DELIVERY_FAILED' | null
  >(null);

  const fetchActive = useCallback(async () => {
    try {
      const data = await apiFetch<ActiveDelivery | null>('/driver/deliveries/active');
      setDelivery(data || null);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load active delivery';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await apiFetch<ActiveDelivery | null>('/driver/deliveries/active');
        if (!ignore) {
          setDelivery(data || null);
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to load active delivery';
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

  const orderStatus = delivery?.order?.status;
  const isFinal = Boolean(orderStatus && FINAL_STATUSES.includes(orderStatus));

  // Poll every 10s; stop polling when in a final status or when completed
  const { refresh, isRefreshing, stop } = usePolling(fetchActive, {
    intervalMs: 10000,
    enabled: !isFinal && completionResult === null,
  });

  useEffect(() => {
    if (isFinal) {
      stop();
    }
  }, [isFinal, stop]);

  // Actions
  const handleConfirmPickup = async () => {
    if (!delivery) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await apiFetch<ActiveDelivery>(
        `/driver/deliveries/${delivery.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'OUT_FOR_DELIVERY' }),
        }
      );
      setDelivery(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm pickup';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!delivery) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await apiFetch<ActiveDelivery>(
        `/driver/deliveries/${delivery.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'DELIVERED' }),
        }
      );
      setDelivery(updated);
      setCompletionResult('DELIVERED');
      setShowDeliverConfirm(false);
      stop();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to mark as delivered';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportFailure = async () => {
    if (!delivery) return;
    if (!failureReason) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await apiFetch<ActiveDelivery>(
        `/driver/deliveries/${delivery.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'DELIVERY_FAILED',
            failureReason,
            failureNote: failureNote.trim() || undefined,
          }),
        }
      );
      setDelivery(updated);
      setCompletionResult('DELIVERY_FAILED');
      setShowFailureModal(false);
      stop();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to report delivery failure';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Cash to collect display logic
  const cashAmountDisplay = useMemo(() => {
    if (!delivery?.order) return null;
    const baseCents = delivery.order.total;
    const exactBase = formatMoney(baseCents, 'USD');

    if (currency === 'PHP') {
      const convertedCents = convert(baseCents, 'USD', 'PHP');
      const phpFormatted = formatMoney(convertedCents, 'PHP');
      return (
        <span>
          <span className="font-extrabold text-slate-900">{exactBase}</span>
          <span className="text-slate-500 font-medium text-xs ml-1.5">
            ({phpFormatted} approx.)
          </span>
        </span>
      );
    }

    return <span className="font-extrabold text-slate-900">{exactBase}</span>;
  }, [delivery, currency]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <div className="h-8 bg-slate-200 rounded-xl w-1/3 animate-pulse" />
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 animate-pulse">
          <div className="h-6 bg-slate-200 rounded-md w-1/2" />
          <div className="h-4 bg-slate-100 rounded-md w-3/4" />
          <div className="h-24 bg-slate-100 rounded-xl w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !delivery) {
    return (
      <div className="p-4 md:p-8 max-w-xl mx-auto">
        <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Failed to load active delivery</h3>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchActive();
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

  // Result Screen after delivery completed or failed
  if (completionResult || (delivery && isFinal)) {
    const isSuccess =
      completionResult === 'DELIVERED' || delivery?.order?.status === 'DELIVERED';
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-6 shadow-sm">
          <div
            className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${
              isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-10 h-10" />
            ) : (
              <XCircle className="w-10 h-10" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isSuccess ? 'Delivery Completed!' : 'Delivery Marked as Failed'}
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {isSuccess
                ? 'Great job! The order has been marked as delivered and payment updated.'
                : 'The order has been recorded as delivery failed. The store management team has been notified.'}
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 text-xs space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Order ID:</span>
              <span className="font-mono font-medium text-slate-900">
                {delivery?.order?.id}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Store:</span>
              <span className="font-medium text-slate-900">
                {delivery?.order?.store?.name}
              </span>
            </div>
            {delivery?.failureReason && (
              <div className="flex justify-between text-rose-700 font-semibold">
                <span>Reason:</span>
                <span>{delivery.failureReason.replace(/_/g, ' ')}</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Link
              href="/driver"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition shadow-xs"
            >
              Back to Available Deliveries
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Empty state: No active delivery
  if (!delivery) {
    return (
      <div className="p-4 md:p-8 max-w-xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-5 shadow-xs">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">No active delivery</h2>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              You are currently not assigned to any ongoing delivery. Pick one up from the available list.
            </p>
          </div>
          <div>
            <Link
              href="/driver"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-xs"
            >
              View Available Deliveries
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isStep1Pickup = orderStatus === 'READY_FOR_DELIVERY';
  const isStep2OutForDelivery = orderStatus === 'OUT_FOR_DELIVERY';

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* ── Header & Status Indicator ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Active Delivery</h1>
            {orderStatus && <StatusBadge status={orderStatus} />}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {isStep1Pickup
              ? 'Step 1 of 2: Go to the store and confirm pickup.'
              : 'Step 2 of 2: In transit to customer. Deliver and collect payment.'}
          </p>
        </div>

        <button
          onClick={() => refresh()}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50 self-start sm:self-auto"
        >
          <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Action Error Banner ── */}
      {actionError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-rose-800 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Stepper Indicator ── */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-3 ${
            isStep1Pickup
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-800'
              : 'bg-white border-slate-200 text-slate-400'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              isStep1Pickup
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {isStep1Pickup ? '1' : '✓'}
          </div>
          <div>
            <div className="font-bold">Step 1: Store Pickup</div>
            <div className="text-[11px] font-normal text-slate-500">Pick up items at store</div>
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-3 ${
            isStep2OutForDelivery
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-800'
              : 'bg-white border-slate-200 text-slate-400'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              isStep2OutForDelivery
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            2
          </div>
          <div>
            <div className="font-bold">Step 2: Customer Delivery</div>
            <div className="text-[11px] font-normal text-slate-500">Hand over & collect payment</div>
          </div>
        </div>
      </div>

      {/* ── STEP 1: STORE PICKUP ── */}
      {isStep1Pickup && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Pickup Location
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                {delivery.order?.store?.name}
              </h2>
              <p className="text-sm text-slate-600 mt-1 flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{delivery.order?.store?.address}</span>
              </p>
              {delivery.order?.store?.phone && (
                <p className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <a
                    href={`tel:${delivery.order.store.phone}`}
                    className="text-emerald-600 font-semibold hover:underline"
                  >
                    {delivery.order.store.phone}
                  </a>
                </p>
              )}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Items to collect:</span>
            <span className="font-bold text-slate-900 text-sm">
              {delivery.order?.items?.length || 0} packages
            </span>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleConfirmPickup}
              disabled={actionLoading}
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Confirming Pickup...
                </>
              ) : (
                <>
                  <Package className="w-5 h-5" />
                  Confirm Picked Up
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-400 mt-2">
              Confirm only after receiving and verifying all grocery items at the store.
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 2: CUSTOMER DELIVERY ── */}
      {isStep2OutForDelivery && (
        <div className="space-y-6">
          {/* Customer & Drop-off Info Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  Customer Details
                </span>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                  <div className="text-base font-bold text-slate-900">
                    {delivery.order?.customer?.name || 'Customer'}
                  </div>
                  {delivery.order?.customer?.phone ? (
                    <a
                      href={`tel:${delivery.order.customer.phone}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{delivery.order.customer.phone}</span>
                      <span className="text-[10px] text-emerald-600 font-normal">(Tap to call)</span>
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No phone provided</span>
                  )}
                </div>
              </div>

              {/* Drop-off address & notes */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Drop-off Location
                </span>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs">
                  <div className="font-semibold text-slate-900 text-sm">
                    {delivery.order?.address?.street}, {delivery.order?.address?.city}
                  </div>
                  {delivery.order?.address?.notes && (
                    <div className="flex items-start gap-1.5 text-slate-600 bg-amber-50/70 p-2 rounded-xl border border-amber-200/50">
                      <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-amber-900">Delivery Notes: </span>
                        <span>{delivery.order.address.notes}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cash to Collect Strip */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Cash to Collect
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {cashAmountDisplay}
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-500 self-start sm:self-auto">
                <span className="font-semibold text-slate-700">Payment: </span>
                <span>{delivery.order?.paymentMethod || 'Cash on Delivery'}</span>
              </div>
            </div>

            {/* Item List */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-slate-400" />
                  Items in this Order ({delivery.order?.items?.length || 0})
                </h3>
              </div>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                {delivery.order?.items?.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {item.product?.name}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Qty: {item.pickedQuantity ?? item.quantity}{' '}
                        {item.product?.unitLabel || 'units'}
                        {item.pickedWeightGrams && (
                          <span className="ml-1 text-slate-400">
                            ({(item.pickedWeightGrams / 1000).toFixed(2)} kg)
                          </span>
                        )}
                      </div>
                      {item.substitutedProduct && (
                        <div className="text-[11px] text-teal-700 font-medium mt-0.5">
                          Substituted with {item.substitutedProduct.name}
                        </div>
                      )}
                    </div>
                    <div className="text-right font-mono font-medium text-slate-700">
                      {formatMoney(item.totalPrice, currency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2 Action Buttons */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowDeliverConfirm(true)}
                disabled={actionLoading}
                className="py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Delivered
              </button>

              <button
                type="button"
                onClick={() => setShowFailureModal(true)}
                disabled={actionLoading}
                className="py-3 px-5 rounded-2xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-sm transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                <AlertTriangle className="w-4 h-4" />
                Delivery Failed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal: Mark Delivered ── */}
      {showDeliverConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Confirm Order Delivered?</h3>
              <p className="text-xs text-slate-500">
                Please ensure you have handed all grocery items to the customer and collected the exact cash payment.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <div className="text-xs text-slate-500">Cash Amount to Collect</div>
              <div className="text-xl font-extrabold text-slate-900 mt-1">
                {cashAmountDisplay}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeliverConfirm(false)}
                disabled={actionLoading}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkDelivered}
                disabled={actionLoading}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Completing...
                  </>
                ) : (
                  'Yes, Delivered'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Delivery Failed ── */}
      {showFailureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Report Delivery Failure</h3>
              <p className="text-xs text-slate-500">
                Select the primary reason why this delivery could not be completed.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Failure Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  value={failureReason}
                  onChange={(e) =>
                    setFailureReason(e.target.value as DeliveryFailureReason)
                  }
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value={DeliveryFailureReason.CUSTOMER_UNAVAILABLE}>
                    Customer Unavailable / No Answer
                  </option>
                  <option value={DeliveryFailureReason.WRONG_ADDRESS}>
                    Wrong or Incomplete Address
                  </option>
                  <option value={DeliveryFailureReason.OTHER}>Other Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Optional Note / Details
                </label>
                <textarea
                  value={failureNote}
                  onChange={(e) => setFailureNote(e.target.value)}
                  placeholder="Provide additional details about why the delivery failed..."
                  rows={3}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFailureModal(false)}
                disabled={actionLoading}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReportFailure}
                disabled={actionLoading}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Failure'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
