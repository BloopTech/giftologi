"use client";
import React from "react";

function MetricCard({ title, value, description }) {
  return (
    <div className="flex flex-col space-y-2 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
      <h2 className="text-[#4A5565] text-xs/4 font-inter">{title}</h2>
      <div className="flex justify-between items-center font-inter text-[#101828]">
        {value}
      </div>
      <span className="font-inter text-[#6A7282] text-[10px]">
        {description}
      </span>
    </div>
  );
}

export default function AnalyticsReportFinancial(props) {
  const { metrics, isLoading, renderMetricValue, formatCount, onDownload } =
    props;

  const skeleton = (
    <div className="h-4 w-16 rounded bg-[#E5E7EB] animate-pulse" />
  );

  const renderValue = (type) => {
    if (isLoading) return skeleton;
    if (!metrics) {
      return (
        <p className="text-[#0A0A0A] font-medium font-poppins text-sm">—</p>
      );
    }
    if (
      type === "totalSales" ||
      type === "serviceCharges" ||
      type === "refunds" ||
      type === "pendingPayouts" ||
      type === "completedPayouts"
    ) {
      return renderMetricValue(type, metrics);
    }
    return (
      <p className="text-[#0A0A0A] font-medium font-poppins text-sm">
        {formatCount(metrics[type])}
      </p>
    );
  };

  return (
    <div className="w-full mt-2 bg-white rounded-xl p-4 border border-[#D6D6D6] flex flex-col space-y-4">
      <div className="flex flex-col">
        <h2 className="text-[#0A0A0A] text-xs font-medium font-poppins">
          Financial Overview
        </h2>
        <p className="text-[#717182] text-[11px] mt-1">
          Income, service charges, payouts, and refunds.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-1">
        <MetricCard
          title="Total Sales (GHS)"
          value={renderValue("totalSales")}
          description="All confirmed payments"
        />
        <MetricCard
          title="Service Charges (GHS)"
          value={renderValue("serviceCharges")}
          description="5% per-item fees retained"
        />
        <MetricCard
          title="Pending Vendor Payouts (GHS)"
          value={renderValue("pendingPayouts")}
          description="Amount due for settlement"
        />
        <MetricCard
          title="Completed Payouts"
          value={renderValue("completedPayouts")}
          description="Released funds to vendors"
        />
        <div className="col-span-2">
          <div className="flex flex-col space-y-2 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
            <h2 className="text-[#4A5565] text-xs/4 font-inter">
              Refunds / Adjustments
            </h2>
            <div className="flex justify-between items-center font-inter text-[#101828]">
              {isLoading
                ? skeleton
                : renderMetricValue("refunds", metrics || {})}
              <div className="flex items-center gap-1">
                {["CSV", "PDF", "XLSX"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={
                      onDownload
                        ? () => onDownload(label.toLowerCase())
                        : undefined
                    }
                    className="inline-flex items-center justify-center rounded-full border border-[#D6D6D6] px-3 py-1 text-[11px] text-[#0A0A0A] bg-white hover:bg-[#F3F4F6] cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[#6A7282] text-[10px] font-inter">
              Manual and automatic refunds
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
