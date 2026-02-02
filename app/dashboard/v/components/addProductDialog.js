"use client";
import React, { useState, useEffect, useActionState, useRef } from "react";
import { PiUploadSimple, PiX } from "react-icons/pi";
import { manageVendor } from "../action";
import { manageProducts } from "../products/action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "../../../components/Dialog";

const ACTION_VARIANTS = {
  vendor_dashboard: {
    handler: manageVendor,
    actionValue: "create_product",
  },
  vendor_products: {
    handler: manageProducts,
    actionValue: "create",
  },
};

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

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];

const createVariationId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const parseVariationDrafts = (raw) => {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      return {
        id: createVariationId(),
        label: typeof entry.label === "string" ? entry.label : "",
        color: typeof entry.color === "string" ? entry.color : "",
        size: typeof entry.size === "string" ? entry.size : "",
        sku: typeof entry.sku === "string" ? entry.sku : "",
        price:
          entry.price === null || typeof entry.price === "undefined"
            ? ""
            : String(entry.price),
      };
    })
    .filter(Boolean);
};

const buildVariationPayload = (drafts) => {
  if (!Array.isArray(drafts)) return "";
  const normalized = drafts
    .map((draft, index) => {
      if (!draft || typeof draft !== "object") return null;
      const color = String(draft.color || "").trim();
      const size = String(draft.size || "").trim();
      const sku = String(draft.sku || "").trim();
      const labelInput = String(draft.label || "").trim();
      const fallbackLabel =
        labelInput || [color, size].filter(Boolean).join(" / ") || sku || `Variant ${index + 1}`;
      const priceValue =
        draft.price === "" || draft.price === null || typeof draft.price === "undefined"
          ? null
          : Number(draft.price);
      const price = Number.isFinite(priceValue) ? priceValue : null;

      if (!fallbackLabel && !color && !size && !sku && price == null) return null;

      const entry = {};
      if (fallbackLabel) entry.label = fallbackLabel;
      if (color) entry.color = color;
      if (size) entry.size = size;
      if (sku) entry.sku = sku;
      if (price != null) entry.price = price;
      return entry;
    })
    .filter(Boolean);

  if (!normalized.length) return "";
  return JSON.stringify(normalized);
};

export function AddProductDialog({
  open,
  onOpenChange,
  categories,
  onSuccess,
  variant = "vendor_dashboard",
}) {
  const { handler, actionValue } =
    ACTION_VARIANTS[variant] || ACTION_VARIANTS.vendor_dashboard;

  const [state, formAction, isPending] = useActionState(handler, {
    success: false,
    message: "",
    errors: {},
    values: {},
  });

  const [imagePreviews, setImagePreviews] = useState([]);
  const [featuredIndex, setFeaturedIndex] = useState("");
  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");
  const [variationDrafts, setVariationDrafts] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const stepLabels = ["Basics", "Variations", "Images"];

  const categoriesById = React.useMemo(() => {
    const map = new Map();
    (categories || []).forEach((category) => {
      map.set(category.id, category);
    });
    return map;
  }, [categories]);

  const categoriesByParentId = React.useMemo(() => {
    const map = new Map();
    (categories || []).forEach((category) => {
      const parentId = category.parent_category_id || null;
      const existing = map.get(parentId) || [];
      existing.push(category);
      map.set(parentId, existing);
    });

    for (const [key, list] of map.entries()) {
      list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      map.set(key, list);
    }

    return map;
  }, [categories]);

  const parentCategoryOptions = React.useMemo(() => {
    return categoriesByParentId.get(null) || [];
  }, [categoriesByParentId]);

  const subcategoryOptions = React.useMemo(() => {
    if (!selectedParentCategoryId) return [];
    return categoriesByParentId.get(selectedParentCategoryId) || [];
  }, [categoriesByParentId, selectedParentCategoryId]);

  const selectedCategoryId = selectedSubcategoryId || selectedParentCategoryId;

  const getCategoryDisplayName = React.useCallback(
    (category) => {
      if (!category) return "Untitled";
      const name = category.name || "Untitled";
      const parentId = category.parent_category_id;
      if (!parentId) return name;
      const parent = categoriesById.get(parentId);
      if (!parent) return name;
      return `${parent.name || "Untitled"} / ${name}`;
    },
    [categoriesById],
  );

  const variationsPayload = React.useMemo(
    () => buildVariationPayload(variationDrafts),
    [variationDrafts],
  );

  const addVariationDraft = () => {
    setVariationDrafts((prev) => [
      ...prev,
      {
        id: createVariationId(),
        label: "",
        color: "",
        size: "",
        sku: "",
        price: "",
      },
    ]);
  };

  const updateVariationDraft = (id, field, value) => {
    setVariationDrafts((prev) =>
      prev.map((draft) =>
        draft.id === id ? { ...draft, [field]: value } : draft,
      ),
    );
  };

  const removeVariationDraft = (id) => {
    setVariationDrafts((prev) => prev.filter((draft) => draft.id !== id));
  };

  useEffect(() => {
    if (!open) return;
    setCurrentStep(0);

    const value = state.values?.category_id;
    if (!value) return;
    if (selectedParentCategoryId || selectedSubcategoryId) return;

    const category = categoriesById.get(value);
    if (category?.parent_category_id) {
      setSelectedParentCategoryId(category.parent_category_id);
      setSelectedSubcategoryId(category.id);
      return;
    }

    setSelectedParentCategoryId(value);
  }, [
    open,
    state.values?.category_id,
    categoriesById,
    selectedParentCategoryId,
    selectedSubcategoryId,
  ]);

  useEffect(() => {
    if (!open) return;
    if (state.values?.variations) {
      setVariationDrafts(parseVariationDrafts(state.values.variations));
      return;
    }
    if (!state.message) {
      setVariationDrafts([]);
    }
  }, [open, state.message, state.values?.variations]);

  useEffect(() => {
    if (state.success) {
      onSuccess?.();
      onOpenChange(false);
      setImagePreviews([]);
      setFeaturedIndex("");
      setSelectedParentCategoryId("");
      setSelectedSubcategoryId("");
      setVariationDrafts([]);
      setCurrentStep(0);
      formRef.current?.reset();
    }
  }, [state.success, onSuccess, onOpenChange]);

  const buildPreviews = (files) => {
    const list = Array.from(files || []).filter((file) =>
      Boolean(file && file.type && file.type.startsWith("image/"))
    );

    const limited = list.slice(0, 3);

    if (list.length !== limited.length && fileInputRef.current) {
      const dt = new DataTransfer();
      limited.forEach((f) => dt.items.add(f));
      fileInputRef.current.files = dt.files;
    }

    Promise.all(
      limited.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({ file, preview: reader.result });
            reader.readAsDataURL(file);
          })
      )
    ).then((items) => {
      setImagePreviews(items);
      setFeaturedIndex("");
    });
  };

  const handleImagesChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setImagePreviews([]);
      return;
    }
    buildPreviews(files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length && Array.from(files).some((f) => f?.type?.startsWith("image/"))) {
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        Array.from(files).forEach((f) => {
          if (f && f.type && f.type.startsWith("image/")) {
            dt.items.add(f);
          }
        });
        fileInputRef.current.files = dt.files;
      }
      buildPreviews(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const syncInputFiles = (nextPreviews) => {
    if (!fileInputRef.current) return;
    const dt = new DataTransfer();
    nextPreviews.forEach((item) => {
      if (item?.file) dt.items.add(item.file);
    });
    fileInputRef.current.files = dt.files;
  };

  const removeImageAt = (index) => {
    setImagePreviews((prev) => {
      const next = prev.filter((_, i) => i !== index);
      syncInputFiles(next);
      return next;
    });
  };

  const removeAllImages = () => {
    setImagePreviews([]);
    setFeaturedIndex("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const imageCount = imagePreviews.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#111827] text-lg font-semibold">
            Add New Product
          </DialogTitle>
          <DialogDescription className="text-[#6B7280] text-sm">
            Enter the details for your new product
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="mt-4 space-y-4">
          <input type="hidden" name="action" value={actionValue} />
          <input
            type="hidden"
            name="featuredImageIndex"
            value={featuredIndex || ""}
          />

          {state.message && !state.success && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {state.message}
            </div>
          )}

          <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
              {stepLabels.map((label, index) => {
                const isActive = currentStep === index;
                const isComplete = currentStep > index;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                        isComplete
                          ? "border-primary bg-primary text-white"
                          : isActive
                          ? "border-primary text-primary"
                          : "border-[#D1D5DB] text-[#9CA3AF]"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={
                        isActive || isComplete
                          ? "font-semibold text-[#374151]"
                          : "text-[#9CA3AF]"
                      }
                    >
                      {label}
                    </span>
                    {index < stepLabels.length - 1 && (
                      <span className="h-px w-6 bg-[#E5E7EB]" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {currentStep === 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#374151] text-sm font-medium">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g., Ceramic Vase Set"
                    defaultValue={state.values?.name || ""}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  {state.errors?.name && (
                    <span className="text-red-500 text-xs">
                      {state.errors.name}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[#374151] text-sm font-medium">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="status"
                    defaultValue={state.values?.status || "pending"}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#374151] text-sm font-medium">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="hidden"
                    name="category_id"
                    value={selectedCategoryId || ""}
                  />
                  <select
                    value={selectedParentCategoryId}
                    onChange={(e) => {
                      setSelectedParentCategoryId(e.target.value);
                      setSelectedSubcategoryId("");
                    }}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  >
                    <option value="">Select category</option>
                    {parentCategoryOptions.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {state.errors?.category_id && (
                    <span className="text-red-500 text-xs">
                      {state.errors.category_id}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[#374151] text-sm font-medium">Subcategory</label>
                  <select
                    value={selectedSubcategoryId}
                    onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                    disabled={!selectedParentCategoryId || !subcategoryOptions.length}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  >
                    <option value="">None</option>
                    {subcategoryOptions.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {getCategoryDisplayName(cat)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[#374151] text-sm font-medium">
                    Selling Price(GHS) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    defaultValue={state.values?.price || ""}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  {state.errors?.price && (
                    <span className="text-red-500 text-xs">
                      {state.errors.price}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#374151] text-sm font-medium">
                    Initial Stock <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="stock_qty"
                    min="0"
                    placeholder="0"
                    defaultValue={state.values?.stock_qty || "0"}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  {state.errors?.stock_qty && (
                    <span className="text-red-500 text-xs">
                      {state.errors.stock_qty}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[#374151] text-sm font-medium">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Product description..."
                  defaultValue={state.values?.description || ""}
                  className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
            </>
          )}

          {currentStep === 1 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[#374151] text-sm font-medium">
                Variations (optional)
              </label>
              <input type="hidden" name="variations" value={variationsPayload} />
              <div className="rounded-lg border border-[#E5E7EB] p-3 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[#6B7280]">
                    Add color/size options or SKU-only variants. Price overrides the base
                    price.
                  </p>
                  <button
                    type="button"
                    onClick={addVariationDraft}
                    className="cursor-pointer inline-flex items-center justify-center rounded-full border border-[#D1D5DB] px-3 py-1 text-xs font-medium text-[#374151] hover:border-primary hover:text-primary"
                  >
                    + Add variation
                  </button>
                </div>

                {variationDrafts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] p-4 text-center text-xs text-[#6B7280]">
                    No variations yet. Add one to offer color, size, or SKU options.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {variationDrafts.map((draft, index) => {
                      const colorValue = draft.color || "";
                      const sizeValue = draft.size || "";
                      return (
                        <div
                          key={draft.id}
                          className="rounded-lg border border-[#E5E7EB] p-3 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-[#6B7280]">
                              Variation {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeVariationDraft(draft.id)}
                              className="cursor-pointer text-xs text-red-500 hover:text-red-600"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-medium text-[#374151]">
                                Label (auto if blank)
                              </label>
                              <input
                                type="text"
                                value={draft.label}
                                onChange={(e) =>
                                  updateVariationDraft(draft.id, "label", e.target.value)
                                }
                                placeholder="e.g., Red / Small"
                                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              />
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-medium text-[#374151]">
                                SKU (optional)
                              </label>
                              <input
                                type="text"
                                value={draft.sku}
                                onChange={(e) =>
                                  updateVariationDraft(draft.id, "sku", e.target.value)
                                }
                                placeholder="SKU-RED-S"
                                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              />
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-medium text-[#374151]">
                                Price override (optional)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={draft.price}
                                onChange={(e) =>
                                  updateVariationDraft(draft.id, "price", e.target.value)
                                }
                                placeholder="0.00"
                                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <label className="text-[11px] font-medium text-[#374151]">
                              Color
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {COLOR_OPTIONS.map((color) => {
                                const isSelected = colorValue === color;
                                return (
                                  <button
                                    key={color}
                                    type="button"
                                    onClick={() =>
                                      updateVariationDraft(
                                        draft.id,
                                        "color",
                                        isSelected ? "" : color,
                                      )
                                    }
                                    className={`cursor-pointer inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                                      isSelected
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-[#E5E7EB] text-[#6B7280] hover:border-primary/50"
                                    }`}
                                  >
                                    <span
                                      className="h-3 w-3 rounded-full border"
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
                              })}
                            </div>
                            <input
                              type="text"
                              value={colorValue}
                              onChange={(e) =>
                                updateVariationDraft(draft.id, "color", e.target.value)
                              }
                              placeholder="Custom color"
                              className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                          </div>

                          <div className="flex flex-col gap-2">
                            <label className="text-[11px] font-medium text-[#374151]">
                              Size
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {SIZE_OPTIONS.map((size) => {
                                const isSelected = sizeValue === size;
                                return (
                                  <button
                                    key={size}
                                    type="button"
                                    onClick={() =>
                                      updateVariationDraft(
                                        draft.id,
                                        "size",
                                        isSelected ? "" : size,
                                      )
                                    }
                                    className={`cursor-pointer inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                                      isSelected
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-[#E5E7EB] text-[#6B7280] hover:border-primary/50"
                                    }`}
                                  >
                                    {size}
                                  </button>
                                );
                              })}
                            </div>
                            <input
                              type="text"
                              value={sizeValue}
                              onChange={(e) =>
                                updateVariationDraft(draft.id, "size", e.target.value)
                              }
                              placeholder="Custom size"
                              className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {state.errors?.variations && (
                <span className="text-red-500 text-xs">{state.errors.variations}</span>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[#374151] text-sm font-medium">
                Product Images
              </label>

              <input
                ref={fileInputRef}
                type="file"
                name="product_images"
                accept="image/*"
                multiple
                onChange={handleImagesChange}
                className="hidden"
                disabled={isPending}
              />

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="relative border-2 border-dashed border-[#D1D5DB] rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
              >
                {imagePreviews.length ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      {imagePreviews.map((item, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={item.preview}
                            alt={`Preview ${idx + 1}`}
                            className="h-20 w-full rounded-lg object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImageAt(idx)}
                            className="cursor-pointer absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <PiX className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={removeAllImages}
                      className="cursor-pointer text-xs text-red-600 hover:underline"
                    >
                      Remove all images
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer text-xs text-primary hover:underline"
                      disabled={isPending}
                    >
                      Replace images
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col items-center gap-2 text-[#9CA3AF]">
                      <PiUploadSimple className="h-8 w-8" />
                      <p className="text-sm text-[#6B7280]">
                        Drag and drop images here, or click to select
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer text-xs text-primary hover:underline"
                      disabled={isPending}
                    >
                      Browse files
                    </button>
                  </div>
                )}
              </div>

              {state.errors?.images && (
                <span className="text-red-500 text-xs">{state.errors.images}</span>
              )}

              {imageCount > 0 && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-[#6B7280]">Featured Image</label>
                  <select
                    value={featuredIndex || ""}
                    onChange={(e) => setFeaturedIndex(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  >
                    <option value="">Use first image</option>
                    {Array.from({ length: imageCount }).map((_, idx) => (
                      <option key={idx} value={String(idx)}>
                        {`Image ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-6 pt-4 border-t border-[#E5E7EB]">
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <DialogClose asChild>
                <button
                  type="button"
                  className="cursor-pointer px-4 py-2 text-sm font-medium text-[#374151] border border-[#D1D5DB] rounded-lg hover:bg-[#F3F4F6]"
                >
                  Cancel
                </button>
              </DialogClose>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
                  disabled={currentStep === 0}
                  className="cursor-pointer px-4 py-2 text-sm font-medium text-[#374151] border border-[#D1D5DB] rounded-lg hover:bg-[#F3F4F6] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
                {currentStep < stepLabels.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentStep((prev) =>
                        Math.min(prev + 1, stepLabels.length - 1),
                      )
                    }
                    className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isPending}
                    className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? "Adding..." : "Add Product"}
                  </button>
                )}
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
