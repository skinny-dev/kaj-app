export interface MenuItem {
  id: string | number;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  available?: boolean;
  station?: "KITCHEN" | "BAR" | "HOOKAH";
  // Optional addons fetched with menu (admin may filter)
  productAddons?: ProductAddon[]; // catalog addons available for selection
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedAddons?: CartItemAddon[];
}

export interface OrderItem {
  menuItemId: string | number;
  name: string;
  quantity: number;
  priceAtTimeOfOrder: number;
  addons?: CartItemAddon[]; // Persisted snapshot (addonName + addonPrice would be backend side; here reuse shape)
  notes?: string; // یادداشت برای این آیتم
}

// Addon catalog item attached to a product
export interface ProductAddon {
  id: string | number;
  name: string;
  price: number; // unit price
  available?: boolean;
  maxPerItem?: number | null; // null/undefined => unlimited
}

// Selected addon inside cart/order context
export interface CartItemAddon {
  addonId: string | number; // references ProductAddon.id
  name: string; // snapshot for UI (avoid extra lookups)
  price: number; // unit price at selection time
  quantity: number; // per single product unit (multiplied by product quantity for total cost)
}

export interface OrderDetails {
  id: string;
  orderNumber?: string;
  type?: "DINE_IN" | "DELIVERY" | "TAKEOUT";
  date: string;
  customerName?: string;
  items: OrderItem[];
  total: number;
  subtotal?: number;
  discount?: number;
  deliveryAddress: string;
  contactPhone: string;
  notes: string;
  status?: string;
}

export interface AddressItem {
  id: string;
  formatted: string;
}

export interface User {
  id: string;
  phone: string;
  addresses: string[]; // Keep for backward compatibility
  addressItems?: AddressItem[]; // New detailed address format
  name?: string;
}

export type Page =
  | "home"
  | "menu"
  | "checkout"
  | "confirmation"
  | "profile"
  | "otp";
