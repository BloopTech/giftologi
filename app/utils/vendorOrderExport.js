export const VENDOR_ORDER_EXPORT_STATUSES = [
  "all",
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "expired",
];

export function normalizeVendorOrderExportFilters(rawFilters = {}) {
  const rawStatus = String(rawFilters?.status || "all").toLowerCase().trim();
  const status = VENDOR_ORDER_EXPORT_STATUSES.includes(rawStatus)
    ? rawStatus
    : "all";

  const q = String(rawFilters?.q || "").trim().slice(0, 160);

  const from = rawFilters?.from ? String(rawFilters.from).trim() : "";
  const to = rawFilters?.to ? String(rawFilters.to).trim() : "";

  return {
    status,
    q,
    from,
    to,
  };
}

export function buildVendorOrdersExportFileName({ queuedAt, status }) {
  const date = queuedAt ? new Date(queuedAt) : new Date();
  const stamp = Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10);

  const normalizedStatus = String(status || "all").toLowerCase();
  return normalizedStatus && normalizedStatus !== "all"
    ? `vendor-orders-${normalizedStatus}-${stamp}.csv`
    : `vendor-orders-${stamp}.csv`;
}

function escapeCsvCell(value) {
  const raw = value == null ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export function buildVendorOrdersCsv(rows = []) {
  const header = [
    "Order Code",
    "Product",
    "SKU",
    "Variation",
    "Customer",
    "Registry",
    "Quantity",
    "Amount",
    "Date",
    "Status",
  ];

  const lines = [header.map(escapeCsvCell).join(",")];

  for (const row of rows) {
    const cells = [
      row?.orderCode || "",
      row?.productName || "",
      row?.productSku || "",
      row?.variation || "",
      row?.customerName || "",
      row?.registryTitle || "",
      row?.quantity ?? "",
      row?.amount ?? "",
      row?.date || "",
      row?.status || "",
    ];

    lines.push(cells.map(escapeCsvCell).join(","));
  }

  return lines.join("\n");
}

export function buildVendorOrdersExportEmailHtml({
  downloadUrl,
  status,
  q,
  from,
  to,
}) {
  const filters = [];
  if (status && status !== "all") filters.push(`Status: ${status}`);
  if (q) filters.push(`Search: ${q}`);
  if (from) filters.push(`From: ${from}`);
  if (to) filters.push(`To: ${to}`);

  const filterHtml =
    filters.length > 0
      ? `<p style="margin:8px 0 16px;color:#4b5563;font-size:13px;">${filters.join(" • ")}</p>`
      : "";

  const safeDownloadUrl = downloadUrl || "#";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:640px;">
      <h2 style="margin:0 0 8px;">Your vendor orders export is ready</h2>
      <p style="margin:0;color:#374151;">We prepared your orders CSV export.</p>
      ${filterHtml}
      <p style="margin:20px 0;">
        <a href="${safeDownloadUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600;">
          Download CSV
        </a>
      </p>
      <p style="margin:0;color:#6b7280;font-size:12px;">If the button does not work, copy this link into your browser:</p>
      <p style="margin:6px 0 0;word-break:break-all;font-size:12px;color:#2563eb;">${safeDownloadUrl}</p>
    </div>
  `;
}
