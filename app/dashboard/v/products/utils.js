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

export const formatCount = (value) => {
  if (value === null || typeof value === "undefined") return "0";
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString();
};

export const getStatusBadge = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "approved" || s === "active") {
    return { label: "Active", className: "bg-[#D1FAE5] text-[#059669]" };
  }
  if (s === "pending") {
    return { label: "Pending", className: "bg-[#FEF3C7] text-[#D97706]" };
  }
  if (s === "rejected") {
    return { label: "Rejected", className: "bg-[#FEE2E2] text-[#DC2626]" };
  }
  if (s === "inactive") {
    return { label: "Inactive", className: "bg-[#F3F4F6] text-[#6B7280]" };
  }
  if (s === "out_of_stock") {
    return { label: "Out of Stock", className: "text-xs bg-[#FEE2E2] text-[#DC2626]" };
  }
  return {
    label: status || "Unknown",
    className: "bg-[#F3F4F6] text-[#6B7280]",
  };
};

export const getStockStatus = (stock) => {
  const qty = Number(stock || 0);
  if (qty === 0) return { label: "Out of Stock", color: "text-xs text-[#DC2626]" };
  if (qty <= 5) return { label: `${qty}`, color: "text-[#D97706]" };
  return { label: `${qty}`, color: "text-[#111827]" };
};

export const calculateMargin = (price, costPrice) => {
  const p = Number(price || 0);
  const c = Number(costPrice || 0);
  if (p === 0 || c === 0) return null;
  const margin = ((p - c) / p) * 100;
  return margin.toFixed(0);
};

export function StatCard({ icon: Icon, iconColor, title, value, description }) {
  return (
    <div className="flex flex-col space-y-2 p-4 bg-white rounded-xl border border-[#E5E7EB]">
      <div className="flex items-center justify-between">
        <span className="text-[#6B7280] text-sm font-brasley-medium">{title}</span>

        <Icon className={`w-5 h-5 text-[${iconColor}]`} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[#111827] text-2xl font-semibold font-brasley-medium">
          {value}
        </span>
      </div>
      {description ? (
        <p className="text-[#6B7280] text-xs font-brasley-medium">{description}</p>
      ) : null}
    </div>
  );
}
