'use client';

import React, { useState, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShoppingBag,
  MapPin,
  Truck,
  User,
  AlertCircle,
  RotateCw,
  CheckCircle2,
  XCircle,
  Store as StoreIcon,
  Phone,
  Calendar,
  CreditCard,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { useCurrency } from '../../../context/currency-context';
import { formatMoney } from '../../../lib/currency';
import { usePolling } from '../../../lib/use-polling';
import {
  Order,
  OrderStatus,
  UnitType,
} from '../../types';
import StatusBadge from '../../../components/status-badge';
import { formatSlotDisplay } from '../../lib/format-slot';

const FINAL_STATUSES = new Set<OrderStatus>([
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
  'DELIVERY_FAILED',
]);

const STATUS_ORDER: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PICKING',
  'READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Order Placed',
  CONFIRMED: 'Confirmed by Store',
  PICKING: 'Picking Items',
  READY_FOR_DELIVERY: 'Ready for Delivery',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected by Store',
  DELIVERY_FAILED: 'Delivery Failed',
};

function formatItemQuantity(qty: number, unitType: UnitType, unitLabel: string): string {
  if (unitType === 'WEIGHT') {
    return `${(qty / 1000).toFixed(qty % 1000 === 0 ? 0 : 2)} kg`;
  }
  return `${qty} ${unitLabel || 'unit'}${qty === 1 ? '' : 's'}`;
}

export default function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const { currency } = useCurrency();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    try {
      setError(null);
      const fetched = await apiFetch<Order>(`/orders/${orderId}`);
      setOrder(fetched);
    } catch (err: unknown) {
      setError(
        (err as Error).message || 'Failed to load order details. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const isFinalStatus = order ? FINAL_STATUSES.has(order.status) : false;

  const { isRefreshing, refresh } = usePolling(loadOrder, {
    intervalMs: 10000,
    enabled: !isFinalStatus,
  });

  const handleCancelOrder = async () => {
    try {
      setCancelling(true);
      setCancelError(null);
      await apiFetch(`/orders/${orderId}/cancel`, {
        method: 'POST',
      });
      setShowCancelModal(false);
      await loadOrder();
    } catch (err: unknown) {
      setCancelError(
        (err as Error).message || 'Failed to cancel order. Please try again.'
      );
    } finally {
      setCancelling(false);
    }
  };

  const canCancel =
    order && (order.status === 'PENDING' || order.status === 'CONFIRMED');

  const hasWeightItems = order?.items.some((i) => i.unitType === 'WEIGHT');
  const isPickingComplete =
    order &&
    order.status !== 'PENDING' &&
    order.status !== 'CONFIRMED' &&
    order.status !== 'PICKING';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header / Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/customer/orders"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Order #{orderId.slice(0, 8).toUpperCase()}
              </h1>
              {order && <StatusBadge status={order.status} />}
            </div>
            {order?.createdAt && (
              <p className="text-xs text-slate-500 mt-0.5">
                Placed on {new Date(order.createdAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isRefreshing}
          className="inline-flex items-center self-start sm:self-auto gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-xs disabled:opacity-50"
        >
          <RotateCw
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`}
          />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-6">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="h-24 bg-slate-100 rounded-xl" />
          <div className="h-40 bg-slate-100 rounded-xl" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-rose-900">
                Unable to load order
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isRefreshing}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs shrink-0 transition-colors disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && order && (
        <>
          {/* Rejection or Failure Banner */}
          {order.status === 'REJECTED' && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-rose-900">Order Rejected</h3>
                <p className="text-xs text-rose-700 mt-1">
                  {order.rejectionReason ||
                    order.statusHistory?.find((h) => h.status === 'REJECTED')?.notes ||
                    'The store was unable to accept this order. Any reserved items have been restored.'}
                </p>
              </div>
            </div>
          )}

          {order.status === 'DELIVERY_FAILED' && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-rose-900">Delivery Failed</h3>
                <p className="text-xs text-rose-700 mt-1">
                  Reason:{' '}
                  <span className="font-semibold">
                    {order.delivery?.failureReason?.replace(/_/g, ' ') || 'Unknown'}
                  </span>
                </p>
                {order.delivery?.failureNote && (
                  <p className="text-xs text-rose-600 mt-0.5">
                    Note: {order.delivery.failureNote}
                  </p>
                )}
              </div>
            </div>
          )}

          {order.status === 'CANCELLED' && (
            <div className="rounded-2xl bg-slate-100 border border-slate-200 p-5 flex items-start gap-3 text-slate-700">
              <XCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Order Cancelled</h3>
                <p className="text-xs text-slate-600 mt-1">
                  {order.statusHistory?.find((h) => h.status === 'CANCELLED')?.notes ||
                    'This order was cancelled. Stock and delivery slots have been released.'}
                </p>
              </div>
            </div>
          )}

          {/* Status Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Order Timeline
            </h2>

            {/* Stepper Progress for normal flow */}
            {!['CANCELLED', 'REJECTED', 'DELIVERY_FAILED'].includes(order.status) && (
              <div className="py-2">
                <div className="grid grid-cols-6 gap-2 text-center text-xs">
                  {STATUS_ORDER.map((stepStatus, idx) => {
                    const currentIndex = STATUS_ORDER.indexOf(order.status);
                    const isCompleted = idx <= currentIndex;
                    const isCurrent = idx === currentIndex;

                    return (
                      <div key={stepStatus} className="flex flex-col items-center space-y-1">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                            isCurrent
                              ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                              : isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <span
                          className={`hidden sm:inline-block font-semibold text-[11px] leading-tight ${
                            isCurrent
                              ? 'text-emerald-800 font-bold'
                              : isCompleted
                              ? 'text-slate-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {STATUS_LABELS[stepStatus]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Detailed Status History Log */}
            {order.statusHistory && order.statusHistory.length > 0 && (
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500">History Log</p>
                <div className="space-y-2">
                  {order.statusHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between gap-3 text-xs p-2 rounded-lg bg-slate-50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">
                            {STATUS_LABELS[entry.status] || entry.status}
                          </span>
                          {entry.changedByUser && (
                            <span className="text-[10px] text-slate-500">
                              by {entry.changedByUser.name} ({entry.changedByUser.role})
                            </span>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-slate-600 mt-0.5">{entry.notes}</p>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Store & Delivery Info Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Store Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <StoreIcon className="w-4 h-4 text-emerald-600" />
                Store Details
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {order.store?.name}
                </h3>
                {order.store?.address && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {order.store.address}
                  </p>
                )}
                {order.store?.phone && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {order.store.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Delivery Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Truck className="w-4 h-4 text-emerald-600" />
                Delivery Information
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">
                      {order.address?.label || 'Delivery Address'}:
                    </span>{' '}
                    {order.address?.street}, {order.address?.city}{' '}
                    {order.address?.postalCode}
                  </div>
                </div>

                {order.deliverySlot && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800">Slot:</span>{' '}
                      {formatSlotDisplay(order.deliverySlot)}
                    </div>
                  </div>
                )}

                {order.delivery?.driver && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800">Driver:</span>{' '}
                      {order.delivery.driver.name}
                      {order.delivery.driver.phone && (
                        <span className="text-slate-400 ml-2">
                          ({order.delivery.driver.phone})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Order Items ({order.items.length})
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                Pref:{' '}
                <span className="font-semibold text-slate-700">
                  {order.substitutionPreference.replace(/_/g, ' ')}
                </span>
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {order.items.map((item) => {
                const isSubstituted =
                  Boolean(item.substitutedProductId) ||
                  Boolean(item.substitutedProduct);
                const isQuantityDifferent =
                  item.quantityFulfilled !== item.quantityOrdered;

                return (
                  <div key={item.id} className="p-5 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {item.productName}
                          </h4>
                          {item.unitType === 'WEIGHT' && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              Weight
                            </span>
                          )}
                        </div>

                        {/* Ordered vs Fulfilled Quantity */}
                        <div className="text-xs text-slate-500 space-x-2">
                          <span>
                            Ordered:{' '}
                            <strong className="text-slate-700">
                              {formatItemQuantity(
                                item.quantityOrdered,
                                item.unitType,
                                item.unitLabel
                              )}
                            </strong>
                          </span>
                          {isPickingComplete && (
                            <>
                              <span>•</span>
                              <span>
                                Fulfilled:{' '}
                                <strong
                                  className={
                                    isQuantityDifferent
                                      ? 'text-amber-600 font-bold'
                                      : 'text-emerald-700'
                                  }
                                >
                                  {formatItemQuantity(
                                    item.quantityFulfilled,
                                    item.unitType,
                                    item.unitLabel
                                  )}
                                </strong>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-900">
                          {formatMoney(item.lineTotal, currency)}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {formatMoney(item.unitPrice, currency)}
                          {item.unitType === 'WEIGHT' ? '/kg' : ' each'}
                        </p>
                      </div>
                    </div>

                    {/* Substitution Display: "X replaced with Y" */}
                    {isSubstituted && (
                      <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center gap-2 text-xs text-amber-900">
                        <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <span className="font-semibold">{item.productName}</span>{' '}
                          replaced with{' '}
                          <span className="font-bold">
                            {item.substitutedProduct?.name || 'Substitute Item'}
                          </span>
                          {item.substituteQuantity && (
                            <span className="text-amber-700 ml-1">
                              (
                              {formatItemQuantity(
                                item.substituteQuantity,
                                item.unitType,
                                item.unitLabel
                              )}
                              )
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Customer Notes */}
            {order.customerNotes && (
              <div className="p-4 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-600">
                <span className="font-bold text-slate-800">Order Note:</span>{' '}
                {order.customerNotes}
              </div>
            )}
          </div>

          {/* Pricing Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Payment Summary
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>
                  Items Subtotal
                  {hasWeightItems && !isPickingComplete && (
                    <span className="text-xs text-slate-400 ml-1">(Estimated)</span>
                  )}
                </span>
                <span className="font-semibold text-slate-900">
                  {formatMoney(order.itemSubtotal, currency)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Delivery Fee</span>
                <span className="font-semibold text-slate-900">
                  {formatMoney(order.deliveryFee, currency)}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                <div>
                  <span className="text-base font-black text-slate-900">
                    {isPickingComplete ? 'Final Total' : 'Estimated Total'}
                  </span>
                  {hasWeightItems && !isPickingComplete && (
                    <p className="text-[11px] text-slate-400">
                      Actual amount may adjust slightly based on weighted items
                    </p>
                  )}
                </div>
                <span className="text-xl font-black text-emerald-700">
                  {formatMoney(order.total, currency)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span>Payment: Cash on Delivery</span>
              </div>
              <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                Status: {order.paymentStatus}
              </span>
            </div>
          </div>

          {/* Cancellation Action */}
          {canCancel && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="px-5 py-2.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-all shadow-xs active:scale-95"
              >
                Cancel Order
              </button>
            </div>
          )}

          {/* Cancel Confirmation Modal */}
          {showCancelModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-full bg-rose-100 text-rose-600 shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Cancel this order?
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Are you sure you want to cancel order #
                      {orderId.slice(0, 8).toUpperCase()}? This will restore
                      reserved inventory and your delivery slot. This action cannot
                      be undone.
                    </p>
                  </div>
                </div>

                {cancelError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                    {cancelError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    disabled={cancelling}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Keep Order
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelOrder}
                    disabled={cancelling}
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {cancelling ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Cancelling...</span>
                      </>
                    ) : (
                      <span>Yes, Cancel Order</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
