"use client";
import React from "react";


export const formatCurrency = (value) => {
  if (value === null || typeof value === "undefined") return "GHS0.00";
  const num = Number(value);
  if (!Number.isFinite(num)) return "GHS0.00";
  return `GHS${num.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().split("T")[0];
};

export const buildMaskedEnding = (value) => {
  if (!value) return "";
  const safe = String(value);
  return safe.slice(-4);
};

export const getPayoutDisplayId = (id) => {
  if (!id) return "—";
  const trimmed = String(id).replace(/-/g, "");
  return `PAY-${trimmed.slice(-6).toUpperCase()}`;
};

export const getTransactionDisplayId = (id) => {
  if (!id) return "—";
  const trimmed = String(id).replace(/-/g, "");
  return `TXN-${trimmed.slice(-6).toUpperCase()}`;
};

export const getStatusConfig = (status) => {
  const s = (status || "").toLowerCase();
  const configs = {
    pending: {
      label: "Pending",
      className: "bg-[#FEF3C7] text-[#D97706]",
      dotColor: "bg-[#F59E0B]",
    },
    completed: {
      label: "Completed",
      className: "bg-[#D1FAE5] text-[#059669]",
      dotColor: "bg-[#10B981]",
    },
    processing: {
      label: "Processing",
      className: "bg-[#DBEAFE] text-[#2563EB]",
      dotColor: "bg-[#3B82F6]",
    },
    failed: {
      label: "Failed",
      className: "bg-[#FEE2E2] text-[#DC2626]",
      dotColor: "bg-[#EF4444]",
    },
  };
  return (
    configs[s] || {
      label: status || "Unknown",
      className: "bg-[#F3F4F6] text-[#6B7280]",
      dotColor: "bg-[#9CA3AF]",
    }
  );
};

export function StatCard({ icon: Icon, iconColor, title, value, subtitle }) {
  return (
    <div className="flex flex-col space-y-2 p-4 bg-white rounded-xl border border-[#E5E7EB]">
      <div className="flex items-center justify-between">
        <span className="text-[#6B7280] text-sm font-brasley-medium">{title}</span>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[#111827] text-2xl font-semibold font-brasley-medium">
            {value}
          </span>
          {subtitle && (
            <span className="text-[#6B7280] text-xs mt-0.5">{subtitle}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const config = getStatusConfig(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${config.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
}
