"use client";

import React from "react";
import { cx } from "@/app/components/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/Dialog";

export default function EditProductDialog({
  open,
  onOpenChange,
  product,
  editState,
  editPending,
  editStep,
  setEditStep,
  editFormRef,
  editFileInputRef,
  editCategoryIds,
  editCategoryIdSet,
  toggleEditCategory,
  clearEditCategories,
  parentCategoryOptions,
  categoriesByParentId,
  categoriesLoading,
  categoriesError,
  categoriesById,
  editVariationsPayload,
  editVariationDrafts,
  addEditVariationDraft,
  removeEditVariationDraft,
  updateEditVariationDraft,
  editActiveVariationFieldById,
  setEditActiveVariationFieldById,
  editExistingImages,
  removeExistingImageAt,
  removeAllExistingImages,
  editImagePreviews,
  removeEditPreviewAt,
  removeAllEditPreviews,
  editFeaturedIndex,
  setEditFeaturedIndex,
  editFeaturedCount,
  handleEditImagesChange,
  handleEditSave,
  handleEditSubmit,
  hasEditError,
  editErrorFor,
  colorOptions,
  colorSwatches,
  sizeOptions,
  getCategoryDisplayName,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
            Edit Product
          </DialogTitle>
          <DialogDescription className="text-xs text-[#717182]">
            Update product details, pricing, and images.
          </DialogDescription>
        </DialogHeader>

        {product && (
          <form
            ref={editFormRef}
            onSubmit={handleEditSubmit}
            className="mt-4 space-y-6 text-xs text-[#0A0A0A]"
          >
            <input type="hidden" name="productId" value={product.id} />
            <input
              type="hidden"
              name="categoryIds"
              value={JSON.stringify(editCategoryIds || [])}
            />
            <input
              type="hidden"
              name="variations"
              value={editVariationsPayload}
            />
            <input
              type="hidden"
              name="featuredImageIndex"
              value={editFeaturedIndex || ""}
            />
            <input
              type="hidden"
              name="existing_images"
              value={JSON.stringify(editExistingImages)}
            />

            {editState?.message &&
            Object.keys(editState?.errors || {}).length ? (
              <p className="text-[11px] text-red-600">{editState.message}</p>
            ) : null}

            <div className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 flex flex-wrap gap-2">
              {["Details", "Categories", "Variations", "Images"].map(
                (label, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setEditStep(index)}
                    disabled={editPending}
                    className={cx(
                      "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                      editStep === index
                        ? "bg-primary text-white"
                        : "bg-white text-[#6B7280] border border-transparent hover:border-primary/40",
                    )}
                  >
                    {`${index + 1}. ${label}`}
                  </button>
                ),
              )}
            </div>

            <div
              className={cx(
                "grid grid-cols-1 md:grid-cols-2 gap-4",
                editStep === 0 ? "" : "hidden",
              )}
            >
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#0A0A0A]">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  defaultValue={product.name || ""}
                  maxLength={100}
                  className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A]"
                  disabled={editPending}
                />
                {hasEditError("name") ? (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {editErrorFor("name").map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#0A0A0A]">
                  Weight (kg) <span className="text-red-500">*</span>
                </label>
                <input
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
                  defaultValue={
                    product.weightKg == null ? "" : String(product.weightKg)
                  }
                  className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A]"
                  disabled={editPending}
                />
                {hasEditError("weightKg") ? (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {editErrorFor("weightKg").map((err, index) => (
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
                <label className="text-xs font-medium text-[#0A0A0A]">
                  Price (GHS) <span className="text-red-500">*</span>
                </label>
                <input
                  name="price"
                  type="text"
                  inputMode="decimal"
                  defaultValue={
                    product.price == null ? "" : String(product.price)
                  }
                  className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A]"
                  disabled={editPending}
                />
                {hasEditError("price") ? (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {editErrorFor("price").map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#0A0A0A]">
                  Service Charge (GHS)
                </label>
                <input
                  name="serviceCharge"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  defaultValue={
                    product.serviceCharge == null
                      ? ""
                      : String(product.serviceCharge)
                  }
                  className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A]"
                  onKeyDown={(event) => {
                    if (["e", "E", "+", "-"].includes(event.key)) {
                      event.preventDefault();
                    }
                  }}
                  disabled={editPending}
                />
                {hasEditError("serviceCharge") ? (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {editErrorFor("serviceCharge").map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#0A0A0A]">
                  Stock Quantity
                </label>
                <input
                  name="stockQty"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  defaultValue={product.stockQty ?? ""}
                  className="w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A]"
                  disabled={editPending}
                />
                {hasEditError("stockQty") ? (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {editErrorFor("stockQty").map((err, index) => (
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
                <label className="text-xs font-medium text-[#0A0A0A]">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={product.description || ""}
                  className="w-full rounded-lg border px-3 py-2 text-xs shadow-sm outline-none bg-white border-[#D6D6D6] text-[#0A0A0A]"
                  disabled={editPending}
                />
                {hasEditError("description") ? (
                  <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                    {editErrorFor("description").map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            <div className={cx("space-y-2", editStep === 1 ? "" : "hidden")}>
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-[#0A0A0A]">
                  Categories <span className="text-red-500">*</span>
                  <span className="ml-1 text-[11px] font-normal text-[#6A7282]">
                    (Select all that apply)
                  </span>
                </label>
                {editCategoryIds?.length ? (
                  <button
                    type="button"
                    onClick={clearEditCategories}
                    className="text-[11px] text-[#6A7282] hover:text-[#0A0A0A]"
                    disabled={editPending}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <div className="rounded-lg border border-[#D6D6D6] bg-white p-3 space-y-3">
                {editCategoryIds?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {editCategoryIds.map((id) => {
                      const category = categoriesById?.get(id);
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
                <div className="space-y-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {parentCategoryOptions.length ? (
                    parentCategoryOptions.map((parent) => {
                      const children =
                        categoriesByParentId?.get(parent.id) || [];
                      return (
                        <div key={parent.id} className="space-y-2">
                          <label className="flex items-center gap-2 text-[11px] text-[#111827]">
                            <input
                              type="checkbox"
                              checked={editCategoryIdSet?.has(parent.id)}
                              onChange={() => toggleEditCategory(parent.id)}
                              disabled={categoriesLoading || editPending}
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
                                    checked={editCategoryIdSet?.has(child.id)}
                                    onChange={() =>
                                      toggleEditCategory(child.id)
                                    }
                                    disabled={categoriesLoading || editPending}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                                  />
                                  <span>{child.name || "Untitled"}</span>
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
              {hasEditError("categoryIds") ? (
                <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                  {editErrorFor("categoryIds").map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className={cx("space-y-2", editStep === 2 ? "" : "hidden")}>
              <label className="text-xs font-medium text-[#0A0A0A]">
                Variations (optional)
              </label>
              <div className="rounded-lg border border-[#D6D6D6] bg-white p-3 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-[#717182]">
                    Add color/size options or SKU-only variants. Price overrides
                    the base price.
                  </p>
                  <button
                    type="button"
                    onClick={addEditVariationDraft}
                    className="cursor-pointer inline-flex items-center justify-center rounded-full border border-[#D6D6D6] px-3 py-1 text-[11px] font-medium text-[#0A0A0A] hover:border-primary hover:text-primary"
                    disabled={editPending}
                  >
                    + Add variation
                  </button>
                </div>

                {editVariationDrafts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#D6D6D6] bg-[#F9FAFB] p-4 text-center text-[11px] text-[#6B7280]">
                    No variations yet. Add one to offer color, size, or SKU
                    options.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {editVariationDrafts.map((draft, index) => {
                      const activeField =
                        editActiveVariationFieldById?.[draft.id] || "";
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
                            <span className="text-[11px] font-medium text-[#6B7280]">
                              Variation {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeEditVariationDraft(draft.id)}
                              className="cursor-pointer text-[11px] text-red-500 hover:text-red-600"
                              disabled={editPending}
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
                                        setEditActiveVariationFieldById?.(
                                          (prev) => ({
                                            ...prev,
                                            [draft.id]: chip.key,
                                          }),
                                        )
                                      }
                                      className="cursor-pointer hover:text-[#0A0A0A]"
                                      disabled={editPending}
                                    >
                                      {chip.label}: {String(chip.value)}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateEditVariationDraft(
                                          draft.id,
                                          chip.key,
                                          "",
                                        );
                                        setEditActiveVariationFieldById?.(
                                          (prev) => ({
                                            ...prev,
                                            [draft.id]:
                                              prev?.[draft.id] === chip.key
                                                ? ""
                                                : prev?.[draft.id],
                                          }),
                                        );
                                      }}
                                      className="cursor-pointer text-[#6B7280] hover:text-red-600"
                                      disabled={editPending}
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
                                <select
                                  value={activeField}
                                  onChange={(e) =>
                                    setEditActiveVariationFieldById?.(
                                      (prev) => ({
                                        ...prev,
                                        [draft.id]: e.target.value,
                                      }),
                                    )
                                  }
                                  className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                  disabled={editPending}
                                >
                                  <option value="">Select option…</option>
                                  <option value="color">Color</option>
                                  <option value="size">Size</option>
                                  <option value="sku">SKU</option>
                                  <option value="price">Price override</option>
                                  <option value="label">Label</option>
                                </select>
                              </div>

                              <div
                                className={
                                  activeField ? "flex flex-col gap-1" : "hidden"
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
                                      updateEditVariationDraft(
                                        draft.id,
                                        "price",
                                        e.target.value,
                                      )
                                    }
                                    onBlur={() =>
                                      setEditActiveVariationFieldById?.(
                                        (prev) => ({
                                          ...prev,
                                          [draft.id]: "",
                                        }),
                                      )
                                    }
                                    placeholder="0.00"
                                    className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    disabled={editPending}
                                  />
                                ) : activeField === "color" ? (
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                      {colorOptions.map((color) => {
                                        const isSelected =
                                          String(draft.color || "") === color;
                                        return (
                                          <button
                                            key={color}
                                            type="button"
                                            onClick={() =>
                                              updateEditVariationDraft(
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
                                            disabled={editPending}
                                          >
                                            <span
                                              className="h-3 w-3 rounded-full border"
                                              style={{
                                                background:
                                                  colorSwatches[color] ||
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
                                          updateEditVariationDraft(
                                            draft.id,
                                            "color",
                                            e.target.value,
                                          )
                                        }
                                        onBlur={() =>
                                          setEditActiveVariationFieldById?.(
                                            (prev) => ({
                                              ...prev,
                                              [draft.id]: "",
                                            }),
                                          )
                                        }
                                        placeholder="Type any color (e.g., Navy, Rose Gold)"
                                        className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        disabled={editPending}
                                      />
                                    </div>
                                  </div>
                                ) : activeField === "size" ? (
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                      {sizeOptions.map((size) => {
                                        const isSelected =
                                          String(draft.size || "") === size;
                                        return (
                                          <button
                                            key={size}
                                            type="button"
                                            onClick={() =>
                                              updateEditVariationDraft(
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
                                            disabled={editPending}
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
                                          updateEditVariationDraft(
                                            draft.id,
                                            "size",
                                            e.target.value,
                                          )
                                        }
                                        onBlur={() =>
                                          setEditActiveVariationFieldById?.(
                                            (prev) => ({
                                              ...prev,
                                              [draft.id]: "",
                                            }),
                                          )
                                        }
                                        placeholder="Type any size (e.g., 42, 10.5, 2XL)"
                                        className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        disabled={editPending}
                                      />
                                    </div>
                                  </div>
                                ) : activeField === "sku" ? (
                                  <input
                                    type="text"
                                    value={draft.sku}
                                    onChange={(e) =>
                                      updateEditVariationDraft(
                                        draft.id,
                                        "sku",
                                        e.target.value,
                                      )
                                    }
                                    onBlur={() =>
                                      setEditActiveVariationFieldById?.(
                                        (prev) => ({
                                          ...prev,
                                          [draft.id]: "",
                                        }),
                                      )
                                    }
                                    placeholder="SKU-RED-S"
                                    className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    disabled={editPending}
                                  />
                                ) : activeField === "label" ? (
                                  <input
                                    type="text"
                                    value={draft.label}
                                    onChange={(e) =>
                                      updateEditVariationDraft(
                                        draft.id,
                                        "label",
                                        e.target.value,
                                      )
                                    }
                                    onBlur={() =>
                                      setEditActiveVariationFieldById?.(
                                        (prev) => ({
                                          ...prev,
                                          [draft.id]: "",
                                        }),
                                      )
                                    }
                                    placeholder="e.g., Red / Small"
                                    className="w-full rounded-lg border border-[#D6D6D6] px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    disabled={editPending}
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
              {hasEditError("variations") ? (
                <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                  {editErrorFor("variations").map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className={cx("space-y-4", editStep === 3 ? "" : "hidden")}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#0A0A0A]">
                  Product Images
                </label>
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="text-[11px] text-primary hover:underline"
                  disabled={editPending}
                >
                  {editImagePreviews.length || editExistingImages.length
                    ? "Add images"
                    : "Upload"}
                </button>
              </div>
              <input
                ref={editFileInputRef}
                type="file"
                name="product_images"
                accept="image/*"
                multiple
                onChange={handleEditImagesChange}
                className="hidden"
                disabled={editPending}
              />

              <div className="space-y-2">
                <p className="text-[11px] text-[#717182]">
                  Add up to 3 images total. New uploads will be appended.
                </p>
                {editExistingImages.length ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-[#0A0A0A]">
                      Current images
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {editExistingImages.map((url, idx) => (
                        <div
                          key={`${url}-${idx}`}
                          className="relative h-16 w-16 rounded-md overflow-hidden border border-gray-200"
                        >
                          <img
                            src={url}
                            alt={`Existing ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingImageAt(idx)}
                            className="absolute -top-2 -right-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={removeAllExistingImages}
                      className="text-[11px] text-red-500 hover:text-red-600"
                      disabled={editPending}
                    >
                      Remove all current images
                    </button>
                  </div>
                ) : null}

                {editImagePreviews.length ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-[#0A0A0A]">
                      New uploads
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {editImagePreviews.map((item, idx) => (
                        <div
                          key={idx}
                          className="relative h-16 w-16 rounded-md overflow-hidden border border-gray-200"
                        >
                          <img
                            src={item.preview}
                            alt={`Preview ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeEditPreviewAt(idx)}
                            className="absolute -top-2 -right-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={removeAllEditPreviews}
                      className="text-[11px] text-red-500 hover:text-red-600"
                      disabled={editPending}
                    >
                      Clear new images
                    </button>
                  </div>
                ) : null}

                {!editExistingImages.length && !editImagePreviews.length ? (
                  <p className="text-[11px] text-[#717182]">
                    No images yet. Upload up to 3 images per product.
                  </p>
                ) : null}
              </div>

              {hasEditError("images") ? (
                <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                  {editErrorFor("images").map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              ) : null}

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#0A0A0A]">
                  Featured Image
                </label>
                {editFeaturedCount <= 0 ? (
                  <p className="text-[11px] text-[#717182]">
                    Select images above first. If you do not choose a featured
                    image, the first image will be used.
                  </p>
                ) : (
                  <select
                    value={editFeaturedIndex}
                    onChange={(e) => setEditFeaturedIndex(e.target.value)}
                    className="w-full rounded-full border px-3 py-2 text-xs bg-white border-[#D6D6D6] text-[#0A0A0A]"
                    disabled={editPending}
                  >
                    <option value="">Use first image as featured</option>
                    {Array.from({ length: Math.min(editFeaturedCount, 3) }).map(
                      (_, idx) => (
                        <option key={idx} value={String(idx)}>
                          {`Image ${idx + 1}`}
                        </option>
                      ),
                    )}
                  </select>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <DialogClose asChild>
                <button
                  type="button"
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-[11px] text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                  disabled={editPending}
                >
                  Cancel
                </button>
              </DialogClose>
              {editStep > 0 ? (
                <button
                  type="button"
                  onClick={() => setEditStep((prev) => Math.max(prev - 1, 0))}
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-[11px] text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
                  disabled={editPending}
                >
                  Back
                </button>
              ) : null}
              {editStep < 2 ? (
                <button
                  type="button"
                  onClick={() => setEditStep((prev) => Math.min(prev + 1, 2))}
                  className="rounded-full border border-primary bg-primary px-4 py-2 text-[11px] font-medium text-white hover:bg-white hover:text-primary cursor-pointer"
                  disabled={editPending}
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEditSave}
                  disabled={editPending}
                  className="rounded-full border border-primary bg-primary px-4 py-2 text-[11px] font-medium text-white hover:bg-white hover:text-primary cursor-pointer"
                >
                  {editPending ? "Saving..." : "Save Changes"}
                </button>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
