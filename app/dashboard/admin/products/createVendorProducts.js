"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LoaderCircle, Search, X } from "lucide-react";

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

const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024;


export default function CreateAllVendorProducts(props) {
  const {
    selectedVendor,
    vendorSearch,
    setVendorSearch,
    vendorLoading,
    vendorError,
    vendorResults,
    handleSelectVendor,
    setCreateMode,
    createMode,
    createAction,
    selectedCategoryIds,
    featuredIndex,
    bulkCategoryIds,
    setSelectedCategoryIds,
    createPending,
    categoriesById,
    getCategoryDisplayName,
    parentCategoryOptions,
    categoriesByParentId,
    selectedCategoryIdSet,
    toggleSelectedCategory,
    categoriesLoading,
    categoriesError,
    createState,
    variationsPayload,
    addVariationDraft,
    variationDrafts,
    activeVariationFieldById,
    removeVariationDraft,
    setActiveVariationFieldById,
    updateVariationDraft,
    setFeaturedIndex,
    setBulkCategoryIds,
    bulkCategoryIdSet,
    toggleBulkCategory,
    handleBulkFileChange,
    bulkFileLabel,
    bulkHeaderError,
    bulkMapping,
    bulkColumns,
    setBulkMapping,
    setSelectedVendor,
    setVendorResults,
  } = props;

  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef(null);

  const imageCount = imagePreviews.length;

  useEffect(() => {
    if (!featuredIndex) return;
    const idx = Number(featuredIndex);
    if (!Number.isInteger(idx) || idx >= imageCount) {
      setFeaturedIndex("");
    }
  }, [featuredIndex, imageCount, setFeaturedIndex]);

  useEffect(() => {
    if (createMode === "single") return;
    setImagePreviews([]);
    setImageError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [createMode]);

  useEffect(() => {
    if (!createState?.data || !Object.keys(createState.data || {}).length) {
      return;
    }
    setImagePreviews([]);
    setImageError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [createState?.data]);

  const syncInputFiles = (nextPreviews) => {
    if (!fileInputRef.current) return;
    const dt = new DataTransfer();
    nextPreviews.forEach((item) => {
      if (item?.file) dt.items.add(item.file);
    });
    fileInputRef.current.files = dt.files;
  };

  const buildPreviews = (files, currentPreviews = []) => {
    const list = Array.from(files || []).filter((file) =>
      Boolean(file && file.type && file.type.startsWith("image/")),
    );

    if (!list.length) return;

    const tooLarge = list.filter(
      (file) => typeof file.size === "number" && file.size > MAX_IMAGE_SIZE_BYTES,
    );
    const filtered = list.filter(
      (file) =>
        !(typeof file.size === "number" && file.size > MAX_IMAGE_SIZE_BYTES),
    );

    const remainingSlots = Math.max(0, 3 - currentPreviews.length);
    const limited = filtered.slice(0, remainingSlots);

    if (tooLarge.length) {
      setImageError("Each image must be 1MB or smaller.");
    } else if (filtered.length > remainingSlots) {
      setImageError("Upload up to 3 images per product.");
    } else {
      setImageError("");
    }

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

  const handleImagesChange = (event) => {
    const files = event?.target?.files;
    if (!files || files.length === 0) return;
    buildPreviews(files, imagePreviews);
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
    setImageError("");
    setFeaturedIndex("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-4 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
        <div className="flex flex-col gap-2">
          <h2 className="text-[#0A0A0A] text-xs font-medium font-brasley-medium">
            Create Products for Vendor
          </h2>
          <p className="text-[#717182] text-[11px] font-brasley-medium">
            Search for a vendor, then create a single product or upload multiple
            products from a CSV file (up to 200 rows per upload).
          </p>
        </div>

        <section className="space-y-3">
          {!selectedVendor && (
            <div className="space-y-3">
              <p className="text-[11px] font-medium text-[#717182]">
                Step 1 - Choose Vendor
              </p>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-3 flex items-center text-[#9CA3AF]">
                    <Search className="size-3.5" />
                  </span>
                  <input
                    type="text"
                    value={vendorSearch}
                    onChange={(event) => setVendorSearch(event.target.value)}
                    placeholder="Search vendors by business name or email"
                    className="w-full rounded-full border px-8 py-2 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[#E5E7EB] bg-white max-h-64 overflow-y-auto text-xs">
                {vendorLoading ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-6 text-[11px] text-[#717182]">
                    <LoaderCircle className="size-3.5 animate-spin" />
                    <span>Loading vendors</span>
                  </div>
                ) : vendorError ? (
                  <div className="px-4 py-6 text-[11px] text-red-600">
                    {vendorError}
                  </div>
                ) : !vendorResults.length ? (
                  <div className="px-4 py-6 text-[11px] text-[#717182]">
                    Start typing to search for vendors by business name or
                    email.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {vendorResults.map((vendor) => {
                      const profile = vendor.profiles || {};
                      const parts = [];
                      if (profile.firstname) parts.push(profile.firstname);
                      if (profile.lastname) parts.push(profile.lastname);
                      const contactName =
                        parts.join(" ") || profile.email || "-";
                      const email = profile.email || "-";

                      return (
                        <li
                          key={vendor.id}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-[#0A0A0A]">
                              {vendor.business_name || "Untitled Vendor"}
                            </span>
                            <span className="text-[11px] text-[#6A7282]">
                              {contactName} - {email}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectVendor(vendor)}
                            className="rounded-full px-3 py-1 text-[11px] font-medium border border-primary bg-primary text-white hover:bg-white hover:text-primary cursor-pointer"
                          >
                            Select
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {selectedVendor && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 flex flex-col gap-1 text-[11px]">
                  <span className="text-[#6B7280]">Selected Vendor</span>
                  <span className="text-xs font-medium text-[#111827]">
                    {selectedVendor.businessName}
                  </span>
                  <span className="text-[11px] text-[#6B7280]">
                    {selectedVendor.contactName} - {selectedVendor.contactEmail}
                  </span>
                </div>
                <div className="inline-flex rounded-full bg-[#F3F4F6] p-1 text-[11px]">
                  {[
                    { id: "single", label: "Single Product" },
                    { id: "bulk", label: "Bulk from CSV" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCreateMode(tab.id)}
                      className={
                        "px-3 py-1.5 rounded-full cursor-pointer transition-colors " +
                        (createMode === tab.id
                          ? "bg-white text-[#0A0A0A] shadow-sm"
                          : "text-[#6A7282] hover:text-[#0A0A0A]")
                      }
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <form
                action={createAction}
                className="space-y-4 text-xs text-[#0A0A0A]"
              >
                <input
                  type="hidden"
                  name="vendorId"
                  value={selectedVendor.id}
                />
                <input type="hidden" name="mode" value={createMode} />
                <input type="hidden" name="categoryId" value="" />
                <input
                  type="hidden"
                  name="categoryIds"
                  value={JSON.stringify(selectedCategoryIds)}
                />
                <input
                  type="hidden"
                  name="featuredImageIndex"
                  value={featuredIndex || ""}
                />
                <input type="hidden" name="bulkCategoryId" value="" />
                <input
                  type="hidden"
                  name="bulkCategoryIds"
                  value={JSON.stringify(bulkCategoryIds)}
                />

                {createMode === "single" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-medium text-[#0A0A0A]">
                          Categories <span className="text-red-500">*</span>
                          <span className="ml-1 text-[11px] font-normal text-[#6A7282]">
                            (Select all that apply)
                          </span>
                        </label>
                        {selectedCategoryIds.length ? (
                          <button
                            type="button"
                            onClick={() => setSelectedCategoryIds([])}
                            className="text-[11px] text-[#6A7282] hover:text-[#0A0A0A]"
                            disabled={createPending}
                          >
                            Clear
                          </button>
                        ) : null}
                      </div>
                      <div className="rounded-lg border border-[#D6D6D6] bg-white p-3 space-y-3">
                        {selectedCategoryIds.length ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedCategoryIds.map((id) => {
                              const category = categoriesById.get(id);
                              if (!category) return null;
                              return (
                                <span
                                  key={id}
                                  className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] text-[#374151]"
                                >
                                  {getCategoryDisplayName(category)}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-[#9CA3AF]">
                            No categories selected yet.
                          </p>
                        )}
                        <div className="space-y-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                          {parentCategoryOptions.length ? (
                            parentCategoryOptions.map((parent) => {
                              const children =
                                categoriesByParentId.get(parent.id) || [];
                              return (
                                <div key={parent.id} className="space-y-2">
                                  <label className="flex items-center gap-2 text-[11px] text-[#111827]">
                                    <input
                                      type="checkbox"
                                      checked={selectedCategoryIdSet.has(
                                        parent.id,
                                      )}
                                      onChange={() =>
                                        toggleSelectedCategory(parent.id)
                                      }
                                      disabled={
                                        categoriesLoading || createPending
                                      }
                                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                                    />
                                    <span className="font-medium">
                                      {parent.name || "Untitled"}
                                    </span>
                                  </label>
                                  {children.length ? (
                                    <div className="ml-6 grid gap-1">
                                      {children.map((child) => (
                                        <label
                                          key={child.id}
                                          className="flex items-center gap-2 text-[11px] text-[#4B5563]"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selectedCategoryIdSet.has(
                                              child.id,
                                            )}
                                            onChange={() =>
                                              toggleSelectedCategory(child.id)
                                            }
                                            disabled={
                                              categoriesLoading || createPending
                                            }
                                            className="accent-primary h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                          />
                                          <span>
                                            {child.name || "Untitled"}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-[11px] text-[#9CA3AF]">
                              No categories available.
                            </p>
                          )}
                        </div>
                      </div>
                      {categoriesError ? (
                        <p className="mt-1 text-[11px] text-red-600">
                          {categoriesError}
                        </p>
                      ) : null}
                      {(createState?.errors?.categoryIds || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.categoryIds.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="product-name"
                        className="text-xs font-medium text-[#0A0A0A]"
                      >
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="product-name"
                        name="name"
                        type="text"
                        maxLength={100}
                        defaultValue={createState?.values?.name || ""}
                        placeholder="e.g. Premium Gift Basket"
                        className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                        disabled={createPending}
                      />
                      {(createState?.errors?.name || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.name.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="product-price"
                        className="text-xs font-medium text-[#0A0A0A]"
                      >
                        Price (GHS) <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="product-price"
                        name="price"
                        type="text"
                        inputMode="decimal"
                        defaultValue={createState?.values?.price || ""}
                        placeholder="e.g. 250.00"
                        className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                        disabled={createPending}
                      />
                      {(createState?.errors?.price || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.price.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="product-weight"
                        className="text-xs font-medium text-[#0A0A0A]"
                      >
                        Weight (kg) <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="product-weight"
                        name="weightKg"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        onKeyDown={(event) => {
                          if (["e", "E", "+", "-"].includes(event.key)) {
                            event.preventDefault();
                          }
                        }}
                        defaultValue={createState?.values?.weightKg || ""}
                        placeholder="e.g. 1.2"
                        className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                        disabled={createPending}
                      />
                      {(createState?.errors?.weightKg || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.weightKg.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-[#717182]">
                          Required for Aramex shipping rates.
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="product-service-charge"
                        className="text-xs font-medium text-[#0A0A0A]"
                      >
                        Service Charge (GHS)
                      </label>
                      <input
                        id="product-service-charge"
                        name="serviceCharge"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        defaultValue={createState?.values?.serviceCharge || ""}
                        placeholder="e.g. 10.00"
                        className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                        onKeyDown={(event) => {
                          if (["e", "E", "+", "-"].includes(event.key)) {
                            event.preventDefault();
                          }
                        }}
                        disabled={createPending}
                      />
                      {(createState?.errors?.serviceCharge || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.serviceCharge.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="product-stock"
                        className="text-xs font-medium text-[#0A0A0A]"
                      >
                        Stock Quantity
                      </label>
                      <input
                        id="product-stock"
                        name="stockQty"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        defaultValue={createState?.values?.stockQty || ""}
                        placeholder="e.g. 50"
                        className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                        disabled={createPending}
                      />
                      {(createState?.errors?.stockQty || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.stockQty.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-[#717182]">
                          Optional. Leave blank if stock is managed elsewhere.
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label
                        htmlFor="product-description"
                        className="text-xs font-medium text-[#0A0A0A]"
                      >
                        Description
                      </label>
                      <textarea
                        id="product-description"
                        name="description"
                        rows={3}
                        defaultValue={createState?.values?.description || ""}
                        placeholder="Short description of the product shown to guests."
                        className="w-full rounded-lg border px-3 py-2 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]"
                        disabled={createPending}
                      />
                      {(createState?.errors?.description || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.description.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label
                        htmlFor="product-variations"
                        className="text-xs font-medium text-[#0A0A0A]"
                      >
                        Variations (optional)
                      </label>
                      <input
                        type="hidden"
                        name="variations"
                        value={variationsPayload}
                      />
                      <div className="rounded-lg border border-[#D6D6D6] bg-white p-3 space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-[11px] text-[#717182]">
                            Add color/size options or SKU-only variants. Price
                            overrides the base price.
                          </p>
                          <button
                            type="button"
                            onClick={addVariationDraft}
                            className="cursor-pointer inline-flex items-center justify-center rounded-full border border-[#D6D6D6] px-3 py-1 text-[11px] font-medium text-[#0A0A0A] hover:border-primary hover:text-primary"
                            disabled={createPending}
                          >
                            + Add variation
                          </button>
                        </div>

                        {variationDrafts.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-[#D6D6D6] bg-[#F9FAFB] p-4 text-center text-[11px] text-[#6B7280]">
                            No variations yet. Add one to offer color, size, or
                            SKU options.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {variationDrafts.map((draft, index) => {
                              const activeField =
                                activeVariationFieldById?.[draft.id] || "";
                              const chips = [
                                {
                                  key: "color",
                                  label: "Color",
                                  value: draft.color,
                                },
                                {
                                  key: "size",
                                  label: "Size",
                                  value: draft.size,
                                },
                                { key: "sku", label: "SKU", value: draft.sku },
                                {
                                  key: "price",
                                  label: "Price",
                                  value: draft.price,
                                },
                                {
                                  key: "label",
                                  label: "Label",
                                  value: draft.label,
                                },
                              ].filter((entry) =>
                                String(entry.value || "").trim(),
                              );

                              return (
                                <div
                                  key={draft.id}
                                  className="rounded-lg border border-[#E5E7EB] p-3 space-y-3"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-medium text-[#6B7280]">
                                      Variation {index + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeVariationDraft(draft.id)
                                      }
                                      className="cursor-pointer text-[11px] text-red-500 hover:text-red-600"
                                      disabled={createPending}
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
                                                setActiveVariationFieldById(
                                                  (prev) => ({
                                                    ...prev,
                                                    [draft.id]: chip.key,
                                                  }),
                                                )
                                              }
                                              className="cursor-pointer hover:text-[#0A0A0A]"
                                              disabled={createPending}
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
                                                setActiveVariationFieldById(
                                                  (prev) => ({
                                                    ...prev,
                                                    [draft.id]:
                                                      prev?.[draft.id] ===
                                                      chip.key
                                                        ? ""
                                                        : prev?.[draft.id],
                                                  }),
                                                );
                                              }}
                                              className="cursor-pointer text-[#6B7280] hover:text-red-600"
                                              disabled={createPending}
                                            >
                                              ×
                                            </button>
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-[#6B7280]">
                                        Choose an option below to start this
                                        variation.
                                      </p>
                                    )}

                                    <div
                                      className={`grid gap-2 ${activeField === "color" || activeField === "size" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}
                                    >
                                      <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-medium text-[#374151]">
                                          Add option
                                        </label>
                                        <select
                                          value={activeField}
                                          onChange={(e) =>
                                            setActiveVariationFieldById(
                                              (prev) => ({
                                                ...prev,
                                                [draft.id]: e.target.value,
                                              }),
                                            )
                                          }
                                          className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                          disabled={createPending}
                                        >
                                          <option value="">
                                            Select option…
                                          </option>
                                          <option value="color">Color</option>
                                          <option value="size">Size</option>
                                          <option value="sku">SKU</option>
                                          <option value="price">
                                            Price override
                                          </option>
                                          <option value="label">Label</option>
                                        </select>
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
                                              setActiveVariationFieldById(
                                                (prev) => ({
                                                  ...prev,
                                                  [draft.id]: "",
                                                }),
                                              )
                                            }
                                            placeholder="0.00"
                                            className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            disabled={createPending}
                                          />
                                        ) : activeField === "color" ? (
                                          <div className="space-y-2">
                                            <div className="flex flex-wrap gap-2">
                                              {COLOR_OPTIONS.map((color) => {
                                                const isSelected =
                                                  String(draft.color || "") ===
                                                  color;
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
                                                    disabled={createPending}
                                                  >
                                                    <span
                                                      className="h-3 w-3 rounded-full border"
                                                      style={{
                                                        background:
                                                          COLOR_SWATCHES[
                                                            color
                                                          ] || "#E5E7EB",
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
                                                className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                disabled={createPending}
                                              />
                                            </div>
                                          </div>
                                        ) : activeField === "size" ? (
                                          <div className="space-y-2">
                                            <div className="flex flex-wrap gap-2">
                                              {SIZE_OPTIONS.map((size) => {
                                                const isSelected =
                                                  String(draft.size || "") ===
                                                  size;
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
                                                    disabled={createPending}
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
                                                className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                disabled={createPending}
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
                                              setActiveVariationFieldById(
                                                (prev) => ({
                                                  ...prev,
                                                  [draft.id]: "",
                                                }),
                                              )
                                            }
                                            placeholder="SKU-RED-S"
                                            className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            disabled={createPending}
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
                                              setActiveVariationFieldById(
                                                (prev) => ({
                                                  ...prev,
                                                  [draft.id]: "",
                                                }),
                                              )
                                            }
                                            placeholder="e.g., Red / Small"
                                            className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            disabled={createPending}
                                          />
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {(createState?.errors?.variations || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.variations.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-[#717182]">
                          Variations can include label, color, size, sku, and
                          price.
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label
                        htmlFor="product-images"
                        className="text-xs font-medium text-[#0A0A0A]"
                      >
                        Product Images
                      </label>
                      <input
                        ref={fileInputRef}
                        id="product-images"
                        name="product_images"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImagesChange}
                        className="hidden"
                        disabled={createPending}
                      />
                      <div className="rounded-lg border border-dashed border-[#D6D6D6] bg-white p-4 text-center">
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
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
                              <button
                                type="button"
                                onClick={removeAllImages}
                                className="cursor-pointer text-red-600 hover:underline"
                                disabled={createPending}
                              >
                                Remove all images
                              </button>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="cursor-pointer text-primary hover:underline"
                                disabled={createPending}
                              >
                                Add images
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex flex-col items-center gap-2 text-[#9CA3AF]">
                              <span className="text-[11px] text-[#6B7280]">
                                Drag and drop images here, or click to select
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="cursor-pointer text-[11px] text-primary hover:underline"
                              disabled={createPending}
                            >
                              Browse files
                            </button>
                          </div>
                        )}
                      </div>
                      {(createState?.errors?.images || []).length || imageError ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {(createState?.errors?.images || []).map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                          {imageError ? <li>{imageError}</li> : null}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-[#717182]">
                          Upload up to 3 images per product. Each image must be
                          1MB or smaller. Images are uploaded to Cloudflare and
                          stored as URLs on the product.
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-[#0A0A0A]">
                        Featured Image
                      </label>
                      <div className="flex flex-col gap-1 text-[11px] text-[#6B7280]">
                        {imageCount <= 0 ? (
                          <p>
                            Select images above first. If you do not choose a
                            featured image, the first uploaded image will be
                            used.
                          </p>
                        ) : (
                          <select
                            value={featuredIndex}
                            onChange={(e) => setFeaturedIndex(e.target.value)}
                            className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]"
                            disabled={createPending}
                          >
                            <option value="">
                              Use first image as featured
                            </option>
                            {Array.from({
                              length: Math.min(imageCount, 3),
                            }).map((_, idx) => (
                              <option key={idx} value={String(idx)}>
                                {`Image ${idx + 1}`}
                              </option>
                            ))}
                          </select>
                        )}
                        {(createState?.errors?.featuredImageIndex || [])
                          .length ? (
                          <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                            {createState.errors.featuredImageIndex.map(
                              (err, index) => (
                                <li key={index}>{err}</li>
                              ),
                            )}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

                {createMode === "bulk" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-medium text-[#0A0A0A]">
                          Default Categories (optional)
                          <span className="ml-1 text-[11px] font-normal text-[#6A7282]">
                            (Applied to every CSV row)
                          </span>
                        </label>
                        {bulkCategoryIds.length ? (
                          <button
                            type="button"
                            onClick={() => setBulkCategoryIds([])}
                            className="text-[11px] text-[#6A7282] hover:text-[#0A0A0A]"
                            disabled={createPending}
                          >
                            Clear
                          </button>
                        ) : null}
                      </div>
                      <div className="rounded-lg border border-[#D6D6D6] bg-white p-3 space-y-3">
                        {bulkCategoryIds.length ? (
                          <div className="flex flex-wrap gap-2">
                            {bulkCategoryIds.map((id) => {
                              const category = categoriesById.get(id);
                              if (!category) return null;
                              return (
                                <span
                                  key={id}
                                  className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] text-[#374151]"
                                >
                                  {getCategoryDisplayName(category)}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-[#9CA3AF]">
                            No default categories selected. CSV rows can define
                            their own.
                          </p>
                        )}
                        <div className="space-y-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                          {parentCategoryOptions.length ? (
                            parentCategoryOptions.map((parent) => {
                              const children =
                                categoriesByParentId.get(parent.id) || [];
                              return (
                                <div key={parent.id} className="space-y-2">
                                  <label className="flex items-center gap-2 text-[11px] text-[#111827]">
                                    <input
                                      type="checkbox"
                                      checked={bulkCategoryIdSet.has(parent.id)}
                                      onChange={() =>
                                        toggleBulkCategory(parent.id)
                                      }
                                      disabled={
                                        categoriesLoading || createPending
                                      }
                                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                                    />
                                    <span className="font-medium">
                                      {parent.name || "Untitled"}
                                    </span>
                                  </label>
                                  {children.length ? (
                                    <div className="ml-6 grid gap-1">
                                      {children.map((child) => (
                                        <label
                                          key={child.id}
                                          className="flex items-center gap-2 text-[11px] text-[#4B5563]"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={bulkCategoryIdSet.has(
                                              child.id,
                                            )}
                                            onChange={() =>
                                              toggleBulkCategory(child.id)
                                            }
                                            disabled={
                                              categoriesLoading || createPending
                                            }
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                                          />
                                          <span>
                                            {child.name || "Untitled"}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-[11px] text-[#9CA3AF]">
                              No categories available.
                            </p>
                          )}
                        </div>
                      </div>
                      {categoriesError ? (
                        <p className="mt-1 text-[11px] text-red-600">
                          {categoriesError}
                        </p>
                      ) : null}
                      {(createState?.errors?.bulkCategoryIds || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.bulkCategoryIds.map(
                            (err, index) => (
                              <li key={index}>{err}</li>
                            ),
                          )}
                        </ul>
                      ) : null}
                      <p className="text-[11px] text-[#717182]">
                        When set, all products created from this CSV will use
                        these categories.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="bulk-file"
                        className="text-xs font-medium text-[#0A0A0A]"
                      >
                        CSV File <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="bulk-file"
                        name="bulk_file"
                        type="file"
                        accept=".csv"
                        onChange={handleBulkFileChange}
                        className="block w-full text-[11px] text-[#4B5563] file:mr-3 file:rounded-full file:border file:border-[#D6D6D6] file:bg-white file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-[#0A0A0A] hover:file:bg-[#F3F4F6]"
                        disabled={createPending}
                      />
                      {bulkFileLabel ? (
                        <p className="text-[11px] text-[#6A7282]">
                          Selected: {bulkFileLabel}
                        </p>
                      ) : null}
                      {bulkHeaderError ? (
                        <p className="text-[11px] text-red-600 mt-1">
                          {bulkHeaderError}
                        </p>
                      ) : null}
                      {(createState?.errors?.bulkFile || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.bulkFile.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-[#717182]">
                          Export from Excel or Google Sheets as a CSV with a
                          header row. Maximum of 200 products per upload.
                        </p>
                      )}
                    </div>

                    <input
                      type="hidden"
                      name="bulk_mapping"
                      value={JSON.stringify(bulkMapping)}
                    />

                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-[#717182]">
                        Step 2 - Map CSV Columns
                      </p>
                      {!bulkColumns.length ? (
                        <p className="text-[11px] text-[#9CA3AF]">
                          Upload a CSV file to configure column mappings.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-[#0A0A0A]">
                              Product Name Column{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={bulkMapping.name}
                              onChange={(e) =>
                                setBulkMapping((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]"
                              disabled={createPending}
                            >
                              <option value="">Select column</option>
                              {bulkColumns.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-[#0A0A0A]">
                              Weight Column (kg){" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={bulkMapping.weightKg}
                              onChange={(e) =>
                                setBulkMapping((prev) => ({
                                  ...prev,
                                  weightKg: e.target.value,
                                }))
                              }
                              className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]"
                              disabled={createPending}
                            >
                              <option value="">Select column</option>
                              {bulkColumns.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-[#0A0A0A]">
                              Price Column{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={bulkMapping.price}
                              onChange={(e) =>
                                setBulkMapping((prev) => ({
                                  ...prev,
                                  price: e.target.value,
                                }))
                              }
                              className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]"
                              disabled={createPending}
                            >
                              <option value="">Select column</option>
                              {bulkColumns.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-[#0A0A0A]">
                              Description Column
                            </label>
                            <select
                              value={bulkMapping.description}
                              onChange={(e) =>
                                setBulkMapping((prev) => ({
                                  ...prev,
                                  description: e.target.value,
                                }))
                              }
                              className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]"
                              disabled={createPending}
                            >
                              <option value="">Optional</option>
                              {bulkColumns.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-[#0A0A0A]">
                              Stock Quantity Column
                            </label>
                            <select
                              value={bulkMapping.stockQty}
                              onChange={(e) =>
                                setBulkMapping((prev) => ({
                                  ...prev,
                                  stockQty: e.target.value,
                                }))
                              }
                              className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]"
                              disabled={createPending}
                            >
                              <option value="">Optional</option>
                              {bulkColumns.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-[#0A0A0A]">
                              Image URL Column
                            </label>
                            <select
                              value={bulkMapping.imageUrl}
                              onChange={(e) =>
                                setBulkMapping((prev) => ({
                                  ...prev,
                                  imageUrl: e.target.value,
                                }))
                              }
                              className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]"
                              disabled={createPending}
                            >
                              <option value="">Optional</option>
                              {bulkColumns.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {(createState?.errors?.bulkMapping || []).length ? (
                        <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                          {createState.errors.bulkMapping.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                )}

                {createState?.message && hasCreateErrors && (
                  <p className="text-[11px] text-red-600">
                    {createState.message}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVendor(null);
                      setVendorSearch("");
                      setVendorResults([]);
                    }}
                    className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                    disabled={createPending}
                  >
                    Change Vendor
                  </button>
                  <button
                    type="submit"
                    disabled={createPending}
                    className="inline-flex items-center justify-center rounded-full border border-primary bg-primary px-6 py-2 text-xs font-medium text-white hover:bg-white hover:text-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {createPending ? (
                      <span className="inline-flex items-center gap-2">
                        <LoaderCircle className="size-3.5 animate-spin" />
                        <span>
                          {createMode === "bulk"
                            ? "Creating products..."
                            : "Creating product..."}
                        </span>
                      </span>
                    ) : createMode === "bulk" ? (
                      "Create Products"
                    ) : (
                      "Create Product"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
