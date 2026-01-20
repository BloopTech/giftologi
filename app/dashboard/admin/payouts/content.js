"use client";
import { Search, X } from "lucide-react";
import React from "react";
import {
  PiInfo,
  PiCardholder,
  PiCheckCircle,
  PiWarning,
  PiShoppingBagOpen,
  PiCashRegister,
  PiFolderStar,
} from "react-icons/pi";
import { usePayoutsContext } from "./context";
import PayoutsTable from "./PayoutsTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/Select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/Dialog";

export default function PayoutsContent() {
  const {
    metrics,
    loadingMetrics,
    searchTerm,
    setSearchTerm,
    setPayoutsPage,
    statusFilter,
    setStatusFilter,
  } = usePayoutsContext() || {};

  const [search, setSearch] = React.useState(searchTerm || "");
  const [rulesOpen, setRulesOpen] = React.useState(false);
  const isLoadingMetrics = !!loadingMetrics;

  const formatCount = (value) => {
    if (value === null || typeof value === "undefined") return "—";
    const num = Number(value);
    if (Number.isNaN(num)) return "—";
    return num.toLocaleString();
  };

  const formatCurrency = (value) => {
    if (value === null || typeof value === "undefined") return "GHS 0.00";
    const num = Number(value);
    if (!Number.isFinite(num)) return "GHS 0.00";
    return (
      "GHS " +
      num.toLocaleString("en-GH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const renderMetricValue = (type) => {
    if (isLoadingMetrics) {
      return <div className="h-4 w-16 rounded bg-[#E5E7EB] animate-pulse" />;
    }

    if (type === "pendingAmount") {
      return (
        <p className="text-[#0A0A0A] font-medium font-poppins text-sm">
          {formatCurrency(metrics?.totalPendingAmount)}
        </p>
      );
    }

    if (type === "pending") {
      return (
        <p className="text-[#0A0A0A] font-medium font-poppins text-sm">
          {formatCount(metrics?.pendingPayouts)}
        </p>
      );
    }

    if (type === "approved") {
      return (
        <p className="text-[#0A0A0A] font-medium font-poppins text-sm">
          {formatCount(metrics?.approvedPayouts)}
        </p>
      );
    }

    return (
      <p className="text-[#0A0A0A] font-medium font-poppins text-sm">
        {formatCount(metrics?.totalPayouts)}
      </p>
    );
  };

  const handleSearch = () => {
    if (!setSearchTerm || !setPayoutsPage) return;
    setSearchTerm(search);
    setPayoutsPage(0);
  };

  return (
    <div className="flex flex-col space-y-4 w-full mb-[2rem]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
            Vendor Payout Management
          </h1>
          <span className="text-[#717182] text-xs/4 font-poppins">
            Review and approve vendor payouts based on completed orders.
          </span>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="px-4 py-2 space-x-2 flex items-center justify-center border border-[#427ED3] text-[#427ED3] bg-white text-xs rounded-full cursor-pointer hover:text-white hover:bg-[#427ED3]"
          >
            <PiInfo className="size-4" />
            <span>Payout Rules</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#B5CDFB] bg-[#EEF4FF] px-4 py-3 flex items-start gap-2">
        <PiInfo className="mt-0.5 size-4 text-[#3979D2]" />
        <div className="flex flex-col">
          <p className="text-xs font-medium text-[#427ED3]">
            Dual Approval Required
          </p>
          <p className="text-[11px] text-[#427ED3]">
            Every payout must be approved by both Finance and Super Admin. Only
            delivered orders are eligible, and payout amounts reflect the
            vendor share after commission.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Pending Payouts
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricValue("pending")}
            <PiShoppingBagOpen className="size-4 text-[#427ED3]" />
          </div>
          <div className="border-t-[2px] border-[#7DADF2]" />
        </div>

        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Approved Payouts
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricValue("approved")}
            <PiCashRegister className="size-4 text-[#6EA30B]" />
          </div>
          <div className="border-t-[2px] border-[#CBED8E]" />
        </div>

        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Total Pending Amount
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricValue("pendingAmount")}
            <PiFolderStar className="size-4 text-[#CB7428]" />
          </div>
          <div className="border-t-[2px] border-[#FFCA57]" />
        </div>

        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Total Payout
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricValue("total")}
            <PiCardholder className="size-4 text-[#286AD4]" />
          </div>
          <div className="border-t-[2px] border-[#5797FF]" />
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-2 md:flex-row md:items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 rounded-full border border-[#D6D6D6] bg-white px-4 py-2.5">
            <Search className="size-4 text-[#717182]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={"Search by vendor name or payout ID"}
              className="w-full bg-transparent outline-none text-xs text-[#0A0A0A] placeholder:text-[#B0B7C3]"
            />
          </div>
        </div>
        <div className="w-full md:w-[20%]">
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) => {
              setStatusFilter?.(value);
              setPayoutsPage?.(0);
            }}
          >
            <SelectTrigger className={``}>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="awaiting_finance">Awaiting Finance</SelectItem>
              <SelectItem value="awaiting_super_admin">
                Awaiting Super Admin
              </SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="w-full md:w-auto px-8 py-2.5 inline-flex items-center justify-center rounded-full bg-primary text-white text-xs font-medium border border-primary cursor-pointer hover:bg-white hover:text-primary"
        >
          Search
        </button>
      </div>

      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
                Payout Rules &amp; Configuration
              </DialogTitle>
              <DialogDescription className="text-xs text-[#717182]">
                System rules for vendor payment processing.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F97373] text-white hover:bg-[#EF4444] cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </DialogClose>
          </DialogHeader>
          <div className="mt-3 text-xs text-[#0A0A0A] space-y-4">
            <div>
              <p className="font-semibold mb-1">Eligibility Criteria</p>
              <ul className="list-disc pl-4 space-y-1 text-[#4B5563]">
                <li>
                  Only <span className="font-semibold">Delivered</span> orders
                  {" "}
                  count toward payout eligibility.
                </li>
                <li>
                  Service fee (5%) deducted from total sales before payout.
                </li>
                <li>Minimum payout threshold: GHS 100.</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold mb-1">Processing Schedule</p>
              <ul className="list-disc pl-4 space-y-1 text-[#4B5563]">
                <li>
                  Payouts processed weekly or monthly (configurable in admin
                  settings).
                </li>
              </ul>
            </div>

            <div>
              <p className="font-semibold mb-1">Payout Methods Supported</p>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="inline-flex items-center rounded-full border border-[#D6D6D6] bg-[#F9FAFB] px-3 py-1 text-[11px] text-[#111827]">
                  Bank Transfer
                </span>
                <span className="inline-flex items-center rounded-full border border-[#D6D6D6] bg-[#F9FAFB] px-3 py-1 text-[11px] text-[#111827]">
                  MTN MoMo
                </span>
                <span className="inline-flex items-center rounded-full border border-[#D6D6D6] bg-[#F9FAFB] px-3 py-1 text-[11px] text-[#111827]">
                  Telecel Cash
                </span>
                <span className="inline-flex items-center rounded-full border border-[#D6D6D6] bg-[#F9FAFB] px-3 py-1 text-[11px] text-[#111827]">
                  AirtelTigo Money
                </span>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-1">CSV Export</p>
              <ul className="list-disc pl-4 space-y-1 text-[#4B5563]">
                <li>
                  Payout summary downloadable as CSV for accounting records.
                </li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PayoutsTable />
    </div>
  );
}
