const DEFAULT_DATE_RANGE = "last_30_days";

export const VALID_ANALYTICS_DATE_RANGES = [
  "last_7_days",
  "last_30_days",
  "this_month",
  "this_year",
  "all_time",
];

export const VALID_ANALYTICS_TABS = [
  "overview",
  "financial",
  "vendor_product",
  "registry_user",
];

export const ADMIN_ANALYTICS_ROLES = [
  "super_admin",
  "finance_admin",
  "operations_manager_admin",
  "customer_support_admin",
  "store_manager_admin",
  "marketing_admin",
];

const CONFIRMED_ORDER_STATUSES = ["paid", "shipped", "delivered"];
const OPEN_TICKET_STATUSES = ["open", "in_progress", "escalated"];
const REFUND_PAYMENT_STATUSES = ["refunded", "chargeback", "reversed"];
const ITEM_FETCH_CHUNK_SIZE = 200;

function toNumber(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function isDateInWindow(value, window) {
  if (!value) return false;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  if (window?.fromDate && date < window.fromDate) return false;
  if (window?.toDate && date > window.toDate) return false;

  return true;
}

function applyWindowFilter(query, column, window) {
  let next = query;
  if (window?.fromIso) {
    next = next.gte(column, window.fromIso);
  }
  if (window?.toIso) {
    next = next.lte(column, window.toIso);
  }
  return next;
}

function computePreviousWindow(window) {
  if (!window?.fromDate || !window?.toDate) return null;

  const diffMs = window.toDate.getTime() - window.fromDate.getTime();
  if (!(diffMs > 0)) return null;

  const prevToDate = new Date(window.fromDate);
  const prevFromDate = new Date(window.fromDate.getTime() - diffMs);

  return {
    fromDate: prevFromDate,
    toDate: prevToDate,
    fromIso: prevFromDate.toISOString(),
    toIso: prevToDate.toISOString(),
  };
}

export function normalizeAnalyticsDateRange(range) {
  const value = String(range || DEFAULT_DATE_RANGE).toLowerCase();
  if (VALID_ANALYTICS_DATE_RANGES.includes(value)) return value;
  return DEFAULT_DATE_RANGE;
}

export function normalizeAnalyticsTab(tabId) {
  const value = String(tabId || "overview").toLowerCase();
  if (VALID_ANALYTICS_TABS.includes(value)) return value;
  return "overview";
}

export function resolveDateRangeWindow(range) {
  const normalized = normalizeAnalyticsDateRange(range);
  const now = new Date();
  const toDate = now;
  let fromDate = null;

  if (normalized === "last_7_days") {
    fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 7);
  } else if (normalized === "last_30_days") {
    fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 30);
  } else if (normalized === "this_month") {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (normalized === "this_year") {
    fromDate = new Date(now.getFullYear(), 0, 1);
  }

  return {
    range: normalized,
    fromDate,
    toDate,
    fromIso: fromDate ? fromDate.toISOString() : null,
    toIso: toDate.toISOString(),
  };
}

async function fetchOrderItemsByOrderIds(adminClient, orderIds) {
  const ids = Array.isArray(orderIds) ? orderIds.filter(Boolean) : [];
  if (!ids.length) return [];

  const rows = [];

  for (let start = 0; start < ids.length; start += ITEM_FETCH_CHUNK_SIZE) {
    const chunk = ids.slice(start, start + ITEM_FETCH_CHUNK_SIZE);
    const { data, error } = await adminClient
      .from("order_items")
      .select(
        "order_id, product_id, vendor_id, quantity, price, service_charge_snapshot, created_at"
      )
      .in("order_id", chunk);

    if (error) {
      throw new Error(error.message || "Failed to load order items");
    }

    if (Array.isArray(data) && data.length) {
      rows.push(...data);
    }
  }

  return rows;
}

async function fetchCoreAnalyticsData({ adminClient, currentWindow, previousWindow }) {
  const now = new Date();
  const nowIso = now.toISOString();

  const confirmedOrdersQuery = applyWindowFilter(
    adminClient
      .from("orders")
      .select("id, registry_id, total_amount, status, created_at")
      .in("status", CONFIRMED_ORDER_STATUSES),
    "created_at",
    currentWindow
  );

  const previousConfirmedOrdersQuery = previousWindow
    ? applyWindowFilter(
        adminClient
          .from("orders")
          .select("id, total_amount, status, created_at")
          .in("status", CONFIRMED_ORDER_STATUSES),
        "created_at",
        previousWindow
      )
    : null;

  const recentVendorsWindow = {
    fromDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    toDate: now,
    fromIso: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    toIso: nowIso,
  };

  const recentConfirmedOrdersQuery = applyWindowFilter(
    adminClient
      .from("orders")
      .select("id")
      .in("status", CONFIRMED_ORDER_STATUSES),
    "created_at",
    recentVendorsWindow
  );

  const profileGrowthQuery = (() => {
    let query = adminClient.from("profiles").select("id, created_at");
    if (previousWindow?.fromIso) {
      query = query.gte("created_at", previousWindow.fromIso);
    } else if (currentWindow?.fromIso) {
      query = query.gte("created_at", currentWindow.fromIso);
    }
    if (currentWindow?.toIso) {
      query = query.lte("created_at", currentWindow.toIso);
    }
    return query;
  })();

  const [
    { count: usersCount, error: usersCountError },
    { data: profilesGrowthRows, error: profilesGrowthError },
    { data: registriesRows, error: registriesError },
    { data: confirmedOrdersRows, error: confirmedOrdersError },
    previousConfirmedOrdersResult,
    { data: recentConfirmedOrdersRows, error: recentConfirmedOrdersError },
    { data: paymentsRows, error: paymentsError },
    { count: vendorsCount, error: vendorsCountError },
    { count: pendingVendorApps, error: pendingVendorAppsError },
    { count: pendingProductsCount, error: pendingProductsError },
    { count: openTickets, error: openTicketsError },
    { data: vendorPayoutsRows, error: vendorPayoutsError },
    { data: productPageViewsRows, error: productPageViewsError },
    { data: registryPageViewsRows, error: registryPageViewsError },
    { data: productsRows, count: totalProductsCount, error: productsError },
    { data: vendorsRows, error: vendorsRowsError },
    { data: eventsRows, error: eventsError },
    { data: registryItemsRows, error: registryItemsError },
  ] = await Promise.all([
    adminClient.from("profiles").select("id", { count: "exact", head: true }),
    profileGrowthQuery,
    adminClient
      .from("registries")
      .select("id, event_id, deadline, created_at")
      .lte("created_at", currentWindow.toIso),
    confirmedOrdersQuery,
    previousConfirmedOrdersQuery || Promise.resolve({ data: [], error: null }),
    recentConfirmedOrdersQuery,
    applyWindowFilter(
      adminClient
        .from("order_payments")
        .select("amount, status, created_at"),
      "created_at",
      currentWindow
    ),
    adminClient.from("vendors").select("id", { count: "exact", head: true }),
    adminClient
      .from("vendor_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    adminClient
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    adminClient
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", OPEN_TICKET_STATUSES),
    applyWindowFilter(
      adminClient
        .from("vendor_payouts")
        .select("status, total_net_amount, created_at"),
      "created_at",
      currentWindow
    ),
    applyWindowFilter(
      adminClient
        .from("product_page_views")
        .select("product_id, profile_id, session_id, ip_hash, created_at"),
      "created_at",
      currentWindow
    ),
    applyWindowFilter(
      adminClient
        .from("registry_page_views")
        .select("registry_id, profile_id, session_id, ip_hash, created_at"),
      "created_at",
      currentWindow
    ),
    adminClient
      .from("products")
      .select("id, name, vendor_id, stock_qty, status, created_at", {
        count: "exact",
      }),
    adminClient.from("vendors").select("id, business_name"),
    adminClient.from("events").select("id, type"),
    applyWindowFilter(
      adminClient
        .from("registry_items")
        .select("registry_id, quantity_needed, purchased_qty, created_at"),
      "created_at",
      currentWindow
    ),
  ]);

  const previousConfirmedOrdersRows =
    previousConfirmedOrdersResult?.data || [];
  const previousConfirmedOrdersError = previousConfirmedOrdersResult?.error || null;

  const errors = [
    usersCountError,
    profilesGrowthError,
    registriesError,
    confirmedOrdersError,
    previousConfirmedOrdersError,
    recentConfirmedOrdersError,
    paymentsError,
    vendorsCountError,
    pendingVendorAppsError,
    pendingProductsError,
    openTicketsError,
    vendorPayoutsError,
    productPageViewsError,
    registryPageViewsError,
    productsError,
    vendorsRowsError,
    eventsError,
    registryItemsError,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(errors[0]?.message || "Failed to load analytics data");
  }

  const confirmedOrderIds = (confirmedOrdersRows || []).map((row) => row.id);
  const previousConfirmedOrderIds = (previousConfirmedOrdersRows || []).map(
    (row) => row.id
  );
  const recentConfirmedOrderIds = (recentConfirmedOrdersRows || []).map(
    (row) => row.id
  );

  const [confirmedOrderItems, previousOrderItems, recentOrderItems] =
    await Promise.all([
      fetchOrderItemsByOrderIds(adminClient, confirmedOrderIds),
      fetchOrderItemsByOrderIds(adminClient, previousConfirmedOrderIds),
      fetchOrderItemsByOrderIds(adminClient, recentConfirmedOrderIds),
    ]);

  return {
    usersCount: typeof usersCount === "number" ? usersCount : 0,
    profilesGrowthRows: profilesGrowthRows || [],
    registriesRows: registriesRows || [],
    confirmedOrdersRows: confirmedOrdersRows || [],
    previousConfirmedOrdersRows: previousConfirmedOrdersRows || [],
    confirmedOrderItems,
    previousOrderItems,
    recentOrderItems,
    paymentsRows: paymentsRows || [],
    vendorsCount: typeof vendorsCount === "number" ? vendorsCount : 0,
    pendingVendorApps:
      typeof pendingVendorApps === "number" ? pendingVendorApps : 0,
    pendingProductsCount:
      typeof pendingProductsCount === "number" ? pendingProductsCount : 0,
    openTickets: typeof openTickets === "number" ? openTickets : 0,
    vendorPayoutsRows: vendorPayoutsRows || [],
    productPageViewsRows: productPageViewsRows || [],
    registryPageViewsRows: registryPageViewsRows || [],
    productsRows: productsRows || [],
    totalProductsCount:
      typeof totalProductsCount === "number" ? totalProductsCount : 0,
    vendorsRows: vendorsRows || [],
    eventsRows: eventsRows || [],
    registryItemsRows: registryItemsRows || [],
  };
}

function buildMetricsFromCoreData(core, currentWindow, previousWindow) {
  const now = new Date();

  const registriesCreatedInRange = (core.registriesRows || []).filter((row) =>
    isDateInWindow(row?.created_at, currentWindow)
  );

  let activeRegistries = 0;
  let completedRegistries = 0;
  for (const reg of registriesCreatedInRange) {
    if (!reg?.deadline) {
      activeRegistries += 1;
      continue;
    }

    const deadline = new Date(reg.deadline);
    if (Number.isNaN(deadline.getTime())) {
      activeRegistries += 1;
      continue;
    }

    if (deadline < now) {
      completedRegistries += 1;
    } else {
      activeRegistries += 1;
    }
  }
  const activeCreatedRegistries = activeRegistries;
  const completedCreatedRegistries = completedRegistries;

  let giftsPurchased = 0;
  let serviceChargesActual = 0;

  const productPurchaseMap = new Map();
  const vendorSalesMap = new Map();
  const vendorOrdersMap = new Map();
  const createdRegistryIds = new Set(
    (registriesCreatedInRange || []).map((row) => row?.id).filter(Boolean)
  );
  const confirmedOrderRegistryMap = new Map(
    (core.confirmedOrdersRows || []).map((row) => [row.id, row.registry_id || null])
  );
  let registryGiftsPurchased = 0;

  for (const row of core.confirmedOrderItems || []) {
    const quantity = toNumber(row.quantity);
    const price = toNumber(row.price);

    giftsPurchased += quantity;
    serviceChargesActual += toNumber(row.service_charge_snapshot) * quantity;

    const registryId = row?.order_id
      ? confirmedOrderRegistryMap.get(row.order_id)
      : null;
    if (registryId && createdRegistryIds.has(registryId)) {
      registryGiftsPurchased += quantity;
    }

    if (row.product_id) {
      productPurchaseMap.set(
        row.product_id,
        (productPurchaseMap.get(row.product_id) || 0) + quantity
      );
    }

    if (row.vendor_id) {
      const amount = quantity * price;
      vendorSalesMap.set(row.vendor_id, (vendorSalesMap.get(row.vendor_id) || 0) + amount);

      const existingOrders = vendorOrdersMap.get(row.vendor_id) || new Set();
      if (row.order_id) existingOrders.add(row.order_id);
      vendorOrdersMap.set(row.vendor_id, existingOrders);
    }
  }

  const vendorSalesPreviousMap = new Map();
  for (const row of core.previousOrderItems || []) {
    if (!row?.vendor_id) continue;

    const quantity = toNumber(row.quantity);
    const price = toNumber(row.price);
    vendorSalesPreviousMap.set(
      row.vendor_id,
      (vendorSalesPreviousMap.get(row.vendor_id) || 0) + quantity * price
    );
  }

  const revenueGenerated = (core.confirmedOrdersRows || []).reduce(
    (sum, row) => sum + toNumber(row.total_amount),
    0
  );

  let refundsAdjustments = 0;
  for (const payment of core.paymentsRows || []) {
    const status = String(payment?.status || "").toLowerCase();
    const amount = toNumber(payment?.amount);
    if (REFUND_PAYMENT_STATUSES.includes(status) || amount < 0) {
      refundsAdjustments += Math.abs(amount);
    }
  }

  let pendingPayoutAmount = 0;
  let completedPayoutAmount = 0;
  for (const payout of core.vendorPayoutsRows || []) {
    const amount = toNumber(payout.total_net_amount);
    const status = String(payout.status || "").toLowerCase();

    if (status === "pending") {
      pendingPayoutAmount += amount;
    } else if (status === "approved" || status === "paid" || status === "completed") {
      completedPayoutAmount += amount;
    }
  }

  const serviceCharges =
    serviceChargesActual > 0 ? serviceChargesActual : revenueGenerated * 0.05;

  const productViewMap = new Map();
  for (const row of core.productPageViewsRows || []) {
    if (!row?.product_id) continue;

    const current = productViewMap.get(row.product_id) || {
      views: 0,
      viewers: new Set(),
    };

    current.views += 1;

    const viewerKey =
      row.profile_id ||
      (row.session_id ? `session:${row.session_id}` : null) ||
      (row.ip_hash ? `ip:${row.ip_hash}` : null);

    if (viewerKey) {
      current.viewers.add(viewerKey);
    }

    productViewMap.set(row.product_id, current);
  }

  const productById = new Map((core.productsRows || []).map((row) => [row.id, row]));
  const vendorById = new Map((core.vendorsRows || []).map((row) => [row.id, row]));

  const productIds = new Set([
    ...Array.from(productViewMap.keys()),
    ...Array.from(productPurchaseMap.keys()),
  ]);

  const topProducts = Array.from(productIds)
    .map((productId) => {
      const viewEntry = productViewMap.get(productId) || { views: 0, viewers: new Set() };
      const purchases = productPurchaseMap.get(productId) || 0;
      const uniqueViewers = viewEntry.viewers?.size || 0;
      const product = productById.get(productId);
      const vendorId = product?.vendor_id || null;
      const vendor = vendorId ? vendorById.get(vendorId) : null;

      return {
        productId,
        productName: product?.name || "Unnamed product",
        vendorId,
        vendorName: vendor?.business_name || (vendorId ? "Unknown vendor" : "—"),
        views: viewEntry.views || 0,
        purchases,
        conversion: uniqueViewers > 0 ? purchases / uniqueViewers : 0,
      };
    })
    .sort((a, b) => {
      const purchaseDiff = (b.purchases || 0) - (a.purchases || 0);
      if (purchaseDiff !== 0) return purchaseDiff;
      return (b.views || 0) - (a.views || 0);
    })
    .slice(0, 5);

  const topVendors = Array.from(vendorSalesMap.entries())
    .map(([vendorId, totalSales]) => {
      const previousSales = vendorSalesPreviousMap.get(vendorId) || 0;
      const growthRate =
        previousWindow && previousSales > 0
          ? (totalSales - previousSales) / previousSales
          : null;

      return {
        vendorId,
        vendorName: vendorById.get(vendorId)?.business_name || "Unknown vendor",
        totalSales,
        orders: (vendorOrdersMap.get(vendorId) || new Set()).size,
        growthRate,
      };
    })
    .sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0))
    .slice(0, 5);

  let lowInventoryCount = 0;
  for (const product of core.productsRows || []) {
    const status = String(product.status || "").toLowerCase();
    const stock = toNumber(product.stock_qty);
    if (status === "approved" && stock > 0 && stock <= 5) {
      lowInventoryCount += 1;
    }
  }

  const vendorsWithRecentSales = new Set(
    (core.recentOrderItems || []).map((row) => row.vendor_id).filter(Boolean)
  );
  const inactiveVendorsCount = Math.max(
    0,
    (core.vendorsRows || []).length - vendorsWithRecentSales.size
  );

  const visitorCounts = new Map();
  const uniqueRegistriesViewed = new Set();
  const uniqueVisitorKeys = new Set();

  for (const row of core.registryPageViewsRows || []) {
    if (row.registry_id) uniqueRegistriesViewed.add(row.registry_id);

    const key =
      row.profile_id ||
      (row.session_id ? `session:${row.session_id}` : null) ||
      (row.ip_hash ? `ip:${row.ip_hash}` : null);

    if (!key) continue;

    uniqueVisitorKeys.add(key);
    visitorCounts.set(key, (visitorCounts.get(key) || 0) + 1);
  }

  let returningVisitorCount = 0;
  for (const count of visitorCounts.values()) {
    if (count > 1) returningVisitorCount += 1;
  }

  const returningVisitors =
    uniqueVisitorKeys.size > 0 ? returningVisitorCount / uniqueVisitorKeys.size : 0;

  const eventTypeById = new Map((core.eventsRows || []).map((row) => [row.id, row.type]));
  const registryTypeCounts = new Map();

  for (const registry of registriesCreatedInRange) {
    const eventType = eventTypeById.get(registry.event_id);
    if (!eventType) continue;
    registryTypeCounts.set(eventType, (registryTypeCounts.get(eventType) || 0) + 1);
  }

  const totalTypeCount = Array.from(registryTypeCounts.values()).reduce(
    (sum, count) => sum + toNumber(count),
    0
  );

  const popularRegistryTypes = Array.from(registryTypeCounts.entries())
    .map(([type, count]) => ({
      type,
      count,
      percentage: totalTypeCount > 0 ? count / totalTypeCount : 0,
    }))
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 5);

  const registryItemsInRange = core.registryItemsRows || [];
  const totalItemsNeeded = registryItemsInRange.reduce(
    (sum, row) => sum + toNumber(row.quantity_needed),
    0
  );
  const totalItemsPurchased = registryItemsInRange.reduce(
    (sum, row) => sum + toNumber(row.purchased_qty),
    0
  );

  const giftFulfillmentRate =
    totalItemsNeeded > 0 ? totalItemsPurchased / totalItemsNeeded : 0;

  const currentSignups = (core.profilesGrowthRows || []).filter((row) =>
    isDateInWindow(row?.created_at, currentWindow)
  ).length;

  const previousSignups = previousWindow
    ? (core.profilesGrowthRows || []).filter((row) =>
        isDateInWindow(row?.created_at, previousWindow)
      ).length
    : 0;

  const userGrowthRate =
    previousWindow && previousSignups > 0
      ? (currentSignups - previousSignups) / previousSignups
      : null;

  const pendingApprovals = core.pendingVendorApps + core.pendingProductsCount;

  return {
    overview: {
      totalUsers: core.usersCount,
      activeRegistries,
      giftsPurchased,
      revenueGenerated,
      serviceCharges,
      vendorCount: core.vendorsCount,
      pendingVendorRequests: core.pendingVendorApps,
      pendingApprovals,
      openTickets: core.openTickets,
    },
    financial: {
      totalSales: revenueGenerated,
      serviceCharges,
      pendingPayouts: pendingPayoutAmount,
      completedPayouts: completedPayoutAmount,
      refundsAdjustments,
    },
    vendorProduct: {
      totalVendors: core.vendorsCount,
      totalProducts: core.totalProductsCount,
      productApprovalQueue: core.pendingProductsCount,
      lowInventoryCount,
      inactiveVendorsCount,
      topVendors,
      topProducts,
    },
    registryUser: {
      registriesCreated: registriesCreatedInRange.length,
      activeRegistries: activeCreatedRegistries,
      completedRegistries: completedCreatedRegistries,
      averageGiftsPerRegistry:
        registriesCreatedInRange.length > 0
          ? registryGiftsPurchased / registriesCreatedInRange.length
          : 0,
      registryViews: (core.registryPageViewsRows || []).length,
      uniqueRegistriesViewed: uniqueRegistriesViewed.size,
      uniqueVisitors: uniqueVisitorKeys.size,
      returningVisitors,
      giftFulfillmentRate,
      userGrowthRate,
      popularRegistryTypes,
    },
  };
}

export async function fetchAdminAnalyticsMetrics({ adminClient, dateRange }) {
  const currentWindow = resolveDateRangeWindow(dateRange);
  const previousWindow = computePreviousWindow(currentWindow);

  const core = await fetchCoreAnalyticsData({
    adminClient,
    currentWindow,
    previousWindow,
  });

  return buildMetricsFromCoreData(core, currentWindow, previousWindow);
}

function escapeCsvCell(value) {
  if (value === null || typeof value === "undefined") return "";
  const str = String(value);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function mapOverviewRows(metrics) {
  return [
    ["Total Users", metrics?.totalUsers],
    ["Active Registries", metrics?.activeRegistries],
    ["Gifts Purchased", metrics?.giftsPurchased],
    ["Revenue Generated", metrics?.revenueGenerated],
    ["Service Charges", metrics?.serviceCharges],
    ["Vendor Count", metrics?.vendorCount],
    ["Pending Approvals", metrics?.pendingApprovals],
    ["Open Tickets", metrics?.openTickets],
  ];
}

function mapFinancialRows(metrics) {
  return [
    ["Total Sales", metrics?.totalSales],
    ["Service Charges", metrics?.serviceCharges],
    ["Pending Vendor Payouts", metrics?.pendingPayouts],
    ["Completed Payouts", metrics?.completedPayouts],
    ["Refunds / Adjustments", metrics?.refundsAdjustments],
  ];
}

function mapVendorProductRows(metrics) {
  const rows = [
    ["Total Vendors", metrics?.totalVendors],
    ["Total Products", metrics?.totalProducts],
    ["Product Approval Queue", metrics?.productApprovalQueue],
    ["Low Inventory Alerts", metrics?.lowInventoryCount],
    ["Inactive Vendors", metrics?.inactiveVendorsCount],
    ["", ""],
    ["Top Vendors", ""],
    ["Vendor Name", "Total Sales", "Orders", "Growth"],
  ];

  for (const vendor of metrics?.topVendors || []) {
    rows.push([
      vendor.vendorName,
      vendor.totalSales,
      vendor.orders,
      typeof vendor.growthRate === "number" ? vendor.growthRate : "",
    ]);
  }

  rows.push(["", ""]);
  rows.push(["Top Products", ""]);
  rows.push(["Product Name", "Vendor", "Views", "Purchases", "Conversion"]);

  for (const product of metrics?.topProducts || []) {
    rows.push([
      product.productName,
      product.vendorName,
      product.views,
      product.purchases,
      typeof product.conversion === "number" ? product.conversion : "",
    ]);
  }

  return rows;
}

function mapRegistryUserRows(metrics) {
  const rows = [
    ["Registries Created", metrics?.registriesCreated],
    ["Active Registries", metrics?.activeRegistries],
    ["Completed Registries", metrics?.completedRegistries],
    ["Average Gifts Per Registry", metrics?.averageGiftsPerRegistry],
    ["Registry Views", metrics?.registryViews],
    ["Unique Registries Viewed", metrics?.uniqueRegistriesViewed],
    ["Unique Visitors", metrics?.uniqueVisitors],
    ["Returning Visitors", metrics?.returningVisitors],
    ["Gift Fulfillment Rate", metrics?.giftFulfillmentRate],
    ["User Growth Rate", metrics?.userGrowthRate],
    ["", ""],
    ["Popular Registry Types", ""],
    ["Type", "Count", "Percentage"],
  ];

  for (const row of metrics?.popularRegistryTypes || []) {
    rows.push([row.type, row.count, row.percentage]);
  }

  return rows;
}

export function buildAnalyticsCsv({ tabId, metricsByTab }) {
  const normalizedTab = normalizeAnalyticsTab(tabId);
  const metrics = metricsByTab || {};

  let rows = [];
  if (normalizedTab === "overview") {
    rows = mapOverviewRows(metrics.overview || {});
  } else if (normalizedTab === "financial") {
    rows = mapFinancialRows(metrics.financial || {});
  } else if (normalizedTab === "vendor_product") {
    rows = mapVendorProductRows(metrics.vendorProduct || {});
  } else {
    rows = mapRegistryUserRows(metrics.registryUser || {});
  }

  const csvLines = rows.map((columns) =>
    (Array.isArray(columns) ? columns : [columns]).map(escapeCsvCell).join(",")
  );

  return csvLines.join("\n");
}

export function buildAnalyticsExportFileName({ tabId, dateRange }) {
  const tab = normalizeAnalyticsTab(tabId);
  const range = normalizeAnalyticsDateRange(dateRange);
  const date = new Date().toISOString().slice(0, 10);
  return `analytics_${tab}_${range}_${date}.csv`;
}

export function buildAnalyticsExportEmailHtml({ downloadUrl, tabId, dateRange }) {
  const tab = normalizeAnalyticsTab(tabId).replace(/_/g, " ");
  const range = normalizeAnalyticsDateRange(dateRange).replace(/_/g, " ");

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin-bottom: 12px;">Your analytics export is ready</h2>
      <p style="margin: 0 0 10px;">Tab: <strong>${tab}</strong></p>
      <p style="margin: 0 0 16px;">Date range: <strong>${range}</strong></p>
      <p style="margin: 0 0 16px;">Use the link below to download your CSV export.</p>
      <a href="${downloadUrl}" style="display: inline-block; padding: 10px 16px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 9999px;">Download CSV</a>
      <p style="margin-top: 16px; color: #6b7280; font-size: 12px;">If you did not request this export, you can ignore this email.</p>
    </div>
  `;
}
