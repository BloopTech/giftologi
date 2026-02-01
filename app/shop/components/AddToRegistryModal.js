"use client";
import React, { useState, useActionState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "../../components/Dialog";
import { X, Gift, Minus, Plus, Loader2 } from "lucide-react";
import { addProductToRegistry } from "../actions";
import { toast } from "sonner";

const PRIORITY_OPTIONS = [
  { value: "must-have", label: "Must Have", color: "bg-red-100 text-red-700" },
  { value: "nice-to-have", label: "Nice to Have", color: "bg-blue-100 text-blue-700" },
];

const initialState = {
  message: "",
  errors: {},
  values: {},
  data: {},
};

export default function AddToRegistryModal({
  open,
  onOpenChange,
  product,
  registry,
}) {
  const toastKeyRef = useRef(0);
  const [quantity, setQuantity] = useState(1);
  const [priority, setPriority] = useState("nice-to-have");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [selectedVariation, setSelectedVariation] = useState("");

  const [state, formAction, isPending] = useActionState(
    addProductToRegistry,
    initialState
  );

  // Show toast notifications based on action state
  useEffect(() => {
    if (!state?.message) return;
    const toastKey = JSON.stringify({
      message: state.message,
      itemId: state?.data?.item?.id || null,
      registryItemId: state?.data?.registryItemId || null,
      errorKeys: Object.keys(state?.errors || {}).join(","),
    });
    if (toastKeyRef.current === toastKey) return;

    if (Object.keys(state?.errors || {}).length > 0) {
      toast.error(state.message);
    } else {
      toast.success(state.message);
      if (state?.data?.item) {
        onOpenChange(false);
        // Reset form on success
        setQuantity(1);
        setPriority("nice-to-have");
        setNotes("");
        setColor("");
        setSize("");
        setSelectedVariation("");
        // Trigger refresh of registry items in context
        window.dispatchEvent(new CustomEvent("registry-item-updated"));
      }
    }

    toastKeyRef.current = toastKey;
  }, [state, onOpenChange]);

  const variations = useMemo(() => {
    if (!product?.variations) return [];
    if (Array.isArray(product.variations)) return product.variations;
    if (typeof product.variations === "string") {
      try {
        const parsed = JSON.parse(product.variations);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [product?.variations]);

  const variationOptions = useMemo(() => {
    return variations
      .map((variation, index) => ({
        key: String(variation?.id || variation?.sku || index),
        label:
          variation?.label ||
          [variation?.color, variation?.size]
            .filter(Boolean)
            .join(" / ") ||
          `Option ${index + 1}`,
        price: variation?.price,
        color: variation?.color,
        size: variation?.size,
        raw: variation,
      }))
      .filter((option) => option.label);
  }, [variations]);

  const handleVariationChange = (value) => {
    setSelectedVariation(value);
    const selected = variationOptions.find((option) => option.key === value);
    if (selected?.color) setColor(String(selected.color));
    if (selected?.size) setSize(String(selected.size));
  };

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > (product?.stock || 10)) return product?.stock || 10;
      return next;
    });
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg rounded-2xl shadow-xl p-0 overflow-hidden">
        <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors cursor-pointer z-10">
          <X className="h-5 w-5 text-gray-500" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[#A5914B]/10 rounded-full">
              <Gift className="size-5 text-[#A5914B]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Add to Registry
              </DialogTitle>
              <p className="text-sm text-gray-500">{registry?.title}</p>
            </div>
          </div>

          {/* Product Preview */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-6">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white shrink-0">
              <Image
                src={product.image || "/host/toaster.png"}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 line-clamp-2">
                {product.name}
              </p>
              <p className="text-sm text-[#A5914B] font-semibold">
                {product.price}
              </p>
            </div>
          </div>

          {/* Form */}
          <form action={formAction} className="space-y-5">
            {/* Hidden fields */}
            <input type="hidden" name="registryId" value={registry?.id || ""} readOnly />
            <input type="hidden" name="productId" value={product.id || ""} readOnly />

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity Desired
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= (product.stock || 10)}
                    className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  {product.stock} available
                </span>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <div className="flex gap-2">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                      priority === opt.value
                        ? opt.color + " ring-2 ring-offset-1 ring-current"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="priority" value={priority} readOnly />
            </div>

            {variationOptions.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choose a variation
                  </label>
                  <select
                    value={selectedVariation}
                    onChange={(e) => handleVariationChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none bg-white"
                  >
                    <option value="">Select an option</option>
                    {variationOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                        {option.price != null ? ` - GHS ${option.price}` : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    type="hidden"
                    name="variation"
                    value={
                      selectedVariation
                        ? JSON.stringify(
                            variationOptions.find(
                              (option) => option.key === selectedVariation
                            )?.raw || {}
                          )
                        : ""
                    }
                    readOnly
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Color
                    </label>
                    <input
                      type="text"
                      name="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="e.g., Blue, Silver"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Size
                    </label>
                    <input
                      type="text"
                      name="size"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      placeholder="e.g., Large, 10x12"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes for Guests (optional)
              </label>
              <textarea
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special preferences or notes..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none resize-none"
              />
            </div>

            {/* Quantity hidden field */}
            <input type="hidden" name="quantity" value={quantity} readOnly />

            {/* Submit Button */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-3 bg-[#A5914B] text-white font-medium rounded-full hover:bg-[#8B7A3F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Gift className="size-4" />
                    Add to Registry
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
