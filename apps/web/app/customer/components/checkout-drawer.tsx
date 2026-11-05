'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  ShoppingBag,
  Trash2,
  MapPin,
  Clock,
  AlertCircle,
  Plus,
  Loader2,
  Banknote,
  ShieldAlert,
} from 'lucide-react';
import { useBasket } from '../basket-context';
import { useCurrency } from '../../context/currency-context';
import { formatMoney } from '../../lib/currency';
import {
  formatUnitPrice,
  formatEstimatedPrice,
} from '../lib/price-helper';
import { formatSlotDisplay, isSlotAvailable } from '../lib/format-slot';
import {
  Address,
  DeliverySlot,
  Store,
  BasketStore,
  SubstitutionPreference,
  Order,
} from '../types';
import { apiFetch, ApiError } from '../../lib/api';
import QuantityStepper from './quantity-stepper';

interface CheckoutDrawerProps {
  store: Store | BasketStore;
  isOpen: boolean;
  onClose: () => void;
}

export default function CheckoutDrawer({
  store,
  isOpen,
  onClose,
}: CheckoutDrawerProps) {
  const router = useRouter();
  const { currency } = useCurrency();
  const {
    items,
    itemCount,
    subtotalCents,
    hasWeightItems,
    updateQuantity,
    removeItem,
    clearBasket,
  } = useBasket();

  // Address state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newLabel, setNewLabel] = useState('Home');
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newPostalCode, setNewPostalCode] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Delivery Slots state
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Substitution Preference
  const [subPreference, setSubPreference] = useState<SubstitutionPreference>(
    'ALLOW_SUBSTITUTES'
  );

  // Customer Notes
  const [customerNotes, setCustomerNotes] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Fetch addresses
  const loadAddresses = useCallback(async () => {
    try {
      setLoadingAddresses(true);
      const list = await apiFetch<Address[]>('/addresses');
      setAddresses(list);
      if (list.length > 0) {
        const def = list.find((a) => a.isDefault) || list[0];
        setSelectedAddressId(def.id);
      }
    } catch (err) {
      console.warn('Failed to fetch addresses:', err);
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  // Fetch delivery slots
  const loadSlots = useCallback(async () => {
    if (!store?.id) return;
    try {
      setLoadingSlots(true);
      const slotList = await apiFetch<DeliverySlot[]>(
        `/stores/${store.id}/delivery-slots`
      );
      setSlots(slotList);
      if (Array.isArray(slotList) && slotList.length > 0) {
        const firstAvailable = slotList.find((s) => isSlotAvailable(s));
        setSelectedSlotId(firstAvailable ? firstAvailable.id : slotList[0].id);
      }
    } catch (err) {
      console.warn('Failed to fetch delivery slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  }, [store]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setServerError(null);
      await Promise.all([loadAddresses(), loadSlots()]);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, loadAddresses, loadSlots]);

  if (!isOpen) return null;

  const isBelowMin = subtotalCents < (store.minOrderAmount || 0);
  const minDiffCents = Math.max(0, (store.minOrderAmount || 0) - subtotalCents);
  const deliveryFee = store.deliveryFee || 0;
  const totalCents = subtotalCents + deliveryFee;

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreet.trim() || !newCity.trim() || !newPostalCode.trim()) {
      setAddressError('Please fill in street, city, and postal code.');
      return;
    }
    try {
      setSavingAddress(true);
      setAddressError(null);
      const created = await apiFetch<Address>('/addresses', {
        method: 'POST',
        body: JSON.stringify({
          label: newLabel.trim() || 'Home',
          street: newStreet.trim(),
          city: newCity.trim(),
          postalCode: newPostalCode.trim(),
          isDefault: addresses.length === 0,
        }),
      });
      setAddresses((prev) => [created, ...prev]);
      setSelectedAddressId(created.id);
      setIsAddingAddress(false);
      setNewStreet('');
      setNewCity('');
      setNewPostalCode('');
    } catch (err: unknown) {
      setAddressError((err as Error).message || 'Failed to save address.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (itemCount === 0) {
      setServerError('Your basket is empty.');
      return;
    }
    if (isBelowMin) {
      setServerError(
        `Order subtotal does not meet the store minimum of ${formatMoney(store.minOrderAmount, currency)}.`
      );
      return;
    }
    if (!selectedAddressId) {
      setServerError('Please select or add a delivery address.');
      return;
    }
    if (!selectedSlotId) {
      setServerError('Please select an open delivery slot.');
      return;
    }

    const chosenSlot = slots.find((s) => s.id === selectedSlotId);
    if (chosenSlot && chosenSlot.bookedCount >= chosenSlot.capacity) {
      setServerError('The selected delivery slot is full. Please choose another.');
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const orderPayload = {
        storeId: store.id,
        addressId: selectedAddressId,
        deliverySlotId: selectedSlotId,
        substitutionPreference: subPreference,
        customerNotes: customerNotes.trim() || undefined,
        items: Object.values(items).map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      };

      const createdOrder = await apiFetch<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });

      clearBasket();
      onClose();
      router.push(`/customer/orders/${createdOrder.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError((err as Error).message || 'Failed to place order.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Checkout & Basket
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {store.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800">
          {/* Server Error Alert Banner */}
          {serverError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-900">
                  Unable to place order
                </h4>
                <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                  {serverError}
                </p>
              </div>
            </div>
          )}

          {/* Basket Items Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Basket Items ({itemCount})
              </h3>
              {itemCount > 0 && (
                <button
                  type="button"
                  onClick={clearBasket}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {itemCount === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4">
                <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">
                  Your basket is empty.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 bg-slate-50/70 rounded-2xl border border-slate-200/80 p-2">
                {Object.values(items).map((item) => {
                  const p = item.product;
                  const stock = p.inventory?.quantityInStock ?? 9999;
                  const itemTotalFormatted = formatEstimatedPrice(
                    p.price,
                    item.quantity,
                    p.unitType,
                    currency
                  );

                  return (
                    <div
                      key={p.id}
                      className="py-3 px-2 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ShoppingBag className="w-5 h-5 text-slate-300" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {p.name}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {formatUnitPrice(
                              p.price,
                              p.unitType,
                              p.unitLabel,
                              currency
                            )}
                          </p>
                          <p className="text-xs font-black text-emerald-700 mt-0.5">
                            {itemTotalFormatted}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <QuantityStepper
                          quantity={item.quantity}
                          unitType={p.unitType}
                          unitLabel={p.unitLabel}
                          onChange={(newQty) => updateQuantity(p.id, newQty)}
                          max={stock}
                          size="sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(p.id)}
                          aria-label="Remove item"
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Delivery Address Section */}
          <section className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Delivery Address</span>
              </h3>
              {!isAddingAddress && (
                <button
                  type="button"
                  onClick={() => setIsAddingAddress(true)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add address</span>
                </button>
              )}
            </div>

            {loadingAddresses && (
              <div className="h-16 bg-slate-50 rounded-xl animate-pulse" />
            )}

            {!loadingAddresses && !isAddingAddress && (
              <div className="space-y-2">
                {addresses.length === 0 ? (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                    <span>No delivery address saved yet.</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingAddress(true)}
                      className="font-bold underline text-amber-900"
                    >
                      Add Address Now
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <label
                          key={addr.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="deliveryAddress"
                            value={addr.id}
                            checked={isSelected}
                            onChange={() => setSelectedAddressId(addr.id)}
                            className="mt-1 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                          />
                          <div className="min-w-0 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {addr.label}
                              </span>
                              {addr.isDefault && (
                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-slate-600 mt-0.5 truncate">
                              {addr.street}, {addr.city} {addr.postalCode}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Inline Add Address Form */}
            {isAddingAddress && (
              <form
                onSubmit={handleCreateAddress}
                className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">
                    Add New Address
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingAddress(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {addressError && (
                  <p className="text-xs text-rose-600">{addressError}</p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Label
                    </label>
                    <input
                      type="text"
                      value={newLabel}
                      placeholder="e.g. Home, Office"
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={newPostalCode}
                      placeholder="e.g. 5000"
                      onChange={(e) => setNewPostalCode(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={newStreet}
                    placeholder="Street, Building, Unit"
                    onChange={(e) => setNewStreet(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    City
                  </label>
                  <input
                    type="text"
                    value={newCity}
                    placeholder="City"
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingAddress(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-50"
                  >
                    {savingAddress ? 'Saving...' : 'Save & Use'}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Delivery Slot Selection */}
          <section className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Select Delivery Slot</span>
            </h3>

            {loadingSlots && (
              <div className="h-16 bg-slate-50 rounded-xl animate-pulse" />
            )}

            {!loadingSlots && slots.length === 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                No delivery slots currently available for this store. Please
                try again later.
              </div>
            )}

            {!loadingSlots && slots.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {slots.map((s) => {
                  const isAvailable = isSlotAvailable(s);
                  const isSelected = selectedSlotId === s.id;

                  return (
                    <label
                      key={s.id}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs transition-all ${
                        !isAvailable
                          ? 'bg-slate-100/60 border-slate-200 opacity-50 cursor-not-allowed'
                          : isSelected
                            ? 'bg-emerald-50/80 border-emerald-500 shadow-xs cursor-pointer'
                            : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliverySlot"
                        value={s.id}
                        disabled={!isAvailable}
                        checked={isSelected}
                        onChange={() => setSelectedSlotId(s.id)}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 leading-snug">
                          {formatSlotDisplay(s)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {!isAvailable ? (
                            <span className="text-rose-600 font-bold">
                              Slot Full
                            </span>
                          ) : (
                            <span>
                              {s.capacity - s.bookedCount} slots remaining
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          {/* Substitution Preference Section */}
          <section className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Substitution Preference
            </h3>
            <div className="space-y-2 text-xs">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  subPreference === 'ALLOW_SUBSTITUTES'
                    ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="subPreference"
                  value="ALLOW_SUBSTITUTES"
                  checked={subPreference === 'ALLOW_SUBSTITUTES'}
                  onChange={() => setSubPreference('ALLOW_SUBSTITUTES')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Allow Substitutes
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Store picker can choose a similar product if an item is out
                    of stock.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  subPreference === 'REFUND_ITEM'
                    ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="subPreference"
                  value="REFUND_ITEM"
                  checked={subPreference === 'REFUND_ITEM'}
                  onChange={() => setSubPreference('REFUND_ITEM')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Refund Item
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Do not substitute. Remove out-of-stock items from the order.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  subPreference === 'CONTACT_ME'
                    ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="subPreference"
                  value="CONTACT_ME"
                  checked={subPreference === 'CONTACT_ME'}
                  onChange={() => setSubPreference('CONTACT_ME')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Contact Me
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Store picker will contact you to confirm any item changes.
                  </span>
                </div>
              </label>
            </div>
          </section>

          {/* Customer Delivery Notes */}
          <section className="space-y-2 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Delivery Notes (Optional)
            </h3>
            <textarea
              rows={2}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="e.g. Leave at front door, ring doorbell, gate passcode..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
          </section>

          {/* Payment Method Notice */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs">
            <Banknote className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">
                Cash on delivery (COD)
              </span>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Pay the driver in cash when your groceries arrive at your door.
                Please prepare exact change if possible.
              </p>
            </div>
          </div>
        </div>

        {/* Drawer Footer & Checkout Summary */}
        <div className="p-5 border-t border-slate-200 bg-white shrink-0 space-y-3">
          {/* Minimum Order Warning */}
          {isBelowMin && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Minimum order not met:</span> Store
                minimum is {formatMoney(store.minOrderAmount, currency)}. Add{' '}
                <span className="font-bold">
                  {formatMoney(minDiffCents, currency)}
                </span>{' '}
                more to checkout.
              </div>
            </div>
          )}

          {/* Pricing Breakdown */}
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>
                Items Subtotal {hasWeightItems && <span className="text-[10px] text-emerald-700">(Est.)</span>}
              </span>
              <span className="font-bold text-slate-800">
                {formatMoney(subtotalCents, currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="font-bold text-slate-800">
                {formatMoney(deliveryFee, currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
              <span>
                Total {hasWeightItems && <span className="text-[10px] font-normal text-emerald-700">(Est.)</span>}
              </span>
              <span className="text-emerald-700">
                {formatMoney(totalCents, currency)}
              </span>
            </div>
          </div>

          {/* Place Order CTA Button */}
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={isSubmitting || isBelowMin || itemCount === 0}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-sm tracking-wide shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Placing order...</span>
              </>
            ) : (
              <span>Place Cash on Delivery Order</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
