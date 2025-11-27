"use client";
import { Search } from "lucide-react";
import React from "react";
import {
  PiShoppingCart,
  PiCheckCircle,
  PiWarning,
  PiTicket,
  PiShoppingBagOpen,
  PiCashRegister,
  PiFolderStar,
} from "react-icons/pi";
import { useViewTransactionsContext } from "./context";
import TransactionsTable from "./TransactionsTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/Select";

export default function ViewTransactionsContent() {
  const {
    metrics,
    loadingMetrics,
    searchTerm,
    setSearchTerm,
    setTransactionsPage,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
  } = useViewTransactionsContext() || {};

  const [search, setSearch] = React.useState(searchTerm || "");
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

  const renderMetricValue = (label) => {
    if (isLoadingMetrics) {
      return <div className="h-4 w-16 rounded bg-[#E5E7EB] animate-pulse" />;
    }
    if (label === "revenue") {
      return (
        <p className="text-[#0A0A0A] font-medium font-poppins text-sm">
          {formatCurrency(metrics?.totalRevenue)}
        </p>
      );
    }
    return (
      <p className="text-[#0A0A0A] font-medium font-poppins text-sm">
        {formatCount(
          label === "paid"
            ? metrics?.paidOrders
            : label === "disputed"
            ? metrics?.disputedOrders
            : metrics?.totalOrders
        )}
      </p>
    );
  };

  const handleSearch = () => {
    if (!setSearchTerm || !setTransactionsPage) return;
    setSearchTerm(search);
    setTransactionsPage(0);
  };

  return (
    <div className="flex flex-col space-y-4 w-full mb-[2rem]">
      <div className="flex flex-col w-full">
        <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
          Transaction & Order Management
        </h1>
        <span className="text-[#717182] text-xs/4 font-poppins">
          End-to-end visibility and control over all orders and payments.
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Total Revenue
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricValue("revenue")}
            <PiShoppingBagOpen className="size-4 text-[#427ED3]" />
          </div>
          <div className="border-t-[2px] border-[#7DADF2]" />
        </div>
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Paid Orders
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricValue("paid")}
            <PiCashRegister className="size-4 text-[#6EA30B]" />
          </div>
          <div className="border-t-[2px] border-[#CBED8E]" />
        </div>
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Disputed Orders
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricValue("disputed")}
            <PiFolderStar className="size-4 text-[#CB7428]" />
          </div>
          <div className="border-t-[2px] border-[#FFCA57]" />
        </div>
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Total Orders
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricValue("total")}
            <PiTicket className="size-4 text-[#286AD4]" />
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
              placeholder={
                "Search by Order ID, guest name, registry, or vendor"
              }
              className="w-full bg-transparent outline-none text-xs text-[#0A0A0A] placeholder:text-[#B0B7C3]"
            />
          </div>
        </div>
        <div className="w-full md:w-[20%]">
          <Select
            value={typeFilter || "all"}
            onValueChange={(value) => {
              setTypeFilter?.(value);
              setTransactionsPage?.(0);
            }}
          >
            <SelectTrigger className={``}>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="order_id">Order ID</SelectItem>
              <SelectItem value="guest_name">Guest Name</SelectItem>
              <SelectItem value="registry">Registry</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-[20%]">
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) => {
              setStatusFilter?.(value);
              setTransactionsPage?.(0);
            }}
          >
            <SelectTrigger className={``}>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="disputed">Disputed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="w-full md:w-auto px-8 py-2.5 inline-flex items-center justify-center rounded-full bg-[#3979D2] text-white text-xs font-medium border border-[#3979D2] cursor-pointer hover:bg-white hover:text-[#3979D2]"
        >
          Search
        </button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="w-full md:w-[20%]">
          <Select
            value={paymentMethodFilter || "all"}
            onValueChange={(value) => {
              setPaymentMethodFilter?.(value);
              setTransactionsPage?.(0);
            }}
          >
            <SelectTrigger className={``}>
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="momo">MoMo</SelectItem>
              <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
              <SelectItem value="telecel_cash">Telecel Cash</SelectItem>
              <SelectItem value="at_momo">AT MoMo</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="bank">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-[11px] text-[#717182]">From</span>
            <input
              type="date"
              value={fromDate || ""}
              onChange={(event) => {
                setFromDate?.(event.target.value);
                setTransactionsPage?.(0);
              }}
              className="w-full md:w-auto rounded-full border border-[#D6D6D6] bg-white px-3 py-2 text-xs text-[#0A0A0A] outline-none"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-[11px] text-[#717182]">To</span>
            <input
              type="date"
              value={toDate || ""}
              onChange={(event) => {
                setToDate?.(event.target.value);
                setTransactionsPage?.(0);
              }}
              className="w-full md:w-auto rounded-full border border-[#D6D6D6] bg-white px-3 py-2 text-xs text-[#0A0A0A] outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setFromDate?.("");
              setToDate?.("");
              setTransactionsPage?.(0);
            }}
            className="mt-1 md:mt-0 inline-flex items-center justify-center rounded-full border border-[#D6D6D6] bg-white px-4 py-2 text-xs text-[#717182] hover:bg-[#F5F5F5]"
          >
            Clear dates
          </button>
        </div>
      </div>

      <div className="flex items-center justify-start mt-2">
        <div className="inline-flex rounded-full bg-[#F1F2F6] p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setStatusFilter?.("all");
              setTransactionsPage?.(0);
            }}
            className={
              "px-4 py-2 text-xs font-medium rounded-full cursor-pointer transition-colors flex items-center gap-2 " +
              (statusFilter === "all"
                ? "bg-white text-[#0A0A0A] shadow-sm"
                : "text-[#717182]")
            }
          >
            <span>All Orders</span>
            <span className="rounded-full px-2 py-0.5 text-[11px] bg-[#E5E7EB] text-[#4B5563]">
              {formatCount(metrics?.totalOrders)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter?.("disputed");
              setTransactionsPage?.(0);
            }}
            className={
              "px-4 py-2 text-xs font-medium rounded-full cursor-pointer transition-colors flex items-center gap-2 " +
              (statusFilter === "disputed"
                ? "bg-white text-[#0A0A0A] shadow-sm"
                : "text-[#717182]")
            }
          >
            <span>Disputed Orders</span>
            <span className="rounded-full px-2 py-0.5 text-[11px] bg-[#E5E7EB] text-[#4B5563]">
              {formatCount(metrics?.disputedOrders)}
            </span>
          </button>
        </div>
      </div>

      <TransactionsTable />
    </div>
  );
}
