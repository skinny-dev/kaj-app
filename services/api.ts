import type { OrderDetails, User, MenuItem } from "../types";
import { getApiUrl } from "./apiConfig";

// Auth token management
let authToken: string | null = localStorage.getItem("kaj-token");

const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem("kaj-token", token);
  } else {
    localStorage.removeItem("kaj-token");
  }
};

// API request helper
const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> => {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${getApiUrl()}${endpoint}`;

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get("content-type");
    if (!response.ok) {
      // Try to parse server-provided JSON error
      if (contentType && contentType.includes("application/json")) {
        const json = await response.json();
        return json as any;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error(`[API] Request failed:`, error);
    return null;
  }
};

// Auth functions
export const loginUser = async (phone: string, password: string) => {
  const data = await apiRequest<{ user: User; token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
  if (data?.token) {
    setAuthToken(data.token);
  }
  return data;
};

export const getCurrentUser = async (): Promise<User | null> => {
  if (!authToken) return null;
  // Try multiple endpoints for compatibility
  const endpoints = ["/users/me", "/auth/me", "/v1/auth/me"];
  let data: any = null;
  for (const ep of endpoints) {
    data = await apiRequest<any>(ep);
    if (data) break; // found a responding endpoint
  }
  if (!data) {
    // Signal transient failure so AuthContext can retry and avoid logging user out
    throw new Error("AUTH_ME_UNAVAILABLE");
  }
  // Support both wrapped and direct formats, and normalize to User
  const raw = data.user ? data.user : data;
  const user: User = {
    id: raw.id,
    phone: raw.phone,
    name: raw.name,
    addresses: Array.isArray(raw.addresses)
      ? raw.addresses.map((a: any) =>
          typeof a === "string"
            ? a
            : [a?.street, a?.city, a?.postalCode]
                .filter((p: any) => p && String(p).trim() && p !== "00000")
                .join(", ")
        )
      : [],
    addressItems: Array.isArray(raw.addressItems)
      ? raw.addressItems.map((it: any) => ({
          id: it.id,
          formatted: it.formatted,
        }))
      : undefined,
  };
  return user;
};

export const logoutUser = () => {
  setAuthToken(null);
};

export const sendOtp = async (phone: string) => {
  return await apiRequest<{ message: string }>("/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
};

export const verifyOtp = async (phone: string, otp: string, name?: string) => {
  const payload: any = { phone, otp };
  if (name) {
    payload.name = name;
  }

  const data = await apiRequest<{ user: User; token: string }>(
    "/auth/otp/verify",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  if (data?.token) {
    setAuthToken(data.token);
  }
  return data;
};

// Menu functions
export const getMenuItems = async (): Promise<MenuItem[]> => {
  // includeUnavailable so we can show disabled (ناموجود) items in UI
  const categories = await apiRequest<any[]>(
    "/menu/categories?for=online&includeUnavailable=1"
  );

  if (!categories || !Array.isArray(categories)) {
    return [];
  }

  // Flatten the categories and products into MenuItem array
  const flattenedItems: MenuItem[] = [];

  categories.forEach((category) => {
    if (category.products && Array.isArray(category.products)) {
      category.products.forEach((product: any) => {
        flattenedItems.push({
          id: product.id,
          name: product.name,
          description: product.description || "",
          price: product.price || 0,
          category: category.name,
          imageUrl: product.imageUrl || "",
          available: product.available !== false, // default true if undefined
          station: category.station,
          productAddons: Array.isArray(product.addons)
            ? product.addons.map((a: any) => ({
                id: a.id,
                name: a.name,
                price: a.price || 0,
                available: a.available !== false,
                maxPerItem: a.maxPerItem ?? null,
              }))
            : [],
        });
      });
    }
  });

  return flattenedItems;
};

export const fetchMenu = async (): Promise<{ menuItems: MenuItem[] }> => {
  const items = await getMenuItems();
  return { menuItems: items };
};

// Order functions
export const createOrder = async (
  orderData: Omit<OrderDetails, "id" | "createdAt" | "status">
): Promise<OrderDetails | null> => {
  const data = await apiRequest<{ order: OrderDetails }>("/orders", {
    method: "POST",
    body: JSON.stringify(orderData),
  });
  return data?.order || null;
};

export const getUserOrders = async (): Promise<OrderDetails[]> => {
  if (!authToken) return [];
  const data = await apiRequest<{ orders: OrderDetails[] }>(
    "/orders/my-orders"
  );
  return data?.orders || [];
};

export const fetchOrderById = async (
  id: string
): Promise<OrderDetails | null> => {
  const data = await apiRequest<{ order: OrderDetails }>(`/orders/${id}`);
  return data?.order || null;
};

export const getOrder = async (id: string): Promise<OrderDetails | null> => {
  return await fetchOrderById(id);
};

// Settings
export interface SettingsInfo {
  name: string;
  openingHours?: string;
  isOpen?: boolean;
  contactPhone?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export const getSettingsInfo = async (): Promise<SettingsInfo | null> => {
  const data = await apiRequest<SettingsInfo>(`/settings/info`);
  return data || null;
};

// Public receipt (no auth) using orderId + refId
export const fetchPublicReceipt = async (
  orderId: string,
  refId: string
): Promise<OrderDetails | null> => {
  const data = await apiRequest<{ order: OrderDetails }>(
    `/payments/receipt?orderId=${encodeURIComponent(
      orderId
    )}&refId=${encodeURIComponent(refId)}`
  );
  return data?.order || null;
};

// Payment functions
export const initiatePayment = async (orderData: {
  items: Array<{
    menuItemId: string;
    quantity: number;
    price: number;
    notes?: string;
    addons?: Array<{ addonId: string; quantity: number }>;
    customizations?: any;
  }>;
  deliveryAddress?: string;
  phone?: string;
  notes?: string;
  totalAmount: number;
  paymentMethod: "online" | "cash";
  orderType?: "DELIVERY" | "PICKUP" | "DINE_IN";
  guestCount?: number;
  tableId?: string | number;
  name?: string;
}): Promise<{
  success: boolean;
  paymentUrl?: string;
  orderId?: string;
  message?: string;
}> => {
  try {
    // Step 1: Create the order first
    const orderType: "DELIVERY" | "PICKUP" | "DINE_IN" =
      orderData.orderType || "DELIVERY";
    // Backend expects: DINE_IN | DELIVERY | TAKEOUT (not PICKUP)
    const normalizedType = orderType === "PICKUP" ? "TAKEOUT" : orderType;
    const orderPayload: any = {
      type: normalizedType,
      address: orderData.deliveryAddress || "",
      // Provide customer name when available so server can store/display it
      customerName: orderData.name || undefined,
      phone: orderData.phone || "",
      notes: orderData.notes || undefined,
      items: orderData.items.map((item) => ({
        productId: item.menuItemId, // API expects productId, not menuItemId
        quantity: item.quantity,
        note: item.notes || undefined, // یادداشت آیتم
        addons:
          item.addons?.map((addon) => ({
            addonId: addon.addonId,
            quantity: addon.quantity,
          })) || undefined,
      })),
    };

    // Attach guestCount for DINE_IN orders when provided
    if (normalizedType === "DINE_IN") {
      if (orderData.guestCount) {
        orderPayload.guestCount = orderData.guestCount;
      }
      if (orderData.tableId) {
        orderPayload.tableId = String(orderData.tableId);
      }
    }

    const orderResponse = await apiRequest<{
      id: string;
      orderNumber: string;
      total: number;
    }>("/orders", {
      method: "POST",
      body: JSON.stringify(orderPayload),
    });

    if (!orderResponse?.id) {
      // If server returned an error object, use its message if available
      const serverError = (orderResponse as any)?.error;
      return { success: false, message: serverError || "خطا در ایجاد سفارش" };
    }

    const orderId = orderResponse.id;

    // Step 2: Request payment for the created order
    const paymentResponse = await apiRequest<{
      success: boolean;
      paymentUrl?: string;
      error?: string;
    }>(`/payments/request/${orderId}`, {
      method: "POST",
      body: JSON.stringify({
        returnUrl: `${window.location.origin}/confirmation`,
      }),
    });

    if (paymentResponse?.success && paymentResponse.paymentUrl) {
      return {
        success: true,
        paymentUrl: paymentResponse.paymentUrl,
        orderId: orderId,
      };
    } else {
      return {
        success: false,
        message: paymentResponse?.error || "خطا در درخواست پرداخت",
      };
    }
  } catch (error) {
    console.error("Payment initiation failed:", error);
    return { success: false, message: "خطا در اتصال به سرور" };
  }
};

export const verifyPayment = async (paymentData: {
  Authority: string;
  Status: string;
  orderId: string;
}): Promise<{
  success: boolean;
  order?: OrderDetails;
  message?: string;
}> => {
  const data = await apiRequest<{
    success: boolean;
    order?: OrderDetails;
    message?: string;
  }>("/payments/verify", {
    method: "POST",
    body: JSON.stringify(paymentData),
  });
  return data || { success: false, message: "خطا در تایید پرداخت" };
};

// Address functions
export const getUserAddresses = async (): Promise<any[]> => {
  if (!authToken) return [];
  // Backend returns an array at /users/me/addresses
  const data = await apiRequest<any[] | { addresses: any[] }>(
    "/users/me/addresses"
  );
  if (Array.isArray(data)) return data;
  return data?.addresses || [];
};

export const addUserAddress = async (address: {
  title: string;
  address: string; // full formatted address (may include details)
  phone?: string;
  isDefault?: boolean;
}): Promise<any> => {
  // Map to backend schema: street, city, postalCode
  const payload = {
    street: address.address,
    city: "",
    postalCode: "",
  };
  return await apiRequest("/users/me/addresses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

// Wrapper for simple address string (used by AuthContext)
export const addUserAddressSimple = async (
  addressString: string
): Promise<any> => {
  return await addUserAddress({
    title: "آدرس",
    address: addressString,
    isDefault: true,
  });
};

export const updateUserAddress = async (
  id: string,
  address: Partial<{
    title: string;
    address: string;
    phone?: string;
    isDefault?: boolean;
  }>
): Promise<any> => {
  // Transform to backend schema
  const payload: any = {};
  if (address.address !== undefined) payload.street = address.address;
  if ((address as any).city !== undefined) payload.city = (address as any).city;
  if ((address as any).postalCode !== undefined)
    payload.postalCode = (address as any).postalCode;
  return await apiRequest(`/users/me/addresses/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const deleteUserAddress = async (id: string): Promise<any> => {
  return await apiRequest(`/users/me/addresses/${id}`, {
    method: "DELETE",
  });
};

export const updateUserProfile = async (
  profileData: Partial<User>
): Promise<User | null> => {
  const data = await apiRequest<any>("/users/me", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });
  if (!data) return null;
  // If server returned an explicit error payload, throw to let callers handle it
  if ((data as any).error) {
    const errMsg = (data as any).error;
    // If the error indicates auth problems, clear local auth token so client can re-login
    try {
      if (
        typeof errMsg === "string" &&
        /invalid|expired|unauthor/i.test(errMsg)
      ) {
        setAuthToken(null);
      }
    } catch {}
    throw new Error(errMsg || "Server returned an error");
  }
  // Support both { user } wrapper and direct user object
  if (data.user) return data.user as User;
  if (data.id && data.phone) {
    const u: User = {
      id: data.id,
      phone: data.phone,
      name: data.name,
      addresses: Array.isArray(data.addresses)
        ? data.addresses.map((a: any) =>
            typeof a === "string"
              ? a
              : [a?.street, a?.city, a?.postalCode]
                  .filter((p: any) => p && String(p).trim() && p !== "00000")
                  .join(", ")
          )
        : [],
    };
    return u;
  }
  return null;
};

export const updateUserName = async (name: string): Promise<User | null> => {
  return await updateUserProfile({ name });
};

export const updateOrderStatus = async (
  id: string,
  status: string
): Promise<OrderDetails | null> => {
  const data = await apiRequest<{ order: OrderDetails }>(
    `/orders/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
  return data?.order || null;
};

export const getMenuItem = async (id: string): Promise<MenuItem | null> => {
  const data = await apiRequest<{ item: MenuItem }>(`/menu/${id}`);
  return data?.item || null;
};

// Connection monitoring
export const checkConnectionStatus = async (): Promise<{
  api: boolean;
  websocket: boolean;
  bridge: boolean;
}> => {
  const apiStatus = await healthCheck();

  // Test WebSocket (simple connection test)
  let websocketStatus = false;
  try {
    const wsUrl = getApiUrl().replace("http", "ws").replace("/v1", "");
    const testWs = new WebSocket(`${wsUrl}/ws`);
    testWs.onopen = () => {
      websocketStatus = true;
      testWs.close();
    };
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch {
    websocketStatus = false;
  }

  // Test printer bridge
  let bridgeStatus = false;
  try {
    const response = await fetch("http://localhost:18080/health", {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    bridgeStatus = response.ok;
  } catch {
    bridgeStatus = false;
  }

  return {
    api: apiStatus,
    websocket: websocketStatus,
    bridge: bridgeStatus,
  };
};

// Health check
export const healthCheck = async (): Promise<boolean> => {
  try {
    const data = await apiRequest<{ ok: boolean }>("/health");
    return data?.ok === true;
  } catch {
    return false;
  }
};

// Zones
export const validateZone = async (
  lat?: number,
  lng?: number
): Promise<{ allowed: boolean; zone?: string; reason?: string }> => {
  if (lat == null || lng == null) return { allowed: true };
  try {
    const q = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
    }).toString();
    const res = await apiRequest<{
      allowed: boolean;
      zone?: string;
      reason?: string;
    }>(`/zones/validate?${q}`);
    // If API responded but didn't include a result, treat as blocked to be safe
    return res || { allowed: false, reason: "اعتبارسنجی محدوده نامشخص است." };
  } catch (e) {
    // Fail-closed: block saving when zone system is not reachable
    return {
      allowed: false,
      reason: "آدرس خارج از محدوده یا سامانه تعیین محدوده در دسترس نیست.",
    };
  }
};

// Export auth state
export const isAuthenticated = () => !!authToken;
export const getAuthToken = () => authToken;

// Missing function aliases for compatibility
export const fetchCurrentUser = getCurrentUser;
export const requestPayment = initiatePayment;
export const requestOtp = sendOtp;

// Fetch order history
export const fetchOrderHistory = async (): Promise<{
  orders: OrderDetails[];
}> => {
  try {
    // Backend provides raw orders array at /orders/me
    const raw = await apiRequest<any[]>("/orders/me");
    const orders: OrderDetails[] = Array.isArray(raw)
      ? raw.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          type: o.type,
          date: new Date(o.createdAt).toISOString(),
          customerName: o.customerName || o.customer?.name,
          items: (o.items || []).map((it: any) => ({
            menuItemId: it.productId,
            name: it.product?.name || it.name || "",
            quantity: it.quantity,
            priceAtTimeOfOrder: it.priceAtOrder ?? it.priceAtTimeOfOrder ?? 0,
          })),
          total: o.total,
          subtotal: o.subtotal,
          discount: o.discount,
          deliveryAddress: o.address || "",
          contactPhone: o.customerPhone || o.customer?.phone || "",
          notes: o.notes || "",
          status: o.status,
        }))
      : [];
    return { orders };
  } catch (error) {
    console.error("Error fetching order history:", error);
    return { orders: [] };
  }
};

// Initialize auth token from storage
if (typeof window !== "undefined") {
  const token = localStorage.getItem("kaj-token");
  if (token) {
    setAuthToken(token);
  }
}
