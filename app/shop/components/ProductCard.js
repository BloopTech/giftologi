"use client";
import React from "react";
import ImageWithFallback from "@/app/components/ImageWithFallback";
import {
  BadgeCheck,
  ShoppingCart,
  Zap,
  Loader2,
  Gift,
  Check,
  Trash2,
} from "lucide-react";
import { useShop } from "../context";

export default function ProductCard({ product }) {
  const {
    openProductDetail,
    openAddToRegistry,
    addToCart,
    buyNow,
    removeFromCart,
    addingToCartId,
    buyingProductId,
    removingFromCartId,
    isHost,
    isProductInRegistry,
    isInCart,
  } = useShop();

  const p = product;
  const isAdding = addingToCartId === p.id;
  const isBuying = buyingProductId === p.id;
  const isRemoving = removingFromCartId === p.id;
  const inRegistry = isProductInRegistry(p.id);
  const inCart = isInCart(p.id);

  return (
    <div className="group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-[#A5914B]/30 transition-all duration-300">
      <div
        className="relative aspect-square bg-gray-50 dark:bg-gray-800 overflow-hidden cursor-pointer"
        onClick={() => openProductDetail(p)}
      >
        <ImageWithFallback
          src={p.image}
          alt={p.name}
          fill
          priority
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {p.stock <= 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-red-600 text-white text-xs font-medium px-3 py-1 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
        {p.vendor?.verified && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
              <BadgeCheck className="size-3" />
            </span>
          </div>
        )}
        {p.isOnSale && p.stock > 0 && (
          <div className="absolute top-2 left-2">
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              {p.discountPercent}% OFF
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p
          className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1 group-hover:text-[#A5914B] transition-colors cursor-pointer"
          onClick={() => openProductDetail(p)}
        >
          {p.name}
        </p>
        <div className="flex items-center gap-2 mb-2">
          <p className="text-base font-bold text-[#A5914B]">{p.price}</p>
          {p.isOnSale && p.originalPrice && (
            <p className="text-sm text-gray-400 line-through">{p.originalPrice}</p>
          )}
        </div>

        {/* Buy + Cart */}
        {p.stock > 0 && (
          <div className="flex gap-1.5 mb-1.5">
            {inCart ? (
              <button
                type="button"
                onClick={() => removeFromCart(p.id)}
                disabled={isRemoving}
                className="flex-1 text-xs px-2 py-1.5 border border-green-300 bg-green-50 text-green-700 font-medium rounded-full hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer group/cart"
              >
                {isRemoving ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <>
                    <Check className="size-3 group-hover/cart:hidden" />
                    <Trash2 className="size-3 hidden group-hover/cart:block" />
                    <span className="group-hover/cart:hidden">In Cart</span>
                    <span className="hidden group-hover/cart:inline">
                      Remove
                    </span>
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => buyNow(p)}
                  disabled={isBuying || isAdding}
                  className="flex-1 text-xs px-2 py-1.5 bg-[#A5914B] text-white font-medium rounded-full hover:bg-[#8B7A3F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isBuying ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <>
                      <Zap className="size-3" />
                      Buy
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => addToCart(p)}
                  disabled={isAdding || isBuying}
                  className="flex-1 text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isAdding ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart className="size-3" />
                      Add to Cart
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* Add to Registry */}
        {isHost && p.stock > 0 && (
          <>
            {inRegistry ? (
              <button
                type="button"
                onClick={() => openProductDetail(p)}
                className="w-full text-xs px-2 py-1.5 bg-green-50 text-green-700 font-medium rounded-full border border-green-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Check className="size-3" />
                In Registry
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAddToRegistry(p)}
                className="w-full text-xs px-2 py-1.5 bg-[#A5914B]/10 text-[#8B7A3F] font-medium rounded-full border border-[#A5914B]/30 hover:bg-[#A5914B]/20 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Gift className="size-3" />
                Add to Registry
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
