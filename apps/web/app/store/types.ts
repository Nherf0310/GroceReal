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
  line1: string;
  line2?: string | null;
  city: string;
  province?: string | null;
  postalCode?: string | null;
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
  notes?: string | null;
  substitutionPreference?: string | null;
  rejectionReason?: string | null;
  customer: Customer;
  address: Address;
  deliverySlot: DeliverySlot;
  items: OrderItem[];
  statusHistory: StatusHistoryEntry[];
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
  inventory: {
    quantityInStock: number;
    lowStockThreshold: number;
  } | null;
}
