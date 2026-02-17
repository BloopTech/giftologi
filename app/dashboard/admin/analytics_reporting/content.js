"use client";
import React from "react";
import { PiDownloadSimple } from "react-icons/pi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/Select";
import { useAnalyticsReportingContext } from "./context";
import AnalyticsReportOverview from "./tabs/overview";
import AnalyticsReportFinancial from "./tabs/finance";
import AnalyticsReportVendorProducts from "./tabs/vendor_products";
import AnalyticsReportRegistryUser from "./tabs/registry_user";

export default function AnalyticsReportingContent() {
  const context = useAnalyticsReportingContext() || {};
  const {
    dateRange,
    setDateRange,
    activeTab,
    setActiveTab,
    overview,
    financial,
    vendorProduct,
    registryUser,
    loading,
    exportSummary,
  } = context;

  const isLoading = !!loading;

  const formatCount = (value) => {
    if (value === null || typeof value === "undefined") return "—";
    const num = Number(value);
    if (Number.isNaN(num)) return "—";
    return num.toLocaleString();
  };

  const formatCurrency = (value) => {
    if (value === null || typeof value === "undefined") return "GHS 0.00";
    const num = Number(value);
    if (!Number.isFinite(num)) return "GHS 0.00";
    return (
      "GHS " +
      num.toLocaleString("en-GH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const renderMetricValue = (type, metrics) => {
    if (isLoading) {
      return <div className="h-4 w-16 rounded bg-[#E5E7EB] animate-pulse" />;
    }
    if (!metrics) {
      return (
        <p className="text-[#0A0A0A] font-medium font-brasley-medium text-sm">
          —
        </p>
      );
    }

    switch (type) {
      case "revenue":
        return (
          <p className="text-[#0A0A0A] font-medium font-brasley-medium text-sm">
            {formatCurrency(metrics.revenueGenerated)}
          </p>
        );
      case "serviceCharges":
        return (
          <p className="text-[#0A0A0A] font-medium font-brasley-medium text-sm">
            {formatCurrency(metrics.serviceCharges)}
          </p>
        );
      case "totalSales":
        return (
          <p className="text-[#0A0A0A] font-medium font-brasley-medium text-sm">
            {formatCurrency(metrics.totalSales)}
          </p>
        );
      case "pendingPayouts":
        return (
          <p className="text-[#0A0A0A] font-medium font-brasley-medium text-sm">
            {formatCurrency(metrics.pendingPayouts)}
          </p>
        );
      case "completedPayouts":
        return (
          <p className="text-[#0A0A0A] font-medium font-brasley-medium text-sm">
            {formatCurrency(metrics.completedPayouts)}
          </p>
        );
      case "refunds":
        return (
          <p className="text-[#0A0A0A] font-medium font-brasley-medium text-sm">
            {formatCurrency(metrics.refundsAdjustments)}
          </p>
        );
      case "avgGifts": {
        const raw = metrics.averageGiftsPerRegistry || 0;
        const num = Number(raw);
        const label = Number.isFinite(num)
          ? num.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })
          : "—";
        return (
          <p className="text-[#0A0A0A] font-medium font-brasley-medium text-sm">
            {label}
          </p>
        );
      }
      default:
        return (
          <p className="text-[#0A0A0A] font-medium font-brasley-medium text-sm">
            {formatCount(metrics[type])}
          </p>
        );
    }
  };

  const handleFinancialExport = async (format) => {
    if (!financial) return;

    const normalized = String(format || "csv").toLowerCase();

    // CSV uses the existing summary export so it stays consistent
    if (normalized === "csv") {
      exportSummary?.("financial");
      return;
    }

    const rows = [
      ["Total Sales (GHS)", financial.totalSales ?? ""],
      ["Service Charges (GHS)", financial.serviceCharges ?? ""],
      ["Pending Vendor Payouts (GHS)", financial.pendingPayouts ?? ""],
      ["Completed Payouts (GHS)", financial.completedPayouts ?? ""],
      ["Refunds / Adjustments (GHS)", financial.refundsAdjustments ?? ""],
    ];

    if (normalized === "xlsx") {
      const header = "Metric,Value";
      const csvLines = rows.map(([label, value]) => {
        const safeLabel = String(label).replace(/"/g, '""');
        const safeValue =
          value === null || typeof value === "undefined" ? "" : String(value);
        return `"${safeLabel}","${safeValue.replace(/"/g, '""')}"`;
      });
      const csv = [header, ...csvLines].join("\n");
      const blob = new Blob([csv], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `financial_overview_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    if (normalized === "pdf") {
      try {
        const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
        const pdfDoc = await PDFDocument.create();
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();

        let y = height - 40;

        const drawLine = (text, { bold = false } = {}) => {
          const font = bold ? fontBold : fontRegular;
          const size = bold ? 14 : 11;
          page.drawText(text, {
            x: 40,
            y,
            size,
            font,
            color: rgb(0.1, 0.1, 0.1),
            maxWidth: width - 80,
          });
          y -= bold ? 20 : 16;
        };

        drawLine("Financial Overview", { bold: true });
        drawLine(`Generated: ${new Date().toLocaleString()}`);
        y -= 8;

        rows.forEach(([label, value]) => {
          drawLine(`${label}: ${value ?? ""}`);
        });

        const bytes = await pdfDoc.save();
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `financial_overview_${new Date().toISOString().slice(0, 10)}.pdf`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (_) {
        // Fallback to CSV if PDF generation fails
        exportSummary?.("financial");
      }
    }
  };

  const handleExport = () => {
    if (!exportSummary) return;
    exportSummary(activeTab);
  };

  const currentDateRange = dateRange || "last_30_days";
  const currentTab = activeTab || "overview";

  return (
    <section aria-label="Analytics and reporting" className="flex flex-col space-y-4 w-full mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-brasley-medium">
            Analytics & Reporting
          </h1>
          <span className="text-[#717182] text-xs/4 font-brasley-medium">
            Track platform performance and download high-level summaries.
          </span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <Select
            value={currentDateRange}
            onValueChange={(value) => setDateRange?.(value)}
          >
            <SelectTrigger className="min-w-[180px] text-xs">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_7_days">Last 7 days</SelectItem>
              <SelectItem value="last_30_days">Last 30 days</SelectItem>
              <SelectItem value="this_month">This month</SelectItem>
              <SelectItem value="this_year">This year</SelectItem>
              <SelectItem value="all_time">All time</SelectItem>
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center space-x-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-white border border-primary cursor-pointer hover:bg-white hover:text-primary"
          >
            <PiDownloadSimple className="size-4" />
            <span>Export summary (CSV)</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-start mt-1">
        <div className="inline-flex rounded-full bg-[#F1F2F6] p-1 gap-1 text-[11px]">
          {[
            { id: "overview", label: "Overview" },
            { id: "financial", label: "Financial Reports" },
            { id: "vendor_product", label: "Vendor & Product Analytics" },
            { id: "registry_user", label: "Registry & User Behaviour" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab?.(tab.id)}
              className={
                "px-4 py-1.5 rounded-full cursor-pointer transition-colors " +
                (currentTab === tab.id
                  ? "bg-white text-[#0A0A0A] shadow-sm"
                  : "text-[#717182]")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {currentTab === "overview" ? (
        <AnalyticsReportOverview
          metrics={overview}
          isLoading={isLoading}
          renderMetricValue={renderMetricValue}
        />
      ) : null}
      {currentTab === "financial" ? (
        <AnalyticsReportFinancial
          metrics={financial}
          isLoading={isLoading}
          renderMetricValue={renderMetricValue}
          formatCount={formatCount}
          onDownload={handleFinancialExport}
        />
      ) : null}
      {currentTab === "vendor_product" ? (
        <AnalyticsReportVendorProducts
          metrics={vendorProduct}
          isLoading={isLoading}
          formatCount={formatCount}
          formatCurrency={formatCurrency}
        />
      ) : null}
      {currentTab === "registry_user" ? (
        <AnalyticsReportRegistryUser
          metrics={registryUser}
          isLoading={isLoading}
          renderMetricValue={renderMetricValue}
          formatCount={formatCount}
        />
      ) : null}
    </section>
  );
}