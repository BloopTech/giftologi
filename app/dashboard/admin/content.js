"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/Select";
import { Search } from "lucide-react";
import React from "react";
import { useDashboardContext } from "./context";
import {
  PiArrowRight,
  PiCardholder,
  PiChartBar,
  PiFile,
  PiFolder,
  PiInfo,
  PiLog,
  PiPackage,
  PiReceipt,
  PiShoppingBagOpen,
  PiShoppingCart,
  PiStorefront,
  PiTicket,
  PiTrendUp,
  PiUser,
  PiWarning,
} from "react-icons/pi";

const modules = [
  {
    id: 1,
    name: "Manage Roles",
    description: "Create, assign, or revoke staff roles and permissions",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-[#3979D2] text-white border border-[#3979D2] hover:bg-white hover:text-[#3979D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiUser,
      bottom: PiArrowRight,
    },
  },
  {
    id: 2,
    name: "Open Registry List",
    description: "View and manage all registries on the platform",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-[#3979D2] text-white border border-[#3979D2] hover:bg-white hover:text-[#3979D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Operations",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiShoppingBagOpen,
      bottom: PiArrowRight,
    },
  },
  {
    id: 3,
    name: "View Requests (Vendor Approvals)",
    description: "Approve or reject vendor applications",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-[#3979D2] text-white border border-[#3979D2] hover:bg-white hover:text-[#3979D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Operations",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiStorefront,
      bottom: PiArrowRight,
    },
  },
  {
    id: 4,
    name: "Manage Products",
    description: "View and manage product catalog and inventory",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-[#3979D2] text-white border border-[#3979D2] hover:bg-white hover:text-[#3979D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Operations",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiPackage,
      bottom: PiArrowRight,
    },
  },
  {
    id: 5,
    name: "View Transactions",
    description: "View and manage all registries on the platform",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-[#3979D2] text-white border border-[#3979D2] hover:bg-white hover:text-[#3979D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Operations",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiShoppingBagOpen,
      bottom: PiArrowRight,
    },
  },
  {
    id: 6,
    name: "View Payouts (Approve Payouts)",
    description: "Approve or reject vendor applications",
    buttons: [
      {
        name: "Finance",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiStorefront,
      bottom: PiArrowRight,
    },
  },
  {
    id: 7,
    name: "Generate Reports",
    description: "Export summary reports (PDF/CSV)",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-[#3979D2] text-white border border-[#3979D2] hover:bg-white hover:text-[#3979D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },

      {
        name: "Operations",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },

      {
        name: "Finance",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },

      {
        name: "Customer Service",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiReceipt,
      bottom: PiArrowRight,
    },
  },
  {
    id: 8,
    name: "View Activity Log",
    description: "Track admin actions, approvals, and suspensions",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-[#3979D2] text-white border border-[#3979D2] hover:bg-white hover:text-[#3979D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Operations",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiLog,
      bottom: PiArrowRight,
    },
  },
  {
    id: 9,
    name: "Manage Support Tickets",
    description: "Assign, escalate, or close support tickets",
    buttons: [
      {
        name: "Customer Support",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Disabled",
        color:
          "text-[8px] cursor-pointer bg-white text-[#D4183D] border border-[#D4183D] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiInfo,
    },
  },
  {
    id: 10,
    name: "API Documentation",
    description: "View database schema, endpoints, and system behaviour",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-[#3979D2] text-white border border-[#3979D2] hover:bg-white hover:text-[#3979D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiFile,
      bottom: PiArrowRight,
    },
  },
  {
    id: 11,
    name: "Analytics & Reporting",
    description: "Track platform performance, vendors, and user engagement",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-[#3979D2] text-white border border-[#3979D2] hover:bg-white hover:text-[#3979D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Operations",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Finance",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiChartBar,
      bottom: PiArrowRight,
    },
  },
  {
    id: 12,
    name: "Content & Policy Pages",
    description: "Manage static pages, email templates, and FAQs",
    buttons: [
      {
        name: "Super Admin",
        color:
          "text-[8px] cursor-pointer bg-[#3979D2] text-white border border-[#3979D2] hover:bg-white hover:text-[#3979D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
      {
        name: "Customer Support",
        color:
          "text-[8px] cursor-pointer bg-white text-[#686868] border border-[#D2D2D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium",
      },
    ],
    icons: {
      top: PiFolder,
      bottom: PiArrowRight,
    },
  },
];

export default function SuperAdminDashboardContent() {
  const { currentAdmin, metrics, loadingMetrics } = useDashboardContext() || {};

  const role = currentAdmin?.role || "super_admin";

  const formatCount = (value) => {
    if (value === null || typeof value === "undefined") return "—";
    const num = Number(value);
    if (Number.isNaN(num)) return "—";
    return num.toLocaleString();
  };

  const formatCurrency = (value) => {
    if (value === null || typeof value === "undefined") return "GHS —";
    const num = Number(value);
    if (Number.isNaN(num)) return "GHS —";
    return `GHS ${num.toLocaleString("en-GH", {
      maximumFractionDigits: 0,
    })}`;
  };

  const isLoadingMetrics = !!loadingMetrics;

  const renderMetricCount = (value) => {
    if (isLoadingMetrics) {
      return (
        <div className="h-4 w-10 rounded bg-[#E5E7EB] animate-pulse" />
      );
    }
    return (
      <p className="text-[#0A0A0A] font-medium font-poppins text-sm">
        {formatCount(value)}
      </p>
    );
  };

  const renderMetricCurrency = (value) => {
    if (isLoadingMetrics) {
      return (
        <div className="h-4 w-20 rounded bg-[#E5E7EB] animate-pulse" />
      );
    }
    return (
      <p className="text-sm font-medium text-[#0A0A0A] font-inter">
        {formatCurrency(value)}
      </p>
    );
  };

  return (
    <div className="flex flex-col space-y-4 w-full">
      <h1 className="text-[#0A0A0A] font-medium font-inter">Overview</h1>
      {/* Card Overview */}
      <div className="flex space-x-8 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
        {/* Active Registries */}
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Active Registries
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.totalRegistries)}
            <PiShoppingBagOpen className="size-4 text-[#6EA30B]" />
          </div>
          <div className="border-t-[2px] border-[#6EA30B]" />
          <p className="text-[#6A7282] text-[10px] font-poppins">
            Total number of active registries
          </p>
        </div>
        {/* Pending Vendor Requests */}
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Pending Vendor Requests
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.pendingVendorRequests)}
            <PiStorefront className="size-4 text-[#CB7428]" />
          </div>
          <div className="border-t-[2px] border-[#FFCA57]" />
          <p className="text-[#6A7282] text-[10px] font-poppins">
            Vendor applications awaiting approval
          </p>
        </div>
        {/* Total Orders */}
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Total Orders
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.totalOrders)}
            <PiShoppingCart className="size-4 text-[#286AD4]" />
          </div>
          <div className="border-t-[2px] border-[#5797FF]" />
          <p className="text-[#6A7282] text-[10px] font-poppins">
            All orders processed on the platform
          </p>
        </div>
        {/* Open Tickets */}
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Open Tickets
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.openTickets)}
            <PiTicket className="size-4 text-[#AA1BC6]" />
          </div>
          <div className="border-t-[2px] border-[#E357FF]" />
          <p className="text-[#6A7282] text-[10px] font-poppins">
            Active customer support tickets
          </p>
        </div>
        {/* Pending Escalations */}
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Pending Escalations
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.pendingEscalations)}
            <PiWarning className="size-4 text-[#C52721]" />
          </div>
          <div className="border-t-[2px] border-[#FF5C57]" />
          <p className="text-[#6A7282] text-[10px] font-poppins">
            Support tickets awaiting higher-level review
          </p>
        </div>
      </div>

      {/* Quick Access */}
      <div className="flex flex-col space-y-2 w-full rounded-xl border border-[#AAE43E] p-4 bg-[#EAF9D4]">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
            Quick Access
          </h1>
          <span className="text-[#717182] text-xs/4 font-poppins">
            Jump straight to your most frequently managed sections.
          </span>
        </div>
        {/* Cards */}
        <div className="flex space-x-4">
          {/* Full Access */}
          <div className="border border-[#AAE43E] flex flex-col space-y-2 rounded-md bg-white p-2">
            <p className="font-inter text-xs text-[#0A0A0A] font-medium">
              {role === "finance_admin"
                ? "Recent Transactions"
                : role === "operations_manager_admin"
                ? "Open Registry List"
                : role === "customer_support_admin"
                ? "Open Tickets & Escalations"
                : "Access to all cards and KPIs"}
            </p>
            <span className="text-[#717182] text-xs/4 font-poppins">
              {role === "finance_admin"
                ? "Displays recent transactions, payouts, and refund activity."
                : role === "operations_manager_admin"
                ? "Quickly access all registries on the platform."
                : role === "customer_support_admin"
                ? "Review and manage incoming tickets and escalations."
                : "Monitor real-time platform metrics and performance insights."}
            </span>
            <div>
              <button className="text-[10px] bg-[#6EA30B] text-white border border-[#6EA30B] hover:bg-white hover:text-[#6EA30B] rounded-full cursor-pointer px-4 py-1 flex items-center justify-center font-poppins font-medium">
                {role === "finance_admin"
                  ? "View Transactions"
                  : role === "operations_manager_admin"
                  ? "Open List"
                  : role === "customer_support_admin"
                  ? "View Tickets"
                  : "Full Access"}
              </button>
            </div>
          </div>

          {/* Add Staff */}
          <div className="border border-[#AAE43E] flex flex-col space-y-2 rounded-md bg-white p-2">
            <p className="font-inter text-xs text-[#0A0A0A] font-medium">
              {role === "finance_admin"
                ? "Approve Payouts"
                : role === "operations_manager_admin"
                ? "View Requests (Vendor Approvals)"
                : role === "customer_support_admin"
                ? "Receive Support Ticket"
                : "Create new staff accounts"}
            </p>
            <span className="text-[#717182] text-xs/4 font-poppins">
              {role === "finance_admin"
                ? "Manage payout requests awaiting approval."
                : role === "operations_manager_admin"
                ? "Approve or reject vendor applications."
                : role === "customer_support_admin"
                ? "Log and triage incoming customer support tickets."
                : "Set up staff profiles with custom roles and permissions."}
            </span>
            <div>
              <button className="text-[10px] cursor-pointer bg-[#3979D2] text-white border border-[#3979D2] hover:bg-white hover:text-[#3979D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium">
                {role === "finance_admin"
                  ? "Add Staff"
                  : role === "operations_manager_admin"
                  ? "Review Requests"
                  : role === "customer_support_admin"
                  ? "New Ticket"
                  : "Add Staff"}
              </button>
            </div>
          </div>
          {/* Manage Roles */}
          <div className="border border-[#AAE43E] flex flex-col space-y-2 rounded-md bg-white p-2">
            <p className="font-inter text-xs text-[#0A0A0A] font-medium">
              {role === "finance_admin"
                ? "Download Reports"
                : role === "operations_manager_admin"
                ? "Manage Products"
                : role === "customer_support_admin"
                ? "Search & Filter"
                : "Assign or revoke permissions"}
            </p>
            <span className="text-[#717182] text-xs/4 font-poppins">
              {role === "finance_admin"
                ? "Export summary reports for payouts and performance."
                : role === "operations_manager_admin"
                ? "View and manage product catalog and inventory."
                : role === "customer_support_admin"
                ? "Search by customer email, registry, or order number."
                : "Grant or restrict access based on roles and responsibilities."}
            </span>
            <div>
              <button className="text-[10px] cursor-pointer bg-white text-[#3979D2] border border-[#3979D2] hover:bg-[#3979D2] hover:text-white rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium">
                {role === "finance_admin"
                  ? "View Reports"
                  : role === "operations_manager_admin"
                  ? "Manage Products"
                  : role === "customer_support_admin"
                  ? "Search"
                  : "Manage Roles"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Universal Search */}
      <div className="flex flex-col p-4 border border-[#D6D6D6] rounded-xl bg-white w-full space-y-4">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
            Universal Search
          </h1>
          <span className="text-[#717182] text-xs/4 font-poppins">
            Get a quick overview of registry and vendor performance at a glance.
          </span>
        </div>
        <div className="flex space-x-4 items-center">
          <div className="w-[50%]">
            <input
              type="text"
              placeholder="Search all users here"
              className="border border-[#D6D6D6] rounded-full py-3 px-4 text-xs bg-white w-full"
            />
          </div>
          <div className="w-[20%]">
            <Select
              value="All Types"
              onValueChange={(value) => console.log(value)}
              disabled={false}
              required
            >
              <SelectTrigger className={``}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Types">All Types</SelectItem>
                <SelectItem value="Vendor">Vendor</SelectItem>
                <SelectItem value="Host">Host</SelectItem>
                <SelectItem value="Guest">Guest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[20%]">
            <Select
              value="All Status"
              onValueChange={(value) => console.log(value)}
              disabled={false}
              required
            >
              <SelectTrigger className={``}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Status">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[10%]">
            <button className="text-[10px] space-x-2 bg-[#3979D2] text-white border border-[#3979D2] hover:bg-white hover:text-[#3979D2] rounded-full cursor-pointer px-4 py-1 flex items-center justify-center font-poppins font-medium">
              <Search className="size-4" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* Performance Snapshot */}
      <div className="flex flex-col rounded-xl w-full space-y-4">
        <div className="flex w-full justify-between">
          <div className="flex flex-col">
            <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
              Performance Snapshot
            </h1>
            <span className="text-[#717182] text-xs/4 font-poppins">
              Quickly locate registries, users, vendors, or orders
            </span>
          </div>
          <div className="flex justify-end w-[15%]">
            <Select
              value="This Week"
              onValueChange={(value) => console.log(value)}
              disabled={false}
              required
            >
              <SelectTrigger className={``}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="This Week">This Week</SelectItem>
                <SelectItem value="This Month">This Month</SelectItem>
                <SelectItem value="This Year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Cards */}
        <div className="grid grid-cols-4 gap-4">
          {/* Total Purchases */}
          <div className="border border-[#8BB9FB] rounded-xl bg-[#EDF4FF] py-4 px-2 flex flex-col space-y-2">
            <div className="flex justify-between items-center px-2">
              <p className="text-xs font-medium text-[#1D5EB9] font-inter">
                Total Purchases
              </p>
              <PiTrendUp className="size-6 text-[#1D5EB9]" />
            </div>
            <div className="border border-[#8BB9FB] rounded-md bg-white p-2 flex flex-col space-y-2">
              {renderMetricCurrency(metrics?.totalPurchases)}
              <div className="border-t border-[#717182]" />
              <span className="text-[#717182] text-[10px] font-poppins">
                Aggregate order amount (GHS)
              </span>
            </div>
          </div>
          {/* Vendor Payouts */}
          <div className="border border-[#8BB9FB] rounded-xl bg-[#EDF4FF] py-4 px-2 flex flex-col space-y-2">
            <div className="flex justify-between items-center px-2">
              <p className="text-xs font-medium text-[#1D5EB9] font-inter">
                Vendor Payouts
              </p>
              <PiCardholder className="size-6 text-[#1D5EB9]" />
            </div>
            <div className="border border-[#8BB9FB] rounded-md bg-white p-2 flex flex-col space-y-2">
              {renderMetricCurrency(metrics?.vendorPayouts)}
              <div className="border-t border-[#717182]" />
              <span className="text-[#717182] text-[10px] font-poppins">
                Amount disbursed to vendors
              </span>
            </div>
          </div>
          {/* Top Performing Vendor */}
          <div className="border border-[#8BB9FB] rounded-xl bg-[#EDF4FF] py-4 px-2 flex flex-col space-y-2">
            <div className="flex justify-between items-center px-2">
              <p className="text-xs font-medium text-[#1D5EB9] font-inter">
                Top Performing Vendor
              </p>
              <PiStorefront className="size-6 text-[#1D5EB9]" />
            </div>
            <div className="border border-[#8BB9FB] rounded-md bg-white p-2 flex flex-col space-y-2">
              {isLoadingMetrics ? (
                <div className="h-4 w-24 rounded bg-[#E5E7EB] animate-pulse" />
              ) : (
                <p className="text-sm font-medium text-[#0A0A0A] font-inter">
                  {metrics?.topVendorName
                    ? `"${metrics.topVendorName}"`
                    : "\"Eya Naturals\""}
                </p>
              )}
              <div className="border-t border-[#717182]" />
              <span className="text-[#717182] text-[10px] font-poppins">
                Vendor with highest sales volume
              </span>
            </div>
          </div>
          {/* Popular Registry */}
          <div className="border border-[#8BB9FB] rounded-xl bg-[#EDF4FF] py-4 px-2 flex flex-col space-y-2">
            <div className="flex justify-between items-center px-2">
              <p className="text-xs font-medium text-[#1D5EB9] font-inter">
                Popular Registry
              </p>
              <PiShoppingBagOpen className="size-6 text-[#1D5EB9]" />
            </div>
            <div className="border border-[#8BB9FB] rounded-md bg-white p-2 flex flex-col space-y-2">
              {isLoadingMetrics ? (
                <div className="h-4 w-24 rounded bg-[#E5E7EB] animate-pulse" />
              ) : (
                <p className="text-sm font-medium text-[#0A0A0A] font-inter">
                  {metrics?.popularRegistryType
                    ? `"${metrics.popularRegistryType}"`
                    : "\"Wedding\""}
                </p>
              )}
              <div className="border-t border-[#717182]" />
              <span className="text-[#717182] text-[10px] font-poppins">
                Registry type with highest activity
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* All Available Modules */}
      <div className="flex flex-col rounded-xl w-full space-y-4">
        <div className="flex flex-col w-full">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
            All Available Modules
          </h1>
          <span className="text-[#717182] text-xs/4 font-poppins">
            Access and manage all key modules available to you and your role.
          </span>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-3 gap-4 w-full">
          {modules?.length
            ? (role === "super_admin"
                ? modules
                : modules.filter(({ buttons }) => {
                    const labelMap = {
                      super_admin: "Super Admin",
                      finance_admin: "Finance",
                      operations_manager_admin: "Operations",
                      customer_support_admin: "Customer Support",
                    };
                    const label = labelMap[role];
                    if (!label) return false;
                    return (buttons || []).some((btn) => {
                      if (btn.name === label) return true;
                      if (
                        role === "customer_support_admin" &&
                        (btn.name === "Customer Service" || btn.name === "Customer Support")
                      ) {
                        return true;
                      }
                      return false;
                    });
                  })
              )?.map(({ id, name, description, buttons, icons }) => {
                return (
                  <div
                    key={id}
                    className="flex border bg-[#FCF2CB] border-[#F1C29A] rounded-xl overflow-hidden"
                  >
                    <div className="flex flex-col space-y-2 border-r w-[90%] border-[#F1C29A] px-2 py-4 rounded-r-md bg-white">
                      <h1 className="font-inter text-[#0A0A0A] text-sm font-medium">
                        {name}
                      </h1>
                      <span className="text-[#717182] text-xs/4 font-poppins h-[2rem]">
                        {description}
                      </span>

                      <div className="flex gap-2 flex-wrap w-full">
                        {buttons?.length
                          ? buttons?.map(({ name, color }) => {
                              return (
                                <button key={name} className={color}>
                                  {name}
                                </button>
                              );
                            })
                          : null}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between px-2 py-4">
                      {icons?.top ? (
                        <icons.top className="size-4 text-[#CB7428]" />
                      ) : null}
                      {icons?.bottom ? (
                        <icons.bottom className="size-4 text-[#CB7428]" />
                      ) : null}
                    </div>
                  </div>
                );
              })
            : null}
        </div>
      </div>
    </div>
  );
}
