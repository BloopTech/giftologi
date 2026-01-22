"use client";

import React, { useMemo, useState, useEffect, useActionState, useRef } from "react";
import Link from "next/link";
import {
  PiCashRegister,
  PiFolderStar,
  PiShoppingBagOpen,
  PiWallet,
  PiWarningCircle,
  PiEye,
  PiUploadSimple,
  PiX,
  PiPlus,
} from "react-icons/pi";
import { useVendorDashboardContext } from "./context";
import {
  SalesTrendSection,
  TopCategoriesSection,
} from "./components/charts/ChartsSection";
import { manageVendor } from "./action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "../../components/Dialog";

const formatCurrency = (value) => {
  if (value === null || typeof value === "undefined") return "GHS 0.00";
  const num = Number(value);
  if (!Number.isFinite(num)) return "GHS 0.00";
  return `GHS ${num.toLocaleString("en-GH", {
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

const buildDailySeries = (orderItems, days = 7) => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));

  const map = new Map();

  (orderItems || []).forEach((row) => {
    const created = row?.created_at;
    if (!created) return;
    const date = new Date(created);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    const entry = map.get(key) || { revenue: 0, orders: new Set() };
    const qty = Number(row.quantity || 0);
    const price = Number(row.price || 0);
    if (Number.isFinite(qty) && Number.isFinite(price)) {
      entry.revenue += qty * price;
    }
    if (row.order_id) {
      entry.orders.add(row.order_id);
    }
    map.set(key, entry);
  });

  return Array.from({ length: days }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = day.toISOString().slice(0, 10);
    const entry = map.get(key);
    const label = day.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return {
      dateKey: key,
      label,
      revenue: entry ? entry.revenue : 0,
      orders: entry ? entry.orders.size : 0,
    };
  });
};

const getStatusColor = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "bg-[#FEF3C7] text-[#D97706]";
  if (s === "confirmed" || s === "paid") return "bg-[#D1FAE5] text-[#059669]";
  if (s === "shipped") return "bg-[#DBEAFE] text-[#2563EB]";
  if (s === "delivered") return "bg-[#D1FAE5] text-[#059669]";
  if (s === "cancelled") return "bg-[#FEE2E2] text-[#DC2626]";
  return "bg-[#F3F4F6] text-[#6B7280]";
};

const getStatusLabel = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "Pending";
  if (s === "confirmed" || s === "paid") return "Confirmed";
  if (s === "shipped") return "Shipped";
  if (s === "delivered") return "Delivered";
  if (s === "cancelled") return "Cancelled";
  return status || "Unknown";
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
};

function AddProductDialog({ open, onOpenChange, categories, onSuccess }) {
  const [state, formAction, isPending] = useActionState(manageVendor, {
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
          <input type="hidden" name="action" value="create_product" />

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
                <span className="text-red-500 text-xs">{state.errors.name}</span>
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
                <span className="text-red-500 text-xs">{state.errors.product_code}</span>
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
                <span className="text-red-500 text-xs">{state.errors.category_id}</span>
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
                <span className="text-red-500 text-xs">{state.errors.price}</span>
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
              <span className="text-red-500 text-xs">{state.errors.stock_qty}</span>
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

export default function VendorDashboardContent() {
  const {
    vendor,
    products = [],
    orderItems = [],
    payouts = [],
    categories = [],
    loadingVendorData,
    vendorError,
    refreshVendorData,
  } = useVendorDashboardContext() || {};

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const derivedData = useMemo(() => {
    const productById = new Map(products.map((product) => [product.id, product]));
    const ordersSet = new Set();
    let totalRevenue = 0;

    orderItems.forEach((row) => {
      if (row?.order_id) ordersSet.add(row.order_id);
      const qty = Number(row.quantity || 0);
      const price = Number(row.price || 0);
      if (Number.isFinite(qty) && Number.isFinite(price)) {
        totalRevenue += qty * price;
      }
    });

    const activeProducts = products.filter(
      (product) => (product.status || "").toLowerCase() === "approved",
    );

    const lowStockItems = products.filter((product) => {
      const status = (product.status || "").toLowerCase();
      const stock = Number(product.stock_qty || 0);
      return (
        status === "approved" && Number.isFinite(stock) && stock > 0 && stock <= 5
      );
    });

    const pendingPayoutAmount = payouts.reduce((sum, row) => {
      const status = (row.status || "").toLowerCase();
      if (status !== "pending") return sum;
      const amt = Number(row.total_net_amount || 0);
      return Number.isFinite(amt) ? sum + amt : sum;
    }, 0);

    const dailySeries = buildDailySeries(orderItems, 7);

    const categorySales = new Map();
    orderItems.forEach((row) => {
      const product = productById.get(row.product_id);
      const category = product?.category || "Other";
      const qty = Number(row.quantity || 0);
      const price = Number(row.price || 0);
      if (Number.isFinite(qty) && Number.isFinite(price)) {
        categorySales.set(
          category,
          (categorySales.get(category) || 0) + qty * price,
        );
      }
    });

    const topCategories = Array.from(categorySales.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const productSales = new Map();
    orderItems.forEach((row) => {
      const productId = row.product_id;
      if (!productId) return;
      const qty = Number(row.quantity || 0);
      const price = Number(row.price || 0);
      if (!Number.isFinite(qty) || !Number.isFinite(price)) return;
      const entry = productSales.get(productId) || { units: 0, revenue: 0 };
      entry.units += qty;
      entry.revenue += qty * price;
      productSales.set(productId, entry);
    });

    const topProducts = Array.from(productSales.entries())
      .map(([productId, stats]) => {
        const product = productById.get(productId);
        return {
          id: productId,
          name: product?.name || "Unnamed product",
          units: stats.units,
          revenue: stats.revenue,
          stock: product?.stock_qty ?? null,
        };
      })
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 5);

    const recentItems = [...orderItems]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 6)
      .map((row) => {
        const product = productById.get(row.product_id);
        const qty = Number(row.quantity || 0);
        const price = Number(row.price || 0);
        return {
          id: `${row.order_id || "order"}-${row.product_id || "product"}`,
          productName: product?.name || "Product",
          orderId: row.order_id || "—",
          createdAt: row.created_at,
          quantity: Number.isFinite(qty) ? qty : 0,
          total: Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0,
        };
      });

    return {
      totalRevenue,
      totalOrders: ordersSet.size,
      activeProducts,
      lowStockItems,
      pendingPayoutAmount,
      dailySeries,
      topCategories,
      topProducts,
      recentItems,
    };
  }, [products, orderItems, payouts]);

  if (loadingVendorData) {
    return (
      <div className="flex flex-col space-y-4 w-full mb-8">
        <div className="h-8 w-48 rounded-lg bg-[#E5E7EB] animate-pulse" />
        <div className="h-32 w-full rounded-2xl bg-[#E5E7EB] animate-pulse" />
        <div className="h-64 w-full rounded-2xl bg-[#E5E7EB] animate-pulse" />
      </div>
    );
  }

  if (vendorError) {
    return (
      <div className="flex flex-col space-y-2 w-full mb-8">
        <h1 className="text-[#0A0A0A] font-semibold font-inter">Vendor Dashboard</h1>
        <p className="text-[#717182] text-sm font-poppins">{vendorError}</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col space-y-4 w-full mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-[#0A0A0A] font-medium text-lg font-inter">
            Vendor Dashboard
          </h1>
          <p className="text-[#717182] text-sm font-poppins">
            We could not locate an approved vendor profile for your account.
            Please contact support if this looks incorrect.
          </p>
        </div>
      </div>
    );
  }

  const {
    totalRevenue,
    totalOrders,
    activeProducts,
    lowStockItems,
    pendingPayoutAmount,
    dailySeries,
    topCategories,
    recentItems,
  } = derivedData;

  const vendorName = vendor?.business_name || "Your store";

  return (
    <div className="flex flex-col space-y-4 w-full mb-8">
      {/* Header */}
      <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium font-inter">
            Welcome back, {vendorName}
          </h1>
          <p className="text-[#717182] text-sm font-poppins">
            Here&apos;s what&apos;s happening with your store today
          </p>
        </div>
        <button
          onClick={() => setAddDialogOpen(true)}
          className="py-2 px-4 flex items-center justify-center gap-1 border border-primary text-white bg-primary text-xs rounded-full cursor-pointer hover:text-primary hover:bg-white transition-colors"
        >
          <PiPlus className="w-4 h-4" />
          Add New Products
        </button>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">Total Sales</h2>
          <div className="flex justify-between items-center">
            <span className="text-[#0A0A0A] text-lg font-semibold font-inter">
              {formatCurrency(totalRevenue)}
            </span>
            <PiCashRegister className="size-4 text-[#7DADF2]" />
          </div>
          <div className="border-t-2 border-[#7DADF2]" />
        </div>

        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">Total Orders</h2>
          <div className="flex justify-between items-center">
            <span className="text-[#0A0A0A] text-lg font-semibold font-inter">
              {formatCount(totalOrders)}
            </span>
            <PiShoppingBagOpen className="size-4 text-[#CBED8E]" />
          </div>
          <div className="border-t-2 border-[#CBED8E]" />
        </div>

        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">Active Products</h2>
          <div className="flex justify-between items-center">
            <span className="text-[#0A0A0A] text-lg font-semibold font-inter">
              {formatCount(activeProducts.length)}
            </span>
            <PiFolderStar className="size-4 text-[#FFCA57]" />
          </div>
          <div className="border-t-2 border-[#FFCA57]" />
        </div>

        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">Pending Payouts</h2>
          <div className="flex justify-between items-center">
            <span className="text-[#0A0A0A] text-lg font-semibold font-inter">
              {formatCurrency(pendingPayoutAmount)}
            </span>
            <PiWallet className="size-4 text-[#FF908B]" />
          </div>
          <div className="border-t-2 border-[#FF908B]" />
        </div>
      </section>

      {/* Sales Trend + Low Stock Alert */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-[#E5E7EB] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <h2 className="text-[#111827] text-base font-semibold font-inter">
                Sales Trend
              </h2>
              <p className="text-[#6B7280] text-sm font-poppins">
                Daily sales for the last 7 days
              </p>
            </div>
            <div className="flex items-center gap-1 bg-[#F3F4F6] rounded-full p-1">
              <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-[#111827] text-white">
                7D
              </button>
              <button className="px-3 py-1.5 text-xs font-medium rounded-full text-[#6B7280] hover:bg-white">
                30D
              </button>
              <button className="px-3 py-1.5 text-xs font-medium rounded-full text-[#6B7280] hover:bg-white">
                90D
              </button>
            </div>
          </div>

          <SalesTrendSection data={dailySeries} />
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <h2 className="text-[#111827] text-base font-semibold font-inter">
                Low Stock Alert
              </h2>
              <p className="text-[#6B7280] text-sm font-poppins">
                Products needing restock
              </p>
            </div>
            <PiWarningCircle className="w-5 h-5 text-[#F59E0B]" />
          </div>

          <div className="space-y-4">
            {lowStockItems.length ? (
              lowStockItems.slice(0, 3).map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-[#F3F4F6] last:border-0"
                >
                  <div className="flex flex-col">
                    <span className="text-[#111827] text-sm font-medium">
                      {item.name || "Product"}
                    </span>
                    <span className="text-[#9CA3AF] text-xs">
                      SKU: {item.id?.slice(0, 8) || `SKU-00${index + 1}`}
                    </span>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded bg-[#FEE2E2] text-[#DC2626]">
                    {formatCount(item.stock_qty)} left
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-[#9CA3AF] py-4">
                All products have healthy stock levels.
              </div>
            )}
          </div>

          <Link
            href="/dashboard/v/products"
            className="mt-4 w-full inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB] transition-colors"
          >
            Manage Inventory
          </Link>
        </div>
      </section>

      {/* Recent Orders + Top Categories */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-[#E5E7EB] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <h2 className="text-[#111827] text-base font-semibold font-inter">
                Recent Orders
              </h2>
              <p className="text-[#6B7280] text-sm font-poppins">
                Latest orders from your products
              </p>
            </div>
            <Link
              href="/dashboard/v/orders"
              className="text-sm font-medium text-[#3B82F6] hover:text-[#2563EB]"
            >
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {recentItems.length ? (
              recentItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b border-[#F3F4F6] last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[#111827] text-sm font-medium">
                          ORD-{item.orderId?.slice(0, 4) || "0000"}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(
                            "pending",
                          )}`}
                        >
                          {getStatusLabel("pending")}
                        </span>
                      </div>
                      <span className="text-[#111827] text-sm">
                        {item.productName}
                      </span>
                      <span className="text-[#9CA3AF] text-xs">
                        Customer • {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[#111827] text-sm font-semibold">
                      {formatCurrency(item.total)}
                    </span>
                    <button className="p-2 rounded-full hover:bg-[#F3F4F6] transition-colors">
                      <PiEye className="w-4 h-4 text-[#6B7280]" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-[#9CA3AF] py-8 text-center">
                No order activity in the last 30 days.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
          <div className="flex flex-col mb-4">
            <h2 className="text-[#111827] text-base font-semibold font-inter">
              Top Categories
            </h2>
            <p className="text-[#6B7280] text-sm font-poppins">
              Sales by category
            </p>
          </div>

          <TopCategoriesSection data={topCategories} />
        </div>
      </section>

      {/* Add Product Dialog */}
      <AddProductDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        categories={categories}
        onSuccess={refreshVendorData}
      />
    </div>
  );
}