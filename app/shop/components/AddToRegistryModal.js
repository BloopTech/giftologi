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
import RegistrySelector from "./RegistrySelector";

const PRIORITY_OPTIONS = [
  { value: "must-have", label: "Must Have", color: "bg-red-100 text-red-700" },
  { value: "nice-to-have", label: "Nice to Have", color: "bg-blue-100 text-blue-700" },
];

const COLOR_OPTIONS = [
  "Black",
  "White",
  "Gray",
  "Red",
  "Orange",
  "Yellow",
  "Green",
  "Blue",
  "Purple",
  "Pink",
  "Brown",
  "Gold",
  "Silver",
];

const COLOR_SWATCHES = {
  Black: "#111827",
  White: "#F9FAFB",
  Gray: "#9CA3AF",
  Red: "#EF4444",
  Orange: "#F97316",
  Yellow: "#FACC15",
  Green: "#22C55E",
  Blue: "#3B82F6",
  Purple: "#8B5CF6",
  Pink: "#EC4899",
  Brown: "#A16207",
  Gold: "#D4AF37",
  Silver: "#CBD5F5",
};

const formatPrice = (value) => {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return `GHS ${num.toFixed(2)}`;
};

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
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedVariantKey, setSelectedVariantKey] = useState("");
  const [selectedRegistry, setSelectedRegistry] = useState(registry);
  const selectedRegistryId = selectedRegistry?.id || registry?.id || "";

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
        setSelectedColor("");
        setSelectedSize("");
        setSelectedVariantKey("");
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
        sku: variation?.sku,
        raw: variation,
      }))
      .filter((option) => option.label);
  }, [variations]);

  const hasColor = useMemo(
    () => variationOptions.some((option) => option.color),
    [variationOptions]
  );
  const hasSize = useMemo(
    () => variationOptions.some((option) => option.size),
    [variationOptions]
  );

  const colorOptions = useMemo(() => {
    if (!hasColor) return [];
    const filtered = selectedSize
      ? variationOptions.filter((opt) => opt.size === selectedSize)
      : variationOptions;
    return Array.from(
      new Set(filtered.map((opt) => opt.color).filter(Boolean))
    );
  }, [hasColor, selectedSize, variationOptions]);

  const sizeOptions = useMemo(() => {
    if (!hasSize) return [];
    const filtered = selectedColor
      ? variationOptions.filter((opt) => opt.color === selectedColor)
      : variationOptions;
    return Array.from(new Set(filtered.map((opt) => opt.size).filter(Boolean)));
  }, [hasSize, selectedColor, variationOptions]);

  const matchingOptions = useMemo(() => {
    if (!hasColor && !hasSize) return variationOptions;
    return variationOptions.filter(
      (option) =>
        (!selectedColor || option.color === selectedColor) &&
        (!selectedSize || option.size === selectedSize)
    );
  }, [hasColor, hasSize, selectedColor, selectedSize, variationOptions]);

  const selectedVariation = useMemo(() => {
    if (selectedVariantKey) {
      return variationOptions.find((option) => option.key === selectedVariantKey) || null;
    }
    if (matchingOptions.length === 1) return matchingOptions[0];
    if (!hasSize && selectedColor && matchingOptions.length) return matchingOptions[0];
    if (!hasColor && selectedSize && matchingOptions.length) return matchingOptions[0];
    return null;
  }, [hasColor, hasSize, matchingOptions, selectedColor, selectedSize, selectedVariantKey, variationOptions]);

  const selectionRequired = variationOptions.length > 0;
  const selectionComplete = !selectionRequired || !!selectedVariation;

  useEffect(() => {
    if (variationOptions.length !== 1) return;
    const [option] = variationOptions;
    setSelectedVariantKey(option.key);
    setSelectedColor(option.color || "");
    setSelectedSize(option.size || "");
  }, [variationOptions]);

  useEffect(() => {
    if (!selectedVariantKey) return;
    const option = variationOptions.find((opt) => opt.key === selectedVariantKey);
    if (!option) return;
    if (option.color && option.color !== selectedColor) {
      setSelectedColor(option.color);
    }
    if (option.size && option.size !== selectedSize) {
      setSelectedSize(option.size);
    }
  }, [selectedVariantKey, selectedColor, selectedSize, variationOptions]);

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > (product?.stock || 10)) return product?.stock || 10;
      return next;
    });
  };

  if (!product) return null;

  const serviceCharge = Number(product?.serviceCharge || 0);
  const basePrice = Number(product?.rawPrice);
  const variationPrice =
    selectedVariation?.price != null
      ? Number(selectedVariation.price) + serviceCharge
      : null;
  const displayPrice =
    variationPrice != null && Number.isFinite(variationPrice)
      ? variationPrice
      : basePrice;
  const formattedPrice = formatPrice(displayPrice) || product.price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[85vh] rounded-2xl shadow-xl p-0 flex flex-col">
        <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors cursor-pointer z-10">
          <X className="h-5 w-5 text-gray-500" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <div className="p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#A5914B]/10 rounded-full">
                <Gift className="size-5 text-[#A5914B]" />
              </div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Add to Registry
              </DialogTitle>
            </div>
            <RegistrySelector
              selectedId={selectedRegistryId}
              onSelect={(r) => setSelectedRegistry(r)}
            />
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
                {formattedPrice || product.price}
              </p>
            </div>
          </div>

          {/* Form */}
          <form action={formAction} className="space-y-5">
            {/* Hidden fields */}
            <input type="hidden" name="registryId" value={selectedRegistryId || ""} readOnly />
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Variation
                </label>

                {!hasColor && !hasSize ? (
                  <div className="grid grid-cols-2 gap-2">
                    {variationOptions.map((option) => {
                      const isSelected = selectedVariantKey === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() =>
                            setSelectedVariantKey(isSelected ? "" : option.key)
                          }
                          className={`cursor-pointer rounded-xl border-2 px-4 py-3 text-left transition-all ${
                            isSelected
                              ? "border-[#A5914B] bg-[#A5914B]/5 ring-1 ring-[#A5914B]/20"
                              : "border-gray-200 hover:border-[#A5914B]/40 hover:bg-gray-50"
                          }`}
                        >
                          <span className={`block text-sm font-medium ${isSelected ? "text-[#8B7A3F]" : "text-gray-800"}`}>
                            {option.label}
                          </span>
                          {option.price != null && (
                            <span className={`block text-xs mt-0.5 ${isSelected ? "text-[#A5914B]" : "text-gray-500"}`}>
                              {formatPrice(option.price)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {hasColor && (
                      <div>
                        <span className="block text-xs font-medium text-gray-500 mb-2">
                          Color {selectedColor && <span className="text-[#A5914B]">— {selectedColor}</span>}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {(colorOptions.length ? colorOptions : COLOR_OPTIONS).map(
                            (color) => {
                              const isSelected = selectedColor === color;
                              return (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => {
                                    const next = isSelected ? "" : color;
                                    setSelectedColor(next);
                                    setSelectedVariantKey("");
                                    if (next && selectedSize && !sizeOptions.includes(selectedSize)) {
                                      setSelectedSize("");
                                    }
                                  }}
                                  className={`cursor-pointer inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                                    isSelected
                                      ? "border-[#A5914B] bg-[#A5914B]/5 text-[#8B7A3F] ring-1 ring-[#A5914B]/20"
                                      : "border-gray-200 text-gray-700 hover:border-[#A5914B]/40 hover:bg-gray-50"
                                  }`}
                                >
                                  <span
                                    className="h-4 w-4 rounded-full border shrink-0"
                                    style={{
                                      background:
                                        COLOR_SWATCHES[color] || "#E5E7EB",
                                      borderColor:
                                        color === "White" ? "#E5E7EB" : "transparent",
                                    }}
                                  />
                                  {color}
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}

                    {hasSize && (
                      <div>
                        <span className="block text-xs font-medium text-gray-500 mb-2">
                          Size {selectedSize && <span className="text-[#A5914B]">— {selectedSize}</span>}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {(sizeOptions.length ? sizeOptions : [])
                            .map((size) => {
                              const isSelected = selectedSize === size;
                              return (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => {
                                    const next = isSelected ? "" : size;
                                    setSelectedSize(next);
                                    setSelectedVariantKey("");
                                  }}
                                  className={`cursor-pointer rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                                    isSelected
                                      ? "border-[#A5914B] bg-[#A5914B]/5 text-[#8B7A3F] ring-1 ring-[#A5914B]/20"
                                      : "border-gray-200 text-gray-700 hover:border-[#A5914B]/40 hover:bg-gray-50"
                                  }`}
                                >
                                  {size}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectionComplete && selectedVariation ? (
                  <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-sm text-green-700 font-medium">
                      ✓ {selectedVariation.label}
                    </span>
                    {selectedVariation.price != null && (
                      <span className="text-sm font-semibold text-[#A5914B] ml-auto">
                        {formatPrice(selectedVariation.price)}
                      </span>
                    )}
                  </div>
                ) : variationOptions.length > 1 ? (
                  <p className="text-xs text-amber-600 mt-2">
                    Please select a variation to continue.
                  </p>
                ) : null}

                <input
                  type="hidden"
                  name="variation"
                  value={
                    selectedVariation ? JSON.stringify(selectedVariation.raw || {}) : ""
                  }
                  readOnly
                />
                <input
                  type="hidden"
                  name="color"
                  value={selectedVariation?.color || selectedColor || ""}
                  readOnly
                />
                <input
                  type="hidden"
                  name="size"
                  value={selectedVariation?.size || selectedSize || ""}
                  readOnly
                />
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
                disabled={isPending || !selectionComplete}
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
