'use client';

import { useState, useCallback } from 'react';import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  MessageSquare,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
} from 'lucide-react';
import { apiFetch, ApiError } from '../../../lib/api';
import { usePolling } from '../../../lib/use-polling';
import { useCurrency } from '../../../context/currency-context';
import { formatMoney, convert, BASE_CURRENCY } from '../../../lib/currency';
import StatusBadge from '../../../components/status-badge';
import { ActionConfirmModal } from '../../components/action-confirm-modal';
import { ReasonModal } from '../../components/reason-modal';
import type { StoreOrder, OrderItem, OrderStatus } from '../../types';
import { timeAgo } from '../../lib/time-ago';

// Final statuses — no actions allowed
const FINAL_STATUSES: OrderStatus[] = ['DELIVERED', 'CANCELLED', 'REJECTED', 'DELIVERY_FAILED'];

function isFinal(status: OrderStatus) {
  return FINAL_STATUSES.includes(status);
}

// ── Status Timeline ─────────────────────────────────────────────────────────

function StatusTimeline({ history }: { history?: StoreOrder['statusHistory'] }) {
  if (!history || !history.length) return null;
  const sorted = [...history].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900">Status History</h2>
      </div>
      <ul className="divide-y divide-slate-100">
        {sorted.map((entry, i) => (
          <li key={entry.id} className={`px-5 py-3 flex gap-3 ${i === 0 ? '' : 'opacity-70'}`}>
            <div className="mt-0.5 w-6 flex justify-center">
              {i === 0 ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : (
                <Clock className="w-4 h-4 text-slate-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={entry.status} />
                <span className="text-xs text-slate-400">
                  {entry.createdAt ? timeAgo(entry.createdAt) : ''}
                </span>
              </div>
              {entry.notes && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">{entry.notes}</p>
              )}
              {entry.changedByUser?.name && (
                <p className="text-xs text-slate-400 mt-0.5">by {entry.changedByUser.name}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Item Row (Picking Checklist) ─────────────────────────────────────────────

function ItemRow({
  item,
  orderId,
  onSaved,
}: {
  item: OrderItem;
  orderId: string;
  onSaved: () => Promise<void>;
}) {
  const isWeight = item?.unitType === 'WEIGHT';
  const [qty, setQty] = useState(item?.quantityFulfilled ?? item?.quantityOrdered ?? 0);
  const [savedQty, setSavedQty] = useState(item?.quantityFulfilled ?? item?.quantityOrdered ?? 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  const isDirty = qty !== savedQty;

  const handleSave = async () => {
    if (!item?.id) return;
    setSaving(true);
    setItemError(null);
    try {
      await apiFetch(`/store/orders/${orderId}/items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantityFulfilled: qty }),
      });
      setSavedQty(qty);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await onSaved();
    } catch (e: unknown) {
      setItemError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const displayUnit = isWeight ? 'g' : (item?.product?.unitLabel || 'item');

  return (
    <li className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900 truncate">
          {item?.product?.name || 'Unknown item'}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          Ordered: {item?.quantityOrdered ?? 0} {displayUnit}
          {item?.substitutedProduct && (
            <span className="ml-2 text-amber-600">
              → Sub: {item.substitutedProduct.name}
            </span>
          )}
        </div>
        {itemError && <p className="text-xs text-rose-500 mt-1">{itemError}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-slate-500">Fulfilled:</span>
        <input
          type="number"
          min={0}
          max={isWeight ? Math.floor((item?.quantityOrdered ?? 0) * 1.1) : (item?.quantityOrdered ?? 0)}
          value={qty}
          onChange={(e) => {
            setQty(Number(e.target.value));
            setSaved(false);
          }}
          className="w-20 border border-slate-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <span className="text-xs text-slate-500">{displayUnit}</span>
        <button
          onClick={() => { void handleSave(); }}
          disabled={saving || !isDirty}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
            saved
              ? 'bg-emerald-100 text-emerald-700'
              : isDirty
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {saving ? '…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
    </li>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function OrderWorkbenchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currency } = useCurrency();

  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'primary';
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [reasonModal, setReasonModal] = useState<{
    title: string;
    onConfirm: (reason: string) => Promise<void>;
  } | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const data = await apiFetch<StoreOrder>(`/store/orders/${id}`);
      setOrder(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Only poll while order is not final
  const isOrderFinal = order ? isFinal(order.status) : false;
  const { isRefreshing, refresh } = usePolling(fetchOrder, { enabled: !isOrderFinal });

  // Don't re-fetch when user is editing
  const handleItemSaved = useCallback(async () => {
    // refresh after save
    try {
      await fetchOrder();
    } catch {
      // ignore
    }
  }, [fetchOrder]);

  const patchStatus = useCallback(
    async (status: string, extra?: Record<string, string>) => {
      setActionPending(true);
      setActionError(null);
      try {
        await apiFetch(`/store/orders/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, ...extra }),
        });
        await fetchOrder();
      } catch (e: unknown) {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Action failed';
        setActionError(msg);
      } finally {
        setActionPending(false);
        setConfirmModal(null);
        setReasonModal(null);
      }
    },
    [id, fetchOrder]
  );

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-7 bg-slate-200 rounded-xl w-48" />
        <div className="h-32 bg-slate-100 rounded-2xl" />
        <div className="h-48 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm text-rose-700">{error ?? 'Order not found'}</p>
          <button
            onClick={() => { void refresh(); }}
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const slot = order.deliverySlot;
  const slotStr = slot
    ? `${slot.date ? new Date(slot.date).toLocaleDateString() : ''} ${slot.startTime || ''}–${slot.endTime || ''}`.trim() || '—'
    : '—';

  const total = convert(order.total ?? 0, BASE_CURRENCY, currency);
  const subtotal = convert(order.itemSubtotal ?? 0, BASE_CURRENCY, currency);
  const deliveryFee = convert(order.deliveryFee ?? 0, BASE_CURRENCY, currency);

  // For PICKING: check if all items have been handled (quantityFulfilled set)
  const items = order.items ?? [];
  const allItemsHandled = items.length > 0 && items.every((item) => item.quantityFulfilled !== undefined && item.quantityFulfilled !== null);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-lg font-bold text-slate-900">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Placed {order.createdAt ? `${timeAgo(order.createdAt)} · ${new Date(order.createdAt).toLocaleString()}` : '—'}
          </p>
        </div>
        <button
          onClick={() => { void refresh(); }}
          disabled={isRefreshing || isOrderFinal}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Action Error */}
      {actionError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
          {actionError}
        </div>
      )}

      {/* Customer & Order Info */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Order Details</h2>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500">Customer</div>
              <div className="text-sm font-medium text-slate-900">{order.customer?.name || 'Customer'}</div>
              {order.customer?.email && (
                <div className="text-xs text-slate-400">{order.customer.email}</div>
              )}
            </div>
          </div>
          {order.customer?.phone && (
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-slate-500">Phone</div>
                <a
                  href={`tel:${order.customer.phone}`}
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  {order.customer.phone}
                </a>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500">
                Delivery Address {order.address?.label ? `(${order.address.label})` : ''}
              </div>
              <div className="text-sm font-medium text-slate-900">
                {order.address?.street || 'No address provided'}
              </div>
              {(order.address?.city || order.address?.postalCode) && (
                <div className="text-xs text-slate-400">
                  {[order.address?.city, order.address?.postalCode]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500">Delivery Slot</div>
              <div className="text-sm font-medium text-slate-900">{slotStr}</div>
            </div>
          </div>
          {order.paymentMethod && (
            <div className="flex items-start gap-3">
              <CreditCard className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-slate-500">Payment</div>
                <div className="text-sm font-medium text-slate-900">{order.paymentMethod}</div>
              </div>
            </div>
          )}
          {order.substitutionPreference && (
            <div className="flex items-start gap-3">
              <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-slate-500">Substitution Preference</div>
                <div className="text-sm font-medium text-slate-900">{order.substitutionPreference}</div>
              </div>
            </div>
          )}
          {(order.customerNotes || order.notes) && (
            <div className="flex items-start gap-3 sm:col-span-2">
              <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-slate-500">Order Notes</div>
                <div className="text-sm text-slate-700">{order.customerNotes || order.notes}</div>
              </div>
            </div>
          )}
          {order.rejectionReason && (
            <div className="flex items-start gap-3 sm:col-span-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-slate-500">Rejection Reason</div>
                <div className="text-sm text-rose-700">{order.rejectionReason}</div>
              </div>
            </div>
          )}
        </div>

        {/* Driver Info for OUT_FOR_DELIVERY / DELIVERED */}
        {order.delivery?.driver && (
          <div className="px-5 py-4 border-t border-slate-100 flex items-start gap-3">
            <Truck className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500">Driver</div>
              <div className="text-sm font-medium text-slate-900">{order.delivery.driver.name || 'Assigned Driver'}</div>
              {order.delivery.driver.phone && (
                <a
                  href={`tel:${order.delivery.driver.phone}`}
                  className="text-xs text-emerald-700 hover:underline"
                >
                  {order.delivery.driver.phone}
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">
            Items ({items.length})
          </h2>
        </div>

        {order.status === 'PICKING' ? (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                orderId={order.id}
                onSaved={handleItemSaved}
              />
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const isWeight = item.unitType === 'WEIGHT';
              const unit = isWeight ? 'g' : (item.product?.unitLabel || 'item');
              const lineTotal = convert(item.lineTotal ?? 0, BASE_CURRENCY, currency);
              return (
                <li key={item.id} className="px-5 py-3 flex justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {item.product?.name || 'Item'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {item.quantityOrdered} {unit} ordered
                      {item.quantityFulfilled !== undefined && item.quantityFulfilled !== null && item.quantityFulfilled !== item.quantityOrdered && (
                        <span className="ml-1 text-amber-600">· {item.quantityFulfilled} {unit} fulfilled</span>
                      )}
                      {item.substitutedProduct && (
                        <span className="ml-1 text-indigo-600">· Sub: {item.substitutedProduct.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 shrink-0">
                    {formatMoney(lineTotal, currency)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Totals */}
        <div className="px-5 py-4 border-t border-slate-100 space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Delivery fee</span>
            <span>{formatMoney(deliveryFee, currency)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-slate-900 pt-1 border-t border-slate-100">
            <span>Total</span>
            <span>{formatMoney(total, currency)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons by Status */}
      {order.status === 'PENDING' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            disabled={actionPending}
            onClick={() => {
              setConfirmModal({
                title: 'Confirm Order',
                message: `Confirm order #${order.id.slice(0, 8).toUpperCase()}? This will start the fulfillment process.`,
                confirmLabel: 'Confirm Order',
                variant: 'primary',
                onConfirm: async () => { await patchStatus('CONFIRMED'); },
              });
            }}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-40"
          >
            Confirm Order
          </button>
          <button
            disabled={actionPending}
            onClick={() => {
              setReasonModal({
                title: 'Reject Order',
                onConfirm: async (reason) => { await patchStatus('REJECTED', { reason }); },
              });
            }}
            className="flex-1 py-3 bg-rose-100 text-rose-700 rounded-xl text-sm font-semibold hover:bg-rose-200 transition disabled:opacity-40"
          >
            Reject Order
          </button>
        </div>
      )}

      {order.status === 'CONFIRMED' && (
        <button
          disabled={actionPending}
          onClick={() => {
            setConfirmModal({
              title: 'Start Picking',
              message: 'Start picking this order? You\'ll be able to record fulfilled quantities.',
              confirmLabel: 'Start Picking',
              variant: 'primary',
              onConfirm: async () => { await patchStatus('PICKING'); },
            });
          }}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-40"
        >
          Start Picking
        </button>
      )}

      {order.status === 'PICKING' && (
        <div className="space-y-2">
          {!allItemsHandled && (
            <p className="text-xs text-amber-600 text-center">
              Save all item quantities before marking ready
            </p>
          )}
          <button
            disabled={actionPending}
            onClick={() => {
              setConfirmModal({
                title: 'Mark Ready for Driver',
                message: 'Mark this order as ready for driver pickup? All items should be packed.',
                confirmLabel: 'Mark Ready',
                variant: 'primary',
                onConfirm: async () => { await patchStatus('READY_FOR_DELIVERY'); },
              });
            }}
            className="w-full py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-40"
          >
            Mark Ready for Driver
          </button>
        </div>
      )}

      {/* Status Timeline */}
      <StatusTimeline history={order.statusHistory} />

      {/* Modals */}
      {confirmModal && (
        <ActionConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          confirmVariant={confirmModal.variant}
          onConfirm={() => { void confirmModal.onConfirm(); }}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {reasonModal && (
        <ReasonModal
          title={reasonModal.title}
          confirmLabel="Reject"
          onConfirm={(reason) => { void reasonModal.onConfirm(reason); }}
          onCancel={() => setReasonModal(null)}
        />
      )}
    </div>
  );
}
