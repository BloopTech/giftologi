"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "../../../components/Dialog";
import { X, ChevronDown, ChevronUp, ShoppingCart, Check } from "lucide-react";

export default function ProductDetailModal({
  open,
  onOpenChange,
  product,
  shippingAddress,
  shippingInstructions,
  onBuyThis,
  onBuyMultiple,
  onRemoveFromCart,
  isInCart = false,
}) {
  const [showAddress, setShowAddress] = useState(false);

  if (!product) return null;

  const {
    title,
    image,
    price,
    desired = 0,
    purchased = 0,
  } = product;

  const isFullyPurchased = purchased >= desired && desired > 0;

  const formatAddress = (addr) => {
    if (!addr) return null;
    const parts = [];
    if (addr.name) parts.push(addr.name);
    if (addr.streetAddress) parts.push(addr.streetAddress);
    if (addr.streetAddress2) parts.push(addr.streetAddress2);
    const cityLine = [addr.city, addr.stateProvince, addr.postalCode]
      .filter(Boolean)
      .join(", ");
    if (cityLine) parts.push(cityLine);
    return parts;
  };

  const addressLines = formatAddress(shippingAddress);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl rounded-2xl shadow-xl p-0">
        <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors cursor-pointer z-10">
          <X className="h-5 w-5 text-gray-500" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <div className="flex flex-col md:flex-row">
          {/* Product Image */}
          <div className="w-full md:w-1/2 bg-gray-50 rounded-l-2xl p-8 flex items-center justify-center">
            <div className="relative w-full aspect-square max-w-[300px]">
              <Image
                src={image || "/host/toaster.png"}
                alt={title}
                fill
                className="object-contain"
                sizes="300px"
              />
            </div>
          </div>

          {/* Product Details */}
          <div className="w-full md:w-1/2 p-8 flex flex-col">
            <DialogTitle className="text-xl font-semibold text-gray-900 mb-4">
              {title}
            </DialogTitle>

              {/* Desired / Purchased */}
              <div className="flex items-center gap-6 text-sm text-gray-600 mb-2">
                <span>Desired: {desired}</span>
                <span>Purchased: {purchased}</span>
              </div>

              {/* Price */}
              <p className="text-2xl font-bold text-gray-900 mb-6">{price}</p>

              {/* Shipping Address Accordion */}
              <div className="border border-gray-200 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setShowAddress(!showAddress)}
                  className="w-full flex items-center justify-between p-4 text-left cursor-pointer"
                >
                  <span className="text-sm font-medium text-[#85753C]">
                    Ship Address
                  </span>
                  {showAddress ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {showAddress && addressLines && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="pt-4 space-y-1">
                      {addressLines.map((line, idx) => (
                        <p
                          key={idx}
                          className={`text-sm ${
                            idx === 0
                              ? "font-medium text-gray-900"
                              : "text-gray-600"
                          }`}
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                    {shippingInstructions && (
                      <button
                        type="button"
                        className="mt-3 text-sm text-[#85753C] hover:underline cursor-pointer"
                      >
                        Shipping Instructions
                      </button>
                    )}
                  </div>
                )}

                {showAddress && !addressLines && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <p className="pt-4 text-sm text-gray-500">
                      No shipping address provided.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
            <div className="flex gap-3 mt-auto">
              {isFullyPurchased ? (
                <button
                  type="button"
                  disabled
                  className="flex-1 py-3 bg-[#8DC76C] text-white font-medium rounded-full cursor-not-allowed"
                >
                  Purchased
                </button>
              ) : isInCart ? (
                <button
                  type="button"
                  onClick={() => onRemoveFromCart?.(product?.productId || product?.id)}
                  className="flex-1 py-3 bg-[#6B7280] text-white font-medium rounded-full hover:bg-[#DC2626] transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <X className="size-4" />
                  Remove from Cart
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onBuyThis?.(product)}
                    className="flex-1 py-3 bg-[#A5914B] text-white font-medium rounded-full hover:bg-[#8B7A3F] transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="size-4" />
                    Add to Cart
                  </button>
                  {desired - purchased > 1 && (
                    <button
                      type="button"
                      onClick={() => onBuyMultiple?.(product)}
                      className="flex-1 py-3 border border-[#A5914B] text-[#A5914B] font-medium rounded-full hover:bg-[#A5914B]/5 transition-colors cursor-pointer"
                    >
                      Add All ({desired - purchased})
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
