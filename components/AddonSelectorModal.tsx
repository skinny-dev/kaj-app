import React, { useState, useEffect, useMemo } from "react";
import ModalSheet from "./ModalSheet";
import type { MenuItem, ProductAddon, CartItemAddon } from "../types";
import { useCart } from "../context/CartContext";

interface AddonSelectorModalProps {
  open: boolean;
  onClose: () => void;
  product: MenuItem | null;
  onConfirm: (addons: CartItemAddon[]) => void;
}

const AddonSelectorModal: React.FC<AddonSelectorModalProps> = ({
  open,
  onClose,
  product,
  onConfirm,
}) => {
  const { getItemQuantity, getItemAddonQuantity } = useCart();
  const [localAddons, setLocalAddons] = useState<CartItemAddon[]>([]);

  // Initialize with current selection (future editing scenario)
  useEffect(() => {
    if (!product) return;
    // If product carries previously selectedAddons (when editing), map them
    const existing: CartItemAddon[] = (product as any).selectedAddons || [];
    setLocalAddons(existing.map((a) => ({ ...a })));
  }, [product, open]); // Add 'open' to dependencies to refresh when modal opens

  const availableAddons: ProductAddon[] = useMemo(
    () => (product?.productAddons || []).filter((a) => a.available !== false),
    [product]
  );

  const productQty = product ? getItemQuantity(product.id) || 1 : 1;

  const getLocalQuantity = (addonId: string | number) => {
    const found = localAddons.find((a) => a.addonId === addonId);
    return found ? found.quantity : 0;
  };

  const increment = (addon: ProductAddon) => {
    setLocalAddons((prev) => {
      const existing = prev.find((a) => a.addonId === addon.id);
      const max = addon.maxPerItem ?? Infinity;
      if (existing) {
        if (existing.quantity >= max) return prev; // respect max
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
  };

  const decrement = (addonId: string | number) => {
    setLocalAddons((prev) => {
      return prev
        .map((a) =>
          a.addonId === addonId ? { ...a, quantity: a.quantity - 1 } : a
        )
        .filter((a) => a.quantity > 0);
    });
  };

  const totalAddonCostPerUnit = localAddons.reduce(
    (sum, a) => sum + a.price * a.quantity,
    0
  );
  const totalAddonCostAll = totalAddonCostPerUnit * productQty;

  const confirm = () => {
    onConfirm(localAddons);
    onClose();
  };

  return (
    <ModalSheet
      open={open}
      onClose={onClose}
      title={product ? `افزودنی ها - ${product.name}` : "افزودنی ها"}
    >
      {!product && (
        <p className="text-sm text-gray-400">محصولی انتخاب نشده است.</p>
      )}
      {product && (
        <div className="space-y-5">
          {availableAddons.length === 0 && (
            <p className="text-center text-gray-400 text-sm">
              افزودنی فعالی برای این محصول وجود ندارد.
            </p>
          )}

          <ul className="space-y-3">
            {availableAddons.map((addon) => {
              const q = getLocalQuantity(addon.id);
              const max = addon.maxPerItem ?? Infinity;
              return (
                <li
                  key={addon.id}
                  className="flex items-center justify-between bg-gray-800 rounded-lg p-3"
                >
                  <div>
                    <p className="font-semibold text-sm">{addon.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {addon.price.toLocaleString("fa-IR")} تومان{" "}
                      {max !== Infinity && (
                        <span className="text-gray-500">(حداکثر {max})</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {q > 0 && (
                      <button
                        onClick={() => decrement(addon.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-700 hover:bg-gray-600 text-red-300 text-lg"
                        aria-label="کاهش"
                      >
                        -
                      </button>
                    )}
                    <span className="w-6 text-center font-bold text-sm">
                      {q}
                    </span>
                    <button
                      onClick={() => increment(addon)}
                      disabled={q >= max}
                      className="w-8 h-8 flex items-center justify-center rounded-md bg-green-500 disabled:bg-green-800 text-black font-bold text-lg"
                      aria-label="افزایش"
                    >
                      +
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-gray-700 pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">جمع افزودنی برای هر واحد</span>
              <span className="font-semibold">
                {totalAddonCostPerUnit.toLocaleString("fa-IR")} تومان
              </span>
            </div>
            {productQty > 1 && (
              <div className="flex justify-between text-xs text-gray-400">
                <span>تعداد محصول × {productQty.toLocaleString("fa-IR")}</span>
                <span>{totalAddonCostAll.toLocaleString("fa-IR")} تومان</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-semibold"
              type="button"
            >
              انصراف
            </button>
            <button
              onClick={confirm}
              className="flex-1 py-3 rounded-lg bg-green-500 hover:bg-green-400 text-black text-sm font-bold"
              type="button"
            >
              تایید
            </button>
          </div>
        </div>
      )}
    </ModalSheet>
  );
};

export default AddonSelectorModal;
