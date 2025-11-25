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
  PiShoppingBagOpen,
  PiShoppingCart,
  PiStorefront,
  PiTicket,
  PiTrendUp,
  PiWarning,
} from "react-icons/pi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/Dialog";
import AddStaffDialog from "./components/AddStaffDialog";
import { useRouter } from "next/navigation";
import { overviewModules } from "./components/utils";
import SearchEngine from "./components/searchengine";

export default function SuperAdminDashboardContent() {
  const {
    currentAdmin,
    metrics,
    loadingMetrics,
    addStaffOpen,
    setAddStaffOpen,
  } = useDashboardContext() || {};
  const router = useRouter();

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
      return <div className="h-4 w-10 rounded bg-[#E5E7EB] animate-pulse" />;
    }
    return (
      <p className="text-[#0A0A0A] font-medium font-poppins text-sm">
        {formatCount(value)}
      </p>
    );
  };

  const renderMetricCurrency = (value) => {
    if (isLoadingMetrics) {
      return <div className="h-4 w-20 rounded bg-[#E5E7EB] animate-pulse" />;
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
      {role === "super_admin" || role === "operations_manager_admin" ? (
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
              {renderMetricCount(metrics?.totalOrders ?? 0)}
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
      ) : null}

      {/* Quick Access */}
      {role === "operations_manager_admin" ? null : (
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
            {role === "customer_support_admin" ? (
              <div className="border border-[#AAE43E] flex flex-col space-y-2 rounded-md bg-white p-2">
                <div className="flex space-x-4 items-start">
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center">
                      <span>{renderMetricCount(metrics?.openTickets)}</span>
                      <PiTicket className="size-4 text-[#AA1BC6]" />
                    </div>
                    <span className="text-xs font-poppins">Open Tickets</span>
                    <div className="border-t-[2px] border-[#AA1BC6]" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center">
                      <span>
                        {renderMetricCount(metrics?.pendingEscalations)}
                      </span>
                      <PiWarning className="size-4 text-[#C52721]" />
                    </div>
                    <span className="text-xs font-poppins">Escalations</span>
                    <div className="border-t-[2px] border-[#FF5C57]" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[#717182] text-xs/4 font-poppins">
                    Review and manage tickets and escalations
                  </span>
                  <PiArrowRight className="size-4 text-[#3979D2]" />
                </div>
              </div>
            ) : (
              <div className="border border-[#AAE43E] flex flex-col space-y-2 rounded-md bg-white p-2">
                <p className="font-inter text-xs text-[#0A0A0A] font-medium">
                  {role === "finance_admin"
                    ? "Recent Transactions"
                    : "Access to all cards and KPIs"}
                </p>
                <span className="text-[#717182] text-xs/4 font-poppins">
                  {role === "finance_admin"
                    ? "Displays recent transactions, pending payouts, and refund requests"
                    : "Monitor real-time platform metrics and performance insights."}
                </span>
                <div>
                  <button className="text-[10px] bg-[#6EA30B] text-white border border-[#6EA30B] hover:bg-white hover:text-[#6EA30B] rounded-full cursor-pointer px-4 py-1 flex items-center justify-center font-poppins font-medium">
                    {role === "finance_admin"
                      ? "View Transactions"
                      : "Full Access"}
                  </button>
                </div>
              </div>
            )}
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
                  ? "Receive and review incoming customer support tickets"
                  : "Set up staff profiles with custom roles and permissions."}
              </span>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    role === "super_admin" ? setAddStaffOpen(true) : null;
                  }}
                  className="text-[10px] cursor-pointer bg-[#3979D2] text-white border border-[#3979D2] hover:bg-white hover:text-[#3979D2] rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium"
                >
                  {role === "finance_admin"
                    ? "Manage Payouts"
                    : role === "operations_manager_admin"
                    ? "Review Requests"
                    : role === "customer_support_admin"
                    ? "New Ticket"
                    : "Add Staff"}
                </button>
                <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-base font-semibold text-[#0A0A0A]">
                        Add New Staff Member
                      </DialogTitle>
                    </DialogHeader>
                    <AddStaffDialog onClose={() => setAddStaffOpen(false)} />
                  </DialogContent>
                </Dialog>
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
                  ? "Manage payout requests awaiting approval."
                  : role === "operations_manager_admin"
                  ? "View and manage product catalog and inventory."
                  : role === "customer_support_admin"
                  ? "Search by customer email, registry, or order number."
                  : "Grant or restrict access based on roles and responsibilities."}
              </span>
              <div>
                <button
                  className="text-[10px] cursor-pointer bg-white text-[#3979D2] border border-[#3979D2] hover:bg-[#3979D2] hover:text-white rounded-full px-4 py-1 flex items-center justify-center font-poppins font-medium"
                  onClick={() => {
                    role === "super_admin"
                      ? router.push("/dashboard/admin/roles")
                      : null;
                  }}
                >
                  {role === "finance_admin"
                    ? "Manage Payouts"
                    : role === "operations_manager_admin"
                    ? "Manage Products"
                    : role === "customer_support_admin"
                    ? "View Tickets"
                    : "Manage Roles"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal Search */}
      <SearchEngine />

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
                  {metrics?.topVendorName ? `"${metrics.topVendorName}"` : "—"}
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
                    : "—"}
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
          {overviewModules?.length
            ? (role === "super_admin"
                ? overviewModules
                : overviewModules.filter(({ buttons }) => {
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
                        (btn.name === "Customer Service" ||
                          btn.name === "Customer Support")
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
