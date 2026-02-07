"use client";
import React from "react";
import Image from "next/image";
import { ShoppingCart, Check, Loader2, X } from "lucide-react";

export default function ProductCard({
  product,
  onClick,
  onAddToCart,
  onRemoveFromCart,
  cartLoading,
  isInCart = false,
}) {
  const {
    id,
    title,
    image,
    price,
    desired = 0,
    purchased = 0,
  } = product;

  const isFullyPurchased = purchased >= desired && desired > 0;

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (!isFullyPurchased && !isInCart && onAddToCart) {
      onAddToCart(product);
    }
  };

  const handleRemoveFromCart = (e) => {
    e.stopPropagation();
    if (isInCart && onRemoveFromCart) {
      onRemoveFromCart(product.productId || product.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(product)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.(product);
      }}
      className={`flex bg-white rounded-xl flex-col w-full border transition-all hover:shadow-md cursor-pointer text-left relative ${
        isFullyPurchased
          ? "border-[#8DC76C] opacity-75"
          : "border-[#F6E9B7] hover:border-[#A5914B]"
      }`}
    >
      {isFullyPurchased && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-[#8DC76C] text-white text-[10px] font-semibold rounded-full px-2 py-0.5">
          <Check className="size-3" />
          Fulfilled
        </div>
      )}

      {/* Product Image */}
      <div className="flex items-center justify-center overflow-hidden bg-gray-50 rounded-t-xl">
        <div className="relative w-full aspect-square">
          <Image
            src={image || "/host/toaster.png"}
            alt={title}
            fill
            className="object-cover"
            sizes="150px"
          />
        </div>
      </div>

      {/* Product Info */}
      <div className="flex flex-col p-4 space-y-2 flex-1">
        <p className="text-sm font-semibold text-black line-clamp-2 min-h-10">
          {title}
        </p>

        <div className="flex items-center justify-between text-xs text-[#939393]">
          <span>Desired: {desired}</span>
          <span>Purchased: {purchased}</span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-sm font-medium text-gray-900">{price}</p>

          {isFullyPurchased ? (
            <span className="text-xs text-white bg-[#8DC76C] rounded-full px-3 py-1">
              Purchased
            </span>
          ) : isInCart ? (
            <button
              type="button"
              onClick={handleRemoveFromCart}
              disabled={cartLoading}
              className="flex items-center gap-1 text-xs text-white bg-[#6B7280] rounded-full px-3 py-1.5 hover:bg-[#DC2626] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {cartLoading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <X className="size-3" />
              )}
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={cartLoading}
              className="flex items-center gap-1 text-xs text-white bg-[#A5914B] rounded-full px-3 py-1.5 hover:bg-[#8B7A3F] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {cartLoading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <ShoppingCart className="size-3" />
              )}
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
