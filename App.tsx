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

  // Triggered from CheckoutPage for guest users
  const handleGuestCheckoutTrigger = async (details: PendingOrder) => {
    try {
      await requestOtp(details.phone);
      setPendingOrderDetails(details);
      setAuthPhoneNumber(details.phone);
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
  };

  // Triggered for logged-in users from CheckoutPage, or for new users after OTP success
  const handleCheckout = async (details: {
    items: CartItem[];
    address: string;
    phone: string;
    name: string;
    orderType?: "DELIVERY" | "PICKUP";
  }) => {
    const total = getCartTotal();

    try {
      // If the address is new, add it to the user's profile
      if (currentUser && !currentUser.addresses.includes(details.address)) {
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
        items: details.items.map((item) => ({
          menuItemId: item.id.toString(),
          quantity: item.quantity,
          price: item.price, // base product unit price (addons priced server-side using addons[])
          addons: (item.selectedAddons || [])
            .filter((a) => a.quantity > 0)
            .map((a) => ({
              addonId: a.addonId.toString(),
              quantity: a.quantity,
            })),
        })),
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
      alert(
        "متاسفانه در ثبت سفارش یا پرداخت شما مشکلی پیش آمد. لطفا دوباره تلاش کنید."
      );
    }
  };

  // Handle login request from LoginPage
  const handleLoginRequest = async (phone: string) => {
    try {
      await requestOtp(phone);
      setAuthPhoneNumber(phone);
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
      case "otp":
        return (
          <OtpPage
            onSuccess={handleOtpSuccess}
            phoneNumber={authPhoneNumber}
            onNavigate={navigateTo}
          />
        );
      default:
        return <HomePage onNavigate={navigateTo} />;
    }
  };

  return <div className="min-h-screen bg-black">{renderPage()}</div>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <RouterProvider>
          <AppContent />
        </RouterProvider>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
