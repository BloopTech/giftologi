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
import { RevenueLineChart, OrdersViewsBarChart, SalesPieChart } from "./charts";
import {
  formatCurrency,
  formatNumber,
  StatCard,
  FooterStatCard,
  TopProductRow,
  CustomerInsightCard,
  CATEGORY_COLORS,
} from "./utils";



export default function VendorAnalyticsContent() {
  const [dateFilter, setDateFilter] = useState("last_30_days");
  const {
    products,
    orderItems,
    pageViews,
    reviews,
    categories,
    loading,
    error,
  } = useVendorAnalyticsContext();

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

    const filteredOrders = orderItems.filter((item) =>
      isWithinRange(item.created_at),
    );
    const filteredViews = pageViews.filter((view) =>
      isWithinRange(view.created_at),
    );
    const filteredReviews = reviews.filter((review) =>
      isWithinRange(review.created_at),
    );

    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );
    const categoryMap = new Map(
      categories.map((category) => [category.id, category.name]),
    );

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
      const categoryName =
        categoryMap.get(product?.category_id) || "Uncategorized";
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      if (!Number.isFinite(qty) || !Number.isFinite(price)) return;
      categoryRevenue.set(
        categoryName,
        (categoryRevenue.get(categoryName) || 0) + qty * price,
      );
    });

    const categoryTotals = Array.from(categoryRevenue.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const categorySum = categoryTotals.reduce(
      (sum, item) => sum + item.value,
      0,
    );
    const categoryData = categoryTotals.map((item, index) => ({
      name: item.name,
      value: item.value,
      percentage: categorySum
        ? Math.round((item.value / categorySum) * 100)
        : 0,
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
          conversion: Number.isFinite(conversion)
            ? Number(conversion.toFixed(1))
            : 0,
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
    <section aria-label="Vendor analytics and insights" className="flex flex-col space-y-6 w-full mb-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/v"
          className="text-[#6B7280] hover:text-[#111827] focus:text-[#111827]"
        >
          Vendor Portal
        </Link>
        <span className="text-[#6B7280]">/</span>
        <span className="text-[#111827] font-medium">Analytics</span>
      </nav>

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
        <div className="text-xs text-[#6B7280]">
          Refreshing analytics data...
        </div>
      )}

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={PiCurrencyCircleDollar}
          iconColor="text-[#10B981]"
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          subtitle="Selected period"
        />

        <StatCard
          icon={PiShoppingCart}
          iconColor="text-[#3B82F6]"
          title="Total Orders"
          value={formatNumber(totalOrders)}
          subtitle="Selected period"
        />

        <StatCard
          icon={PiTrendUp}
          iconColor="text-[#8B5CF6]"
          title="Avg Order Value"
          value={formatCurrency(avgOrderValue)}
          subtitle="Selected period"
        />

        <StatCard
          icon={PiUsers}
          iconColor="text-[#F59E0B]"
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
          <RevenueLineChart data={revenueData} height={220} />
        </div>

        {/* Orders & Views Chart */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h2 className="text-[#111827] text-base font-semibold font-inter mb-1">
            Orders & Views
          </h2>
          <p className="text-[#6B7280] text-sm mb-4">
            Weekly orders and product views
          </p>
          <OrdersViewsBarChart data={ordersViewsData} height={220} />
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
          <SalesPieChart data={categoryData} height={280} />
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
          bgColor="bg-gradient from-[#EFF6FF] to-[#DBEAFE]"
          icon={PiPackage}
          iconColor="text-[#155DFC]"
          title="Total Products"
          value={formatNumber(totalProducts)}
          titleColor="text-[#193CB8]"
          valueColor="text-[#1C398E]"
          border="border border-[#BEDBFF]"
        />

        <FooterStatCard
          bgColor="bg-gradient from-[#FAF5FF] to-[#F3E8FF]"
          icon={PiUsers}
          iconColor="text-[#9810FA]"
          title="Total Customers"
          value={formatNumber(totalCustomers)}
          titleColor="text-[#6E11B0]"
          valueColor="text-[#59168B]"
          border="border border-[#E9D4FF]"
        />

        <FooterStatCard
          bgColor="bg-gradient from-[#FFF7ED] to-[#FFEDD4]"
          icon={PiStarFill}
          iconColor="text-[#F54900]"
          title="Avg Rating"
          value={avgRating.toFixed(1)}
          extra={<PiStarFill className="w-5 h-5 text-[#FF6900]" />}
          titleColor="text-[#9F2D00]"
          valueColor="text-[#7E2A0C]"
          border="border border-[#FFD6A7]"
        />
      </div>
    </section>
  );
}
