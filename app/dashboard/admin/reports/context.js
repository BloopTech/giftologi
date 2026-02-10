 "use client";
 import React, {
   createContext,
   useCallback,
   useContext,
   useMemo,
   useState,
 } from "react";
 import { useQueryState, parseAsString } from "nuqs";
 import { createClient as createSupabaseClient } from "../../../utils/supabase/client";

 const GenerateReportsContext = createContext();

 const DEFAULT_DATE_RANGE = "last_30_days";
 const DEFAULT_STATUS = "all";
 const DEFAULT_FORMAT = "pdf";

 const REPORT_DEFINITIONS = [
  {
    id: "registry_summary",
    title: "Registry Summary Report",
    description: "Overview of all active and completed registries",
    accessLevel: "All roles",
  },
  {
    id: "vendor_performance",
    title: "Vendor Performance Report",
    description: "Sales and fulfillment metrics per vendor",
    accessLevel: "Operations, Super Admin",
  },
  {
    id: "financial_transactions",
    title: "Financial Transactions Report",
    description: "Detailed order payments and revenue breakdown",
    accessLevel: "Finance, Super Admin",
  },
  {
    id: "support_tickets",
    title: "Support Tickets Report",
    description: "Summary of tickets by status, priority, and resolution time",
    accessLevel: "Customer Support, Super Admin",
  },
  {
    id: "user_activity",
    title: "User Activity Report",
    description: "Platform usage statistics and user engagement metrics",
    accessLevel: "Super Admin",
  },
 ];

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

 function formatCurrency(value) {
  if (value === null || typeof value === "undefined") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return num.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function escapeCsvCell(value) {
  if (value === null || typeof value === "undefined") return "";
  const str = String(value);
  if (str.includes("\"") || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv({ fileName, columns, rows }) {
  const headerLine = columns.map((col) => escapeCsvCell(col.label)).join(",");
  const rowLines = Array.isArray(rows)
    ? rows.map((row) =>
        columns.map((col) => escapeCsvCell(row[col.key])).join(",")
      )
    : [];

  const csvContent = [headerLine, ...rowLines].join("\n");
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function downloadPdf({ fileName, title, columns, rows }) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.create();
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const headerFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const createPage = () => {
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    return { page, width, height, y: height - 40 };
  };

  let { page, width, height, y } = createPage();

  const drawText = (text, { font, size, color, lineHeight }) => {
    if (y < 40) {
      ({ page, width, height, y } = createPage());
    }
    page.drawText(text, {
      x: 40,
      y,
      size,
      font,
      color,
      maxWidth: width - 80,
    });
    y -= lineHeight;
  };

  // Title
  drawText(title || "Report", {
    font: headerFont,
    size: 16,
    color: rgb(0.1, 0.1, 0.1),
    lineHeight: 22,
  });

  // Simple generated-at line
  const generatedAt = new Date().toLocaleString();
  drawText(`Generated at: ${generatedAt}`, {
    font: bodyFont,
    size: 9,
    color: rgb(0.4, 0.4, 0.4),
    lineHeight: 14,
  });

  y -= 6;

  const headerLine = columns.map((c) => c.label).join("  |  ");
  drawText(headerLine, {
    font: headerFont,
    size: 10,
    color: rgb(0.15, 0.15, 0.2),
    lineHeight: 16,
  });

  if (Array.isArray(rows)) {
    for (const row of rows) {
      const line = columns
        .map((c) => String(row[c.key] ?? ""))
        .join("  |  ")
        .slice(0, 200);
      drawText(line, {
        font: bodyFont,
        size: 9,
        color: rgb(0.15, 0.15, 0.15),
        lineHeight: 13,
      });
    }
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${fileName}.pdf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function buildRegistrySummaryPayload({ supabase, from, to }) {
  let query = supabase
    .from("registries")
    .select("id, deadline, created_at")
    .order("created_at", { ascending: false });

  if (from) {
    query = query.gte("created_at", from.toISOString());
  }
  if (to) {
    query = query.lte("created_at", to.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "Failed to load registries");
  }

  const now = new Date();
  let total = 0;
  let active = 0;
  let expired = 0;

  if (Array.isArray(data)) {
    for (const reg of data) {
      total += 1;
      if (!reg?.deadline) {
        active += 1;
        continue;
      }
      const deadline = new Date(reg.deadline);
      if (!Number.isNaN(deadline.getTime()) && deadline < now) {
        expired += 1;
      } else {
        active += 1;
      }
    }
  }

  const columns = [
    { key: "metric", label: "Metric" },
    { key: "value", label: "Value" },
  ];

  const rows = [
    { metric: "Total registries", value: total },
    { metric: "Active registries", value: active },
    { metric: "Expired registries", value: expired },
  ];

  const fileName = `registry_summary_${new Date()
    .toISOString()
    .slice(0, 10)}`;

  return {
    id: "registry_summary",
    title: "Registry Summary Report",
    fileName,
    columns,
    rows,
  };
}

async function buildVendorPerformancePayload({ supabase, from, to }) {
  const { count: vendorsCount, error: vendorsError } = await supabase
    .from("vendors")
    .select("id", { count: "exact" });

  if (vendorsError) {
    throw new Error(vendorsError.message || "Failed to load vendors");
  }

  let itemsQuery = supabase
    .from("order_items")
    .select("id, quantity, price, created_at");

  if (from) {
    itemsQuery = itemsQuery.gte("created_at", from.toISOString());
  }
  if (to) {
    itemsQuery = itemsQuery.lte("created_at", to.toISOString());
  }

  const { data: itemRows, error: itemsError } = await itemsQuery;
  if (itemsError) {
    throw new Error(itemsError.message || "Failed to load order items");
  }

  let totalItems = 0;
  let totalSales = 0;

  if (Array.isArray(itemRows)) {
    for (const row of itemRows) {
      const qty = Number(row.quantity || 0);
      const price = Number(row.price || 0);
      const amount = qty * price;
      if (!Number.isFinite(amount)) continue;
      totalItems += qty;
      totalSales += amount;
    }
  }

  const columns = [
    { key: "metric", label: "Metric" },
    { key: "value", label: "Value" },
  ];

  const rows = [
    { metric: "Total vendors", value: vendorsCount ?? 0 },
    { metric: "Items sold", value: totalItems },
    { metric: "Gross sales (GHS)", value: formatCurrency(totalSales) },
  ];

  const fileName = `vendor_performance_${new Date()
    .toISOString()
    .slice(0, 10)}`;

  return {
    id: "vendor_performance",
    title: "Vendor Performance Report",
    fileName,
    columns,
    rows,
  };
}

async function buildFinancialTransactionsPayload({
  supabase,
  from,
  to,
}) {
  let ordersQuery = supabase
    .from("orders")
    .select("id, total_amount, status, created_at");

  if (from) {
    ordersQuery = ordersQuery.gte("created_at", from.toISOString());
  }
  if (to) {
    ordersQuery = ordersQuery.lte("created_at", to.toISOString());
  }

  const { data: ordersData, error: ordersError } = await ordersQuery;
  if (ordersError) {
    throw new Error(ordersError.message || "Failed to load orders");
  }

  let paymentsQuery = supabase
    .from("order_payments")
    .select("amount, status, created_at");

  if (from) {
    paymentsQuery = paymentsQuery.gte("created_at", from.toISOString());
  }
  if (to) {
    paymentsQuery = paymentsQuery.lte("created_at", to.toISOString());
  }

  const { data: paymentsData, error: paymentsError } = await paymentsQuery;
  if (paymentsError) {
    throw new Error(paymentsError.message || "Failed to load payments");
  }

  const totalOrders = Array.isArray(ordersData) ? ordersData.length : 0;

  let paidOrders = 0;
  let disputedOrders = 0;

  if (Array.isArray(ordersData)) {
    for (const row of ordersData) {
      const status = (row.status || "").toLowerCase();
      if (["paid", "shipped", "delivered"].includes(status)) {
        paidOrders += 1;
      }
      if (status === "disputed") {
        disputedOrders += 1;
      }
    }
  }

  let totalRevenue = 0;
  if (Array.isArray(paymentsData)) {
    for (const row of paymentsData) {
      const status = (row.status || "").toLowerCase();
      if (status === "success") {
        const amount = Number(row.amount || 0);
        if (Number.isFinite(amount)) {
          totalRevenue += amount;
        }
      }
    }
  }

  const columns = [
    { key: "metric", label: "Metric" },
    { key: "value", label: "Value" },
  ];

  const rows = [
    { metric: "Total orders", value: totalOrders },
    { metric: "Paid orders", value: paidOrders },
    { metric: "Disputed orders", value: disputedOrders },
    {
      metric: "Total revenue (GHS)",
      value: formatCurrency(totalRevenue),
    },
  ];

  const fileName = `financial_transactions_${new Date()
    .toISOString()
    .slice(0, 10)}`;

  return {
    id: "financial_transactions",
    title: "Financial Transactions Report",
    fileName,
    columns,
    rows,
  };
}

async function buildSupportTicketsPayload({ supabase, from, to }) {
  let query = supabase
    .from("support_tickets")
    .select("id, status, created_at");

  if (from) {
    query = query.gte("created_at", from.toISOString());
  }
  if (to) {
    query = query.lte("created_at", to.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "Failed to load support tickets");
  }

  let total = 0;
  let open = 0;
  let escalated = 0;
  let resolved = 0;

  if (Array.isArray(data)) {
    for (const ticket of data) {
      total += 1;
      const status = (ticket.status || "").toLowerCase();
      if (status === "open") open += 1;
      if (status === "escalated") escalated += 1;
      if (status === "resolved" || status === "closed") resolved += 1;
    }
  }

  const columns = [
    { key: "metric", label: "Metric" },
    { key: "value", label: "Value" },
  ];

  const rows = [
    { metric: "Total tickets", value: total },
    { metric: "Open tickets", value: open },
    { metric: "Escalated tickets", value: escalated },
    { metric: "Resolved/Closed tickets", value: resolved },
  ];

  const fileName = `support_tickets_${new Date()
    .toISOString()
    .slice(0, 10)}`;

  return {
    id: "support_tickets",
    title: "Support Tickets Report",
    fileName,
    columns,
    rows,
  };
}

async function buildUserActivityPayload({ supabase, from, to }) {
  let query = supabase
    .from("registry_page_views")
    .select("registry_id, profile_id, created_at");

  if (from) {
    query = query.gte("created_at", from.toISOString());
  }
  if (to) {
    query = query.lte("created_at", to.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "Failed to load registry views");
  }

  const totalViews = Array.isArray(data) ? data.length : 0;
  const uniqueRegistries = Array.isArray(data)
    ? new Set(data.map((row) => row.registry_id).filter(Boolean)).size
    : 0;
  const uniqueUsers = Array.isArray(data)
    ? new Set(data.map((row) => row.profile_id).filter(Boolean)).size
    : 0;

  const columns = [
    { key: "metric", label: "Metric" },
    { key: "value", label: "Value" },
  ];

  const rows = [
    { metric: "Total registry views", value: totalViews },
    { metric: "Unique registries viewed", value: uniqueRegistries },
    { metric: "Unique visitors (profiles)", value: uniqueUsers },
  ];

  const fileName = `user_activity_${new Date()
    .toISOString()
    .slice(0, 10)}`;

  return {
    id: "user_activity",
    title: "User Activity Report",
    fileName,
    columns,
    rows,
  };
}

async function buildReportPayload({ supabase, reportId, from, to }) {
  switch (reportId) {
    case "registry_summary":
      return buildRegistrySummaryPayload({ supabase, from, to });
    case "vendor_performance":
      return buildVendorPerformancePayload({ supabase, from, to });
    case "financial_transactions":
      return buildFinancialTransactionsPayload({ supabase, from, to });
    case "support_tickets":
      return buildSupportTicketsPayload({ supabase, from, to });
    case "user_activity":
      return buildUserActivityPayload({ supabase, from, to });
    default:
      throw new Error("Unknown report type");
  }
}

export const GenerateReportsProvider = ({ children }) => {
  const value = useGenerateReportsProviderValue();

  return (
    <GenerateReportsContext.Provider value={value}>
      {children}
    </GenerateReportsContext.Provider>
  );
};

function useGenerateReportsProviderValue() {
  const [rangeParam, setRangeParam] = useQueryState(
    "range",
    parseAsString.withDefault(DEFAULT_DATE_RANGE)
  );
  const [statusParam, setStatusParam] = useQueryState(
    "status",
    parseAsString.withDefault(DEFAULT_STATUS)
  );
  const [formatParam, setFormatParam] = useQueryState(
    "format",
    parseAsString.withDefault(DEFAULT_FORMAT)
  );
  const [focusIdParam, setFocusIdParam] = useQueryState(
    "focusId",
    parseAsString.withDefault("")
  );

  const [recentReports, setRecentReports] = useState([]);
  const [exportingReportId, setExportingReportId] = useState(null);
  const [error, setError] = useState(null);

  const dateRange = rangeParam || DEFAULT_DATE_RANGE;
  const statusFilter = statusParam || DEFAULT_STATUS;
  const exportFormat = (formatParam || DEFAULT_FORMAT).toLowerCase();
  const focusId = focusIdParam || "";

  const setFocusId = useCallback(
    (value) => {
      setFocusIdParam(value || "");
    },
    [setFocusIdParam]
  );

  const generateReport = useCallback(
    async (reportId) => {
      const definition = REPORT_DEFINITIONS.find((r) => r.id === reportId);
      if (!definition) return;

      setError(null);
      setExportingReportId(reportId);

      try {
        const supabase = createSupabaseClient();
        const { from, to } = resolveDateRange(dateRange);

        const payload = await buildReportPayload({
          supabase,
          reportId,
          from,
          to,
        });

        if (exportFormat === "csv") {
          downloadCsv({
            fileName: payload.fileName,
            columns: payload.columns,
            rows: payload.rows,
          });
        } else if (exportFormat === "pdf") {
          await downloadPdf({
            fileName: payload.fileName,
            title: payload.title,
            columns: payload.columns,
            rows: payload.rows,
          });
        } else {
          setError("Unsupported export format");
        }

        const now = new Date();

        setRecentReports((prev) => {
          const next = [
            {
              id: `${reportId}-${now.toISOString()}`,
              reportId,
              title: definition.title,
              createdAt: now.toISOString(),
              format: exportFormat.toUpperCase(),
            },
            ...prev,
          ];
          return next.slice(0, 5);
        });
      } catch (err) {
        setError(err?.message || "Failed to generate report");
      } finally {
        setExportingReportId(null);
      }
    },
    [dateRange, exportFormat]
  );

  return useMemo(
    () => ({
      reports: REPORT_DEFINITIONS,
      dateRange,
      statusFilter,
      exportFormat,
      setDateRange: setRangeParam,
      setStatusFilter: setStatusParam,
      setExportFormat: setFormatParam,
      focusId,
      setFocusId,
      recentReports,
      exportingReportId,
      error,
      generateReport,
    }),
    [
      dateRange,
      statusFilter,
      exportFormat,
      focusId,
      setFocusId,
      recentReports,
      exportingReportId,
      error,
      generateReport,
      setRangeParam,
      setStatusParam,
      setFormatParam,
    ]
  );
}

export const useGenerateReportsContext = () =>
  useContext(GenerateReportsContext);
