"use client";
import React, { useState, useEffect, useCallback, useContext } from "react";
import ImageWithFallback from "@/app/components/ImageWithFallback";
import Link from "next/link";
import {
  X,
  ShoppingCart,
  Trash2,
  Store,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { ShopContext } from "../context";
import { getOrCreateGuestBrowserId } from "@/app/utils/guest";

export default function CartDrawer({
  open,
  onClose,
  cartCount: cartCountProp,
  removingFromCartId: removingFromCartIdProp,
  onCartChanged,
}) {
  const shopContext = useContext(ShopContext);
  const cartCount =
    typeof cartCountProp === "number"
      ? cartCountProp
      : Number(shopContext?.cartCount || 0);
  const removingFromCartId =
    removingFromCartIdProp ?? shopContext?.removingFromCartId ?? null;
  const removeFromCartFromContext = shopContext?.removeFromCart;

  const [vendorGroups, setVendorGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [localRemovingProductId, setLocalRemovingProductId] = useState(null);

  const fetchCartDetails = useCallback(async () => {
    setLoading(true);
    try {
      const guestBrowserId = getOrCreateGuestBrowserId();
      const url = new URL("/api/shop/cart-details", window.location.origin);
      if (guestBrowserId) url.searchParams.set("guestBrowserId", guestBrowserId);
      url.searchParams.set("_ts", String(Date.now()));
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) return;
      const body = await res.json();
      setVendorGroups(body.vendors || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchCartDetails();
  }, [open, fetchCartDetails, cartCount]);

  const handleRemove = async (productId, cartItemId) => {
    if (removeFromCartFromContext) {
      await removeFromCartFromContext(productId);
    } else if (cartItemId) {
      setLocalRemovingProductId(productId);
      try {
        await fetch("/api/storefront/cart", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartItemId }),
        });
      } catch {
        // ignore
      } finally {
        setLocalRemovingProductId(null);
      }
    }
    onCartChanged?.();
    // Re-fetch after removal
    setTimeout(fetchCartDetails, 300);
  };

  const totalItems = vendorGroups.reduce(
    (sum, g) => sum + g.items.reduce((s, i) => s + i.quantity, 0),
    0
  );
  const grandTotal = vendorGroups.reduce((sum, g) => sum + g.subtotal, 0);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <ShoppingCart className="size-5 text-[#A5914B]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Cart
            </h2>
            {totalItems > 0 && (
              <span className="bg-[#A5914B] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalItems}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer"
            aria-label="Close cart"
          >
            <X className="size-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="size-6 text-[#A5914B] animate-spin" />
            </div>
          ) : vendorGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <ShoppingBag className="size-12 mb-3 text-gray-300" />
              <p className="font-medium">Your cart is empty</p>
              <p className="text-sm mt-1">Add products from the shop to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {vendorGroups.map((group) => (
                <div key={group.vendor.slug} className="p-4">
                  {/* Vendor header */}
                  <div className="flex items-center gap-2 mb-3">
                    {group.vendor.logo ? (
                      <ImageWithFallback
                        src={group.vendor.logo}
                        alt={group.vendor.name}
                        width={20}
                        height={20}
                        className="rounded-full object-cover"
                        priority
                      />
                    ) : (
                      <Store className="size-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {group.vendor.name}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="space-y-3">
                    {group.items.map((item) => {
                      const isRemoving =
                        removingFromCartId === item.productId ||
                        localRemovingProductId === item.productId;
                      return (
                        <div
                          key={item.cartItemId}
                          className={`flex gap-3 ${isRemoving ? "opacity-50" : ""}`}
                        >
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                            {item.image ? (
                              <ImageWithFallback
                                src={item.image}
                                alt={item.name}
                                fill
                                className="object-cover"
                                priority
                                sizes="64px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="size-6 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                              {item.name}
                            </p>
                            {item.variation && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {item.variation.label ||
                                  [item.variation.color, item.variation.size]
                                    .filter(Boolean)
                                    .join(" / ")}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-[#A5914B]">
                                  GHS {item.price.toLocaleString()}
                                </span>
                                {item.quantity > 1 && (
                                  <span className="text-xs text-gray-400">
                                    × {item.quantity}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() =>
                                  handleRemove(item.productId, item.cartItemId)
                                }
                                disabled={isRemoving}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                                aria-label={`Remove ${item.name} from cart`}
                              >
                                {isRemoving ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Vendor subtotal */}
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-500">
                      Subtotal: <span className="font-semibold text-gray-900 dark:text-white">GHS {group.subtotal.toLocaleString()}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with grand total + unified checkout */}
        {vendorGroups.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500">Grand Total</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  GHS {grandTotal.toLocaleString()}
                </p>
              </div>
            </div>
            <Link
              href="/shop/checkout"
              className="flex items-center justify-center gap-2 w-full bg-[#A5914B] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#8B7A3F] transition-colors"
              onClick={onClose}
            >
              <ShoppingCart className="size-4" />
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
