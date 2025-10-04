import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import AddonSelectorModal from "./AddonSelectorModal";
import type { MenuItem, CartItemAddon, ProductAddon } from "../types";
import { resolveImageUrl } from "../services/assets";

interface MenuItemCardProps {
  item: MenuItem;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item }) => {
  const {
    addToCart,
    updateQuantity,
    getItemQuantity,
    incrementAddon,
    decrementAddon,
    cartItems,
    setItemAddons,
    getItemAddonQuantity,
  } = useCart();
  const quantity = getItemQuantity(item.id);
  // Local (pre-add) addon selections; once item is in cart we rely on cart state instead
  const [localAddons, setLocalAddons] = useState<CartItemAddon[]>([]);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const existingCartItem = cartItems.find((ci) => ci.id === item.id);

  // We now want to show unavailable addons too (dimmed) so user sees full list
  const rawAddons: ProductAddon[] = Array.isArray(item.productAddons)
    ? item.productAddons
    : [];
  const availableAddons: ProductAddon[] = rawAddons;

  const getAddonQuantity = (addonId: string | number) => {
    if (existingCartItem && existingCartItem.selectedAddons) {
      const found = existingCartItem.selectedAddons.find(
        (a) => a.addonId === addonId
      );
      return found ? found.quantity : 0;
    }
    const local = localAddons.find((a) => a.addonId === addonId);
    return local ? local.quantity : 0;
  };

  const handleIncrementAddon = (addon: ProductAddon) => {
    const max = addon.maxPerItem ?? Infinity;
    const current = getAddonQuantity(addon.id);
    if (current >= max) return; // enforce max
    if (quantity === 0) {
      // Adjust local pre-cart selection
      setLocalAddons((prev) => {
        const existing = prev.find((a) => a.addonId === addon.id);
        if (existing) {
          return prev.map((a) =>
            a.addonId === addon.id ? { ...a, quantity: a.quantity + 1 } : a
          );
        }
        return [
          ...prev,
          {
            addonId: addon.id,
            name: addon.name,
            price: addon.price,
            quantity: 1,
          },
        ];
      });
    } else {
      incrementAddon(item.id, addon);
    }
  };

  const handleDecrementAddon = (addon: ProductAddon) => {
    const current = getAddonQuantity(addon.id);
    if (current <= 0) return;
    if (quantity === 0) {
      setLocalAddons((prev) =>
        prev
          .map((a) =>
            a.addonId === addon.id ? { ...a, quantity: a.quantity - 1 } : a
          )
          .filter((a) => a.quantity > 0)
      );
    } else {
      decrementAddon(item.id, addon.id);
    }
  };

  const handleToggleSingleAddon = (addon: ProductAddon) => {
    const current = getAddonQuantity(addon.id);
    if (current > 0) {
      // turn off
      handleDecrementAddon(addon);
    } else {
      handleIncrementAddon(addon);
    }
  };

  const finalizeAddToCart = () => {
    if (quantity === 0) {
      // If has addons, open modal, otherwise direct add
      if (availableAddons.length > 0) {
        setIsAddonModalOpen(true);
      } else {
        // Direct add without addons
        addToCart(item, []);
        setLocalAddons([]);
      }
    }
  };

  const handleAddonModalConfirm = (addons: CartItemAddon[]) => {
    addToCart(item, addons);
    setLocalAddons([]);
  };

  // Calculate per-unit addon total for display (current state depending on whether in cart)
  const perUnitAddonTotal = (
    existingCartItem?.selectedAddons || localAddons
  ).reduce((s, a) => s + a.price * a.quantity, 0);

  const isAvailable = item.available !== false; // default true

  return (
    <>
      <div
        className={`bg-gray-900 p-4 rounded-xl relative transition-opacity shadow-sm border border-gray-800 ${
          isAvailable ? "opacity-100" : "opacity-50"
        }`}
      >
        <div className="grid grid-cols-[5rem_1fr_auto] gap-4 items-start">
          <div className="w-20 h-20 flex items-center justify-center col-span-1 row-span-2">
            {item.imageUrl && resolveImageUrl(item.imageUrl) ? (
              <img
                src={resolveImageUrl(item.imageUrl)}
                alt={item.name}
                className="w-20 h-20 object-cover rounded-md"
                onError={(e) => {
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML =
                      '<div class="text-4xl text-gray-500">🖼️</div>';
                  }
                }}
              />
            ) : (
              <div className="text-4xl text-gray-500">🖼️</div>
            )}
          </div>
          <div className="flex-grow min-w-0 col-span-1">
            <h3 className="font-bold text-[16px] leading-snug truncate pr-1 text-gray-100">
              {item.name}
            </h3>
            {item.description && (
              <p className="text-[12px] text-gray-400 mt-1 leading-snug line-clamp-2">
                {item.description}
              </p>
            )}
            <div className="mt-2 flex items-center gap-5 text-[15px] font-semibold tracking-tight">
              <span className="text-gray-100">
                {item.price.toLocaleString("fa-IR")}
                <span className="text-[12px] font-normal mr-1 text-gray-500">
                  تومان
                </span>
              </span>
              {perUnitAddonTotal > 0 && (
                <span className="text-green-400 font-semibold">
                  <span>{perUnitAddonTotal.toLocaleString("fa-IR")}</span>
                  <span className="text-[12px] font-normal mr-1 text-green-300/70">
                    تومان
                  </span>
                </span>
              )}
            </div>
            {/* Addons moved to full-width row below */}
          </div>
          <div className="flex flex-col items-center justify-start pt-1 gap-2 col-span-1 row-span-2">
            {isAvailable ? (
              quantity === 0 ? (
                <button
                  onClick={finalizeAddToCart}
                  className="bg-green-500 text-black font-bold px-5 py-2 rounded-xl text-sm transition-transform transform hover:scale-105 shadow-sm w-full"
                >
                  افزودن
                </button>
              ) : (
                <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-1 w-full justify-center">
                  <button
                    onClick={() => updateQuantity(item.id, quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center text-lg text-green-400 rounded-md hover:bg-gray-700"
                  >
                    +
                  </button>
                  <span className="font-bold text-base w-6 text-center tabular-nums">
                    {quantity.toLocaleString("fa-IR")}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center text-lg text-red-400 rounded-md hover:bg-gray-700"
                  >
                    -
                  </button>
                </div>
              )
            ) : (
              <div className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600/20 text-red-400 border border-red-600/30 select-none">
                ناموجود
              </div>
            )}
          </div>
          {availableAddons.length > 0 && (
            <div className="col-span-3 mt-2 pt-2 border-t border-gray-800 space-y-2">
              <ul className="flex flex-col gap-2">
                {availableAddons.map((addon) => {
                  const q = getAddonQuantity(addon.id);
                  const max = addon.maxPerItem ?? 1; // default 1 for quick add
                  const nextQty = q >= max ? 0 : q + 1; // cycle
                  const atMax = q >= max && q !== 0;
                  const addonIsAvailable = addon.available !== false;
                  return (
                    <li
                      key={addon.id}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 bg-gray-800/70 transition-colors border border-gray-700/40 ${
                        q > 0 ? "ring-1 ring-green-500/40" : ""
                      } ${
                        !addonIsAvailable ? "opacity-40" : "hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex flex-col pr-3 flex-grow min-w-0">
                        <span className="text-[13px] font-semibold text-gray-100 truncate leading-tight">
                          {addon.name}
                        </span>
                        <span className="text-[12px] text-gray-300 flex items-center gap-1 mt-0.5">
                          <span>{addon.price.toLocaleString("fa-IR")}</span>
                          <span className="text-[10px] text-gray-500">
                            تومان
                          </span>
                          {q > 0 && (
                            <span className="text-[11px] text-green-400 font-semibold">
                              × {q}
                            </span>
                          )}
                          {!addonIsAvailable && (
                            <span className="text-[10px] text-red-400 font-medium ml-1">
                              ناموجود
                            </span>
                          )}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (!isAvailable || !addonIsAvailable) return; // block interaction
                          if (nextQty === 0) {
                            for (let i = 0; i < q; i++)
                              handleDecrementAddon(addon);
                          } else if (q === 0) {
                            handleIncrementAddon(addon);
                          } else {
                            if (q < max) handleIncrementAddon(addon);
                          }
                        }}
                        disabled={!isAvailable || !addonIsAvailable}
                        className={`px-3 h-8 rounded-md text-sm font-bold flex items-center gap-1 transition-colors ${
                          !isAvailable || !addonIsAvailable
                            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                            : q === 0
                            ? "bg-pink-500/20 text-pink-300 hover:bg-pink-500/30"
                            : atMax
                            ? "bg-green-600/20 text-green-300 hover:bg-green-600/30"
                            : "bg-green-500 text-black hover:bg-green-400"
                        }`}
                      >
                        {q === 0 && <span>افزودن</span>}
                        {q > 0 && !atMax && (
                          <span>{q + 1 <= max ? "افزودن +" : "حداکثر"}</span>
                        )}
                        {atMax && <span>حذف</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        {/* grid end */}
        {!isAvailable && (
          <div className="absolute inset-0 rounded-lg cursor-not-allowed" />
        )}
      </div>
      {/* Addon Selection Modal */}
      <AddonSelectorModal
        open={isAddonModalOpen}
        onClose={() => setIsAddonModalOpen(false)}
        product={
          {
            ...item,
            // Pass existing addons for editing
            selectedAddons: existingCartItem?.selectedAddons || [],
          } as any
        }
        onConfirm={handleAddonModalConfirm}
      />
    </>
  );
};
