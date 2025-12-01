"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";
import { useQueryState, parseAsString } from "nuqs";

const AnalyticsReportingContext = createContext();

const DEFAULT_DATE_RANGE = "last_30_days";
const DEFAULT_TAB = "overview";

function resolveDateRange(range) {
  const now = new Date();
  const end = now;
  let start = null;

  const value = (range || DEFAULT_DATE_RANGE).toLowerCase();

  if (value === "last_7_days") {
    start = new Date(now);
    start.setDate(start.getDate() - 7);
  } else if (value === "last_30_days") {
    start = new Date(now);
    start.setDate(start.getDate() - 30);
  } else if (value === "this_month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (value === "this_year") {
    start = new Date(now.getFullYear(), 0, 1);
  } else if (value === "all_time") {
    start = null;
  } else {
    start = new Date(now);
    start.setDate(start.getDate() - 30);
  }

  return { from: start, to: end };
}

export const AnalyticsReportingProvider = ({ children }) => {
  const value = useAnalyticsReportingValue();

  return (
    <AnalyticsReportingContext.Provider value={value}>
      {children}
    </AnalyticsReportingContext.Provider>
  );
};

function useAnalyticsReportingValue() {
  const [rangeParam, setRangeParam] = useQueryState(
    "range",
    parseAsString.withDefault(DEFAULT_DATE_RANGE)
  );
  const [tabParam, setTabParam] = useQueryState(
    "tab",
    parseAsString.withDefault(DEFAULT_TAB)
  );

  const dateRange = rangeParam || DEFAULT_DATE_RANGE;
  const activeTab = tabParam || DEFAULT_TAB;

  const [overview, setOverview] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [vendorProduct, setVendorProduct] = useState(null);
  const [registryUser, setRegistryUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createSupabaseClient();

        const [
          { data: profilesData, count: usersCount },
          { data: registriesData },
          { data: orderItemsData },
          { data: paymentsData },
          { count: vendorsCount },
          { count: pendingVendorApps },
          { count: openTickets },
          { data: pageViewsData },
          { count: totalProductsCount },
          { count: pendingProductsCount },
          { data: vendorPayoutsData },
          { data: productPageViewsData },
          { data: productsData },
          { data: vendorsData },
          { data: ordersData },
          { data: eventsData },
          { data: registryItemsData },
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, created_at", { count: "exact" }),
          supabase
            .from("registries")
            .select("id, event_id, deadline, created_at"),
          supabase
            .from("order_items")
            .select(
              "order_id, product_id, vendor_id, quantity, price, created_at"
            ),
          supabase
            .from("order_payments")
            .select("amount, status, created_at"),
          supabase.from("vendors").select("id", { count: "exact" }),
          supabase
            .from("vendor_applications")
            .select("id", { count: "exact" })
            .eq("status", "pending"),
          supabase
            .from("support_tickets")
            .select("id", { count: "exact" })
            .in("status", ["open", "in_progress", "escalated"]),
          supabase
            .from("registry_page_views")
            .select("registry_id, profile_id, session_id, ip_hash, created_at"),
          supabase.from("products").select("id", { count: "exact" }),
          supabase
            .from("products")
            .select("id", { count: "exact" })
            .eq("status", "pending"),
          supabase
            .from("vendor_payouts")
            .select("status, total_net_amount, created_at"),
          supabase
            .from("product_page_views")
            .select("product_id, profile_id, session_id, ip_hash, created_at"),
          supabase
            .from("products")
            .select("id, name, vendor_id, price, stock_qty, status, created_at"),
          supabase.from("vendors").select("id, business_name"),
          supabase
            .from("orders")
            .select("id, registry_id, created_at, status")
            .in("status", ["paid", "shipped", "delivered"]),
          supabase.from("events").select("id, type"),
          supabase
            .from("registry_items")
            .select(
              "registry_id, quantity_needed, purchased_qty, created_at"
            ),
        ]);

        if (ignore) return;

        const currentWindow = resolveDateRange(dateRange);

        const filterByWindow = (rows, field, window) => {
          if (!Array.isArray(rows)) return [];
          const from = window?.from || null;
          const to = window?.to || null;
          if (!from && !to) return rows;
          return rows.filter((row) => {
            const value = row[field];
            if (!value) return false;
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return false;
            if (from && d < from) return false;
            if (to && d > to) return false;
            return true;
          });
        };

        const computePreviousWindow = (window) => {
          if (!window || !window.from || !window.to) return null;
          const diffMs = window.to.getTime() - window.from.getTime();
          if (!(diffMs > 0)) return null;
          const prevTo = new Date(window.from);
          const prevFrom = new Date(window.from.getTime() - diffMs);
          return { from: prevFrom, to: prevTo };
        };

        const previousWindow = computePreviousWindow(currentWindow);
        const shouldComputeGrowth =
          dateRange === "last_30_days" && !!previousWindow;

        const registriesInRange = filterByWindow(
          registriesData,
          "created_at",
          currentWindow
        );
        const orderItemsInRange = filterByWindow(
          orderItemsData,
          "created_at",
          currentWindow
        );
        const paymentsInRange = filterByWindow(
          paymentsData,
          "created_at",
          currentWindow
        );
        const pageViewsInRange = filterByWindow(
          pageViewsData,
          "created_at",
          currentWindow
        );
        const productPageViewsInRange = filterByWindow(
          productPageViewsData,
          "created_at",
          currentWindow
        );
        const ordersInRange = filterByWindow(
          ordersData,
          "created_at",
          currentWindow
        );

        const orderItemsPreviousRange =
          shouldComputeGrowth && previousWindow
            ? filterByWindow(orderItemsData, "created_at", previousWindow)
            : [];

        const now = new Date();
        let activeRegistries = 0;
        let completedRegistries = 0;
        if (Array.isArray(registriesInRange)) {
          for (const reg of registriesInRange) {
            if (!reg?.deadline) {
              activeRegistries += 1;
              continue;
            }
            const d = new Date(reg.deadline);
            if (!Number.isNaN(d.getTime()) && d < now) {
              completedRegistries += 1;
            } else {
              activeRegistries += 1;
            }
          }
        }

        let giftsPurchased = 0;
        if (Array.isArray(orderItemsInRange)) {
          for (const row of orderItemsInRange) {
            const q = Number(row.quantity || 0);
            if (Number.isFinite(q)) giftsPurchased += q;
          }
        }

        let revenueGenerated = 0;
        if (Array.isArray(paymentsInRange)) {
          for (const row of paymentsInRange) {
            const status = (row.status || "").toLowerCase();
            if (status === "success") {
              const amt = Number(row.amount || 0);
              if (Number.isFinite(amt)) revenueGenerated += amt;
            }
          }
        }

        // Platform service charges are estimated at 5% of net revenue
        const serviceCharges = revenueGenerated * 0.05;

        // Aggregate vendor payouts (pending vs completed) using total_net_amount
        let pendingPayoutAmount = 0;
        let completedPayoutAmount = 0;
        const payoutsInRange = filterByWindow(
          vendorPayoutsData,
          "created_at",
          currentWindow
        );
        if (Array.isArray(payoutsInRange)) {
          for (const row of payoutsInRange) {
            const status = (row.status || "").toLowerCase();
            const amt = Number(row.total_net_amount || 0);
            if (!Number.isFinite(amt)) continue;
            if (status === "pending") {
              pendingPayoutAmount += amt;
            } else if (status === "approved" || status === "paid") {
              completedPayoutAmount += amt;
            }
          }
        }

        // Best-effort estimate of refunds and adjustments from payment records
        let refundsAdjustments = 0;
        if (Array.isArray(paymentsInRange)) {
          for (const row of paymentsInRange) {
            const status = (row.status || "").toLowerCase();
            const amt = Number(row.amount || 0);
            if (!Number.isFinite(amt)) continue;
            if (status === "refunded" || status === "chargeback") {
              refundsAdjustments += Math.abs(amt);
            } else if (amt < 0) {
              refundsAdjustments += Math.abs(amt);
            }
          }
        }

        const totalUsers = typeof usersCount === "number" ? usersCount : null;
        const vendorCountValue =
          typeof vendorsCount === "number" ? vendorsCount : null;
        const pendingVendorRequestsValue =
          typeof pendingVendorApps === "number" ? pendingVendorApps : null;
        const totalProductsValue =
          typeof totalProductsCount === "number" ? totalProductsCount : null;
        const pendingProductsValue =
          typeof pendingProductsCount === "number" ? pendingProductsCount : null;

        const pendingApprovals =
          (pendingVendorRequestsValue || 0) + (pendingProductsValue || 0);

        const productViewMap = new Map();
        if (Array.isArray(productPageViewsInRange)) {
          for (const row of productPageViewsInRange) {
            const pid = row.product_id;
            if (!pid) continue;
            let entry = productViewMap.get(pid);
            if (!entry) {
              entry = { views: 0, viewers: new Set() };
              productViewMap.set(pid, entry);
            }
            entry.views += 1;
            const viewerKey =
              row.profile_id ||
              (row.session_id ? `session:${row.session_id}` : null) ||
              (row.ip_hash ? `ip:${row.ip_hash}` : null);
            if (viewerKey) {
              entry.viewers.add(viewerKey);
            }
          }
        }

        const productPurchaseMap = new Map();
        const vendorSalesMap = new Map();
        const vendorSalesPreviousMap = new Map();
        const vendorOrdersMap = new Map();
        if (Array.isArray(orderItemsInRange)) {
          for (const row of orderItemsInRange) {
            const pid = row.product_id;
            const vid = row.vendor_id;
            const orderId = row.order_id;
            const quantity = Number(row.quantity || 0);
            const price = Number(row.price || 0);
            if (pid && Number.isFinite(quantity)) {
              productPurchaseMap.set(
                pid,
                (productPurchaseMap.get(pid) || 0) + quantity
              );
            }
            if (vid && Number.isFinite(quantity) && Number.isFinite(price)) {
              const amount = quantity * price;
              if (Number.isFinite(amount) && amount > 0) {
                vendorSalesMap.set(vid, (vendorSalesMap.get(vid) || 0) + amount);
              }
            }
            if (vid && orderId) {
              let ordersSet = vendorOrdersMap.get(vid);
              if (!ordersSet) {
                ordersSet = new Set();
                vendorOrdersMap.set(vid, ordersSet);
              }
              ordersSet.add(orderId);
            }
          }
        }

        if (Array.isArray(orderItemsPreviousRange)) {
          for (const row of orderItemsPreviousRange) {
            const vidPrev = row.vendor_id;
            const quantityPrev = Number(row.quantity || 0);
            const pricePrev = Number(row.price || 0);
            if (
              vidPrev &&
              Number.isFinite(quantityPrev) &&
              Number.isFinite(pricePrev)
            ) {
              const amountPrev = quantityPrev * pricePrev;
              if (Number.isFinite(amountPrev) && amountPrev > 0) {
                vendorSalesPreviousMap.set(
                  vidPrev,
                  (vendorSalesPreviousMap.get(vidPrev) || 0) + amountPrev
                );
              }
            }
          }
        }

        const productById = new Map();
        if (Array.isArray(productsData)) {
          for (const prod of productsData) {
            if (prod && prod.id) {
              productById.set(prod.id, prod);
            }
          }
        }

        const vendorById = new Map();
        if (Array.isArray(vendorsData)) {
          for (const v of vendorsData) {
            if (v && v.id) {
              vendorById.set(v.id, v);
            }
          }
        }

        const topProducts = [];
        for (const [productId, entry] of productViewMap.entries()) {
          const product = productById.get(productId);
          const views = entry.views || 0;
          const uniqueViewers = entry.viewers ? entry.viewers.size : 0;
          const purchases = productPurchaseMap.get(productId) || 0;
          const conversion =
            uniqueViewers > 0 ? purchases / uniqueViewers : 0;
          const vendorId = product?.vendor_id || null;
          const vendor = vendorId ? vendorById.get(vendorId) : null;
          topProducts.push({
            productId,
            productName: product?.name || "Unnamed product",
            vendorId,
            vendorName: vendor?.business_name || (vendorId ? "Unknown vendor" : "—"),
            views,
            uniqueViewers,
            purchases,
            conversion,
          });
        }
        topProducts.sort((a, b) => (b.views || 0) - (a.views || 0));
        const topProductsLimited = topProducts.slice(0, 5);

        const topVendorsArray = [];
        for (const [vendorId, totalSales] of vendorSalesMap.entries()) {
          const vendor = vendorById.get(vendorId);
          const ordersSet = vendorOrdersMap.get(vendorId);
          const orders = ordersSet ? ordersSet.size : 0;
          let growthRate = null;
          if (shouldComputeGrowth) {
            const prevSales = vendorSalesPreviousMap.get(vendorId);
            if (typeof prevSales === "number" && prevSales > 0) {
              growthRate = (totalSales - prevSales) / prevSales;
            } else {
              growthRate = null;
            }
          }
          topVendorsArray.push({
            vendorId,
            vendorName: vendor?.business_name || "Unknown vendor",
            totalSales,
            orders,
            growthRate,
          });
        }
        topVendorsArray.sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0));
        const topVendorsLimited = topVendorsArray.slice(0, 5);

        let lowInventoryCount = 0;
        if (Array.isArray(productsData)) {
          for (const prod of productsData) {
            const status = (prod.status || "").toLowerCase();
            const stock = Number(prod.stock_qty);
            if (
              status === "approved" &&
              Number.isFinite(stock) &&
              stock > 0 &&
              stock <= 5
            ) {
              lowInventoryCount += 1;
            }
          }
        }

        let inactiveVendorsCount = 0;
        if (Array.isArray(vendorsData)) {
          const vendorsWithSales = new Set(vendorSalesMap.keys());
          inactiveVendorsCount = vendorsData.length - vendorsWithSales.size;
          if (inactiveVendorsCount < 0) inactiveVendorsCount = 0;
        }

        const overviewMetrics = {
          totalUsers,
          activeRegistries,
          giftsPurchased,
          revenueGenerated,
          serviceCharges,
          vendorCount: vendorCountValue,
          pendingVendorRequests: pendingVendorRequestsValue,
          pendingApprovals,
          openTickets: typeof openTickets === "number" ? openTickets : null,
        };

        const paidPayments = Array.isArray(paymentsInRange)
          ? paymentsInRange.filter(
              (row) => (row.status || "").toLowerCase() === "success"
            )
          : [];

        const financialMetrics = {
          totalSales: revenueGenerated,
          serviceCharges,
          pendingPayouts: pendingPayoutAmount || 0,
          completedPayouts: completedPayoutAmount || 0,
          refundsAdjustments,
        };

        const vendorProductMetrics = {
          totalVendors: vendorCountValue,
          totalProducts: totalProductsValue,
          productApprovalQueue: pendingProductsValue,
          lowInventoryCount,
          inactiveVendorsCount,
          topVendors: topVendorsLimited,
          topProducts: topProductsLimited,
        };

        const uniqueRegistries = new Set();
        const uniqueProfiles = new Set();
        if (Array.isArray(pageViewsInRange)) {
          for (const row of pageViewsInRange) {
            if (row.registry_id) uniqueRegistries.add(row.registry_id);
            if (row.profile_id) uniqueProfiles.add(row.profile_id);
          }
        }

        const visitorCounts = new Map();
        if (Array.isArray(pageViewsInRange)) {
          for (const row of pageViewsInRange) {
            const key =
              row.profile_id ||
              (row.session_id ? `session:${row.session_id}` : null);
            if (!key) continue;
            visitorCounts.set(key, (visitorCounts.get(key) || 0) + 1);
          }
        }
        let returningVisitorsCount = 0;
        for (const count of visitorCounts.values()) {
          if (count > 1) returningVisitorsCount += 1;
        }
        const totalVisitorKeys = visitorCounts.size;
        const returningVisitors =
          totalVisitorKeys > 0 && Number.isFinite(returningVisitorsCount)
            ? returningVisitorsCount / totalVisitorKeys
            : 0;

        const eventTypeById = new Map();
        if (Array.isArray(eventsData)) {
          for (const ev of eventsData) {
            if (ev && ev.id && ev.type) {
              eventTypeById.set(ev.id, ev.type);
            }
          }
        }

        const registryEventById = new Map();
        if (Array.isArray(registriesData)) {
          for (const reg of registriesData) {
            if (reg && reg.id) {
              registryEventById.set(reg.id, reg.event_id || null);
            }
          }
        }

        const registryTypeCounts = {};
        if (Array.isArray(ordersInRange)) {
          for (const order of ordersInRange) {
            const registryId = order.registry_id;
            if (!registryId) continue;
            const eventId = registryEventById.get(registryId);
            if (!eventId) continue;
            const type = eventTypeById.get(eventId);
            if (!type) continue;
            registryTypeCounts[type] = (registryTypeCounts[type] || 0) + 1;
          }
        }

        const totalTypeOrders = Object.values(registryTypeCounts).reduce(
          (sum, val) => sum + (typeof val === "number" ? val : 0),
          0
        );

        const popularRegistryTypes = Object.entries(registryTypeCounts).map(
          ([type, count]) => {
            const numericCount = Number(count || 0);
            const percentage =
              totalTypeOrders > 0 && Number.isFinite(numericCount)
                ? numericCount / totalTypeOrders
                : 0;
            return {
              type,
              count: numericCount,
              percentage,
            };
          }
        );
        popularRegistryTypes.sort((a, b) => (b.count || 0) - (a.count || 0));
        const popularRegistryTypesLimited = popularRegistryTypes.slice(0, 5);

        let totalItemsNeeded = 0;
        let totalItemsPurchased = 0;
        const registryItemsInRange = filterByWindow(
          registryItemsData || [],
          "created_at",
          currentWindow
        );
        if (Array.isArray(registryItemsInRange)) {
          for (const item of registryItemsInRange) {
            const needed = Number(item.quantity_needed || 0);
            const purchased = Number(item.purchased_qty || 0);
            if (Number.isFinite(needed) && needed > 0) {
              totalItemsNeeded += needed;
            }
            if (Number.isFinite(purchased) && purchased > 0) {
              totalItemsPurchased += purchased;
            }
          }
        }

        const giftFulfillmentRate =
          totalItemsNeeded > 0 && Number.isFinite(totalItemsPurchased)
            ? totalItemsPurchased / totalItemsNeeded
            : 0;

        // Month-over-month user growth based on profile signups
        let userGrowthRate = null;
        if (Array.isArray(profilesData)) {
          const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const prevMonthStart = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1
          );
          const prevPrevMonthStart = new Date(
            now.getFullYear(),
            now.getMonth() - 2,
            1
          );

          let currentMonthSignups = 0;
          let prevMonthSignups = 0;

          for (const profile of profilesData) {
            const created = profile?.created_at;
            if (!created) continue;
            const d = new Date(created);
            if (Number.isNaN(d.getTime())) continue;

            if (d >= currentMonthStart && d < now) {
              currentMonthSignups += 1;
            } else if (d >= prevMonthStart && d < currentMonthStart) {
              prevMonthSignups += 1;
            }
          }

          if (prevMonthSignups > 0 && Number.isFinite(currentMonthSignups)) {
            userGrowthRate =
              (currentMonthSignups - prevMonthSignups) / prevMonthSignups;
          } else {
            userGrowthRate = null;
          }
        }

        const registryUserMetrics = {
          registriesCreated: registriesInRange.length || 0,
          activeRegistries,
          completedRegistries,
          averageGiftsPerRegistry:
            activeRegistries > 0 ? giftsPurchased / activeRegistries : 0,
          registryViews: pageViewsInRange.length || 0,
          uniqueRegistriesViewed: uniqueRegistries.size,
          uniqueVisitors: uniqueProfiles.size,
          returningVisitors,
          giftFulfillmentRate,
          // Placeholder for now; can be computed as MoM or YoY growth later
          userGrowthRate,
          popularRegistryTypes: popularRegistryTypesLimited,
        };

        setOverview(overviewMetrics);
        setFinancial(financialMetrics);
        setVendorProduct(vendorProductMetrics);
        setRegistryUser(registryUserMetrics);
      } catch (err) {
        if (!ignore) {
          setError(err?.message || "Failed to load analytics");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [dateRange]);

  const exportSummary = useCallback(
    (tabId) => {
      const id = tabId || activeTab;
      let metrics = null;
      if (id === "overview") metrics = overview;
      else if (id === "financial") metrics = financial;
      else if (id === "vendor_product") metrics = vendorProduct;
      else if (id === "registry_user") metrics = registryUser;
      if (!metrics) return;

      const rows = Object.entries(metrics);
      if (!rows.length) return;

      const header = "Metric,Value";
      const lines = rows.map(([key, value]) => {
        const label = key.replace(/_/g, " ");
        return `${label},${value ?? ""}`;
      });
      const csv = [header, ...lines].join("\n");
      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `analytics_${id}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [activeTab, overview, financial, vendorProduct, registryUser]
  );

  return useMemo(
    () => ({
      dateRange,
      setDateRange: setRangeParam,
      activeTab,
      setActiveTab: setTabParam,
      overview,
      financial,
      vendorProduct,
      registryUser,
      loading,
      error,
      exportSummary,
    }),
    [
      dateRange,
      activeTab,
      overview,
      financial,
      vendorProduct,
      registryUser,
      loading,
      error,
      setRangeParam,
      setTabParam,
      exportSummary,
    ]
  );
}

export const useAnalyticsReportingContext = () =>
  useContext(AnalyticsReportingContext);
