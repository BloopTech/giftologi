"use client";
import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const formatCurrency = (value) => {
  if (value === null || typeof value === "undefined") return "GHS0.00";
  const num = Number(value);
  if (!Number.isFinite(num)) return "GHS0.00";
  return `GHS${num.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-lg p-3">
        <p className="text-[#111827] text-sm font-medium">{data.name}</p>
        <p className="text-[#6B7280] text-xs mt-1">
          {formatCurrency(data.value)} ({data.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

export default function SalesPieChart({ data, height = 280 }) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-[#6B7280]"
        style={{ height }}
      >
        No sales data available
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6" style={{ minHeight: height }}>
      {/* Pie Chart */}
      <div className="relative w-48 h-48 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[#6B7280] text-xs">Total</span>
          <span className="text-[#111827] text-sm font-semibold">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-[#6B7280] truncate">{item.name}</span>
              <span className="text-xs text-[#9CA3AF]">{item.percentage}%</span>
            </div>
            <span className="text-xs font-medium text-[#111827] ml-auto whitespace-nowrap">
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
