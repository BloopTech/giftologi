"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";

import {
  PiCurrencyCircleDollar,
  PiShoppingCart,
  PiReceipt,
  PiTrendUp,
  PiTrendDown,
  PiCaretDown,
  PiUsers,
  PiUserPlus,
  PiArrowsClockwise,
  PiStarFill,
  PiPackage,
  PiEye,
  PiChartLine,
} from "react-icons/pi";
import { useVendorAnalyticsContext } from "./context";

const formatCurrency = (value) => {
  if (value === null || typeof value === "undefined") return "GHS0.00";
  const num = Number(value);
  if (!Number.isFinite(num)) return "GHS0.00";
  return `GHS${num.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatNumber = (value) => {
  if (value === null || typeof value === "undefined") return "0";
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString();
};

const CATEGORY_COLORS = [
  "#8B5CF6",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

function StatCard({ icon: Icon, iconBgColor, title, value, change, changeType, subtitle }) {
  const isPositive = changeType === "positive";
  const isNegative = changeType === "negative";

  return (
    <div className="flex flex-col space-y-2 p-4 bg-white rounded-xl border border-[#E5E7EB]">
      <div className="flex items-center justify-between">
        <span className="text-[#6B7280] text-sm font-poppins">{title}</span>
        <div className={`p-2 rounded-full ${iconBgColor}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-[#111827] text-2xl font-semibold font-inter">
          {value}
        </span>
        {change && (
          <div className="flex items-center gap-1 mt-1">
            {isPositive && <PiTrendUp className="w-4 h-4 text-[#10B981]" />}
            {isNegative && <PiTrendDown className="w-4 h-4 text-[#EF4444]" />}
            <span
              className={`text-xs font-medium ${
                isPositive ? "text-[#10B981]" : isNegative ? "text-[#EF4444]" : "text-[#6B7280]"
              }`}
            >
              {change}
            </span>
            {subtitle && (
              <span className="text-[#6B7280] text-xs ml-1">{subtitle}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SimpleLineChart({ data, dataKey, color, height = 200 }) {
  const maxValue = Math.max(...data.map((d) => d[dataKey]));
  const minValue = Math.min(...data.map((d) => d[dataKey]));
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d[dataKey] - minValue) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <div className="relative" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id={`gradient-${dataKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <polygon
          points={areaPoints}
          fill={`url(#gradient-${dataKey})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * 100;
          const y = 100 - ((d[dataKey] - minValue) / range) * 80 - 10;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill="white"
              stroke={color}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-[#6B7280] mt-2">
        {data.map((d, i) => (
          <span key={i}>{d.week}</span>
        ))}
      </div>
    </div>
  );
}

function SimpleBarChart({ data, height = 200 }) {
  const maxOrders = Math.max(...data.map((d) => d.orders));
  const maxViews = Math.max(...data.map((d) => d.views));
  const maxValue = Math.max(maxOrders, maxViews, 1);

  return (
    <div className="relative" style={{ height }}>
      <div className="flex items-end justify-between h-full gap-4 pb-6">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-end gap-1 h-full w-full justify-center">
              <div
                className="w-4 bg-[#3B82F6] rounded-t"
                style={{ height: `${(d.orders / maxValue) * 100}%` }}
                title={`Orders: ${d.orders}`}
              />
              <div
                className="w-4 bg-[#F59E0B] rounded-t"
                style={{ height: `${(d.views / maxValue) * 20}%` }}
                title={`Views: ${d.views}`}
              />
            </div>
            <span className="text-xs text-[#6B7280] absolute bottom-0">{d.week}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-[#3B82F6] rounded" />
          <span className="text-xs text-[#6B7280]">Orders</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-[#F59E0B] rounded" />
          <span className="text-xs text-[#6B7280]">Views</span>
        </div>
      </div>
    </div>
  );
}

function PieChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = 0;

  if (total <= 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[#6B7280]">
        No sales data yet.
      </div>
    );
  }

  const createArcPath = (startAngle, endAngle, radius = 80) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    const x1 = 100 + radius * Math.cos(startRad);
    const y1 = 100 + radius * Math.sin(startRad);
    const x2 = 100 + radius * Math.cos(endRad);
    const y2 = 100 + radius * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M 100 100 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {data.map((d, i) => {
            const angle = (d.value / total) * 360;
            const path = createArcPath(currentAngle, currentAngle + angle);
            currentAngle += angle;
            return (
              <path
                key={i}
                d={path}
                fill={d.color}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            );
          })}
          <circle cx="100" cy="100" r="40" fill="white" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-[#6B7280]">Total</span>
          <span className="text-sm font-semibold text-[#111827]">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-xs text-[#6B7280]">{d.name}</span>
            <span className="text-xs font-medium text-[#111827] ml-auto">
              {formatCurrency(d.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomerInsightCard({ icon: Icon, title, value, change, changeType }) {
  const isPositive = changeType === "positive";
  const isNegative = changeType === "negative";

  return (
    <div className="flex items-center justify-between py-3 border-b border-[#E5E7EB] last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#F3F4F6] rounded-lg">
          <Icon className="w-4 h-4 text-[#6B7280]" />
        </div>
        <div>
          <p className="text-[#6B7280] text-xs">{title}</p>
          <p className="text-[#111827] text-lg font-semibold">{value}</p>
        </div>
      </div>
      {change && (
        <div className="flex items-center gap-1">
          {isPositive && <PiTrendUp className="w-4 h-4 text-[#10B981]" />}
          {isNegative && <PiTrendDown className="w-4 h-4 text-[#EF4444]" />}
          <span
            className={`text-sm font-medium ${
              isPositive ? "text-[#10B981]" : isNegative ? "text-[#EF4444]" : "text-[#6B7280]"
            }`}
          >
            {change}
          </span>
        </div>
      )}
    </div>
  );
}

function TopProductRow({ product }) {
  return (
    <div className="p-4 border-b border-[#E5E7EB] last:border-b-0 hover:bg-[#F9FAFB]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[#6B7280] text-sm font-medium">#{product.rank}</span>
          <div>
            <p className="text-[#111827] text-sm font-semibold">{product.name}</p>
            <p className="text-[#6B7280] text-xs">
              {product.orders} orders • {formatNumber(product.views)} views
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[#10B981] text-base font-semibold">
            {formatCurrency(product.totalSales)}
          </p>
          <p className="text-[#6B7280] text-xs">Total Sales</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="flex items-center gap-2">
          <PiShoppingCart className="w-4 h-4 text-[#6B7280]" />
          <div>
            <p className="text-[#6B7280] text-xs">Orders</p>
            <p className="text-[#111827] text-sm font-medium">{product.orders}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PiEye className="w-4 h-4 text-[#6B7280]" />
          <div>
            <p className="text-[#6B7280] text-xs">Views</p>
            <p className="text-[#111827] text-sm font-medium">{formatNumber(product.views)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PiChartLine className="w-4 h-4 text-[#6B7280]" />
          <div>
            <p className="text-[#6B7280] text-xs">Conversion</p>
            <p className="text-[#111827] text-sm font-medium">{product.conversion}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PiCurrencyCircleDollar className="w-4 h-4 text-[#6B7280]" />
          <div>
            <p className="text-[#6B7280] text-xs">Avg Price</p>
            <p className="text-[#111827] text-sm font-medium">{formatCurrency(product.avgPrice)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FooterStatCard({ bgColor, icon: Icon, iconColor, title, value, extra }) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl ${bgColor}`}>
      <div className={`p-3 rounded-full bg-white/20`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div>
        <p className="text-white/80 text-xs">{title}</p>
        <div className="flex items-center gap-2">
          <p className="text-white text-2xl font-semibold">{value}</p>
          {extra}
        </div>
      </div>
    </div>
  );
}

export default function VendorAnalyticsContent() {
  const [dateFilter, setDateFilter] = useState("last_30_days");
  const { products, orderItems, pageViews, reviews, categories, loading, error } =
    useVendorAnalyticsContext();

  const stats = useMemo(() => {
    const now = new Date();
    let startDate = new Date(now);

    if (dateFilter === "last_60_days") {
      startDate.setDate(now.getDate() - 60);
    } else if (dateFilter === "last_90_days") {
      startDate.setDate(now.getDate() - 90);
    } else if (dateFilter === "this_year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate.setDate(now.getDate() - 30);
    }

    const isWithinRange = (dateValue) => {
      if (!dateValue) return false;
      const date = new Date(dateValue);
      return Number.isFinite(date.getTime()) && date >= startDate;
    };

    const filteredOrders = orderItems.filter((item) => isWithinRange(item.created_at));
    const filteredViews = pageViews.filter((view) => isWithinRange(view.created_at));
    const filteredReviews = reviews.filter((review) => isWithinRange(review.created_at));

    const productMap = new Map(products.map((product) => [product.id, product]));
    const categoryMap = new Map(categories.map((category) => [category.id, category.name]));

    const totalRevenue = filteredOrders.reduce((sum, item) => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      if (!Number.isFinite(qty) || !Number.isFinite(price)) return sum;
      return sum + qty * price;
    }, 0);

    const orderIds = new Set(
      filteredOrders.map((item) => item.order_id).filter(Boolean),
    );
    const totalOrders = orderIds.size;
    const totalViews = filteredViews.length;
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
    const conversionRate = totalViews ? (totalOrders / totalViews) * 100 : 0;

    const customerOrderMap = new Map();
    filteredOrders.forEach((item) => {
      const buyerId = item.orders?.buyer_id;
      if (!buyerId) return;
      if (!customerOrderMap.has(buyerId)) {
        customerOrderMap.set(buyerId, new Set());
      }
      const orderId = item.order_id || item.id;
      customerOrderMap.get(buyerId).add(orderId);
    });

    const newCustomers = customerOrderMap.size;
    const repeatCustomers = Array.from(customerOrderMap.values()).filter(
      (ordersSet) => ordersSet.size > 1,
    ).length;
    const customerAvgOrderValue = avgOrderValue;

    const ratings = filteredReviews
      .map((review) => Number(review.rating))
      .filter((rating) => Number.isFinite(rating));
    const avgRating = ratings.length
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : 0;

    const totalProducts = products.length;
    const totalCustomers = newCustomers;

    const chartStart = new Date(now);
    chartStart.setDate(chartStart.getDate() - 28);

    const weekBuckets = Array.from({ length: 4 }, (_, index) => ({
      label: `Week ${index + 1}`,
      revenue: 0,
      views: 0,
      orders: new Set(),
    }));

    const getBucketIndex = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      if (!Number.isFinite(date.getTime())) return null;
      const diffDays = Math.floor((date - chartStart) / 86400000);
      if (diffDays < 0 || diffDays >= 28) return null;
      return Math.floor(diffDays / 7);
    };

    filteredOrders.forEach((item) => {
      const bucketIndex = getBucketIndex(item.created_at);
      if (bucketIndex === null) return;
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      if (Number.isFinite(qty) && Number.isFinite(price)) {
        weekBuckets[bucketIndex].revenue += qty * price;
      }
      weekBuckets[bucketIndex].orders.add(item.order_id || item.id);
    });

    filteredViews.forEach((view) => {
      const bucketIndex = getBucketIndex(view.created_at);
      if (bucketIndex === null) return;
      weekBuckets[bucketIndex].views += 1;
    });

    const revenueData = weekBuckets.map((bucket) => ({
      week: bucket.label,
      revenue: bucket.revenue,
    }));

    const ordersViewsData = weekBuckets.map((bucket) => ({
      week: bucket.label,
      orders: bucket.orders.size,
      views: bucket.views,
    }));

    const categoryRevenue = new Map();
    filteredOrders.forEach((item) => {
      const product = productMap.get(item.product_id);
      const categoryName = categoryMap.get(product?.category_id) || "Uncategorized";
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      if (!Number.isFinite(qty) || !Number.isFinite(price)) return;
      categoryRevenue.set(categoryName, (categoryRevenue.get(categoryName) || 0) + qty * price);
    });

    const categoryTotals = Array.from(categoryRevenue.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const categorySum = categoryTotals.reduce((sum, item) => sum + item.value, 0);
    const categoryData = categoryTotals.map((item, index) => ({
      name: item.name,
      value: item.value,
      percentage: categorySum ? Math.round((item.value / categorySum) * 100) : 0,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));

    const productStats = new Map();
    filteredOrders.forEach((item) => {
      const productId = item.product_id;
      if (!productId) return;
      if (!productStats.has(productId)) {
        productStats.set(productId, {
          orderIds: new Set(),
          units: 0,
          totalSales: 0,
          views: 0,
        });
      }
      const stats = productStats.get(productId);
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      if (Number.isFinite(qty) && Number.isFinite(price)) {
        stats.units += qty;
        stats.totalSales += qty * price;
      }
      stats.orderIds.add(item.order_id || item.id);
    });

    filteredViews.forEach((view) => {
      const productId = view.product_id;
      if (!productId) return;
      if (!productStats.has(productId)) {
        productStats.set(productId, {
          orderIds: new Set(),
          units: 0,
          totalSales: 0,
          views: 0,
        });
      }
      productStats.get(productId).views += 1;
    });

    const topProducts = Array.from(productStats.entries())
      .map(([productId, stats]) => {
        const product = productMap.get(productId);
        const orders = stats.orderIds.size;
        const views = stats.views;
        const avgPrice = stats.units
          ? stats.totalSales / stats.units
          : Number(product?.price || 0);
        const conversion = views ? (orders / views) * 100 : 0;
        return {
          productId,
          name: product?.name || "Unknown Product",
          orders,
          views,
          conversion: Number.isFinite(conversion) ? Number(conversion.toFixed(1)) : 0,
          avgPrice: Number.isFinite(avgPrice) ? avgPrice : 0,
          totalSales: stats.totalSales,
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5)
      .map((product, index) => ({ ...product, rank: index + 1 }));

    return {
      revenueData,
      ordersViewsData,
      categoryData,
      topProducts,
      totalRevenue,
      totalOrders,
      avgOrderValue,
      conversionRate,
      newCustomers,
      repeatCustomers,
      customerAvgOrderValue,
      customerRating: avgRating,
      totalProducts,
      totalCustomers,
      avgRating,
    };
  }, [dateFilter, products, orderItems, pageViews, reviews, categories]);

  const {
    revenueData,
    ordersViewsData,
    categoryData,
    topProducts,
    totalRevenue,
    totalOrders,
    avgOrderValue,
    conversionRate,
    newCustomers,
    repeatCustomers,
    customerAvgOrderValue,
    customerRating,
    totalProducts,
    totalCustomers,
    avgRating,
  } = stats;

  return (
    <div className="flex flex-col space-y-6 w-full mb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/v" className="text-[#6B7280] hover:text-[#111827]">
          Vendor Portal
        </Link>
        <span className="text-[#6B7280]">/</span>
        <span className="text-[#111827] font-medium">Analytics</span>
      </div>

      {/* Header with Date Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#111827] text-xl font-semibold font-inter">
            Analytics & Insights
          </h1>
          <p className="text-[#6B7280] text-sm font-poppins">
            Track your store performance and sales metrics
          </p>
        </div>
        <div className="relative">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="last_30_days">Last 30 days</option>
            <option value="last_60_days">Last 60 days</option>
            <option value="last_90_days">Last 90 days</option>
            <option value="this_year">This year</option>
          </select>
          <PiCaretDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-xs text-[#6B7280]">Refreshing analytics data...</div>
      )}

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={PiCurrencyCircleDollar}
          iconBgColor="bg-[#10B981]"
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          subtitle="Selected period"
        />

        <StatCard
          icon={PiShoppingCart}
          iconBgColor="bg-[#3B82F6]"
          title="Total Orders"
          value={formatNumber(totalOrders)}
          subtitle="Selected period"
        />

        <StatCard
          icon={PiReceipt}
          iconBgColor="bg-[#8B5CF6]"
          title="Avg Order Value"
          value={formatCurrency(avgOrderValue)}
          subtitle="Selected period"
        />

        <StatCard
          icon={PiTrendUp}
          iconBgColor="bg-[#F59E0B]"
          title="Conversion Rate"
          value={`${conversionRate.toFixed(1)}%`}
          subtitle="Selected period"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h2 className="text-[#111827] text-base font-semibold font-inter mb-1">
            Revenue Trend
          </h2>
          <p className="text-[#6B7280] text-sm mb-4">
            Weekly revenue over the selected period
          </p>
          <SimpleLineChart
            data={revenueData}
            dataKey="revenue"
            color="#10B981"
            height={180}
          />
        </div>

        {/* Orders & Views Chart */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h2 className="text-[#111827] text-base font-semibold font-inter mb-1">
            Orders & Views
          </h2>
          <p className="text-[#6B7280] text-sm mb-4">
            Weekly orders and product views
          </p>
          <SimpleBarChart data={ordersViewsData} height={180} />
        </div>
      </div>

      {/* Sales by Category & Customer Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Category */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h2 className="text-[#111827] text-base font-semibold font-inter mb-1">
            Sales by Category
          </h2>
          <p className="text-[#6B7280] text-sm mb-4">
            Revenue distribution across product categories
          </p>
          <PieChart data={categoryData} />
        </div>

        {/* Customer Insights */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h2 className="text-[#111827] text-base font-semibold font-inter mb-1">
            Customer Insights
          </h2>
          <p className="text-[#6B7280] text-sm mb-4">
            Key customer metrics and trends
          </p>
          <div className="space-y-1">
            <CustomerInsightCard
              icon={PiUserPlus}
              title="New Customers"
              value={formatNumber(newCustomers)}
            />

            <CustomerInsightCard
              icon={PiArrowsClockwise}
              title="Repeat Customers"
              value={formatNumber(repeatCustomers)}
            />

            <CustomerInsightCard
              icon={PiReceipt}
              title="Avg Order Value"
              value={formatCurrency(customerAvgOrderValue)}
            />

            <CustomerInsightCard
              icon={PiStarFill}
              title="Customer Rating"
              value={`${customerRating.toFixed(1)}/5`}
            />
          </div>
        </div>
      </div>

      {/* Top Performing Products */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div>
            <h2 className="text-[#111827] text-lg font-semibold font-inter">
              Top Performing Products
            </h2>
            <p className="text-[#6B7280] text-sm font-poppins">
              Best sellers by revenue and conversion rate
            </p>
          </div>
          <Link
            href="/dashboard/v/products"
            className="text-primary text-sm font-medium hover:underline"
          >
            View All Products
          </Link>
        </div>
        <div>
          {topProducts.length === 0 ? (
            <p className="p-4 text-sm text-[#6B7280]">
              No product performance data yet.
            </p>
          ) : (
            topProducts.map((product) => (
              <TopProductRow key={product.productId} product={product} />
            ))
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FooterStatCard
          bgColor="bg-[#8B5CF6]"
          icon={PiPackage}
          iconColor="text-white"
          title="Total Products"
          value={formatNumber(totalProducts)}
        />

        <FooterStatCard
          bgColor="bg-[#F59E0B]"
          icon={PiUsers}
          iconColor="text-white"
          title="Total Customers"
          value={formatNumber(totalCustomers)}
        />

        <FooterStatCard
          bgColor="bg-[#10B981]"
          icon={PiStarFill}
          iconColor="text-white"
          title="Avg Rating"
          value={avgRating.toFixed(1)}
          extra={<PiStarFill className="w-5 h-5 text-[#FCD34D]" />}
        />
      </div>
    </div>
  );
}