import React, { useState, useEffect } from "react";
import * as api from "../services/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import type { Page } from "../App";
import type { CartItem } from "../types";
import { ArrowRightIcon, PlusIcon } from "../components/icons/Icons";
import LocationPicker from "../components/LocationPicker";
import ModalSheet from "../components/ModalSheet";
import AddressModal from "../components/AddressModal";

interface CheckoutPageProps {
  onNavigate: (page: Page) => void;
  onCheckout: (details: {
    items: CartItem[];
    total: number;
    address: string;
    phone: string;
    notes: string;
    name: string;
    orderType?: "DELIVERY" | "PICKUP" | "DINE_IN";
    guestCount?: number;
  }) => void;
  onGuestCheckout: (details: {
    items: CartItem[];
    total: number;
    address: string;
    phone: string;
    notes: string;
    name: string;
    orderType?: "DELIVERY" | "PICKUP" | "DINE_IN";
    guestCount?: number;
  }) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  onNavigate,
  onCheckout,
  onGuestCheckout,
}) => {
  const { cartItems, getCartTotal } = useCart();
  const { currentUser, updateName, refreshUser, addAddressDetailed } =
    useAuth();
  const total = getCartTotal();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [newAddress, setNewAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{
    address?: string;
    phone?: string;
    name?: string;
    guestCount?: string;
  }>({});
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [orderType, setOrderType] = useState<
    "DELIVERY" | "PICKUP" | "DINE_IN"
  >("DELIVERY");
  const [guestCount, setGuestCount] = useState<number>(() => {
    try {
      const params = new URLSearchParams(window.location.search || "");
      const guests = params.get("guests") || params.get("guest");
      const fromUrl = guests ? parseInt(guests, 10) : NaN;
      if (!Number.isNaN(fromUrl) && fromUrl > 0) return fromUrl;
      const stored = localStorage.getItem("kaj-guest-count");
      const fromStore = stored ? parseInt(stored, 10) : NaN;
      return !Number.isNaN(fromStore) && fromStore > 0 ? fromStore : 1;
    } catch {
      return 1;
    }
  });
  const [guestAddresses, setGuestAddresses] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("kaj-guest-addresses");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  // Keep metadata { title, details } for addresses stored locally or for rendering purposes
  const [addressMeta, setAddressMeta] = useState<
    Record<
      string,
      { title: string; details?: string; coords?: { lat: number; lng: number } }
    >
  >(() => {
    try {
      const raw = localStorage.getItem("kaj-address-meta");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  // Per-user address metadata keyed by addressId (prevents collisions when formatted strings are identical)
  const [userAddressMeta, setUserAddressMeta] = useState<
    Record<
      string,
      { title: string; details?: string; coords?: { lat: number; lng: number } }
    >
  >(() => {
    try {
      const raw = localStorage.getItem("kaj-user-address-meta");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "kaj-guest-addresses",
        JSON.stringify(guestAddresses)
      );
    } catch {}
  }, [guestAddresses]);

  useEffect(() => {
    try {
      localStorage.setItem("kaj-address-meta", JSON.stringify(addressMeta));
    } catch {}
  }, [addressMeta]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "kaj-user-address-meta",
        JSON.stringify(userAddressMeta)
      );
    } catch {}
  }, [userAddressMeta]);

  // One-time sanitize: remove generic 'آدرس' titles from persisted metadata
  useEffect(() => {
    const updated: typeof addressMeta = {};
    let changed = false;
    for (const key of Object.keys(addressMeta)) {
      const entry = addressMeta[key];
      if (entry && entry.title === "آدرس") {
        updated[key] = { title: "", details: entry.details };
        changed = true;
      } else {
        updated[key] = entry;
      }
    }
    if (changed) setAddressMeta(updated);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shorten = (s: string, max = 110) =>
    s.length > max ? `${s.slice(0, max)}…` : s;
  // Try to extract a concise address head (e.g., first two comma/، segments)
  const conciseHead = (s: string) => {
    if (!s) return s;
    const sep = s.includes("،") ? "،" : ",";
    const parts = s
      .split(sep)
      .map((p) => p.trim())
      .filter(Boolean);
    return parts.slice(0, 2).join("، ");
  };

  // Accept both legacy string addresses and new object-based addresses { street, city, postalCode, address }
  const stringifyAddress = (addr: any): string => {
    if (!addr) return "";
    if (typeof addr === "string") return addr;
    if (typeof addr === "object") {
      // Prefer explicit address field if exists
      if (typeof addr.address === "string" && addr.address.trim().length > 0) {
        return addr.address.trim();
      }
      const parts: string[] = [];
      if (addr.street) parts.push(String(addr.street));
      if (addr.city) parts.push(String(addr.city));
      if (addr.postalCode) parts.push(String(addr.postalCode));
      if (addr.details) parts.push(String(addr.details));
      // Fallback to JSON if nothing usable
      return parts.length > 0 ? parts.join("، ") : JSON.stringify(addr);
    }
    try {
      return String(addr);
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (currentUser) {
      // Pre-fill with existing name if user has one, otherwise leave empty
      setName(currentUser.name || "");
      // Normalize phone: ensure string, convert Persian digits and add leading 0 if missing
      try {
        const raw = currentUser.phone || "";
        const asStr = String(raw);
        const pers = asStr.replace(/[۰۱۲۳۴۵۶۷۸۹]/g, (m) =>
          String("۰۱۲۳۴۵۶۷۸۹".indexOf(m))
        );
        const digitsOnly = pers.replace(/\D/g, "");
        if (digitsOnly.length === 10 && digitsOnly.startsWith("9")) {
          setPhone("0" + digitsOnly);
        } else {
          setPhone(asStr);
        }
      } catch {
        setPhone(currentUser.phone as any);
      }
      if (
        Array.isArray((currentUser as any).addressItems) &&
        (currentUser as any).addressItems.length > 0
      ) {
        const first = (currentUser as any).addressItems[0];
        setSelectedAddressId(first.id);
        setSelectedAddress(first.formatted);
      } else if (
        Array.isArray(currentUser.addresses) &&
        currentUser.addresses.length > 0
      ) {
        setSelectedAddressId("");
        setSelectedAddress(stringifyAddress(currentUser.addresses[0] as any));
      } else {
        setSelectedAddressId("");
        setSelectedAddress("");
      }
    } else {
      // Guest: preselect last guest address if exists
      if (guestAddresses.length > 0) {
        setSelectedAddress(guestAddresses[0]);
      } else {
        setSelectedAddress("");
      }
    }
  }, [currentUser]);

  // Auto-select order type from URL query parameters (e.g., dine-in links)
  useEffect(() => {
    try {
      const search = window.location.search || "";
      const params = new URLSearchParams(search);

      const get = (k: string) => (params.get(k) || "").toLowerCase();
      const has = (k: string) => params.has(k);

      // Normalize common indicators
      const type = get("type") || get("orderType") || get("ordertype");
      const mode = get("mode") || get("service");
      const dinein = get("dinein") || get("dine-in") || get("dine_in");
      const salon = get("salon") || get("سالن");

      const truthy = (v: string) => ["1", "true", "yes", "y"].includes(v);

      const isDineInHint =
        truthy(dinein) ||
        ["dinein", "dine-in", "dine_in", "dinein", "dine in"].includes(
          type
        ) ||
        ["salon", "inhouse", "in-house", "dinein"].includes(mode) ||
        ["salon", "سالن"].includes(salon) ||
        // If a table code is present, assume dine-in
        has("table") ||
        has("tableId") ||
        has("desk") ||
        has("deskId");

      const isPickupHint =
        ["pickup", "takeout", "take-away", "takeaway"].includes(type) ||
        ["pickup", "takeout"].includes(mode);

      const isDeliveryHint =
        ["delivery", "send", "ارسال"].includes(type) ||
        ["delivery", "send"].includes(mode);

      if (isDineInHint) {
        setOrderType("DINE_IN");
        localStorage.setItem("kaj-dinein", "1");
        localStorage.setItem("kaj-order-type", "DINE_IN");
        // Ensure URL carries dinein=1 (and guests if available)
        const url = new URL(window.location.href);
        if (url.searchParams.get("dinein") !== "1") {
          url.searchParams.set("dinein", "1");
        }
        const gc = String(guestCount || 1);
        if (!url.searchParams.get("guests") && gc) {
          url.searchParams.set("guests", gc);
        }
        window.history.replaceState({}, "", url.toString());
      } else if (isPickupHint) setOrderType("PICKUP");
      else if (isDeliveryHint) setOrderType("DELIVERY");
      else {
        // No hint in URL: fall back to localStorage
        const persisted = localStorage.getItem("kaj-dinein");
        if (persisted === "1") {
          setOrderType("DINE_IN");
          const url = new URL(window.location.href);
          if (url.searchParams.get("dinein") !== "1") {
            url.searchParams.set("dinein", "1");
          }
          const storedGc = localStorage.getItem("kaj-guest-count");
          if (storedGc && !url.searchParams.get("guests")) {
            url.searchParams.set("guests", storedGc);
          }
          window.history.replaceState({}, "", url.toString());
        }
      }
    } catch {}
  }, []);

  // Persist guest count changes
  useEffect(() => {
    try {
      localStorage.setItem("kaj-guest-count", String(guestCount || 1));
      // Keep URL in sync when in DINE_IN mode
      if (orderType === "DINE_IN") {
        const url = new URL(window.location.href);
        url.searchParams.set("guests", String(guestCount || 1));
        window.history.replaceState({}, "", url.toString());
      }
    } catch {}
  }, [guestCount, orderType]);

  const validateForm = async () => {
    const newErrors: {
      address?: string;
      phone?: string;
      name?: string;
      guestCount?: string;
    } = {};

    // Name is always required
    if (name.trim().length < 3) {
      newErrors.name = "لطفاً نام و نام خانوادگی معتبری وارد کنید.";
    }

    if (orderType === "DELIVERY") {
      if (!selectedAddress && !newAddress.trim()) {
        newErrors.address =
          "لطفاً یک آدرس را انتخاب کنید یا آدرس جدید ثبت نمایید.";
      } else if (selectedAddress) {
        // If we have coords for the selected address, validate against delivery zones for a precise message
        const meta = selectedAddressId
          ? userAddressMeta[selectedAddressId]
          : addressMeta[selectedAddress];
        if (meta?.coords?.lat != null && meta?.coords?.lng != null) {
          try {
            const vr = await api.validateZone(meta.coords.lat, meta.coords.lng);
            if (vr && vr.allowed === false) {
              newErrors.address =
                vr.reason || "این آدرس خارج از محدوده ارسال است.";
            }
          } catch {
            // Fail-open on network errors
          }
        }
      }
    } else if (orderType === "DINE_IN") {
      if (!guestCount || guestCount < 1) {
        newErrors.guestCount = "لطفاً تعداد نفرات را وارد کنید.";
      }
    }
    if (!/^\d{11}$/.test(phone)) {
      newErrors.phone = "شماره تماس باید ۱۱ رقمی باشد.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await validateForm()) {
      setIsSubmitting(true);
      try {
        // Always update user name during checkout to ensure it's saved
        if (currentUser && name.trim()) {
          try {
            await updateName(name.trim());
            // Important: Refresh user data after name update
            await refreshUser();
          } catch (error) {
            console.error("Failed to update user name", error);
            // Optional: Show an error to the user
          }
        }

        const orderDetails = {
          items: cartItems,
          total,
          address:
            orderType === "DELIVERY"
              ? newAddress.trim() || selectedAddress
              : "",
          phone: phone,
          notes,
          name: name.trim(),
          orderType,
          guestCount: orderType === "DINE_IN" ? guestCount : undefined,
        };

        if (currentUser) {
          await onCheckout(orderDetails);
        } else {
          await onGuestCheckout(orderDetails);
        }
      } catch (error) {
        console.error("Checkout failed:", error);
        // Optional: Show error to user
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">سبد خرید شما خالی است.</h1>
        <button
          onClick={() => onNavigate("menu")}
          className="bg-green-500 text-black font-bold py-3 px-6 rounded-lg"
        >
          بازگشت به منو
        </button>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white p-4 pb-28">
      <header className="flex items-center mb-6">
        <button onClick={() => onNavigate("menu")} className="p-2">
          <ArrowRightIcon />
        </button>
        <h1 className="text-xl font-bold flex-grow text-center">تکمیل سفارش</h1>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            نام و نام خانوادگی <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
            placeholder="نام کامل خود را وارد کنید"
            required
          />
          {errors.name && (
            <p className="text-red-400 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            شماره تماس
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={11}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
            placeholder="09123456789"
          />
          {currentUser && (
            <p className="text-xs text-gray-400 mt-2">
              شماره تماس اصلی شما. برای این سفارش می‌توانید آن را تغییر دهید.
            </p>
          )}
          {errors.phone && (
            <p className="text-red-400 text-sm mt-1">{errors.phone}</p>
          )}
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-300 mb-3">
            نحوه دریافت
          </span>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setOrderType("DELIVERY")}
              className={`flex-1 rounded-lg p-3 border text-sm ${
                orderType === "DELIVERY"
                  ? "bg-gray-700 border-green-500 text-white"
                  : "bg-gray-800 border-gray-700 text-gray-300"
              }`}
            >
              ارسال به آدرس
            </button>
            <button
              type="button"
              onClick={() => setOrderType("PICKUP")}
              className={`flex-1 rounded-lg p-3 border text-sm ${
                orderType === "PICKUP"
                  ? "bg-gray-700 border-green-500 text-white"
                  : "bg-gray-800 border-gray-700 text-gray-300"
              }`}
            >
              تحویل حضوری
            </button>
            <button
              type="button"
              onClick={() => setOrderType("DINE_IN")}
              className={`flex-1 rounded-lg p-3 border text-sm ${
                orderType === "DINE_IN"
                  ? "bg-gray-700 border-green-500 text-white"
                  : "bg-gray-800 border-gray-700 text-gray-300"
              }`}
            >
              سالن
            </button>
          </div>
        </div>

        {orderType === "DINE_IN" && (
          <div>
            <span className="block text-sm font-medium text-gray-300 mb-3">
              تعداد نفرات
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={guestCount}
                onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value || "1", 10)))}
                className="w-24 bg-gray-800 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500 text-white text-center"
                placeholder="1"
              />
              <span className="text-sm text-gray-400">نفر</span>
            </div>
            {errors.guestCount && (
              <p className="text-red-400 text-sm mt-2">{errors.guestCount}</p>
            )}
          </div>
        )}

        {orderType === "DELIVERY" && (
          <div>
            <span className="block text-sm font-medium text-gray-300 mb-3">
              آدرس تحویل
            </span>
            {/* Address list: user or guest */}
            {currentUser &&
              Array.isArray((currentUser as any).addressItems) &&
              (currentUser as any).addressItems.length > 0 && (
                <div className="space-y-3 mb-4">
                  {(currentUser as any).addressItems.map((item: any) => {
                    const addrString = item.formatted as string;
                    const meta = userAddressMeta[item.id];
                    return (
                      <label
                        key={item.id}
                        className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedAddressId === item.id
                            ? "bg-gray-700 border-green-500"
                            : "bg-gray-800 border-gray-700 hover:border-gray-500"
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={item.id}
                          checked={selectedAddressId === item.id}
                          onChange={(e) => {
                            const id = e.target.value;
                            setSelectedAddressId(id);
                            setSelectedAddress(addrString);
                            setNewAddress("");
                            setIsAddingNewAddress(false);
                          }}
                          className="hidden"
                        />
                        {(() => {
                          const t = meta?.title?.trim();
                          return t && t !== "آدرس";
                        })() && (
                          <p className="font-medium text-white">
                            {meta!.title}
                          </p>
                        )}
                        <p
                          className={`text-sm text-gray-400 ${(() => {
                            const t = meta?.title?.trim();
                            return t && t !== "آدرس" ? "mt-1" : "";
                          })()} line-clamp-2`}
                        >
                          {`${conciseHead(addrString)}${
                            meta?.details ? ` — ${meta.details}` : ""
                          }`}
                        </p>
                      </label>
                    );
                  })}
                </div>
              )}

            {currentUser &&
              (!Array.isArray((currentUser as any).addressItems) ||
                (currentUser as any).addressItems.length === 0) &&
              Array.isArray(currentUser.addresses) &&
              currentUser.addresses.length > 0 && (
                <div className="space-y-3 mb-4">
                  {currentUser.addresses.map((address, index) => {
                    const addrString = stringifyAddress(address as any);
                    return (
                      <label
                        key={index}
                        className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedAddress === addrString
                            ? "bg-gray-700 border-green-500"
                            : "bg-gray-800 border-gray-700 hover:border-gray-500"
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={addrString}
                          checked={selectedAddress === addrString}
                          onChange={(e) => {
                            setSelectedAddress(e.target.value);
                            setSelectedAddressId("");
                            setNewAddress("");
                            setIsAddingNewAddress(false);
                          }}
                          className="hidden"
                        />
                        {(() => {
                          const t = addressMeta[addrString]?.title?.trim();
                          return t && t !== "آدرس";
                        })() && (
                          <p className="font-medium text-white">
                            {addressMeta[addrString]!.title}
                          </p>
                        )}
                        <p
                          className={`text-sm text-gray-400 ${(() => {
                            const t = addressMeta[addrString]?.title?.trim();
                            return t && t !== "آدرس" ? "mt-1" : "";
                          })()} line-clamp-2`}
                        >
                          {`${conciseHead(addrString)}${
                            addressMeta[addrString]?.details
                              ? ` — ${addressMeta[addrString]!.details}`
                              : ""
                          }`}
                        </p>
                      </label>
                    );
                  })}
                </div>
              )}

            {!currentUser && guestAddresses.length > 0 && (
              <div className="space-y-3 mb-4">
                {guestAddresses.map((address, index) => (
                  <label
                    key={index}
                    className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedAddress === address
                        ? "bg-gray-700 border-green-500"
                        : "bg-gray-800 border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={address}
                      checked={selectedAddress === address}
                      onChange={(e) => {
                        setSelectedAddress(e.target.value);
                        setNewAddress("");
                        setIsAddingNewAddress(false);
                      }}
                      className="hidden"
                    />
                    {(() => {
                      const t = addressMeta[address]?.title?.trim();
                      return t && t !== "آدرس";
                    })() && (
                      <p className="font-medium text-white">
                        {addressMeta[address]!.title}
                      </p>
                    )}
                    <p
                      className={`text-sm text-gray-400 ${(() => {
                        const t = addressMeta[address]?.title?.trim();
                        return t && t !== "آدرس" ? "mt-1" : "";
                      })()} line-clamp-2`}
                    >
                      {`${conciseHead(address)}${
                        addressMeta[address]?.details
                          ? ` — ${addressMeta[address]!.details}`
                          : ""
                      }`}
                    </p>
                  </label>
                ))}
              </div>
            )}

            {currentUser &&
            Array.isArray(currentUser.addresses) &&
            currentUser.addresses.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowAddressModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-gray-800/60 border border-gray-700 text-gray-200 hover:text-white hover:border-gray-500 rounded-lg p-3 transition-colors"
              >
                <PlusIcon />
                آدرس جدید
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddressModal(true)}
                className="w-full text-sm bg-gray-800/40 border border-gray-700 text-gray-200 hover:text-white hover:border-gray-500 rounded-lg p-3"
              >
                آدرس جدید
              </button>
            )}

            {isAddingNewAddress && (
              <div>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full bg-gray-800 border-2 border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="مثال: خیابان ولیعصر، کوچه کاج، پلاک ۱۰"
                  autoFocus
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    className="text-xs bg-gray-800 border border-gray-600 text-gray-200 hover:border-gray-400 rounded px-3 py-1"
                  >
                    انتخاب روی نقشه
                  </button>
                </div>
                <ModalSheet
                  open={showPicker}
                  onClose={() => setShowPicker(false)}
                  title="انتخاب موقعیت روی نقشه"
                >
                  <LocationPicker
                    onConfirm={({ address }) => {
                      setNewAddress(address);
                      setShowPicker(false);
                    }}
                    onCancel={() => setShowPicker(false)}
                  />
                </ModalSheet>
              </div>
            )}

            {/* Address Add Modal (map + fields) */}
            <AddressModal
              open={showAddressModal}
              onClose={() => setShowAddressModal(false)}
              onSave={async ({ address, details, title, phone, lat, lng }) => {
                if (savingAddress) return;
                setSavingAddress(true);
                try {
                  const formatted = `${address}${
                    details ? ` - ${details}` : ""
                  }`;
                  if (currentUser) {
                    try {
                      await addAddressDetailed({
                        address,
                        details,
                        title,
                        phone,
                        isDefault: false,
                      });
                      // Ensure we have fresh user with IDs
                      const refreshed = await api.getCurrentUser();
                      if (
                        refreshed &&
                        Array.isArray((refreshed as any).addressItems)
                      ) {
                        const found =
                          (refreshed as any).addressItems.find(
                            (it: any) => it.formatted === formatted
                          ) || (refreshed as any).addressItems[0];
                        if (found) {
                          setSelectedAddressId(found.id);
                          setSelectedAddress(found.formatted);
                          setUserAddressMeta((prev) => ({
                            ...prev,
                            [found.id]: {
                              title: (title || "").trim(),
                              details: (details || "").trim() || undefined,
                              coords:
                                lat != null && lng != null
                                  ? { lat, lng }
                                  : prev[found.id]?.coords,
                            },
                          }));
                        } else {
                          setSelectedAddress(formatted);
                          setSelectedAddressId("");
                        }
                      } else {
                        setSelectedAddress(formatted);
                        setSelectedAddressId("");
                      }
                    } catch (e) {
                      // ignore; fallback to local select
                      setSelectedAddress(formatted);
                      setSelectedAddressId("");
                    }
                  } else {
                    // Guest: save locally (prepend newest) and dedupe
                    setGuestAddresses((prev) => {
                      const nextSet = new Set<string>([formatted, ...prev]);
                      const next = Array.from(nextSet);
                      return next.slice(0, 5);
                    });
                    setSelectedAddress(formatted);
                  }
                  // Save/Update render metadata
                  if (!currentUser) {
                    setAddressMeta((prev) => ({
                      ...prev,
                      [formatted]: {
                        title: (title || "").trim(),
                        details: (details || "").trim() || undefined,
                        coords:
                          lat != null && lng != null
                            ? { lat, lng }
                            : prev[formatted]?.coords,
                      },
                    }));
                  }
                  setIsAddingNewAddress(false);
                  setShowAddressModal(false);
                } finally {
                  setSavingAddress(false);
                }
              }}
              onZoneBlocked={(msg) => {
                setErrors((prev) => ({
                  ...prev,
                  address: msg || "این آدرس خارج از محدوده ارسال است.",
                }));
              }}
              initialPhone={phone}
            />
            {errors.address && (
              <p className="text-red-400 text-sm mt-2">{errors.address}</p>
            )}
          </div>
        )}

        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            توضیحات اضافی
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="اگر نکته‌ای دارید اینجا بنویسید..."
          ></textarea>
        </div>

        <div className="space-y-3 bg-gray-900 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">خلاصه سفارش</h2>
          {cartItems.map((item) => {
            const unitAddonTotal = (item.selectedAddons || []).reduce(
              (s, a) => s + a.price * a.quantity,
              0
            );
            const lineTotal = (item.price + unitAddonTotal) * item.quantity;
            return (
              <div key={item.id} className="text-sm space-y-1">
                <div className="flex justify-between items-center">
                  <p className="text-gray-300">
                    {item.name}{" "}
                    <span className="text-green-400">
                      x{item.quantity.toLocaleString("fa-IR")}
                    </span>
                  </p>
                  <p>{lineTotal.toLocaleString("fa-IR")} تومان</p>
                </div>
                {item.selectedAddons && item.selectedAddons.length > 0 && (
                  <ul className="ml-2 pr-1 border-r border-gray-700 text-[11px] text-gray-400 space-y-0.5">
                    {item.selectedAddons.map((ad) => (
                      <li key={ad.addonId} className="flex justify-between">
                        <span>
                          + {ad.name}
                          {ad.quantity > 1 &&
                            ` ×${ad.quantity.toLocaleString("fa-IR")}`}
                        </span>
                        <span>
                          {(
                            ad.price *
                            ad.quantity *
                            item.quantity
                          ).toLocaleString("fa-IR")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          <div className="border-t border-gray-700 my-2"></div>
          <div className="flex justify-between items-center font-bold text-lg">
            <p>جمع کل</p>
            <p>{total.toLocaleString("fa-IR")} تومان</p>
          </div>
        </div>

        <footer className="fixed bottom-0 right-0 left-0 bg-gray-900 p-4 border-t border-gray-700">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs text-gray-400">مبلغ قابل پرداخت</div>
              <div className="text-lg font-bold text-white">
                {total.toLocaleString("fa-IR")}{" "}
                <span className="text-sm font-normal text-gray-300">تومان</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[46%] bg-green-500 text-black font-bold py-3 px-5 rounded-lg text-base transition-transform transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
              )}
              {isSubmitting ? "در حال پردازش..." : "ثبت سفارش"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
};
