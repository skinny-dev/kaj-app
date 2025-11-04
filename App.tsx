import React, { useState, useEffect } from "react";
import { HomePage } from "./pages/HomePage";
import { MenuPage } from "./pages/MenuPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import { ProfilePage } from "./pages/ProfilePage";
import { OtpPage } from "./pages/OtpPage";
import { CartProvider, useCart } from "./context/CartContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RouterProvider, useRouter } from "./context/RouterContext";
import type { OrderDetails, CartItem } from "./types";
import * as api from "./services/api";

import { LoginPage } from "./pages/LoginPage";
import ErrorBoundary from "./components/ErrorBoundary";

export type Page =
  | "home"
  | "menu"
  | "checkout"
  | "confirmation"
  | "profile"
  | "otp"
  | "login";

// Define a type for pending order data before it's sent to the API
type PendingOrder = {
  items: CartItem[];
  total: number;
  address: string;
  phone: string;
  name: string;
};

const AppContent: React.FC = () => {
  const { currentPage, navigateTo } = useRouter();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [pendingOrderDetails, setPendingOrderDetails] =
    useState<PendingOrder | null>(null);
  const [authPhoneNumber, setAuthPhoneNumber] = useState<string>("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const {
    currentUser,
    requestOtp,
    isLoading: isAuthLoading,
    addAddress,
    refreshUser,
  } = useAuth();
  const { clearCart, getCartTotal } = useCart();

  // Handle routing for payment confirmation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const path = (window.location.pathname || "").replace(/\/+$/, "");
    // If any of the payment callback params are present, show the confirmation page.
    if (urlParams.has("Authority") || urlParams.has("success")) {
      navigateTo("confirmation");
      return;
    }
    // Also support direct navigation to /confirmation (e.g., manual refresh or deep link)
    if (path === "/confirmation") {
      navigateTo("confirmation");
    }
  }, [navigateTo]);

  // Remove the old navigateTo function since we're using router now

  // Expose a global helper so external listeners can show runtime errors in the same toast
  useEffect(() => {
    try {
      (window as any).__showAppError = (msg: string) => setCheckoutError(msg);
    } catch {}
    return () => {
      try {
        delete (window as any).__showAppError;
      } catch {}
    };
  }, []);

  // Triggered from CheckoutPage for guest users
  const handleGuestCheckoutTrigger = async (details: PendingOrder) => {
    try {
      await requestOtp(details.phone);
      setPendingOrderDetails(details);
      setAuthPhoneNumber(details.phone);
      try {
        sessionStorage.setItem("kaj-auth-phone", details.phone);
      } catch {}
      navigateTo("otp");
    } catch (error) {
      console.error("Failed to request OTP", error);
      alert(
        "خطا در ارسال کد تایید. لطفا شماره را بررسی کرده و دوباره تلاش کنید."
      );
    }
  };

  // Triggered from OtpPage on success
  const handleOtpSuccess = () => {
    if (pendingOrderDetails) {
      // The user is now logged in via AuthContext. Proceed to create the order.
      handleCheckout(pendingOrderDetails);
      setPendingOrderDetails(null);
    } else {
      // If there was no pending order, just go home (e.g., a regular login)
      navigateTo("home");
    }
    try {
      sessionStorage.removeItem("kaj-auth-phone");
    } catch {}
  };

  // Triggered for logged-in users from CheckoutPage, or for new users after OTP success
  const handleCheckout = async (details: {
    items: CartItem[];
    address: string;
    phone: string;
    name: string;
    orderType?: "DELIVERY" | "PICKUP" | "DINE_IN";
  }) => {
    const total = getCartTotal();

    try {
      // If the address is new, add it to the user's profile
      if (
        currentUser &&
        Array.isArray(currentUser.addresses) &&
        !currentUser.addresses.includes(details.address)
      ) {
        await addAddress(details.address);
      }

      // Refresh user data if needed
      if (currentUser) {
        try {
          await refreshUser();
          console.log("User data refreshed before order creation");
        } catch (refreshError) {
          console.error("Failed to refresh user data:", refreshError);
          // Don't block the payment flow if refresh fails
        }
      }

      // Create order and request payment in one step
      const paymentData = {
        items: details.items.map((item) => {
          const addonsList = (item.selectedAddons || [])
            .filter((a) => a.quantity > 0)
            .map((a) => ({
              addonId: a.addonId.toString(),
              quantity: a.quantity,
            }));
          return {
            menuItemId: item.id.toString(),
            quantity: item.quantity,
            price: item.price, // base product unit price (addons priced server-side using addons[])
            ...(addonsList.length ? { addons: addonsList } : {}),
          };
        }),
        deliveryAddress: details.address,
        phone: details.phone,
        totalAmount: total,
        paymentMethod: "online" as const,
        orderType: details.orderType || "DELIVERY",
      };

      const paymentResponse = await api.requestPayment(paymentData);

      if (paymentResponse.success && paymentResponse.paymentUrl) {
        try {
          if (paymentResponse.orderId) {
            localStorage.setItem("lastOrderId", paymentResponse.orderId);
          }
        } catch {}
        console.log("Redirecting to payment:", paymentResponse.paymentUrl);
        // Clear cart only after successful payment redirect
        // (cart will be cleared when user returns from payment)
        // Redirect to Zarinpal sandbox
        window.location.href = paymentResponse.paymentUrl;
      } else {
        throw new Error(paymentResponse.message || "Payment request failed");
      }
    } catch (error) {
      console.error("Failed to create order or initiate payment", error);
      // Show server-provided message when available
      const msg = error instanceof Error ? error.message : String(error || "");
      setCheckoutError(
        msg && !msg.includes("Payment request failed")
          ? msg
          : "متاسفانه در ثبت سفارش یا پرداخت شما مشکلی پیش آمد. لطفا دوباره تلاش کنید."
      );
    }
  };

  // Handle login request from LoginPage
  const handleLoginRequest = async (phone: string) => {
    try {
      await requestOtp(phone);
      setAuthPhoneNumber(phone);
      try {
        sessionStorage.setItem("kaj-auth-phone", phone);
      } catch {}
      navigateTo("otp");
    } catch (error) {
      console.error("Failed to request OTP", error);
      throw error; // Let LoginPage handle the error
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p>در حال بارگذاری...</p>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage onNavigate={navigateTo} />;
      case "menu":
        return <MenuPage onNavigate={navigateTo} />;
      case "checkout":
        return (
          <CheckoutPage
            onNavigate={navigateTo}
            onCheckout={handleCheckout}
            onGuestCheckout={handleGuestCheckoutTrigger}
          />
        );
      case "login":
        return (
          <LoginPage
            onNavigate={navigateTo}
            onRequestOtp={handleLoginRequest}
          />
        );
      case "confirmation":
        return <ConfirmationPage onNavigate={navigateTo} />;
      case "profile":
        return currentUser ? (
          <ProfilePage onNavigate={navigateTo} />
        ) : (
          <HomePage onNavigate={navigateTo} />
        );
      case "otp": {
        // Guard against direct navigation to /otp without a phone number.
        const phone =
          authPhoneNumber || sessionStorage.getItem("kaj-auth-phone") || "";
        if (!phone) {
          // Redirect to login page to request phone
          navigateTo("login");
          return <HomePage onNavigate={navigateTo} />;
        }
        return (
          <OtpPage
            onSuccess={handleOtpSuccess}
            phoneNumber={phone}
            onNavigate={navigateTo}
          />
        );
      }
      default:
        return <HomePage onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {renderPage()}

      {/* Checkout error toast */}
      {checkoutError && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 max-w-lg w-[90%]">
          <div className="bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-start gap-3">
            <div className="flex-1 text-sm leading-relaxed">
              {checkoutError}
            </div>
            <button
              onClick={() => setCheckoutError(null)}
              aria-label="بستن"
              className="text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Small component that registers global handlers and forwards runtime
// errors to the in-app error display (window.__showAppError is set
// by AppContent).
const GlobalErrorHandler: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  useEffect(() => {
    const show = (msg?: string) => {
      try {
        const fn = (window as any).__showAppError;
        if (typeof fn === "function") fn(msg || "متاسفانه خطایی پیش آمد.");
      } catch {}
    };

    const onError = (ev: any) => {
      try {
        console.error("Global error:", ev.error || ev.message, ev);
        const m = ev?.error?.message || ev?.message || String(ev?.error || ev);
        show(m);
      } catch {}
    };

    const onRejection = (ev: any) => {
      try {
        console.error("Unhandled rejection:", ev.reason);
        const m = ev?.reason?.message || String(ev?.reason);
        show(m);
      } catch {}
    };

    window.addEventListener("error", onError as EventListener);
    window.addEventListener("unhandledrejection", onRejection as EventListener);
    return () => {
      window.removeEventListener("error", onError as EventListener);
      window.removeEventListener(
        "unhandledrejection",
        onRejection as EventListener
      );
    };
  }, []);

  return <>{children}</>;
};

// Wrap main app and export
const AppWrapper: React.FC = () => (
  <AuthProvider>
    <CartProvider>
      <RouterProvider>
        <ErrorBoundary>
          <GlobalErrorHandler>
            <AppContent />
          </GlobalErrorHandler>
        </ErrorBoundary>
      </RouterProvider>
    </CartProvider>
  </AuthProvider>
);

export default AppWrapper;
