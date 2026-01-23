"use client";
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-lg p-3">
        <p className="text-[#6B7280] text-xs mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className="text-sm"
            style={{ color: entry.color }}
          >
            <span className="font-medium">{entry.name}:</span> {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }) => {
  return (
    <div className="flex items-center justify-center gap-6 mt-2">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-[#6B7280]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function OrdersViewsBarChart({ data, height = 220 }) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-[#6B7280]"
        style={{ height }}
      >
        No orders/views data available
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.orders || 0, d.views || 0))
  );
  const yAxisMax = Math.ceil(maxValue / 100) * 100 + 100;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          barCategoryGap="20%"
        >
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
            domain={[0, yAxisMax]}
            dx={-5}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
          <Bar
            dataKey="orders"
            name="Orders"
            fill="#3B82F6"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
          <Bar
            dataKey="views"
            name="Views"
            fill="#F59E0B"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
