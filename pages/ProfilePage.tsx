import React, { useState, useEffect, useCallback } from "react";
import type { Page } from "../App";
import type { OrderDetails } from "../types";
import { useAuth } from "../context/AuthContext";
import { OrderHistoryCard } from "../components/OrderHistoryCard";
import AddressModal from "../components/AddressModal";
import {
  ArrowRightIcon,
  LogoutIcon,
  PlusIcon,
} from "../components/icons/Icons";
import * as api from "../services/api";

interface ProfilePageProps {
  onNavigate: (page: Page) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const [orderHistory, setOrderHistory] = useState<OrderDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser, logout, addAddressDetailed, refreshUser } = useAuth();
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(
    null
  );

  // Normalize address objects to strings for rendering
  const stringifyAddress = (addr: any): string => {
    if (!addr) return "";
    if (typeof addr === "string") return addr;
    if (typeof addr === "object") {
      if (typeof addr.address === "string" && addr.address.trim().length > 0) {
        return addr.address.trim();
      }
      const parts: string[] = [];
      if (addr.street) parts.push(String(addr.street));
      if (addr.city) parts.push(String(addr.city));
      if (addr.postalCode) parts.push(String(addr.postalCode));
      if (addr.details) parts.push(String(addr.details));
      return parts.length > 0 ? parts.join("، ") : JSON.stringify(addr);
    }
    try {
      return String(addr);
    } catch {
      return "";
    }
  };

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const { orders } = await api.fetchOrderHistory();
      setOrderHistory(orders);
    } catch (error) {
      console.error("Failed to fetch order history", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, currentUser?.phone]);

  useEffect(() => {
    const onFocus = () => loadHistory();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadHistory]);

  const handleLogout = () => {
    logout();
    onNavigate("home");
  };

  // Save address via detailed modal
  const handleSaveAddressDetailed = async (data: {
    address: string;
    details?: string;
    title?: string;
    phone?: string;
    lat?: number;
    lng?: number;
  }) => {
    try {
      await addAddressDetailed({
        address: data.address,
        details: data.details,
        title: data.title,
        phone: data.phone || currentUser?.phone,
        isDefault: false,
      });
      await refreshUser();
      setIsAddingAddress(false);
    } catch (error) {
      console.error("Error saving address:", error);
      alert("خطا در ذخیره آدرس.");
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    setDeletingAddressId(addressId);
    try {
      await api.deleteUserAddress(addressId);
      await refreshUser();
    } catch (error) {
      console.error("Error deleting address:", error);
      alert("خطا در حذف آدرس");
    } finally {
      setDeletingAddressId(null);
    }
  };

  const renderOrderHistory = () => {
    if (isLoading) {
      return (
        <p className="text-center text-gray-400 mt-10">
          در حال بارگذاری تاریخچه سفارشات...
        </p>
      );
    }
    if (orderHistory.length === 0) {
      return (
        <div className="text-center text-gray-400 mt-10 flex flex-col items-center">
          <p className="text-base">شما هنوز سفارشی ثبت نکرده‌اید.</p>
          <button
            onClick={() => onNavigate("menu")}
            className="mt-6 bg-green-500 text-black font-bold py-3 px-8 rounded-lg"
          >
            شروع سفارش
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {orderHistory.map((order) => (
          <OrderHistoryCard key={order.id} order={order} />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-black min-h-screen text-white p-4 pb-10">
      <header className="flex items-center justify-between mb-6">
        <button onClick={() => onNavigate("home")} className="p-2">
          <ArrowRightIcon />
        </button>
        <h1 className="text-xl font-bold">پروفایل کاربری</h1>
        <button onClick={handleLogout} className="p-2 text-red-400">
          <LogoutIcon />
        </button>
      </header>

      <div className="bg-gray-900 p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold mb-3">اطلاعات شما</h2>
          <button
            onClick={loadHistory}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 py-1 px-3 rounded"
          >
            به‌روزرسانی سفارشات
          </button>
        </div>
        {currentUser?.name ? (
          <div className="mb-1">
            <span className="text-gray-300">نام: </span>
            <span className="text-white font-semibold">{currentUser.name}</span>
          </div>
        ) : (
          <div className="mb-1">
            <span className="text-gray-300">نام: </span>
            <span className="text-amber-400 text-sm">
              نام شما هنگام سفارش بعدی ثبت خواهد شد
            </span>
          </div>
        )}
        <p className="text-gray-400">
          شماره تماس:{" "}
          <span className="text-white font-mono tracking-wider">
            {currentUser?.phone}
          </span>
        </p>
      </div>

      <div className="bg-gray-900 p-4 rounded-lg mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">آدرس‌های من</h2>
          {!isAddingAddress && (
            <button
              onClick={() => setIsAddingAddress(true)}
              className="text-sm bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <PlusIcon />
              افزودن آدرس
            </button>
          )}
        </div>
        {/* Address add modal (map + fields) */}
        <AddressModal
          open={isAddingAddress}
          onClose={() => setIsAddingAddress(false)}
          onSave={handleSaveAddressDetailed}
          initialPhone={currentUser?.phone}
        />

        {currentUser &&
        currentUser.addressItems &&
        currentUser.addressItems.length > 0 ? (
          <div className="space-y-2">
            {currentUser.addressItems.map((addressItem) => (
              <div
                key={addressItem.id}
                className="flex items-center justify-between bg-gray-800 p-3 rounded-lg"
              >
                <span className="text-gray-300">{addressItem.formatted}</span>
                <button
                  onClick={() => handleDeleteAddress(addressItem.id)}
                  disabled={deletingAddressId === addressItem.id}
                  className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  title="حذف آدرس"
                >
                  {deletingAddressId === addressItem.id && (
                    <div className="animate-spin rounded-full h-3 w-3 border border-red-400 border-t-transparent"></div>
                  )}
                  {deletingAddressId === addressItem.id
                    ? "در حال حذف..."
                    : "حذف"}
                </button>
              </div>
            ))}
          </div>
        ) : currentUser &&
          currentUser.addresses &&
          currentUser.addresses.length > 0 ? (
          <ul className="space-y-2 list-disc list-inside text-gray-300 pl-2">
            {currentUser.addresses.map((address, index) => {
              const addrString = stringifyAddress(address as any);
              return <li key={index}>{addrString}</li>;
            })}
          </ul>
        ) : (
          !isAddingAddress && (
            <p className="text-gray-400">هنوز آدرسی ثبت نکرده‌اید.</p>
          )
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">تاریخچه سفارشات</h2>
        {renderOrderHistory()}
      </div>
    </div>
  );
};
