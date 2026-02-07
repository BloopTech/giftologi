"use client";
import React, {
  useMemo,
  useState,
  useEffect,
  useActionState,
  useRef,
} from "react";
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
  PiStorefront,
} from "react-icons/pi";
import { useVendorDashboardContext } from "./context";
import {
  SalesTrendSection,
  TopCategoriesSection,
} from "./components/charts/ChartsSection";
import {
  formatCurrency,
  formatCount,
  formatTimeAgo,
  getStatusColor,
  getStatusLabel,
  buildDailySeries,
} from "./components/utils";
import { AddProductDialog } from "./components/addProductDialog";

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
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );
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
        status === "approved" &&
        Number.isFinite(stock) &&
        stock > 0 &&
        stock <= 5
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
          total:
            Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0,
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
        <h1 className="text-[#0A0A0A] font-semibold font-brasley-medium">
          Vendor Dashboard
        </h1>
        <p className="text-[#717182] text-sm font-brasley-medium">{vendorError}</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col space-y-4 w-full mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-[#0A0A0A] font-medium text-lg font-brasley-medium">
            Vendor Dashboard
          </h1>
          <p className="text-[#717182] text-sm font-brasley-medium">
            We could not locate an approved vendor profile for your account.
            Please complete your application or contact support if this looks incorrect.
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
  const isClosingRequested = vendor?.shop_status === "closing_requested";
  const isClosed = vendor?.shop_status === "closed";
  const isShopInactive = isClosingRequested || isClosed;
  const storefrontSlug = vendor?.slug ? String(vendor.slug).trim() : "";
  const storefrontPath = storefrontSlug ? `/storefront/${storefrontSlug}` : "";

  return (
    <div className="flex flex-col space-y-4 w-full mb-8">
      {isClosingRequested && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <div className="flex items-start gap-3">
            <PiWarningCircle className="size-4 mt-0.5 text-amber-500" />
            <div className="space-y-1">
              <p className="font-medium text-amber-900">
                Close request pending review
              </p>
              <p>
                Your shop is still active, but product updates are paused until
                an admin reviews your request. You can cancel the request from
                the navigation menu.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium font-brasley-medium">
            Welcome back, {vendorName}
          </h1>
          <p className="text-[#717182] text-sm font-brasley-medium">
            Here&apos;s what&apos;s happening with your store today
          </p>
          {storefrontPath ? (
            <div className="pt-2 w-40">
              <Link
                href={storefrontPath}
                target="_blank"
                rel="noreferrer"
                className={`py-2 px-4 flex items-center justify-center gap-1 border text-xs rounded-xl transition-colors border-primary text-white bg-primary cursor-pointer hover:text-primary hover:bg-white`}
              >
                <PiStorefront className="w-4 h-4" />
                Visit Storefront
              </Link>
            </div>
          ) : null}
        </div>
        <button
          onClick={() => setAddDialogOpen(true)}
          disabled={isShopInactive}
          className={`py-2 px-4 flex items-center justify-center gap-1 border text-xs rounded-full transition-colors ${
            isShopInactive
              ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
              : "border-primary text-white bg-primary cursor-pointer hover:text-primary hover:bg-white"
          }`}
        >
          <PiPlus className="w-4 h-4" />
          {isShopInactive ? "Shop closing in review" : "Add New Products"}
        </button>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-brasley-medium">Total Sales</h2>
          <div className="flex justify-between items-center">
            <span className="text-[#0A0A0A] text-lg font-semibold font-brasley-medium">
              {formatCurrency(totalRevenue)}
            </span>
            <PiCashRegister className="size-4 text-[#7DADF2]" />
          </div>
          <div className="border-t-2 border-[#7DADF2]" />
        </div>

        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-brasley-medium">
            Total Orders
          </h2>
          <div className="flex justify-between items-center">
            <span className="text-[#0A0A0A] text-lg font-semibold font-brasley-medium">
              {formatCount(totalOrders)}
            </span>
            <PiShoppingBagOpen className="size-4 text-[#CBED8E]" />
          </div>
          <div className="border-t-2 border-[#CBED8E]" />
        </div>

        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-brasley-medium">
            Active Products
          </h2>
          <div className="flex justify-between items-center">
            <span className="text-[#0A0A0A] text-lg font-semibold font-brasley-medium">
              {formatCount(activeProducts.length)}
            </span>
            <PiFolderStar className="size-4 text-[#FFCA57]" />
          </div>
          <div className="border-t-2 border-[#FFCA57]" />
        </div>

        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-brasley-medium">
            Pending Payouts
          </h2>
          <div className="flex justify-between items-center">
            <span className="text-[#0A0A0A] text-lg font-semibold font-brasley-medium">
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
              <h2 className="text-[#111827] text-base font-semibold font-brasley-medium">
                Sales Trend
              </h2>
              <p className="text-[#6B7280] text-sm font-brasley-medium">
                Daily sales for the last 7 days
              </p>
            </div>
            <div className="flex items-center gap-1 bg-[#F3F4F6] rounded-full p-1">
              <button className="cursor-pointer px-3 py-1.5 text-xs font-medium rounded-full bg-[#111827] text-white">
                7D
              </button>
              <button className="cursor-pointer px-3 py-1.5 text-xs font-medium rounded-full text-[#6B7280] hover:bg-white">
                30D
              </button>
              <button className="cursor-pointer px-3 py-1.5 text-xs font-medium rounded-full text-[#6B7280] hover:bg-white">
                90D
              </button>
            </div>
          </div>

          <SalesTrendSection data={dailySeries} />
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <h2 className="text-[#111827] text-base font-semibold font-brasley-medium">
                Low Stock Alert
              </h2>
              <p className="text-[#6B7280] text-sm font-brasley-medium">
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
              <h2 className="text-[#111827] text-base font-semibold font-brasley-medium">
                Recent Orders
              </h2>
              <p className="text-[#6B7280] text-sm font-brasley-medium">
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
                    <button className="cursor-pointer p-2 rounded-full hover:bg-[#F3F4F6] transition-colors">
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
            <h2 className="text-[#111827] text-base font-semibold font-brasley-medium">
              Top Categories
            </h2>
            <p className="text-[#6B7280] text-sm font-brasley-medium">
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
