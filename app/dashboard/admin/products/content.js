"use client";
import { Search } from "lucide-react";
import React from "react";
import {
  PiShoppingBagOpen,
  PiCheckCircle,
  PiXCircle,
  PiFlag,
  PiArticle,
} from "react-icons/pi";
import { useManageProductsContext } from "./context";
import ProductsTable from "./ProductsTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/Select";

export default function ManageProductsContent() {
  const {
    metrics,
    loadingMetrics,
    searchTerm,
    setSearchTerm,
    setProductsPage,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
  } = useManageProductsContext() || {};

  const [search, setSearch] = React.useState(searchTerm || "");
  const isLoadingMetrics = !!loadingMetrics;

  const formatCount = (value) => {
    if (value === null || typeof value === "undefined") return "—";
    const num = Number(value);
    if (Number.isNaN(num)) return "—";
    return num.toLocaleString();
  };

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

  const handleSearch = () => {
    if (!setSearchTerm || !setProductsPage) return;
    setSearchTerm(search);
    setProductsPage(0);
  };

  return (
    <div className="flex flex-col space-y-4 w-full mb-[2rem]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
            Manage Products
          </h1>
          <span className="text-[#717182] text-xs/4 font-poppins">
            Approve, reject, or flag products submitted by vendors.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Total Products
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.total)}
            <PiShoppingBagOpen className="size-4 text-[#427ED3]" />
          </div>
          <div className="border-t-[2px] border-[#7DADF2]" />
        </div>
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Pending Approval
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.pending)}
            <PiArticle className="size-4 text-[#DDA938]" />
          </div>
          <div className="border-t-[2px] border-[#FFCA57]" />
        </div>
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Approved Products
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.approved)}
            <PiCheckCircle className="size-4 text-[#6EA30B]" />
          </div>
          <div className="border-t-[2px] border-[#CBED8E]" />
        </div>
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">Flagged</h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.flagged)}
            <PiFlag className="size-4 text-[#C52721]" />
          </div>
          <div className="border-t-[2px] border-[#FF908B]" />
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
              placeholder={"Search by product name or description"}
              className="w-full bg-transparent outline-none text-xs text-[#0A0A0A] placeholder:text-[#B0B7C3]"
            />
          </div>
        </div>
        <div className="w-full md:w-[20%]">
          <Select
            value={typeFilter || "all"}
            onValueChange={(value) => {
              setTypeFilter?.(value);
              setProductsPage?.(0);
            }}
          >
            <SelectTrigger className={``}>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-[20%]">
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) => {
              setStatusFilter?.(value);
              setProductsPage?.(0);
            }}
          >
            <SelectTrigger className={``}>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
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

      <div className="flex items-center justify-start mt-2">
        <div className="inline-flex rounded-full bg-[#F1F2F6] p-1 gap-1">
          {["pending", "approved", "flagged", "rejected"].map((key) => {
            const labelMap = {
              pending: "Pending Approval",
              approved: "Approved",
              flagged: "Flagged",
              rejected: "Rejected",
            };
            const countMap = {
              pending: metrics?.pending,
              approved: metrics?.approved,
              flagged: metrics?.flagged,
              rejected: metrics?.rejected,
            };
            const isActive = statusFilter === key;
            const label = labelMap[key] || key;
            const count = countMap[key];

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setStatusFilter?.(key);
                  setProductsPage?.(0);
                }}
                className={
                  "px-4 py-2 text-xs font-medium rounded-full cursor-pointer transition-colors flex items-center gap-2 " +
                  (isActive ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#717182]")
                }
              >
                <span>{label}</span>
                <span className="rounded-full px-2 py-0.5 text-[11px] bg-[#E5E7EB] text-[#4B5563]">
                  {formatCount(count)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* <VendorRequestsTable /> */}
      <ProductsTable />
    </div>
  );
}
