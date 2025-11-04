
import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { MenuItemCard } from '../components/MenuItemCard';
import { UserIcon, ArrowRightIcon } from '../components/icons/Icons';
import type { Page } from '../App';
import * as api from '../services/api';
import type { MenuItem } from '../types';

interface MenuPageProps {
  onNavigate: (page: Page) => void;
}

export const MenuPage: React.FC<MenuPageProps> = ({ onNavigate }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getCartTotal, cartItems } = useCart();
  const { currentUser } = useAuth();
  const total = getCartTotal();
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        setError(null);
        setIsLoading(true);
        const { menuItems: fetchedItems } = await api.fetchMenu();
        const uniqueCategories = [...new Set(fetchedItems.map(item => item.category))];
        setMenuItems(fetchedItems);
        setCategories(uniqueCategories);
        if (uniqueCategories.length > 0) {
          setSelectedCategory(uniqueCategories[0]);
        }
      } catch (err) {
        setError("خطا در دریافت منو. لطفا دوباره تلاش کنید.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadMenu();
  }, []);

  // Persist dine-in intent when arriving via QR or URL hints on /menu
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search || "");
      const get = (k: string) => (params.get(k) || "").toLowerCase();
      const has = (k: string) => params.has(k);
      const truthy = (v: string) => ["1", "true", "yes", "y"].includes(v);

      const type = get("type") || get("orderType") || get("ordertype");
      const mode = get("mode") || get("service");
      const dinein = get("dinein") || get("dine-in") || get("dine_in");
      const salon = get("salon") || get("سالن");
      const guests = get("guests") || get("guest") || get("persons");

      const isDineInHint =
        truthy(dinein) ||
        ["dinein", "dine-in", "dine_in", "dine in"].includes(type) ||
        ["salon", "inhouse", "in-house", "dinein"].includes(mode) ||
        ["salon", "سالن"].includes(salon) ||
        has("table") ||
        has("tableId") ||
        has("desk") ||
        has("deskId");

      if (isDineInHint) {
        localStorage.setItem("kaj-dinein", "1");
        localStorage.setItem("kaj-order-type", "DINE_IN");
        // Initialize guest count if provided or not set yet
        const parsed = parseInt(guests, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          localStorage.setItem("kaj-guest-count", String(parsed));
        } else if (!localStorage.getItem("kaj-guest-count")) {
          localStorage.setItem("kaj-guest-count", "1");
        }
      }
    } catch {}
  }, []);

  const filteredItems = menuItems.filter(item => item.category === selectedCategory);

  const handleProfileClick = () => {
    if (currentUser) {
        onNavigate('profile');
    }
  };

  const renderContent = () => {
      if(isLoading) {
          return <p className="text-center mt-10">در حال بارگذاری منو...</p>
      }
      if(error) {
          return <p className="text-center text-red-400 mt-10">{error}</p>
      }
      return (
          <div className="grid grid-cols-1 gap-4">
              {filteredItems.map(item => (
                <MenuItemCard key={item.id} item={item} />
              ))}
          </div>
      )
  }

  return (
    <div className="bg-black min-h-screen text-white pb-28">
      <header className="p-4 flex justify-between items-center sticky top-0 bg-black z-10 border-b border-gray-800">
        <button onClick={() => onNavigate('home')} className="p-2">
            <ArrowRightIcon />
        </button>
        <h1 className="text-xl font-bold">منو</h1>
        <button 
            onClick={handleProfileClick} 
            className={`p-2 ${!currentUser ? 'opacity-50 cursor-default' : ''}`}
            aria-label="User Profile"
        >
            <UserIcon />
        </button>
      </header>

      <div className="p-4">
        <div className="flex overflow-x-auto space-x-4 space-x-reverse pb-3 mb-4 scrollbar-hide">
          {categories.map((category, index) => (
            <button
              key={`category-${index}-${category}`}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-colors ${
                selectedCategory === category
                  ? 'bg-green-500 text-black'
                  : 'bg-gray-800 text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {renderContent()}
      </div>

      {cartItemCount > 0 && (
        <footer className="fixed bottom-0 right-0 left-0 bg-gray-900 p-4 border-t border-gray-700">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="text-right">
                <span className="text-lg font-bold">{total.toLocaleString('fa-IR')}</span>
                <span className="text-sm text-gray-400 mr-1">تومان</span>
            </div>
            <button
              onClick={() => onNavigate('checkout')}
              className="bg-green-500 text-black font-bold py-3 px-8 rounded-lg text-base transition-transform transform hover:scale-105"
            >
              ثبت سفارش
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};
