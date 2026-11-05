// Local TypeScript types for store API responses

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

export interface StoreOverview {
  orderCountsByStatus: Record<string, number>;
  todayOrdersCount: number;
  todayRevenue: number; // cents
  lowStockCount: number;
  openSlotsToday: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

export interface Address {
  id: string;
  label?: string | null;
  street: string;
  city: string;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

export interface DeliverySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
}

export interface Product {
  id: string;
  name: string;
  unitType: 'EACH' | 'WEIGHT';
  unitLabel: string;
  imageUrl?: string | null;
  price: number;
  sku?: string | null;
}

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  quantityOrdered: number;
  quantityFulfilled: number;
  unitType: 'EACH' | 'WEIGHT';
  unitPrice: number; // cents
  lineTotal: number; // cents
  substitutedProductId?: string | null;
  substitutedProduct?: { id: string; name: string } | null;
  substituteQuantity?: number | null;
  substituteUnitPrice?: number | null;
  notes?: string | null;
}

export interface StatusHistoryEntry {
  id: string;
  status: OrderStatus;
  createdAt: string;
  notes?: string | null;
  changedByUser?: { id: string; name: string; role: string } | null;
}

export interface Driver {
  id: string;
  name: string;
  phone?: string | null;
}

export interface Delivery {
  id: string;
  orderId: string;
  driverId?: string | null;
  driver?: Driver | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  failureReason?: string | null;
}

export interface StoreOrder {
  id: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  total: number; // cents
  itemSubtotal: number; // cents
  deliveryFee: number; // cents
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  customerNotes?: string | null;
  notes?: string | null;
  substitutionPreference?: string | null;
  rejectionReason?: string | null;
  customer?: Customer;
  address?: Address;
  deliverySlot?: DeliverySlot;
  items?: OrderItem[];
  statusHistory?: StatusHistoryEntry[];
  delivery?: Delivery | null;
}

// Overview order shape (list endpoint returns same as detail but statusHistory only takes: 3)
export type StoreOrderListItem = StoreOrder;

export interface LowStockProduct {
  id: string;
  name: string;
  unitType: 'EACH' | 'WEIGHT';
  unitLabel: string;
  imageUrl?: string | null;
  category?: { id: string; name: string } | null;
  inventory: {
    quantityInStock: number;
    lowStockThreshold: number;
  } | null;
}

export interface Category {
  id: string;
  storeId?: string;
  name: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    products: number;
  };
}

export interface StoreProduct {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  sku?: string | null;
  imageUrl?: string | null;
  price: number; // in cents
  unitType: 'EACH' | 'WEIGHT';
  unitLabel: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    sortOrder?: number;
  };
  inventory: {
    id?: string;
    quantityInStock: number;
    lowStockThreshold: number;
  } | null;
}

export interface StoreProfile {
  id: string;
  managerId: string;
  name: string;
  slug?: string;
  description?: string | null;
  address: string;
  phone: string;
  imageUrl?: string | null;
  isOpen: boolean;
  isApproved: boolean;
  minOrderAmount: number; // cents
  deliveryFee: number; // cents
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
    orders: number;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  categoryId: string;
  name: string;
  description?: string;
  brand?: string;
  sku?: string;
  imageUrl?: string;
  price: number; // in cents
  unitType: 'EACH' | 'WEIGHT';
  unitLabel: string;
  initialStock?: number;
  lowStockThreshold?: number;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  brand?: string;
  price?: number; // in cents
  isAvailable?: boolean;
  imageUrl?: string;
}

export interface AdjustInventoryInput {
  quantityInStock: number;
  lowStockThreshold?: number;
}

export interface CreateDeliverySlotInput {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  capacity?: number;
}

export interface UpdateStoreInput {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  imageUrl?: string;
  isOpen?: boolean;
  minOrderAmount?: number; // in cents
  deliveryFee?: number; // in cents
}

export interface UpdateUserInput {
  name?: string;
  phone?: string;
}

