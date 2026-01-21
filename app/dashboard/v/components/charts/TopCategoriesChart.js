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
  Cell,
} from "recharts";

const COLORS = ["#8B5CF6", "#F59E0B", "#10B981", "#3B82F6", "#EC4899"];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-[#111827] mb-1">{label}</p>
        <p className="text-sm text-[#6B7280]">
          Revenue:{" "}
          <span className="font-semibold" style={{ color: payload[0].payload.fill }}>
            GHS {payload[0].value.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

export default function TopCategoriesChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[#9CA3AF]">
        No category data available.
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "#6B7280" }}
          dy={5}
          interval={0}
          angle={-15}
          textAnchor="end"
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          tickFormatter={(value) => {
            if (value >= 1000) {
              return `${(value / 1000).toFixed(0)}k`;
            }
            return value;
          }}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.05)" }} />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={50}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
