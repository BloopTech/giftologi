"use client";
import React from "react";
import Image from "next/image";
import { ShoppingCart, Check, Loader2, X, Star, Heart, Palette, Ruler, StickyNote } from "lucide-react";

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
    priority = null,
    notes = null,
    color = null,
    size = null,
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
      {/* Priority badge */}
      {priority && (
        <span
          className={`absolute top-2 left-2 z-10 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
            priority === "must-have"
              ? "bg-red-100 text-red-700 border border-red-200"
              : "bg-blue-50 text-blue-600 border border-blue-200"
          }`}
        >
          {priority === "must-have" ? (
            <><Star className="w-3 h-3" /> Must-have</>
          ) : (
            <><Heart className="w-3 h-3" /> Nice-to-have</>
          )}
        </span>
      )}

      {isFullyPurchased && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-[#8DC76C] text-white text-[10px] font-semibold rounded-full px-2 py-0.5">
          <Check className="size-3" />
          Fulfilled
        </div>
      )}

      {/* Sale badge */}
      {product.isOnSale && product.discountPercent > 0 && !isFullyPurchased && (
        <div className="absolute top-2 right-2 z-10">
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {product.discountPercent}% OFF
          </span>
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

        {/* Specs row */}
        {(color || size || notes) && (
          <div className="flex flex-wrap gap-1">
            {color && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full border border-purple-100">
                <Palette className="w-2.5 h-2.5" /> {color}
              </span>
            )}
            {size && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-teal-50 text-teal-600 rounded-full border border-teal-100">
                <Ruler className="w-2.5 h-2.5" /> {size}
              </span>
            )}
            {notes && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100" title={notes}>
                <StickyNote className="w-2.5 h-2.5" /> Note
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-[#939393]">
          <span>Desired: {desired}</span>
          <span>Purchased: {purchased}</span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-gray-900">{price}</p>
            {product.isOnSale && product.originalPrice && (
              <p className="text-xs text-gray-400 line-through">{product.originalPrice}</p>
            )}
          </div>

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
