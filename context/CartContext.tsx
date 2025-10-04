import React, {
  createContext,
  useState,
  useContext,
  useMemo,
  useEffect,
} from "react";
import type { CartItem, MenuItem, CartItemAddon, ProductAddon } from "../types";

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: MenuItem, selectedAddons?: CartItemAddon[]) => void;
  updateQuantity: (itemId: number | string, newQuantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getItemQuantity: (itemId: number | string) => number;
  setItemAddons: (itemId: number | string, addons: CartItemAddon[]) => void;
  incrementAddon: (itemId: number | string, addon: ProductAddon) => void;
  decrementAddon: (itemId: number | string, addonId: number | string) => void;
  getItemAddonQuantity: (
    itemId: number | string,
    addonId: number | string
  ) => number;
  computeItemUnitPrice: (item: CartItem) => number; // base + addons per single unit
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const storedItems = localStorage.getItem("cartItems");
      return storedItems ? JSON.parse(storedItems) : [];
    } catch (error) {
      console.error("Error reading cart from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("cartItems", JSON.stringify(cartItems));
    } catch (error) {
      console.error("Error saving cart to localStorage", error);
    }
  }, [cartItems]);

  const addToCart = (item: MenuItem, selectedAddons?: CartItemAddon[]) => {
    if (item.available === false) {
      // Silently ignore or we could toast a message later
      return;
    }
    setCartItems((prevItems) => {
      const existingItem = prevItems.find(
        (cartItem) => cartItem.id === item.id
      );
      if (existingItem) {
        return prevItems.map((cartItem) =>
          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
              }
            : cartItem
        );
      }
      return [
        ...prevItems,
        {
          ...item,
          quantity: 1,
          selectedAddons: selectedAddons || [],
        },
      ];
    });
  };

  const updateQuantity = (itemId: number | string, newQuantity: number) => {
    setCartItems((prevItems) => {
      if (newQuantity <= 0) {
        return prevItems.filter((item) => item.id !== itemId);
      }
      return prevItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const setItemAddons = (itemId: number | string, addons: CartItemAddon[]) => {
    setCartItems((prev) =>
      prev.map((it) =>
        it.id === itemId ? { ...it, selectedAddons: addons } : it
      )
    );
  };

  const incrementAddon = (itemId: number | string, addon: ProductAddon) => {
    setCartItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        if (it.available === false || addon.available === false) return it;
        const existing = (it.selectedAddons || []).find(
          (a) => a.addonId === addon.id
        );
        const max = addon.maxPerItem ?? Infinity;
        if (existing) {
          if (existing.quantity >= max) return it; // enforce max
          return {
            ...it,
            selectedAddons: (it.selectedAddons || []).map((a) =>
              a.addonId === addon.id ? { ...a, quantity: a.quantity + 1 } : a
            ),
          };
        }
        return {
          ...it,
          selectedAddons: [
            ...(it.selectedAddons || []),
            {
              addonId: addon.id,
              name: addon.name,
              price: addon.price,
              quantity: 1,
            },
          ],
        };
      })
    );
  };

  const decrementAddon = (
    itemId: number | string,
    addonId: number | string
  ) => {
    setCartItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const updated = (it.selectedAddons || [])
          .map((a) =>
            a.addonId === addonId ? { ...a, quantity: a.quantity - 1 } : a
          )
          .filter((a) => a.quantity > 0);
        return { ...it, selectedAddons: updated };
      })
    );
  };

  const getItemAddonQuantity = (
    itemId: number | string,
    addonId: number | string
  ) => {
    const item = cartItems.find((i) => i.id === itemId);
    if (!item || !item.selectedAddons) return 0;
    const found = item.selectedAddons.find((a) => a.addonId === addonId);
    return found ? found.quantity : 0;
  };

  const computeItemUnitPrice = (item: CartItem) => {
    const base = item.price;
    const addonsTotal = (item.selectedAddons || []).reduce(
      (sum, a) => sum + a.price * a.quantity,
      0
    );
    return base + addonsTotal;
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = useMemo(
    () => () => {
      return cartItems.reduce((total, item) => {
        const unit = computeItemUnitPrice(item);
        return total + unit * item.quantity;
      }, 0);
    },
    [cartItems]
  );

  const getItemQuantity = useMemo(
    () => (itemId: number | string) => {
      const item = cartItems.find((i) => i.id === itemId);
      return item ? item.quantity : 0;
    },
    [cartItems]
  );

  const value: CartContextType = {
    cartItems,
    addToCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getItemQuantity,
    setItemAddons,
    incrementAddon,
    decrementAddon,
    getItemAddonQuantity,
    computeItemUnitPrice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
