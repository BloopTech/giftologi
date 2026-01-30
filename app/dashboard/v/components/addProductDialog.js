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

  useEffect(() => {
    if (!open) return;

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
    if (state.success) {
      onSuccess?.();
      onOpenChange(false);
      setImagePreviews([]);
      setFeaturedIndex("");
      setSelectedParentCategoryId("");
      setSelectedSubcategoryId("");
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
              <input type="hidden" name="category_id" value={selectedCategoryId || ""} />
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

          {/* <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[#374151] text-sm font-medium">
                Cost Price(GHS)
              </label>
              <input
                type="number"
                name="cost_price"
                step="0.01"
                min="0"
                placeholder="0.00"
                defaultValue={state.values?.cost_price || ""}
                className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div> */}

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
                <>
                  <PiUploadSimple className="w-8 h-8 mx-auto text-[#9CA3AF] mb-2" />
                  <p className="text-[#6B7280] text-sm">
                    Drag & drop an image here, or{" "}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary cursor-pointer hover:underline"
                      disabled={isPending}
                    >
                      Browse
                    </button>
                  </p>
                </>
              )}
            </div>

            {(state.errors?.images || []).length ? (
              <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
                {Array.isArray(state.errors.images)
                  ? state.errors.images.map((err, idx) => <li key={idx}>{err}</li>)
                  : null}
              </ul>
            ) : (
              <p className="text-xs text-[#6B7280]">
                Upload up to 3 images per product. Each image must be 1MB or smaller.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[#374151] text-sm font-medium">
              Featured Image
            </label>
            {imageCount <= 0 ? (
              <p className="text-xs text-[#6B7280]">
                Select images above first. If you do not choose a featured image, the
                first uploaded image will be used.
              </p>
            ) : (
              <select
                value={featuredIndex}
                onChange={(e) => setFeaturedIndex(e.target.value)}
                className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                disabled={isPending}
              >
                <option value="">Use first image as featured</option>
                {Array.from({ length: Math.min(imageCount, 3) }).map((_, idx) => (
                  <option key={idx} value={String(idx)}>
                    {`Image ${idx + 1}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <DialogFooter className="mt-6 pt-4 border-t border-[#E5E7EB]">
            <DialogClose asChild>
              <button
                type="button"
                className="cursor-pointer px-4 py-2 text-sm font-medium text-[#374151] bg-white border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB]"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={isPending}
              className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Adding..." : "Add Product"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
