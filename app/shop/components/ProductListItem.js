"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  ShoppingCart,
  Zap,
  Loader2,
  Gift,
  Store,
  Check,
  Trash2,
} from "lucide-react";
import { useShop } from "../context";

export default function ProductListItem({ product }) {
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
    <div className="group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-[#A5914B]/30 transition-all duration-300 flex">
      <div
        className="relative w-32 md:w-48 shrink-0 bg-gray-50 dark:bg-gray-800 cursor-pointer"
        onClick={() => openProductDetail(p)}
      >
        <Image src={p.image} alt={p.name} fill className="object-cover" />
        {p.stock <= 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-red-600 text-white text-xs font-medium px-2 py-1 rounded-full">
              Out of Stock
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
      <div className="flex-1 p-4 flex flex-col justify-center">
        <Link
          href={`/storefront/${p.vendor?.slug}`}
          className="text-xs text-gray-500 hover:text-[#A5914B] flex items-center gap-1 mb-1"
        >
          <Store className="size-3" />
          {p.vendor?.name}
          {p.vendor?.verified && (
            <BadgeCheck className="size-3 text-blue-500" />
          )}
        </Link>
        <p
          className="text-base font-medium text-gray-900 dark:text-white line-clamp-2 mb-1 group-hover:text-[#A5914B] transition-colors cursor-pointer"
          onClick={() => openProductDetail(p)}
        >
          {p.name}
        </p>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xl font-bold text-[#A5914B]">{p.price}</p>
          {p.isOnSale && p.originalPrice && (
            <p className="text-sm text-gray-400 line-through">{p.originalPrice}</p>
          )}
        </div>
        {p.stock > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {inCart ? (
              <button
                type="button"
                onClick={() => removeFromCart(p.id)}
                disabled={isRemoving}
                className="text-xs px-4 py-1.5 border border-green-300 bg-green-50 text-green-700 font-medium rounded-full hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer group/cart"
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
                  className="text-xs px-4 py-1.5 bg-[#A5914B] text-white font-medium rounded-full hover:bg-[#8B7A3F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
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
                  className="text-xs px-4 py-1.5 border border-gray-300 text-gray-700 font-medium rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
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
            {isHost && (
              <>
                {inRegistry ? (
                  <span className="text-xs px-3 py-1.5 bg-green-50 text-green-700 font-medium rounded-full border border-green-200 flex items-center gap-1">
                    <Check className="size-3" />
                    In Registry
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAddToRegistry(p)}
                    className="text-xs px-4 py-1.5 bg-[#A5914B]/10 text-[#8B7A3F] font-medium rounded-full border border-[#A5914B]/30 hover:bg-[#A5914B]/20 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Gift className="size-3" />
                    Add to Registry
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
