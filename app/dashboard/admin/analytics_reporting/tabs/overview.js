"use client";
import React from "react";
import { PiClock, PiCurrencyDollar, PiFile, PiPackage, PiShoppingCart, PiUsers, PiWarning } from "react-icons/pi";

function MetricCard({ title, value, description, Icon }) {
  return (
    <div className="font-inter flex flex-col space-y-2 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
      <div className="flex items-center justify-between w-full">
        <h2 className="text-[#4A5565] text-xs/4">{title}</h2>
        {Icon}
      </div>
      <div className="flex justify-between items-center text-[#101828]">{value}</div>
      <span className="text-[10px] text-[#6A7282]">{description}</span>
    </div>
  );
}

export default function AnalyticsReportOverview(props) {
  const { metrics, isLoading, renderMetricValue } = props;

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
    if (type === "revenue" || type === "serviceCharges") {
      return renderMetricValue(type, metrics);
    }
    return renderMetricValue(type, metrics);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mt-2">
      <MetricCard
        title="Total Users"
        value={renderValue("totalUsers")}
        description="Active users (Hosts, Vendors, Guests)"
        Icon={<PiUsers className="size-4 text-[#3979D2]" />}
      />
      <MetricCard
        title="Active Registries"
        value={renderValue("activeRegistries")}
        description="Ongoing gift registries"
        Icon={<PiFile className="size-4 text-[#00A63E]" />}
      />
      <MetricCard
        title="Gifts Purchased"
        value={renderValue("giftsPurchased")}
        description="Completed purchases"
        Icon={<PiShoppingCart className="size-4 text-[#9810FA]" />}
      />
      <MetricCard
        title="Revenue Generated"
        value={renderValue("revenue")}
        description="Total transactions (minus refunds)"
        Icon={<PiCurrencyDollar className="size-4 text-[#F54900]" />}
      />
      <MetricCard
        title="Service Charges"
        value={renderValue("serviceCharges")}
        description="Platform fees earned (5%)"
        Icon={<PiCurrencyDollar className="size-4 text-[#00A63E]" />}
      />
      <MetricCard
        title="Vendor Count"
        value={renderValue("vendorCount")}
        description="Active, pending, and suspended"
        Icon={<PiPackage className="size-4 text-[#3979D2]" />}
      />
      <MetricCard
        title="Pending Approvals"
        value={renderValue("pendingApprovals")}
        description="Products, vendors, registries"
        Icon={<PiWarning className="size-4 text-[#F54900]" />}
      />
      <MetricCard
        title="Open Tickets"
        value={renderValue("openTickets")}
        description="Unresolved support tickets"
        Icon={<PiClock className="size-4 text-[#E7000B]" />}
      />
    </div>
  );
}
