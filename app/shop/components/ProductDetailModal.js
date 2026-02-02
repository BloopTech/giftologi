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
import { X, Store, BadgeCheck, Plus, ExternalLink, Trash2, Loader2 } from "lucide-react";
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
  const { getRegistryItem, openAddToRegistry } = useShop();
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
              <Link
                href={`/storefront/${vendor?.slug}/${product.productCode}`}
                className="w-full flex items-center justify-center px-4 text-sm py-3 border border-[#A5914B] text-[#A5914B] font-medium rounded-full hover:bg-[#A5914B]/5 transition-colors"
              >
                View in Store
              </Link>
              
              {isHost && !isInRegistry && !isOutOfStock && (
                <form action={addAction}>
                  <input type="hidden" name="registryId" value={registry?.id || ""} readOnly />
                  <input type="hidden" name="productId" value={product.id || ""} readOnly />
                  <input type="hidden" name="quantity" value="1" readOnly />
                  <input type="hidden" name="priority" value="nice-to-have" readOnly />
                  <button
                    type="submit"
                    disabled={isAddPending}
                    className="w-full text-sm px-4 py-3 bg-[#A5914B] text-white font-medium rounded-full hover:bg-[#8B7A3F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isAddPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="size-4" />
                        Add to Registry
                      </>
                    )}
                  </button>
                </form>
              )}
              
              {isHost && isInRegistry && (
                <form action={removeAction}>
                  <input type="hidden" name="registryItemId" value={registryItem?.id || ""} readOnly />
                  <button
                    type="submit"
                    disabled={isRemovePending}
                    className="w-full text-sm px-4 py-3 bg-red-600 text-white font-medium rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isRemovePending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="size-4" />
                        Remove from Registry
                      </>
                    )}
                  </button>
                </form>
              )}
              
              {isHost && isOutOfStock && (
                <button
                  type="button"
                  disabled
                  className="flex-1 py-3 bg-gray-200 text-gray-500 font-medium rounded-full cursor-not-allowed"
                >
                  Out of Stock
                </button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
