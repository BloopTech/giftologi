"use client";
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const formatCurrency = (value) => {
  if (value === null || typeof value === "undefined") return "GHS0";
  const num = Number(value);
  if (!Number.isFinite(num)) return "GHS0";
  return `GHS${num.toLocaleString("en-GH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-lg p-3">
        <p className="text-[#6B7280] text-xs mb-1">{label}</p>
        <p className="text-[#111827] text-sm font-semibold">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function RevenueLineChart({ data, height = 220 }) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-[#6B7280]"
        style={{ height }}
      >
        No revenue data available
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue || 0));
  const yAxisMax = Math.ceil(maxRevenue / 1000) * 1000 + 1000;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E5E7EB"
            vertical={false}
          />
          <XAxis
            dataKey="week"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7280", fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7280", fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            domain={[0, yAxisMax]}
            dx={-5}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#revenueGradient)"
            dot={{
              r: 4,
              fill: "#fff",
              stroke: "#10B981",
              strokeWidth: 2,
            }}
            activeDot={{
              r: 6,
              fill: "#10B981",
              stroke: "#fff",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
