"use client";
import React from "react";




export const formatCurrency = (value) => {
  if (value === null || typeof value === "undefined") return "GHS 0.00";
  const num = Number(value);
  if (!Number.isFinite(num)) return "GHS 0.00";
  return `GHS ${num.toLocaleString("en-GH", {
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

export const buildDailySeries = (orderItems, days = 7) => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));

  const map = new Map();

  (orderItems || []).forEach((row) => {
    const created = row?.created_at;
    if (!created) return;
    const date = new Date(created);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    const entry = map.get(key) || { revenue: 0, orders: new Set() };
    const qty = Number(row.quantity || 0);
    const price = Number(row.price || 0);
    if (Number.isFinite(qty) && Number.isFinite(price)) {
      entry.revenue += qty * price;
    }
    if (row.order_id) {
      entry.orders.add(row.order_id);
    }
    map.set(key, entry);
  });

  return Array.from({ length: days }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = day.toISOString().slice(0, 10);
    const entry = map.get(key);
    const label = day.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return {
      dateKey: key,
      label,
      revenue: entry ? entry.revenue : 0,
      orders: entry ? entry.orders.size : 0,
    };
  });
};

export const getStatusColor = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "bg-[#FEF3C7] text-[#D97706]";
  if (s === "confirmed" || s === "paid") return "bg-[#D1FAE5] text-[#059669]";
  if (s === "shipped") return "bg-[#DBEAFE] text-[#2563EB]";
  if (s === "delivered") return "bg-[#D1FAE5] text-[#059669]";
  if (s === "cancelled") return "bg-[#FEE2E2] text-[#DC2626]";
  return "bg-[#F3F4F6] text-[#6B7280]";
};

export const getStatusLabel = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "Pending";
  if (s === "confirmed" || s === "paid") return "Confirmed";
  if (s === "shipped") return "Shipped";
  if (s === "delivered") return "Delivered";
  if (s === "cancelled") return "Cancelled";
  return status || "Unknown";
};

export const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
};
