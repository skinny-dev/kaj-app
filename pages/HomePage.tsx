import React from "react";
import type { Page } from "../App";
import { PhoneIcon, MapPinIcon, UserIcon } from "../components/icons/Icons";
import { useAuth } from "../context/AuthContext";

interface HomePageProps {
  onNavigate: (page: Page) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const restaurantPhone = "021-9466555";

  const handleProfileClick = () => {
    if (currentUser) {
      onNavigate("profile");
    } else {
      onNavigate("login");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white p-6">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={handleProfileClick}
            className="p-1"
            aria-label={currentUser ? "پروفایل کاربری" : "ورود"}
            title={currentUser ? "پروفایل کاربری" : "ورود / ثبت‌نام"}
          >
            <UserIcon />
          </button>
          <a
            href={`tel:${currentUser?.phone || restaurantPhone}`}
            className="p-1"
            aria-label="Call restaurant"
          >
            <PhoneIcon />
          </a>
        </div>
        <div className="text-right">
          <p className="text-green-400 font-semibold">باز است</p>
          <p className="text-sm text-gray-400">از ساعت ۸ صبح تا ۱۲ شب</p>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center text-center">
        <h1 className="text-8xl font-bold tracking-widest">کاج</h1>
        <p className="text-xl text-gray-300 mt-2">رستوران | کافه</p>
      </main>

      <footer className="flex flex-col gap-4">
        <button
          onClick={() => onNavigate("menu")}
          className="w-full bg-green-500 text-black font-bold py-4 rounded-lg text-lg transition-transform transform hover:scale-105"
        >
          سفارش آنلاین
        </button>
        <div className="text-center">
          <a href={`tel:${restaurantPhone}`} className="text-lg tracking-wider">
            94 66 555 - 021
          </a>
          <p className="text-gray-400 mt-2">
            تهران، چهاردانگه، مجتمع افشین، کافه رستوران کاج
          </p>
        </div>
        <a
          href="https://www.google.com/maps"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-gray-800 text-white font-semibold py-3 rounded-lg text-center flex items-center justify-center gap-2 transition-colors hover:bg-gray-700"
        >
          <MapPinIcon />
          مسیریابی
        </a>
      </footer>
    </div>
  );
};
