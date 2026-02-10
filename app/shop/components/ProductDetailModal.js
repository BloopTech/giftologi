"use client";
import React, { useActionState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "../../components/Dialog";
import {
  X,
  Store,
  BadgeCheck,
  ExternalLink,
  Trash2,
  Loader2,
  ShoppingCart,
  Zap,
  Gift,
  Check,
} from "lucide-react";
import { removeProductFromRegistry } from "../actions";
import { toast } from "sonner";
import { useShop } from "../context";

const initialState = {
  message: "",
  errors: {},
  values: {},
  data: {},
};

export default function ProductDetailModal({
  open,
  onOpenChange,
  product,
  isHost,
  registry,
}) {
  const removeToastKeyRef = useRef(0);
  const {
    getRegistryItem,
    openAddToRegistry,
    addToCart,
    buyNow,
    removeFromCart,
    addingToCartId,
    buyingProductId,
    removingFromCartId,
    isProductInRegistry,
    isInCart,
  } = useShop();
  const [removeState, removeAction, isRemovePending] = useActionState(
    removeProductFromRegistry,
    initialState
  );

  useEffect(() => {
    if (!removeState?.message) return;
    if (removeToastKeyRef.current === removeState.message) return;

    if (Object.keys(removeState?.errors || {}).length > 0) {
      toast.error(removeState.message);
    } else {
      toast.success(removeState.message);
      if (removeState?.data?.registryItemId) {
        onOpenChange(false);
        // Trigger refresh of registry items in context
        window.dispatchEvent(new CustomEvent("registry-item-updated"));
      }
    }

    removeToastKeyRef.current = removeState.message;
  }, [removeState, onOpenChange]);

  if (!product) return null;

  const {
    name,
    image,
    images,
    price,
    description,
    stock,
    vendor,
  } = product;

  const isOutOfStock = stock <= 0;
  const registryItem = getRegistryItem?.(product?.id);
  const isInRegistry = !!registryItem;
  const isAddingToCart = addingToCartId === product?.id;
  const isBuying = buyingProductId === product?.id;
  const isRemoving = removingFromCartId === product?.id;
  const inCart = isInCart(product?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl rounded-2xl shadow-xl p-0 overflow-hidden">
        <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors cursor-pointer z-10 bg-white/80 backdrop-blur-sm">
          <X className="h-5 w-5 text-gray-500" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <div className="flex flex-col md:flex-row">
          {/* Product Image */}
          <div className="w-full md:w-1/2 bg-gray-50 p-8 flex items-center justify-center">
            <div className="relative w-full aspect-square max-w-[300px]">
              <Image
                src={image || "/host/toaster.png"}
                alt={name}
                fill
                className="object-contain"
                sizes="300px"
              />
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                  <span className="bg-red-600 text-white px-4 py-2 rounded-full font-medium">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="w-full md:w-1/2 p-8 flex flex-col">
            {/* Vendor Info */}
            <Link
              href={`/storefront/${vendor?.slug}`}
              className="flex items-center gap-2 mb-4 group"
            >
              <Store className="size-4 text-gray-400 group-hover:text-[#A5914B]" />
              <span className="text-sm text-gray-500 group-hover:text-[#A5914B] transition-colors">
                {vendor?.name}
              </span>
              {vendor?.verified && (
                <BadgeCheck className="size-4 text-blue-500" />
              )}
              <ExternalLink className="size-3 text-gray-400 group-hover:text-[#A5914B]" />
            </Link>

            <DialogTitle className="text-xl font-semibold text-gray-900 mb-4">
              {name}
            </DialogTitle>

            {/* Price */}
            <p className="text-2xl font-bold text-[#A5914B] mb-4">{price}</p>

            {/* Stock Status */}
            <div className="flex items-center gap-2 mb-4">
              {stock > 0 ? (
                <span className="text-sm text-green-600 font-medium">
                  In Stock ({stock} available)
                </span>
              ) : (
                <span className="text-sm text-red-600 font-medium">
                  Out of Stock
                </span>
              )}
            </div>

            {/* Description */}
            {description && (
              <div className="mb-6 flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Description
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line line-clamp-6">
                  {description}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-auto">
              {/* Buy & Add to Cart row */}
              {!isOutOfStock && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => buyNow(product)}
                    disabled={isBuying || isAddingToCart}
                    className="flex-1 text-sm px-4 py-3 bg-[#A5914B] text-white font-medium rounded-full hover:bg-[#8B7A3F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isBuying ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="size-4" />
                        Buy Now
                      </>
                    )}
                  </button>
                  {inCart ? (
                    <button
                      type="button"
                      onClick={() => removeFromCart(product.id)}
                      disabled={isRemoving}
                      className="flex-1 text-sm px-4 py-3 border border-green-300 bg-green-50 text-green-700 font-medium rounded-full hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isRemoving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="size-4" />
                          In Cart
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      disabled={isAddingToCart || isBuying}
                      className="flex-1 text-sm px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isAddingToCart ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="size-4" />
                          Add to Cart
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Add to Registry (hosts only) */}
              {isHost && !isOutOfStock && !isInRegistry && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    openAddToRegistry(product);
                  }}
                  className="w-full text-sm px-4 py-3 bg-[#A5914B]/10 text-[#8B7A3F] font-medium rounded-full hover:bg-[#A5914B]/20 transition-colors flex items-center justify-center gap-2 cursor-pointer border border-[#A5914B]/30"
                >
                  <Gift className="size-4" />
                  Add to Registry
                </button>
              )}

              {/* Already in registry */}
              {isHost && isInRegistry && (
                <div className="flex gap-2">
                  <div className="flex-1 text-sm px-4 py-3 bg-green-50 text-green-700 font-medium rounded-full flex items-center justify-center gap-2 border border-green-200">
                    <Check className="size-4" />
                    In Registry
                  </div>
                  <form action={removeAction} className="flex-1">
                    <input type="hidden" name="registryItemId" value={registryItem?.id || ""} readOnly />
                    <button
                      type="submit"
                      disabled={isRemovePending}
                      className="w-full text-sm px-4 py-3 bg-red-600 text-white font-medium rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isRemovePending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="size-4" />
                          Remove
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Out of stock */}
              {isOutOfStock && (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 bg-gray-200 text-gray-500 font-medium rounded-full cursor-not-allowed"
                >
                  Out of Stock
                </button>
              )}

              {/* View in store link */}
              <Link
                href={`/storefront/${vendor?.slug}/${product.productCode}`}
                className="w-full flex items-center justify-center px-4 text-sm py-2.5 text-gray-500 hover:text-[#A5914B] font-medium transition-colors"
              >
                <ExternalLink className="size-3.5 mr-1.5" />
                View in Store
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
