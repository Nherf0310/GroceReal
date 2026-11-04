'use client';

/**
 * CustomerShopView — cart/address/checkout logic.
 * Product catalog, delivery slots, and store data are loaded live via apiFetch/API without hardcoded sample data.
 * Will be fully wired into /customer in Phase 5.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/auth-context';
import { apiFetch } from '../../lib/api';

enum UnitType {
  EACH = 'EACH',
  WEIGHT = 'WEIGHT',
}

enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PICKING = 'PICKING',
  READY_FOR_DELIVERY = 'READY_FOR_DELIVERY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

enum SubstitutionPreference {
  ALLOW_SUBSTITUTES = 'ALLOW_SUBSTITUTES',
  REFUND_ITEM = 'REFUND_ITEM',
  CONTACT_ME = 'CONTACT_ME',
}

interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  unitType: UnitType;
  unitLabel: string;
  stock: number;
  lowThreshold: number;
  imageUrl?: string | null;
}

interface ApiProduct {
  id: string;
  name: string;
  category?: { name?: string } | null;
  price: number;
  unitType?: UnitType | string;
  unitLabel?: string;
  inventory?: { quantityInStock?: number; lowStockThreshold?: number } | null;
  imageUrl?: string | null;
}

interface DeliverySlot {
  id: string;
  storeId?: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
}

interface AddressItem {
  id: string;
  userId?: string;
  label: string;
  street: string;
  city: string;
  postalCode: string;
  isDefault?: boolean;
}

interface PlacedOrder {
  id: string;
  status: OrderStatus;
  itemSubtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  deliverySlot?: { date: string; startTime: string; endTime: string };
  address?: { street: string; city: string; label: string };
  items: Array<{
    id: string;
    productName: string;
    unitPrice: number;
    unitType: UnitType;
    unitLabel: string;
    quantityOrdered: number;
    lineTotal: number;
  }>;
}

interface ApiStore {
  id: string;
  name: string;
  address?: string | null;
  deliveryFee?: number | null;
  minOrderAmount?: number | null;
}

export default function CustomerShopView() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [products, setProducts] = useState<ProductItem[]>([]);

  const [cart, setCart] = useState<{ [productId: string]: number }>({});
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  const [storeId, setStoreId] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('');
  const [storeAddress, setStoreAddress] = useState<string>('');
  const [storeDeliveryFee, setStoreDeliveryFee] = useState<number>(0);
  const [storeMinOrder, setStoreMinOrder] = useState<number>(0);

  const [deliverySlots, setDeliverySlots] = useState<DeliverySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');

  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isAddingAddress, setIsAddingAddress] = useState<boolean>(false);
  const [newAddressLabel, setNewAddressLabel] = useState<string>('Home');
  const [newAddressStreet, setNewAddressStreet] = useState<string>('');
  const [newAddressCity, setNewAddressCity] = useState<string>('');
  const [newAddressPostalCode, setNewAddressPostalCode] = useState<string>('');
  const [isSavingAddress, setIsSavingAddress] = useState<boolean>(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [subPreference, setSubPreference] = useState<SubstitutionPreference>(SubstitutionPreference.ALLOW_SUBSTITUTES);
  const [customerNotes, setCustomerNotes] = useState<string>('');

  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(OrderStatus.PICKING);

  const [categoryList, setCategoryList] = useState<string[]>(['All']);

  const loadDeliverySlots = useCallback(async (targetStoreId: string) => {
    try {
      const slots = await apiFetch<DeliverySlot[]>(`/stores/${targetStoreId}/delivery-slots`);
      if (Array.isArray(slots) && slots.length > 0) {
        setDeliverySlots(slots);
        const firstAvailable = slots.find((s) => s.bookedCount < s.capacity);
        setSelectedSlot(firstAvailable ? firstAvailable.id : slots[0].id);
      } else {
        setDeliverySlots([]);
        setSelectedSlot('');
      }
    } catch (err) {
      console.warn('Could not fetch delivery slots from API:', err);
      setDeliverySlots([]);
      setSelectedSlot('');
    }
  }, []);

  const loadAddresses = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setSelectedAddressId('');
      return;
    }
    try {
      const list = await apiFetch<AddressItem[]>('/addresses');
      if (Array.isArray(list) && list.length > 0) {
        setAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        setSelectedAddressId(def.id);
      } else {
        setAddresses([]);
        setSelectedAddressId('');
      }
    } catch (err) {
      console.warn('Could not fetch user addresses:', err);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (active) await loadAddresses();
    })();
    return () => {
      active = false;
    };
  }, [loadAddresses]);

  useEffect(() => {
    let active = true;

    async function loadStoreAndCatalog() {
      try {
        const stores = await apiFetch<ApiStore[]>('/stores');
        if (!active || !Array.isArray(stores) || stores.length === 0) return;

        const store = stores[0];
        setStoreId(store.id);
        if (store.name) setStoreName(store.name);
        if (store.address) setStoreAddress(store.address);
        if (typeof store.deliveryFee === 'number') setStoreDeliveryFee(store.deliveryFee);
        if (typeof store.minOrderAmount === 'number') setStoreMinOrder(store.minOrderAmount);

        void loadDeliverySlots(store.id);

        const cats = await apiFetch<Array<{ name: string }>>(`/stores/${store.id}/categories`);
        if (active && Array.isArray(cats) && cats.length > 0) {
          setCategoryList(['All', ...cats.map((c) => c.name)]);
        }

        const prods = await apiFetch<ApiProduct[]>(`/stores/${store.id}/products`);
        if (active && Array.isArray(prods) && prods.length > 0) {
          setProducts(
            prods.map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category?.name || 'Produce',
              price: p.price,
              unitType: p.unitType === UnitType.WEIGHT ? UnitType.WEIGHT : UnitType.EACH,
              unitLabel: p.unitLabel || 'each',
              stock: p.inventory?.quantityInStock ?? 0,
              lowThreshold: p.inventory?.lowStockThreshold ?? 0,
              imageUrl: p.imageUrl || null,
            }))
          );
        }
      } catch (err) {
        console.warn('Could not load store data from API:', err);
      }
    }

    void loadStoreAndCatalog();

    return () => {
      active = false;
    };
  }, [loadDeliverySlots]);

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const cartSubtotal = Object.entries(cart).reduce((total, [productId, qty]) => {
    const product = products.find((p) => p.id === productId);
    if (!product || qty <= 0) return total;
    if (product.unitType === UnitType.WEIGHT) return total + Math.round((product.price * qty) / 1000);
    return total + product.price * qty;
  }, 0);

  const canCheckout = cartSubtotal >= storeMinOrder && cartSubtotal > 0;
  const orderTotal = cartSubtotal > 0 ? cartSubtotal + storeDeliveryFee : 0;

  const adjustCart = (productId: string, delta: number, isWeight: boolean) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const step = isWeight ? 250 : 1;
      const next = Math.max(0, current + delta * step);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const formatSlotDisplay = (s: DeliverySlot): string => {
    try {
      const d = new Date(s.date);
      const dateFormatted = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return `${dateFormatted}: ${s.startTime} - ${s.endTime}`;
    } catch {
      return `${s.startTime} - ${s.endTime}`;
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressStreet.trim() || !newAddressCity.trim() || !newAddressPostalCode.trim()) {
      setAddressError('Please fill in street, city, and postal code.');
      return;
    }
    setIsSavingAddress(true);
    setAddressError(null);
    try {
      const created = await apiFetch<AddressItem>('/addresses', {
        method: 'POST',
        body: JSON.stringify({
          label: newAddressLabel.trim() || 'Home',
          street: newAddressStreet.trim(),
          city: newAddressCity.trim(),
          postalCode: newAddressPostalCode.trim(),
          isDefault: addresses.length === 0,
        }),
      });
      setAddresses((prev) => [created, ...prev]);
      setSelectedAddressId(created.id);
      setIsAddingAddress(false);
      setNewAddressStreet('');
      setNewAddressCity('');
      setNewAddressPostalCode('');
    } catch (err: unknown) {
      setAddressError((err as Error).message || 'Failed to save address.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      setOrderError('You must be logged in as a Customer to place an order.');
      return;
    }
    if (!selectedAddressId) {
      setOrderError('Please select or add a delivery address before placing your order.');
      return;
    }
    if (!selectedSlot) {
      setOrderError('Please select a delivery slot.');
      return;
    }
    const slot = deliverySlots.find((s) => s.id === selectedSlot);
    if (slot && slot.bookedCount >= slot.capacity) {
      setOrderError('The selected delivery slot is fully booked.');
      return;
    }
    const items = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }));
    if (items.length === 0) {
      setOrderError('Your basket is empty.');
      return;
    }
    if (cartSubtotal < storeMinOrder) {
      setOrderError(`Order subtotal $${(cartSubtotal / 100).toFixed(2)} does not meet the store minimum of $${(storeMinOrder / 100).toFixed(2)}.`);
      return;
    }
    setIsSubmittingOrder(true);
    setOrderError(null);
    try {
      const order = await apiFetch<PlacedOrder>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          storeId: storeId || undefined,
          addressId: selectedAddressId,
          deliverySlotId: selectedSlot,
          substitutionPreference: subPreference,
          customerNotes: customerNotes.trim() || undefined,
          items,
        }),
      });
      setPlacedOrder(order);
      setOrderStatus(order.status || OrderStatus.PENDING);
      setCart({});
      if (storeId) void loadDeliverySlots(storeId);
    } catch (err: unknown) {
      setOrderError((err as Error).message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const nextSlotLabel = deliverySlots.length > 0 ? formatSlotDisplay(deliverySlots[0]) : null;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Store Banner */}
      {storeName && (
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{storeName}</h1>
            {storeAddress && <p className="text-sm text-emerald-100/80 mt-1 max-w-xl">{storeAddress}</p>}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-emerald-200 font-medium">
              <span>Delivery: ${(storeDeliveryFee / 100).toFixed(2)} (Min: ${(storeMinOrder / 100).toFixed(2)})</span>
              {nextSlotLabel && <span>• Next Slot: {nextSlotLabel}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-2 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15">
            <span className="text-xs font-medium text-emerald-200">Current Order Journey</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-sm font-bold text-white uppercase tracking-wide">{orderStatus.replace(/_/g, ' ')}</span>
            </div>
            {placedOrder && <span className="text-[11px] font-mono text-emerald-300">ID: #{placedOrder.id.slice(0, 8).toUpperCase()}</span>}
            <button onClick={() => setIsCartOpen(true)} className="mt-1 px-3 py-1.5 rounded-lg bg-white text-emerald-900 text-xs font-bold hover:bg-emerald-50 transition">
              {placedOrder ? 'View Order Details →' : 'View Basket & Checkout →'}
            </button>
          </div>
        </div>
      )}

      {/* Category + Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {categoryList.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
        </div>
      </div>

      {/* Mobile Cart Button */}
      <div className="md:hidden fixed bottom-4 right-4 z-20">
        <button
          onClick={() => setIsCartOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 text-white font-semibold text-sm shadow-xl shadow-emerald-600/30"
        >
          🛒 <span>{Object.keys(cart).length} items</span>
          <span className="font-bold">${(cartSubtotal / 100).toFixed(2)}</span>
        </button>
      </div>

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">
          <p className="text-4xl mb-3">🛒</p>
          <p className="font-medium">No products available.</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">No products match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProducts.map((product) => {
            const inCartQty = cart[product.id] || 0;
            const isWeight = product.unitType === UnitType.WEIGHT;
            const isLowStock = product.stock <= product.lowThreshold;
            return (
              <div key={product.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
                <div className="relative h-44 bg-slate-100 flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl text-slate-300">🥬</span>
                  )}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm ${
                        isWeight ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-blue-100 text-blue-900 border border-blue-200'
                      }`}
                    >
                      {isWeight ? 'By Weight' : 'Per Unit'}
                    </span>
                    {isLowStock && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">Low Stock</span>}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{product.category}</span>
                    <h3 className="font-bold text-slate-900 text-sm mt-0.5 line-clamp-1">{product.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{isWeight ? `${(product.stock / 1000).toFixed(1)} kg available` : `${product.stock} units available`}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-base font-extrabold text-slate-900">
                        ${(product.price / 100).toFixed(2)}
                        <span className="text-xs font-normal text-slate-500">/{product.unitLabel}</span>
                      </div>
                      {isWeight && inCartQty > 0 && <div className="text-[11px] text-emerald-600 font-semibold">Est: ${((product.price * inCartQty) / 100000).toFixed(2)}</div>}
                    </div>
                    {inCartQty === 0 ? (
                      <button
                        onClick={() => adjustCart(product.id, 1, isWeight)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white font-bold text-xs border border-emerald-200 hover:border-transparent transition-all"
                      >
                        + Add {isWeight ? '(250g)' : ''}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                          onClick={() => adjustCart(product.id, -1, isWeight)}
                          className="w-6 h-6 rounded bg-white text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center text-xs shadow-xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold px-1 text-slate-800">{isWeight ? (inCartQty >= 1000 ? `${(inCartQty / 1000).toFixed(2)}kg` : `${inCartQty}g`) : inCartQty}</span>
                        <button
                          onClick={() => adjustCart(product.id, 1, isWeight)}
                          className="w-6 h-6 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700 flex items-center justify-center text-xs shadow-xs"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="font-black text-slate-900 text-lg">{placedOrder ? 'Order Confirmation' : 'Your Grocery Basket'}</h3>
                {storeName && <span className="text-xs text-slate-500">{storeName}</span>}
              </div>
              <button onClick={() => setIsCartOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 flex items-center justify-center text-sm transition">
                ✕
              </button>
            </div>

            {placedOrder ? (
              <div className="p-5 flex-1 space-y-4 overflow-y-auto">
                <div className="text-center py-4 bg-emerald-50 rounded-2xl border border-emerald-200 p-4">
                  <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center text-2xl mx-auto shadow-md">✓</div>
                  <h3 className="text-lg font-black text-slate-900 mt-2">Order Created!</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Your order was successfully stored in the database.</p>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-emerald-300 text-xs font-mono font-bold text-emerald-800">
                    ID: #{placedOrder.id.slice(0, 8).toUpperCase()}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order Status</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">{placedOrder.status}</span>
                  </div>
                  <p className="text-xs text-slate-600">Your order is queued in store picking. You will pay cash upon arrival.</p>
                </div>
                {placedOrder.address && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Fulfillment Summary</span>
                    <div>
                      <span className="text-slate-500 font-medium">Deliver to: </span>
                      <strong className="text-slate-900">
                        {placedOrder.address.label} ({placedOrder.address.street}, {placedOrder.address.city})
                      </strong>
                    </div>
                    {placedOrder.deliverySlot && (
                      <div>
                        <span className="text-slate-500 font-medium">Slot: </span>
                        <strong className="text-slate-900">
                          {new Date(placedOrder.deliverySlot.date).toLocaleDateString()} {placedOrder.deliverySlot.startTime} - {placedOrder.deliverySlot.endTime}
                        </strong>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500 font-medium">Payment: </span>
                      <strong className="text-slate-900">Cash on Delivery</strong>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Line Items ({placedOrder.items?.length || 0})</span>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                    {placedOrder.items?.map((item) => (
                      <div key={item.id} className="pt-2 first:pt-0 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{item.productName}</div>
                          <div className="text-[11px] text-slate-500">
                            {item.unitType === UnitType.WEIGHT ? `${item.quantityOrdered}g @ $${(item.unitPrice / 100).toFixed(2)}/kg` : `${item.quantityOrdered} x $${(item.unitPrice / 100).toFixed(2)}`}
                          </div>
                        </div>
                        <div className="font-bold text-slate-900">${(item.lineTotal / 100).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Items Subtotal:</span>
                    <span className="font-semibold">${(placedOrder.itemSubtotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Fee:</span>
                    <span className="font-semibold">${(placedOrder.deliveryFee / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1 border-t border-slate-200">
                    <span>Total (COD):</span>
                    <span>${(placedOrder.total / 100).toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPlacedOrder(null);
                    setIsCartOpen(false);
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition"
                >
                  Start New Shopping Cart
                </button>
              </div>
            ) : (
              <div className="p-5 flex-1 space-y-5 overflow-y-auto">
                {/* Cart Items */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Basket Items ({Object.keys(cart).length})</span>
                  {Object.keys(cart).length === 0 ? (
                    <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                      <p className="text-2xl mb-1">🛒</p>
                      Your grocery basket is empty.
                      <p className="text-[11px] text-slate-400 mt-1">Browse items above to add products.</p>
                    </div>
                  ) : (
                    Object.entries(cart).map(([pId, qty]) => {
                      const product = products.find((p) => p.id === pId);
                      if (!product) return null;
                      const isWeight = product.unitType === UnitType.WEIGHT;
                      const lineTotal = isWeight ? Math.round((product.price * qty) / 1000) : product.price * qty;
                      return (
                        <div key={pId} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white">
                          <div className="flex-1 pr-2">
                            <h4 className="font-bold text-xs text-slate-900">{product.name}</h4>
                            <span className="text-[11px] text-slate-500">
                              {isWeight ? `${qty}g @ $${(product.price / 100).toFixed(2)}/kg` : `${qty} x $${(product.price / 100).toFixed(2)}`}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-xs text-slate-900">${(lineTotal / 100).toFixed(2)}</div>
                            <button onClick={() => adjustCart(pId, -Math.ceil(qty / (isWeight ? 250 : 1)), isWeight)} className="text-[10px] text-rose-600 font-semibold hover:underline">
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Delivery Slot */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Choose Delivery Slot</span>
                  {deliverySlots.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No delivery slots available.</p>
                  ) : (
                    <select
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                      className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {deliverySlots.map((s) => {
                        const spotsLeft = s.capacity - s.bookedCount;
                        const isFull = spotsLeft <= 0;
                        return (
                          <option key={s.id} value={s.id} disabled={isFull}>
                            {formatSlotDisplay(s)} {isFull ? '(Fully Booked)' : `(${spotsLeft} spots left)`}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery Address</span>
                    {user && !isAddingAddress && (
                      <button type="button" onClick={() => setIsAddingAddress(true)} className="text-[11px] font-semibold text-emerald-600 hover:underline">
                        + Add New
                      </button>
                    )}
                  </div>
                  {!user ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                      <p className="font-semibold">Sign in required</p>
                      <Link href="/login" className="inline-block px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition">
                        Sign In Now →
                      </Link>
                    </div>
                  ) : isAddingAddress || addresses.length === 0 ? (
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">New Delivery Address</span>
                        {addresses.length > 0 && (
                          <button type="button" onClick={() => setIsAddingAddress(false)} className="text-[11px] text-slate-500 hover:text-slate-800 font-medium">
                            Cancel
                          </button>
                        )}
                      </div>
                      {addressError && <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">{addressError}</div>}
                      <div>
                        <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Label</label>
                        <input type="text" placeholder="Home, Office" value={newAddressLabel} onChange={(e) => setNewAddressLabel(e.target.value)} className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white" />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Street</label>
                        <input type="text" placeholder="Street Address" value={newAddressStreet} onChange={(e) => setNewAddressStreet(e.target.value)} className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-medium text-slate-600 block mb-0.5">City</label>
                          <input type="text" placeholder="City" value={newAddressCity} onChange={(e) => setNewAddressCity(e.target.value)} className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white" />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Postal Code</label>
                          <input type="text" placeholder="Postal Code" value={newAddressPostalCode} onChange={(e) => setNewAddressPostalCode(e.target.value)} className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white" />
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isSavingAddress}
                        onClick={handleCreateAddress}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition disabled:opacity-50"
                      >
                        {isSavingAddress ? 'Saving...' : 'Save & Select Address'}
                      </button>
                    </div>
                  ) : (
                    <select
                      value={selectedAddressId}
                      onChange={(e) => setSelectedAddressId(e.target.value)}
                      className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}: {a.street}, {a.city} {a.isDefault ? '(Default)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Substitution */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Out-of-Stock Preference</span>
                  <select
                    value={subPreference}
                    onChange={(e) => setSubPreference(e.target.value as SubstitutionPreference)}
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={SubstitutionPreference.ALLOW_SUBSTITUTES}>Allow Store Pickers to Substitute</option>
                    <option value={SubstitutionPreference.REFUND_ITEM}>Do Not Substitute (Refund Item)</option>
                    <option value={SubstitutionPreference.CONTACT_ME}>Call / Contact Me First</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery Instructions (Optional)</span>
                  <textarea
                    rows={2}
                    placeholder="Gate buzzer code, leave by front doorstep, etc."
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Checkout Footer */}
            {!placedOrder && (
              <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3 shrink-0">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Items Subtotal:</span>
                    <span className="font-semibold">${(cartSubtotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Fee:</span>
                    <span className="font-semibold">${(storeDeliveryFee / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1 border-t border-slate-200">
                    <span>Total (Cash on Delivery):</span>
                    <span>${(orderTotal / 100).toFixed(2)}</span>
                  </div>
                </div>
                {!canCheckout && Object.keys(cart).length > 0 && storeMinOrder > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
                    Minimum order is ${(storeMinOrder / 100).toFixed(2)}. Add ${((storeMinOrder - cartSubtotal) / 100).toFixed(2)} more.
                  </div>
                )}
                {orderError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium flex items-start justify-between gap-2">
                    <div>
                      <strong className="block">Order Error</strong>
                      {orderError}
                    </div>
                    <button onClick={() => setOrderError(null)} className="text-rose-500 hover:text-rose-800 font-bold">
                      ✕
                    </button>
                  </div>
                )}
                {!user ? (
                  <Link href="/login" className="block text-center w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition bg-emerald-600 hover:bg-emerald-700 text-white">
                    Sign In as Customer to Place Order
                  </Link>
                ) : (
                  <button
                    disabled={!canCheckout || isSubmittingOrder || Object.keys(cart).length === 0 || !selectedAddressId || !selectedSlot}
                    onClick={handlePlaceOrder}
                    className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 ${
                      canCheckout && !isSubmittingOrder && Object.keys(cart).length > 0 && selectedAddressId && selectedSlot
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isSubmittingOrder && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    <span>{isSubmittingOrder ? 'Placing Order...' : `Place Order (COD) — $${(orderTotal / 100).toFixed(2)}`}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
