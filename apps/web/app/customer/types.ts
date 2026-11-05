export type UnitType = 'EACH' | 'WEIGHT';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PICKING'
  | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'DELIVERY_FAILED';

export type SubstitutionPreference =
  | 'ALLOW_SUBSTITUTES'
  | 'REFUND_ITEM'
  | 'CONTACT_ME';

export type PaymentMethod = 'CASH_ON_DELIVERY';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export type DeliveryFailureReason =
  | 'CUSTOMER_UNAVAILABLE'
  | 'WRONG_ADDRESS'
  | 'REJECTED_BY_CUSTOMER'
  | 'OTHER';

export interface Inventory {
  id: string;
  productId: string;
  quantityInStock: number;
  lowStockThreshold: number;
  reorderThreshold: number;
}

export interface Category {
  id: string;
  storeId?: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  sku?: string | null;
  barcode?: string | null;
  imageUrl?: string | null;
  price: number; // in cents (per unit or per 1000g for WEIGHT)
  unitType: UnitType;
  unitLabel: string;
  isAvailable: boolean;
  category?: Category | { id: string; name: string } | null;
  inventory?: Inventory | null;
  store?: {
    id: string;
    name: string;
    deliveryFee: number;
    minOrderAmount: number;
    phone?: string | null;
    address?: string | null;
  } | null;
}

export interface DeliverySlot {
  id: string;
  storeId: string;
  date: string;
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "11:00"
  capacity: number;
  bookedCount: number;
}

export interface Store {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  imageUrl?: string | null;
  isOpen: boolean;
  minOrderAmount: number; // cents
  deliveryFee: number; // cents
  nextSlot?: DeliverySlot | null;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  street: string;
  city: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  changedByUserId: string;
  notes?: string | null;
  createdAt: string;
  changedByUser?: {
    id: string;
    name: string;
    role: string;
  } | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  unitPrice: number; // cents
  unitType: UnitType;
  unitLabel: string;
  quantityOrdered: number; // count for EACH, grams for WEIGHT
  quantityFulfilled: number;
  substitutedProductId?: string | null;
  substituteQuantity?: number | null;
  substituteUnitPrice?: number | null;
  lineTotal: number; // cents
  product?: Product | null;
  substitutedProduct?: Product | null;
}

export interface Delivery {
  id: string;
  orderId: string;
  driverId?: string | null;
  acceptedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  failureReason?: DeliveryFailureReason | null;
  failureNote?: string | null;
  driver?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
}

export interface Order {
  id: string;
  customerId: string;
  storeId: string;
  addressId: string;
  deliverySlotId: string;
  status: OrderStatus;
  rejectionReason?: string | null;
  substitutionPreference: SubstitutionPreference;
  customerNotes?: string | null;
  itemSubtotal: number; // cents
  deliveryFee: number; // cents
  total: number; // cents
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  store: {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
    imageUrl?: string | null;
  };
  address: Address;
  deliverySlot: DeliverySlot;
  delivery?: Delivery | null;
  statusHistory: OrderStatusHistory[];
}

export interface BasketStore {
  id: string;
  name: string;
  deliveryFee: number;
  minOrderAmount: number;
  address?: string | null;
}

export interface BasketItem {
  product: Product;
  quantity: number; // count for EACH, grams for WEIGHT
}
