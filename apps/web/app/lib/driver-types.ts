export interface DeliveryOrderItemProduct {
  id: string;
  name: string;
  unitType: string;
  unitLabel?: string | null;
  imageUrl?: string | null;
}

export interface DeliveryOrderItem {
  id: string;
  quantity: number;
  pickedQuantity?: number | null;
  pickedWeightGrams?: number | null;
  unitPrice: number;
  totalPrice: number;
  notes?: string | null;
  product: DeliveryOrderItemProduct;
  substitutedProduct?: { id: string; name: string } | null;
}

export interface DeliveryStore {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  imageUrl?: string | null;
}

export interface DeliveryAddress {
  id: string;
  label?: string | null;
  street: string;
  city: string;
  notes?: string | null;
}

export interface DeliverySlot {
  id: string;
  startTime: string;
  endTime: string;
}

export interface DeliveryCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string;
}

export interface StatusHistoryEntry {
  id: string;
  status: string;
  notes?: string | null;
  createdAt: string;
}

export interface AvailableDelivery {
  id: string;
  orderId: string;
  driverId: string | null;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  failureReason: string | null;
  failureNote: string | null;
  createdAt: string;
  storeName: string;
  storeAddress: string;
  dropOffAddress: string;
  itemCount: number;
  total: number;
  order: {
    id: string;
    status: string;
    total: number;
    deliverySlot?: DeliverySlot | null;
    store: DeliveryStore;
    address?: DeliveryAddress | null;
    items: DeliveryOrderItem[];
  };
}

export interface ActiveDelivery {
  id: string;
  orderId: string;
  driverId: string;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  failureReason: string | null;
  failureNote: string | null;
  createdAt: string;
  order: {
    id: string;
    status: string;
    total: number;
    paymentMethod: string;
    paymentStatus: string;
    customer: DeliveryCustomer;
    store: DeliveryStore;
    address?: DeliveryAddress | null;
    deliverySlot?: DeliverySlot | null;
    items: DeliveryOrderItem[];
    statusHistory: StatusHistoryEntry[];
  };
}

export interface HistoryDelivery {
  id: string;
  orderId: string;
  driverId: string;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  failureReason: string | null;
  failureNote: string | null;
  createdAt: string;
  order: {
    id: string;
    status: string;
    total: number;
    customer: { id: string; name: string };
    store: { id: string; name: string };
    address?: DeliveryAddress | null;
    statusHistory: StatusHistoryEntry[];
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
  updatedAt?: string;
}

