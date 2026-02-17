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
import CascadingCategoryPicker from "../../../components/CascadingCategoryPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/Select";

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
        stock_qty:
          entry.stock_qty === null || typeof entry.stock_qty === "undefined"
            ? ""
            : String(entry.stock_qty),
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
        labelInput ||
        [color, size].filter(Boolean).join(" / ") ||
        sku ||
        `Variant ${index + 1}`;
      const priceValue =
        draft.price === "" ||
        draft.price === null ||
        typeof draft.price === "undefined"
          ? null
          : Number(draft.price);
      const price = Number.isFinite(priceValue) ? priceValue : null;

      if (!fallbackLabel && !color && !size && !sku && price == null)
        return null;

      const entry = {};
      if (fallbackLabel) entry.label = fallbackLabel;
      if (color) entry.color = color;
      if (size) entry.size = size;
      if (sku) entry.sku = sku;
      if (price != null) entry.price = price;
      const stockRaw = draft.stock_qty;
      const stockValue =
        stockRaw === "" || stockRaw === null || typeof stockRaw === "undefined"
          ? null
          : Number(stockRaw);
      const stock = Number.isFinite(stockValue) && stockValue >= 0 ? stockValue : null;
      if (stock != null) entry.stock_qty = stock;
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

  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [variationDrafts, setVariationDrafts] = useState([]);
  const [activeVariationFieldById, setActiveVariationFieldById] = useState({});
  const [status, setStatus] = useState("pending");
  const [currentStep, setCurrentStep] = useState(0);
  const stepLabels = ["Basics", "Categories", "Variations", "Images"];

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
      list.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || "")),
      );
      map.set(key, list);
    }

    return map;
  }, [categories]);

  const parentCategoryOptions = React.useMemo(() => {
    return categoriesByParentId.get(null) || [];
  }, [categoriesByParentId]);

  const selectedCategoryIdSet = React.useMemo(
    () => new Set(selectedCategoryIds),
    [selectedCategoryIds],
  );

  const toggleSelectedCategory = React.useCallback((categoryId) => {
    if (!categoryId) return;
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  }, []);

  const normalizeCategoryIds = React.useCallback((value) => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map((id) => String(id).trim()).filter(Boolean);
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((id) => String(id).trim()).filter(Boolean);
        }
      } catch (_) {
        return trimmed
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
      }
    }
    return [];
  }, []);

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

  const variationStockSum = React.useMemo(() => {
    if (!variationDrafts.length) return null;
    const values = variationDrafts.map((d) => d.stock_qty).filter((v) => v !== "" && v != null);
    if (!values.length) return null;
    return values.reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, [variationDrafts]);

  const hasVariationStock = variationStockSum !== null;

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
        stock_qty: "",
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

  const handleSubmit = React.useCallback(
    (event) => {
      event.preventDefault();
      const lastStepIndex = stepLabels.length - 1;
      if (currentStep !== lastStepIndex) {
        setCurrentStep(lastStepIndex);
        return;
      }
      if (isPending) return;
      const formData = new FormData(event.currentTarget);
      React.startTransition(() => {
        formAction(formData);
      });
    },
    [currentStep, formAction, isPending, stepLabels.length],
  );

  useEffect(() => {
    if (!open) return;
    setCurrentStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setStatus(state.values?.status || "pending");
  }, [open, state.values?.status]);

  useEffect(() => {
    if (!open) return;
    const value = normalizeCategoryIds(state.values?.categoryIds);
    if (!value.length) return;
    if (selectedCategoryIds.length) return;
    setSelectedCategoryIds(value);
  }, [
    open,
    normalizeCategoryIds,
    selectedCategoryIds.length,
    state.values?.categoryIds,
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
    if (!open) return;
    if (state.success) return;
    if (!state?.errors) return;

    if (state.errors?.images) {
      setCurrentStep(3);
    } else if (state.errors?.variations) {
      setCurrentStep(2);
    } else if (state.errors?.categoryIds) {
      setCurrentStep(1);
    }
  }, [open, state.success, state.errors]);

  useEffect(() => {
    if (state.success) {
      onSuccess?.();
      onOpenChange(false);
      setImagePreviews([]);
      setFeaturedIndex("");
      setSelectedCategoryIds([]);
      setVariationDrafts([]);
      setStatus("pending");
      setCurrentStep(0);
      formRef.current?.reset();
    }
  }, [state.success, onSuccess, onOpenChange]);

  const buildPreviews = (files, currentPreviews = []) => {
    const list = Array.from(files || []).filter((file) =>
      Boolean(file && file.type && file.type.startsWith("image/")),
    );

    const remainingSlots = Math.max(0, 3 - currentPreviews.length);
    const limited = list.slice(0, remainingSlots);

    if (fileInputRef.current) {
      const dt = new DataTransfer();
      currentPreviews.forEach((item) => {
        if (item?.file) dt.items.add(item.file);
      });
      limited.forEach((f) => dt.items.add(f));
      fileInputRef.current.files = dt.files;
    }

    if (!limited.length) return;

    Promise.all(
      limited.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({ file, preview: reader.result });
            reader.readAsDataURL(file);
          }),
      ),
    ).then((items) => {
      setImagePreviews((prev) => [...prev, ...items]);
      setFeaturedIndex("");
    });
  };

  const handleImagesChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    buildPreviews(files, imagePreviews);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (
      files &&
      files.length &&
      Array.from(files).some((f) => f?.type?.startsWith("image/"))
    ) {
      buildPreviews(files, imagePreviews);
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#0A0A0A]">
            Add New Product
          </DialogTitle>
        </DialogHeader>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            if (currentStep === stepLabels.length - 1) return;
            if (e.target?.tagName === "TEXTAREA") return;
            e.preventDefault();
          }}
          className="space-y-6"
        >
          <input type="hidden" name="action" value={actionValue} />
          <input
            type="hidden"
            name="categoryIds"
            value={JSON.stringify(selectedCategoryIds || [])}
          />
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

          <div className={currentStep === 0 ? "" : "hidden"}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
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
                <input type="hidden" name="status" value={status} />
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full h-[38px] rounded-lg text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_shippable"
                    value="true"
                    defaultChecked={state.values?.is_shippable !== "false"}
                    className="accent-primary h-4 w-4"
                  />
                  <span className="text-[#374151] text-sm font-medium">
                    Shippable
                  </span>
                </label>
                <span className="text-[11px] text-[#6B7280]">
                  Uncheck if this product does not require physical shipping (e.g. digital vouchers).
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[#374151] text-sm font-medium">
                  Sale Price (GHS)
                </label>
                <input
                  type="number"
                  name="sale_price"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  defaultValue={state.values?.sale_price || ""}
                  className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <span className="text-[11px] text-[#6B7280]">
                  Leave empty for no sale. Must be less than selling price.
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[#374151] text-sm font-medium">
                  Sale Starts
                </label>
                <input
                  type="datetime-local"
                  name="sale_starts_at"
                  defaultValue={state.values?.sale_starts_at || ""}
                  className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[#374151] text-sm font-medium">
                  Sale Ends
                </label>
                <input
                  type="datetime-local"
                  name="sale_ends_at"
                  defaultValue={state.values?.sale_ends_at || ""}
                  className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[#374151] text-sm font-medium">
                  Weight (kg) <span className="text-red-500">*</span>
                </label>
                <input
                  name="weight_kg"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  onKeyDown={(event) => {
                    if (["e", "E", "+", "-"].includes(event.key)) {
                      event.preventDefault();
                    }
                  }}
                  placeholder="e.g. 1.2"
                  defaultValue={state.values?.weight_kg || ""}
                  className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                {state.errors?.weight_kg ? (
                  <span className="text-red-500 text-xs">
                    {state.errors.weight_kg}
                  </span>
                ) : (
                  <span className="text-[11px] text-[#6B7280]">
                    Required for Aramex shipping rates.
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[#374151] text-sm font-medium">
                  Initial Stock <span className="text-red-500">*</span>
                </label>
                {hasVariationStock ? (
                  <>
                    <input type="hidden" name="stock_qty" value={variationStockSum} />
                    <input
                      type="number"
                      min="0"
                      value={variationStockSum}
                      readOnly
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-[#F9FAFB] text-[#6B7280] cursor-not-allowed"
                    />
                    <span className="text-[11px] text-[#6B7280]">
                      Auto-calculated from variation stock quantities.
                    </span>
                  </>
                ) : (
                  <input
                    type="number"
                    name="stock_qty"
                    min="0"
                    placeholder="0"
                    defaultValue={state.values?.stock_qty || "0"}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                )}
                {state.errors?.stock_qty && (
                  <span className="text-red-500 text-xs">
                    {state.errors.stock_qty}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[#374151] text-sm font-medium">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                placeholder="Product description..."
                defaultValue={state.values?.description || ""}
                className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>
          </div>

          <div className={currentStep === 1 ? "" : "hidden"}>
            <div className="flex flex-col gap-1.5">
              <label className="text-[#374151] text-sm font-medium">
                Categories <span className="text-red-500">*</span>
              </label>
              <CascadingCategoryPicker
                categories={categories}
                selectedCategoryIds={selectedCategoryIds}
                onToggleCategory={toggleSelectedCategory}
                onClearAll={() => setSelectedCategoryIds([])}
                disabled={isPending}
                error={state.errors?.categoryIds}
              />
            </div>
          </div>

          <div className={currentStep === 2 ? "" : "hidden"}>
            <div className="flex flex-col gap-1.5">
              <label className="text-[#374151] text-sm font-medium">
                Variations (optional)
              </label>
              <input
                type="hidden"
                name="variations"
                value={variationsPayload}
              />
              <div className="rounded-lg border border-[#E5E7EB] p-3 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[#6B7280]">
                    Add color/size options or SKU-only variants. Price overrides
                    the base price.
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
                    No variations yet. Add one to offer color, size, or SKU
                    options.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {variationDrafts.map((draft, index) => {
                      const activeField =
                        activeVariationFieldById?.[draft.id] || "";
                      const chips = [
                        { key: "color", label: "Color", value: draft.color },
                        { key: "size", label: "Size", value: draft.size },
                        { key: "sku", label: "SKU", value: draft.sku },
                        { key: "price", label: "Price", value: draft.price },
                        { key: "label", label: "Label", value: draft.label },
                      ].filter((entry) => String(entry.value || "").trim());

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

                          <div className="space-y-2">
                            {chips.length ? (
                              <div className="flex flex-wrap gap-2">
                                {chips.map((chip) => (
                                  <span
                                    key={chip.key}
                                    className="inline-flex items-center gap-2 rounded-full bg-[#F3F4F6] px-3 py-1 text-[11px] text-[#374151]"
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveVariationFieldById((prev) => ({
                                          ...prev,
                                          [draft.id]: chip.key,
                                        }))
                                      }
                                      className="cursor-pointer hover:text-[#0A0A0A]"
                                      disabled={isPending}
                                    >
                                      {chip.label}: {String(chip.value)}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateVariationDraft(
                                          draft.id,
                                          chip.key,
                                          "",
                                        );
                                        setActiveVariationFieldById((prev) => ({
                                          ...prev,
                                          [draft.id]:
                                            prev?.[draft.id] === chip.key
                                              ? ""
                                              : prev?.[draft.id],
                                        }));
                                      }}
                                      className="cursor-pointer text-[#6B7280] hover:text-red-600"
                                      disabled={isPending}
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-[#6B7280]">
                                Choose an option below to start this variation.
                              </p>
                            )}

                            <div
                              className={`grid gap-2 ${activeField === "color" || activeField === "size" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}
                            >
                              <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-medium text-[#374151]">
                                  Add option
                                </label>
                                <Select
                                  value={activeField}
                                  onValueChange={(value) =>
                                    setActiveVariationFieldById((prev) => ({
                                      ...prev,
                                      [draft.id]: value,
                                    }))
                                  }
                                  disabled={isPending}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select attribute…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="color">Color</SelectItem>
                                    <SelectItem value="size">Size</SelectItem>
                                    <SelectItem value="sku">SKU</SelectItem>
                                    <SelectItem value="price">Price override</SelectItem>
                                    <SelectItem value="label">Label</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div
                                className={
                                  activeField
                                    ? `flex flex-col gap-1 ${
                                        activeField === "color" ||
                                        activeField === "size"
                                          ? "sm:col-span-2"
                                          : ""
                                      }`
                                    : "hidden"
                                }
                              >
                                <label className="text-[11px] font-medium text-[#374151]">
                                  Value
                                </label>

                                {activeField === "price" ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={draft.price}
                                    onChange={(e) =>
                                      updateVariationDraft(
                                        draft.id,
                                        "price",
                                        e.target.value,
                                      )
                                    }
                                    onBlur={() =>
                                      setActiveVariationFieldById((prev) => ({
                                        ...prev,
                                        [draft.id]: "",
                                      }))
                                    }
                                    placeholder="0.00"
                                    className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    disabled={isPending}
                                  />
                                ) : activeField === "color" ? (
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                      {COLOR_OPTIONS.map((color) => {
                                        const isSelected =
                                          String(draft.color || "") === color;
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
                                            disabled={isPending}
                                          >
                                            <span
                                              className="h-3 w-3 rounded-full border"
                                              style={{
                                                background:
                                                  COLOR_SWATCHES[color] ||
                                                  "#E5E7EB",
                                                borderColor:
                                                  color === "White"
                                                    ? "#E5E7EB"
                                                    : "transparent",
                                              }}
                                            />
                                            {color}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[11px] text-[#6B7280]">
                                        Custom color
                                      </label>
                                      <input
                                        type="text"
                                        value={draft.color}
                                        onChange={(e) =>
                                          updateVariationDraft(
                                            draft.id,
                                            "color",
                                            e.target.value,
                                          )
                                        }
                                        onBlur={() =>
                                          setActiveVariationFieldById(
                                            (prev) => ({
                                              ...prev,
                                              [draft.id]: "",
                                            }),
                                          )
                                        }
                                        placeholder="Type any color (e.g., Navy, Rose Gold)"
                                        className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        disabled={isPending}
                                      />
                                    </div>
                                  </div>
                                ) : activeField === "size" ? (
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                      {SIZE_OPTIONS.map((size) => {
                                        const isSelected =
                                          String(draft.size || "") === size;
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
                                            disabled={isPending}
                                          >
                                            {size}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[11px] text-[#6B7280]">
                                        Custom size
                                      </label>
                                      <input
                                        type="text"
                                        value={draft.size}
                                        onChange={(e) =>
                                          updateVariationDraft(
                                            draft.id,
                                            "size",
                                            e.target.value,
                                          )
                                        }
                                        onBlur={() =>
                                          setActiveVariationFieldById(
                                            (prev) => ({
                                              ...prev,
                                              [draft.id]: "",
                                            }),
                                          )
                                        }
                                        placeholder="Type any size (e.g., 42, 10.5, 2XL)"
                                        className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        disabled={isPending}
                                      />
                                    </div>
                                  </div>
                                ) : activeField === "sku" ? (
                                  <input
                                    type="text"
                                    value={draft.sku}
                                    onChange={(e) =>
                                      updateVariationDraft(
                                        draft.id,
                                        "sku",
                                        e.target.value,
                                      )
                                    }
                                    onBlur={() =>
                                      setActiveVariationFieldById((prev) => ({
                                        ...prev,
                                        [draft.id]: "",
                                      }))
                                    }
                                    placeholder="SKU-RED-S"
                                    className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    disabled={isPending}
                                  />
                                ) : activeField === "label" ? (
                                  <input
                                    type="text"
                                    value={draft.label}
                                    onChange={(e) =>
                                      updateVariationDraft(
                                        draft.id,
                                        "label",
                                        e.target.value,
                                      )
                                    }
                                    onBlur={() =>
                                      setActiveVariationFieldById((prev) => ({
                                        ...prev,
                                        [draft.id]: "",
                                      }))
                                    }
                                    placeholder="e.g., Red / Small"
                                    className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    disabled={isPending}
                                  />
                                ) : null}

                                {activeField && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveVariationFieldById((prev) => ({
                                        ...prev,
                                        [draft.id]: "",
                                      }))
                                    }
                                    className="cursor-pointer self-end mt-1 inline-flex items-center gap-1 rounded-lg border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                                    disabled={isPending}
                                  >
                                    Add
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 pt-2 border-t border-[#F3F4F6]">
                            <label className="text-[11px] font-medium text-[#374151]">
                              Stock / Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={draft.stock_qty}
                              onChange={(e) =>
                                updateVariationDraft(
                                  draft.id,
                                  "stock_qty",
                                  e.target.value,
                                )
                              }
                              placeholder="Available quantity for this variation"
                              className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              disabled={isPending}
                            />
                          </div>
                          {(() => {
                            const hasAttr = Boolean(draft.label || draft.color || draft.size || draft.sku);
                            const hasStock = draft.stock_qty !== "" && draft.stock_qty != null;
                            if (!hasAttr && hasStock) {
                              return (
                                <p className="text-[11px] text-red-500 mt-1">
                                  Add at least one attribute (color, size, SKU, or label) for this variation.
                                </p>
                              );
                            }
                            if (hasAttr && !hasStock) {
                              return (
                                <p className="text-[11px] text-red-500 mt-1">
                                  Stock quantity is required for this variation.
                                </p>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {state.errors?.variations && (
                <span className="text-red-500 text-xs">
                  {state.errors.variations}
                </span>
              )}
            </div>
          </div>

          <div className={currentStep === 3 ? "" : "hidden"}>
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

                    <div className="flex items-center justify-between mt-2">
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
                        className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors"
                        disabled={isPending}
                      >
                        <PiUploadSimple className="w-3.5 h-3.5" />
                        Add more product images
                      </button>
                    </div>
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
                <span className="text-red-500 text-xs">
                  {state.errors.images}
                </span>
              )}

              {imageCount > 0 && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-[#6B7280]">
                    Featured Image
                  </label>
                  <Select
                    value={featuredIndex || ""}
                    onValueChange={(value) => setFeaturedIndex(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Use first image" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: imageCount }).map((_, idx) => (
                        <SelectItem key={idx} value={String(idx)}>
                          {`Image ${idx + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

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
                  onClick={() =>
                    setCurrentStep((prev) => Math.max(prev - 1, 0))
                  }
                  disabled={currentStep === 0}
                  className="cursor-pointer px-4 py-2 text-sm font-medium text-[#374151] border border-[#D1D5DB] rounded-lg hover:bg-[#F3F4F6] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
                {currentStep < stepLabels.length - 1 ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentStep((prev) =>
                        Math.min(prev + 1, stepLabels.length - 1),
                      );
                    }}
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
