"use client";
import React, { useState, useEffect, useActionState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  PiPackage,
  PiCurrencyCircleDollar,
  PiWarningCircle,
  PiXCircle,
  PiMagnifyingGlass,
  PiCaretDown,
  PiDotsThreeVertical,
  PiPencilSimple,
  PiTrash,
  PiUploadSimple,
  PiX,
  PiPlus,
  PiImage,
} from "react-icons/pi";
import { useVendorProductsContext } from "./context";
import { manageProducts } from "./action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "../../../components/Dialog";

const formatCurrency = (value) => {
  if (value === null || typeof value === "undefined") return "GHS0.00";
  const num = Number(value);
  if (!Number.isFinite(num)) return "GHS0.00";
  return `GHS${num.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatCount = (value) => {
  if (value === null || typeof value === "undefined") return "0";
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString();
};

const getStatusBadge = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "approved" || s === "active") {
    return { label: "Active", className: "bg-[#D1FAE5] text-[#059669]" };
  }
  if (s === "pending") {
    return { label: "Pending", className: "bg-[#FEF3C7] text-[#D97706]" };
  }
  if (s === "rejected") {
    return { label: "Rejected", className: "bg-[#FEE2E2] text-[#DC2626]" };
  }
  if (s === "inactive") {
    return { label: "Inactive", className: "bg-[#F3F4F6] text-[#6B7280]" };
  }
  if (s === "out_of_stock") {
    return { label: "Out of Stock", className: "bg-[#FEE2E2] text-[#DC2626]" };
  }
  return {
    label: status || "Unknown",
    className: "bg-[#F3F4F6] text-[#6B7280]",
  };
};

const getStockStatus = (stock) => {
  const qty = Number(stock || 0);
  if (qty === 0) return { label: "Out of Stock", color: "text-[#DC2626]" };
  if (qty <= 5) return { label: `${qty}`, color: "text-[#D97706]" };
  return { label: `${qty}`, color: "text-[#111827]" };
};

const calculateMargin = (price, costPrice) => {
  const p = Number(price || 0);
  const c = Number(costPrice || 0);
  if (p === 0 || c === 0) return null;
  const margin = ((p - c) / p) * 100;
  return margin.toFixed(0);
};

function StatCard({ icon: Icon, iconColor, title, value }) {
  return (
    <div className="flex flex-col space-y-2 p-4 bg-white rounded-xl border border-[#E5E7EB]">
      <div className="flex items-center justify-between">
        <span className="text-[#6B7280] text-sm font-poppins">{title}</span>

        <Icon className={`w-5 h-5 text-[${iconColor}]`} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[#111827] text-2xl font-semibold font-inter">
          {value}
        </span>
      </div>
    </div>
  );
}

function AddProductDialog({ open, onOpenChange, categories, onSuccess }) {
  const [state, formAction, isPending] = useActionState(manageProducts, {
    success: false,
    message: "",
    errors: {},
    values: {},
  });

  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (state.success) {
      onSuccess?.();
      onOpenChange(false);
      setImagePreview(null);
      formRef.current?.reset();
    }
  }, [state.success, onSuccess, onOpenChange]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInputRef.current.files = dt.files;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
          <input type="hidden" name="action" value="create" />

          {state.message && !state.success && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {state.message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
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
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="product_code"
                placeholder="e.g., CVS-001"
                defaultValue={state.values?.product_code || ""}
                className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {state.errors?.product_code && (
                <span className="text-red-500 text-xs">
                  {state.errors.product_code}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[#374151] text-sm font-medium">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category_id"
                defaultValue={state.values?.category_id || ""}
                className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[#374151] text-sm font-medium">
                Selling Price <span className="text-red-500">*</span>
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

            <div className="flex flex-col gap-1.5">
              <label className="text-[#374151] text-sm font-medium">
                Cost Price
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
          </div>

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
              Product Image
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="relative border-2 border-dashed border-[#D1D5DB] rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
            >
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-32 mx-auto rounded-lg object-contain"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <PiX className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <PiUploadSimple className="w-8 h-8 mx-auto text-[#9CA3AF] mb-2" />
                  <p className="text-[#6B7280] text-sm">
                    Drag & drop an image here, or{" "}
                    <label className="text-primary cursor-pointer hover:underline">
                      Browse
                      <input
                        ref={fileInputRef}
                        type="file"
                        name="image"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </p>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 pt-4 border-t border-[#E5E7EB]">
            <DialogClose asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-[#374151] bg-white border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB]"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Adding..." : "Add Product"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProductActionsMenu({ product, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors"
      >
        <PiDotsThreeVertical className="w-5 h-5 text-[#6B7280]" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[#E5E7EB] rounded-lg shadow-lg py-1 min-w-[120px]">
            <button
              onClick={() => {
                onEdit?.(product);
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-[#374151] hover:bg-[#F3F4F6] flex items-center gap-2"
            >
              <PiPencilSimple className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => {
                onDelete?.(product);
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <PiTrash className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function VendorProductsContent() {
  const {
    vendor,
    categories,
    loading,
    error,
    refreshData,
    totalProducts,
    inventoryValue,
    lowStockCount,
    outOfStockCount,
    productsWithSales,
  } = useVendorProductsContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const filteredProducts = productsWithSales.filter((product) => {
    const matchesSearch =
      !searchQuery ||
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.product_code?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || product.category_id === categoryFilter;

    const matchesStatus =
      statusFilter === "all" ||
      product.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col space-y-4 w-full mb-8">
        <div className="h-8 w-48 rounded-lg bg-[#E5E7EB] animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-[#E5E7EB] animate-pulse"
            />
          ))}
        </div>
        <div className="h-96 w-full rounded-xl bg-[#E5E7EB] animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col space-y-2 w-full mb-8">
        <h1 className="text-[#111827] font-semibold font-inter">Products</h1>
        <p className="text-[#6B7280] text-sm font-poppins">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 w-full mb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/v"
          className="text-[#6B7280] hover:text-[#111827]"
        >
          Vendor Portal
        </Link>
        <span className="text-[#6B7280]">/</span>
        <span className="text-[#111827] font-medium">Products</span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={PiPackage}
          iconColor="#3B82F6"
          title="Total Products"
          value={formatCount(totalProducts)}
        />
        <StatCard
          icon={PiCurrencyCircleDollar}
          iconColor="#10B981"
          title="Inventory Value"
          value={formatCurrency(inventoryValue)}
        />
        <StatCard
          icon={PiWarningCircle}
          iconColor="#F59E0B"
          title="Low Stock"
          value={formatCount(lowStockCount)}
        />
        <StatCard
          icon={PiXCircle}
          iconColor="#EF4444"
          title="Out of Stock"
          value={formatCount(outOfStockCount)}
        />
      </div>

      {/* Product Catalog Section */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E7EB] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-[#111827] text-lg font-semibold font-inter">
              Product Catalog
            </h2>
            <p className="text-[#6B7280] text-sm font-poppins">
              Manage your product listings and inventory
            </p>
          </div>
          <button
            onClick={() => setAddDialogOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
          >
            <PiPlus className="w-4 h-4" />
            Add New Products
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-[#E5E7EB] flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <PiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <PiCaretDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Status</option>
                <option value="approved">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
                <option value="rejected">Rejected</option>
              </select>
              <PiCaretDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Sales
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Margin
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <PiPackage className="w-12 h-12 text-[#D1D5DB]" />
                      <p className="text-[#6B7280] text-sm">
                        {searchQuery ||
                        categoryFilter !== "all" ||
                        statusFilter !== "all"
                          ? "No products match your filters"
                          : "No products yet. Add your first product!"}
                      </p>
                      {!searchQuery &&
                        categoryFilter === "all" &&
                        statusFilter === "all" && (
                          <button
                            onClick={() => setAddDialogOpen(true)}
                            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90"
                          >
                            <PiPlus className="w-4 h-4" />
                            Add Product
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.stock_qty);
                  const statusBadge = getStatusBadge(
                    product.stock_qty === 0 ? "out_of_stock" : product.status,
                  );
                  const margin = calculateMargin(product.price, null);

                  return (
                    <tr key={product.id} className="hover:bg-[#F9FAFB]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#F3F4F6] flex items-center justify-center overflow-hidden">
                            {product.images?.[0] ? (
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <PiImage className="w-5 h-5 text-[#9CA3AF]" />
                            )}
                          </div>
                          <span className="text-[#111827] text-sm font-medium">
                            {product.name || "Unnamed Product"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] text-sm">
                        {product.product_code || "—"}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] text-sm">
                        {product.categories?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-[#111827] text-sm font-medium">
                        {formatCurrency(product.price)}
                      </td>
                      <td
                        className={`px-4 py-3 text-center text-sm font-medium ${stockStatus.color}`}
                      >
                        {stockStatus.label}
                      </td>
                      <td className="px-4 py-3 text-center text-[#111827] text-sm">
                        {formatCount(product.salesUnits)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-[#10B981] text-sm font-medium">
                        {margin ? `↑ ${margin}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ProductActionsMenu
                          product={product}
                          onEdit={(p) => console.log("Edit", p)}
                          onDelete={(p) => console.log("Delete", p)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Dialog */}
      <AddProductDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        categories={categories}
        onSuccess={refreshData}
      />
    </div>
  );
}
