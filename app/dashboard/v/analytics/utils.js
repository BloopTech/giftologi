"use client";
import React from "react";
import {
  PiCurrencyCircleDollar,
  PiShoppingCart,
  PiReceipt,
  PiTrendUp,
  PiTrendDown,
  PiCaretDown,
  PiUsers,
  PiUserPlus,
  PiArrowsClockwise,
  PiStarFill,
  PiPackage,
  PiEye,
  PiChartLine,
} from "react-icons/pi";


export const formatCurrency = (value) => {
  if (value === null || typeof value === "undefined") return "GHS0.00";
  const num = Number(value);
  if (!Number.isFinite(num)) return "GHS0.00";
  return `GHS${num.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatNumber = (value) => {
  if (value === null || typeof value === "undefined") return "0";
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString();
};

export const CATEGORY_COLORS = [
  "#8B5CF6",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

export function StatCard({
  icon: Icon,
  iconColor,
  title,
  value,
  change,
  changeType,
  subtitle,
}) {
  const isPositive = changeType === "positive";
  const isNegative = changeType === "negative";

  return (
    <div className="flex flex-col space-y-2 p-4 bg-white rounded-xl border border-[#E5E7EB]">
      <div className="flex items-center justify-between">
        <span className="text-[#6B7280] text-sm font-brasley-medium">{title}</span>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex flex-col">
        <span className="text-[#111827] text-2xl font-semibold font-brasley-medium">
          {value}
        </span>
        {change && (
          <div className="flex items-center gap-1 mt-1">
            {isPositive && <PiTrendUp className="w-4 h-4 text-[#10B981]" />}
            {isNegative && <PiTrendDown className="w-4 h-4 text-[#EF4444]" />}
            <span
              className={`text-xs font-medium ${
                isPositive
                  ? "text-[#10B981]"
                  : isNegative
                    ? "text-[#EF4444]"
                    : "text-[#6B7280]"
              }`}
            >
              {change}
            </span>
            {subtitle && (
              <span className="text-[#6B7280] text-xs ml-1">{subtitle}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CustomerInsightCard({ icon: Icon, title, value, change, changeType }) {
  const isPositive = changeType === "positive";
  const isNegative = changeType === "negative";

  return (
    <div className="flex items-center justify-between py-3 border-b border-[#E5E7EB] last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#F3F4F6] rounded-lg">
          <Icon className="w-4 h-4 text-[#6B7280]" />
        </div>
        <div>
          <p className="text-[#6B7280] text-xs">{title}</p>
          <p className="text-[#111827] text-lg font-semibold">{value}</p>
        </div>
      </div>
      {change && (
        <div className="flex items-center gap-1">
          {isPositive && <PiTrendUp className="w-4 h-4 text-[#10B981]" />}
          {isNegative && <PiTrendDown className="w-4 h-4 text-[#EF4444]" />}
          <span
            className={`text-sm font-medium ${
              isPositive
                ? "text-[#10B981]"
                : isNegative
                  ? "text-[#EF4444]"
                  : "text-[#6B7280]"
            }`}
          >
            {change}
          </span>
        </div>
      )}
    </div>
  );
}

export function TopProductRow({ product }) {
  return (
    <div className="p-4 border-b border-[#E5E7EB] last:border-b-0 hover:bg-[#F9FAFB]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[#6B7280] text-sm font-medium">
            #{product.rank}
          </span>
          <div>
            <p className="text-[#111827] text-sm font-semibold">
              {product.name}
            </p>
            <p className="text-[#6B7280] text-xs">
              {product.orders} orders • {formatNumber(product.views)} views
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[#10B981] text-base font-semibold">
            {formatCurrency(product.totalSales)}
          </p>
          <p className="text-[#6B7280] text-xs">Total Sales</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="flex items-center gap-2">
          <PiShoppingCart className="w-4 h-4 text-[#6B7280]" />
          <div>
            <p className="text-[#6B7280] text-xs">Orders</p>
            <p className="text-[#111827] text-sm font-medium">
              {product.orders}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PiEye className="w-4 h-4 text-[#6B7280]" />
          <div>
            <p className="text-[#6B7280] text-xs">Views</p>
            <p className="text-[#111827] text-sm font-medium">
              {formatNumber(product.views)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PiChartLine className="w-4 h-4 text-[#6B7280]" />
          <div>
            <p className="text-[#6B7280] text-xs">Conversion</p>
            <p className="text-[#111827] text-sm font-medium">
              {product.conversion}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PiCurrencyCircleDollar className="w-4 h-4 text-[#6B7280]" />
          <div>
            <p className="text-[#6B7280] text-xs">Avg Price</p>
            <p className="text-[#111827] text-sm font-medium">
              {formatCurrency(product.avgPrice)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FooterStatCard({
  bgColor,
  icon: Icon,
  iconColor,
  title,
  value,
  extra,
  titleColor,
  valueColor,
  border,
}) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl ${bgColor} ${border}`}>  
      <div>
        <p className={`text-xs ${titleColor}`}>{title}</p>
        <div className="flex items-center gap-2">
          <p className={`${valueColor} text-2xl font-semibold`}>{value}</p>
          {extra}
        </div>
      </div>
      <div className={`p-3 rounded-full bg-white/20`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
    </div>
  );
}
