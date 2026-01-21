"use server";
import React from "react";
import Link from "next/link";
import {
  PiChartLineUp,
  PiPackage,
  PiShoppingCart,
  PiWallet,
  PiEye,
  PiWarningCircle,
  PiWarning,
  PiTicket,
  PiStorefront,
  PiShoppingBagOpen,
} from "react-icons/pi";
import { createClient } from "../../utils/supabase/server";

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

  const series = [];
  for (let i = 0; i < days; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    const entry = map.get(key);
    const label = day.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    series.push({
      dateKey: key,
      label,
      revenue: entry ? entry.revenue : 0,
      orders: entry ? entry.orders.size : 0,
    });
  }
  return series;
};

const buildLineChartPath = (
  values,
  width = 500,
  height = 200,
  padding = 40,
) => {
  if (!values || values.length === 0)
    return { path: "", areaPath: "", points: [] };
  const max = Math.max(...values, 1);
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const step = values.length > 1 ? chartWidth / (values.length - 1) : 0;

  const points = values.map((value, index) => {
    const x = padding + step * index;
    const y = padding + chartHeight - (Number(value) / max) * chartHeight;
    return { x, y, value };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

  return { path: pathD, areaPath: areaD, points, max, chartHeight, padding };
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

export default async function VendorDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileResult, vendorResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, firstname, lastname, role")
      .eq("id", user?.id || "")
      .single(),
    supabase
      .from("vendors")
      .select("id, business_name, category, verified, created_at")
      .eq("profiles_id", user?.id || "")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = profileResult?.data || null;
  const vendor = vendorResult?.data || null;

  let products = [];
  let orderItems = [];
  let payouts = [];

  if (vendor?.id) {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 30);
    const windowIso = windowStart.toISOString();

    const [productsResult, orderItemsResult, payoutsResult] = await Promise.all(
      [
        supabase
          .from("products")
          .select("id, name, price, stock_qty, status, created_at")
          .eq("vendor_id", vendor.id),
        supabase
          .from("order_items")
          .select("order_id, product_id, quantity, price, created_at")
          .eq("vendor_id", vendor.id)
          .gte("created_at", windowIso),
        supabase
          .from("vendor_payouts")
          .select("status, total_net_amount, created_at")
          .eq("vendor_id", vendor.id),
      ],
    );

    products = productsResult?.data || [];
    orderItems = orderItemsResult?.data || [];
    payouts = payoutsResult?.data || [];
  }

  const productById = new Map(
    (products || []).map((product) => [product.id, product]),
  );

  const ordersSet = new Set();
  let totalRevenue = 0;
  let totalUnits = 0;

  orderItems.forEach((row) => {
    if (row?.order_id) ordersSet.add(row.order_id);
    const qty = Number(row.quantity || 0);
    const price = Number(row.price || 0);
    if (Number.isFinite(qty) && Number.isFinite(price)) {
      totalRevenue += qty * price;
      totalUnits += qty;
    }
  });

  const totalOrders = ordersSet.size;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

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

  const completedPayoutAmount = payouts.reduce((sum, row) => {
    const status = (row.status || "").toLowerCase();
    if (!(status === "paid" || status === "approved")) return sum;
    const amt = Number(row.total_net_amount || 0);
    return Number.isFinite(amt) ? sum + amt : sum;
  }, 0);

  const dailySeries = buildDailySeries(orderItems, 7);
  const revenueValues = dailySeries.map((row) => row.revenue || 0);
  const chartData = buildLineChartPath(revenueValues, 500, 220, 50);

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

  const vendorName = vendor?.business_name || "Your store";
  const firstName = profile?.firstname || "Vendor";

  if (!vendor) {
    return (
      <div className="flex flex-col space-y-4 w-full mb-[2rem] lg:px-10 px-5">
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

  const pendingPayoutsCount = payouts.filter(
    (p) => (p.status || "").toLowerCase() === "pending",
  ).length;

  return (
    <div className="flex flex-col space-y-6 w-full mb-[2rem] lg:px-10 px-5">
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
        <Link
          href="/dashboard/v/products/new"
          className="py-2 px-4 flex items-center justify-center border border-primary text-white bg-primary text-xs rounded-full cursor-pointer hover:text-primary hover:bg-white"
        >
          + Add New Products
        </Link>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
        {/* Total Sales */}
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">Total Sales</h2>
          <div className="flex justify-between items-center">
            {/* {renderMetricCount(metrics?.totalRegistries)} */}
            <PiShoppingBagOpen className="size-4 text-[#6EA30B]" />
          </div>
          <div className="border-t-[2px] border-[#6EA30B]" />
        </div>
        {/* Pending Vendor Requests */}
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Total Orders
          </h2>
          <div className="flex justify-between items-center">
            {/* {renderMetricCount(metrics?.pendingVendorRequests)} */}
            <PiStorefront className="size-4 text-[#CB7428]" />
          </div>
          <div className="border-t-[2px] border-[#FFCA57]" />
        </div>
        {/* Active Products */}
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Active Products
          </h2>
          <div className="flex justify-between items-center">
            {/* {renderMetricCount(metrics?.totalOrders ?? 0)} */}
            <PiShoppingCart className="size-4 text-[#286AD4]" />
          </div>
          <div className="border-t-[2px] border-[#5797FF]" />
        </div>
        {/* Pending Payouts */}
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Pending Payouts
          </h2>
          <div className="flex justify-between items-center">
            {/* {renderMetricCount(metrics?.openTickets)} */}
            <PiTicket className="size-4 text-[#AA1BC6]" />
          </div>
          <div className="border-t-[2px] border-[#E357FF]" />
        </div>
      </section>

      {/* Sales Trend + Low Stock Alert */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
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

          <div className="relative h-[220px]">
            {chartData.path ? (
              <svg
                viewBox="0 0 500 220"
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Y-axis labels */}
                {[0, 1, 2, 3, 4].map((i) => {
                  const value = Math.round((chartData.max / 4) * (4 - i));
                  const y = 50 + (120 / 4) * i;
                  return (
                    <g key={i}>
                      <text
                        x="35"
                        y={y + 4}
                        className="text-[11px] fill-[#9CA3AF]"
                        textAnchor="end"
                      >
                        {value.toLocaleString()}
                      </text>
                      <line
                        x1="50"
                        y1={y}
                        x2="450"
                        y2={y}
                        stroke="#E5E7EB"
                        strokeWidth="1"
                        strokeDasharray="4"
                      />
                    </g>
                  );
                })}

                {/* Area fill */}
                <defs>
                  <linearGradient
                    id="salesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={chartData.areaPath} fill="url(#salesGradient)" />

                {/* Line */}
                <path
                  d={chartData.path}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data points */}
                {chartData.points.map((point, i) => (
                  <circle
                    key={i}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#3B82F6"
                    stroke="white"
                    strokeWidth="2"
                  />
                ))}

                {/* X-axis labels */}
                {dailySeries.map((row, i) => {
                  const x = 50 + (400 / (dailySeries.length - 1)) * i;
                  return (
                    <text
                      key={row.dateKey}
                      x={x}
                      y="205"
                      className="text-[11px] fill-[#9CA3AF]"
                      textAnchor="middle"
                    >
                      {row.label}
                    </text>
                  );
                })}
              </svg>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-[#9CA3AF]">
                No sales activity in this period.
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
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
        {/* Recent Orders */}
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
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor("pending")}`}
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

        {/* Top Categories */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
          <div className="flex flex-col mb-4">
            <h2 className="text-[#111827] text-base font-semibold font-inter">
              Top Categories
            </h2>
            <p className="text-[#6B7280] text-sm font-poppins">
              Sales by category
            </p>
          </div>

          <div className="h-[200px] flex items-end justify-between gap-2">
            {topCategories.length ? (
              topCategories.map((cat, i) => {
                const maxRevenue = Math.max(
                  ...topCategories.map((c) => c.revenue),
                  1,
                );
                const height = Math.max(20, (cat.revenue / maxRevenue) * 160);
                const colors = [
                  "#8B5CF6",
                  "#F59E0B",
                  "#10B981",
                  "#3B82F6",
                  "#EC4899",
                ];
                return (
                  <div
                    key={cat.name}
                    className="flex flex-col items-center flex-1"
                  >
                    <span className="text-xs text-[#6B7280] mb-2">
                      {Math.round(cat.revenue / 1000)}k
                    </span>
                    <div
                      className="w-full rounded-t-lg"
                      style={{
                        height: `${height}px`,
                        backgroundColor: colors[i % colors.length],
                      }}
                    />
                    <span className="text-[10px] text-[#6B7280] mt-2 text-center truncate w-full">
                      {cat.name}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center w-full h-full text-sm text-[#9CA3AF]">
                No category data available.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
