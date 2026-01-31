"use client";
import React from "react";
import Image from "next/image";

export default function ProductCard({ product, onClick }) {
  const {
    id,
    title,
    image,
    price,
    desired = 0,
    purchased = 0,
  } = product;

  const isFullyPurchased = purchased >= desired && desired > 0;
  const remainingQty = Math.max(0, desired - purchased);

  return (
    <button
      type="button"
      onClick={() => onClick?.(product)}
      className={`flex bg-white rounded-xl flex-col w-full border transition-all hover:shadow-md cursor-pointer text-left ${
        isFullyPurchased
          ? "border-[#8DC76C]"
          : "border-[#F6E9B7] hover:border-[#A5914B]"
      }`}
    >
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
          ) : (
            <span className="text-xs text-white bg-[#A5914B] rounded-full px-3 py-1">
              Buy Gift
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
