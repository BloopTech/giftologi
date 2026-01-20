"use client";
import { Search } from "lucide-react";
import React from "react";
import {
  PiFlag,
  PiShoppingBagOpen,
  PiShoppingCart,
  PiStorefront,
  PiTicket,
  PiWarning,
  PiXCircle,
} from "react-icons/pi";
import { useRegistryListContext } from "./context";
import RegistryListTable from "./RegistryListTable";
import {
  SelectTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../../../components/Select";

export default function RegistryListContent() {
  const {
    metrics,
    loadingMetrics,
    searchTerm,
    setSearchTerm,
    setRegistryPage,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
  } = useRegistryListContext() || {};

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
    if (!setSearchTerm || !setRegistryPage) return;
    setSearchTerm(search);
    setRegistryPage(0);
  };

  return (
    <div className="flex flex-col space-y-4 w-full mb-[2rem]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
            Open Registry List
          </h1>
          <span className="text-[#717182] text-xs/4 font-poppins">
            Monitor, audit, and manage all event registries.
          </span>
        </div>
      </div>

      {/* Card Overview */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
        {/* Active Registries */}
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Active Registries
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.activeRegistries)}
            <PiShoppingBagOpen className="size-4 text-[#6EA30B]" />
          </div>
          <div className="border-t-[2px] border-[#6EA30B]" />
        </div>
        {/* Expired */}
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">Expired</h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.expiredRegistries)}
            <PiXCircle className="size-4 text-[#CB7428]" />
          </div>
          <div className="border-t-[2px] border-[#FFCA57]" />
        </div>
        {/* Flagged */}
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">Flagged</h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.flaggedRegistries)}
            <PiFlag className="size-4 text-[#C52721]" />
          </div>
          <div className="border-t-[2px] border-[#FF908B]" />
        </div>
        {/* Total Registries */}
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Total Registries
          </h2>
          <div className="flex justify-between items-center">
            {renderMetricCount(metrics?.totalRegistries)}
            <PiTicket className="size-4 text-[#286AD4]" />
          </div>
          <div className="border-t-[2px] border-[#5797FF]" />
        </div>
      </div>

      {/* SEARCH */}
      <div className="flex flex-col gap-3 mt-2 md:flex-row md:items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 rounded-full border border-[#D6D6D6] bg-white px-4 py-2.5">
            <Search className="size-4 text-[#717182]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={"Search by host name, registry name or code"}
              className="w-full bg-transparent outline-none text-xs text-[#0A0A0A] placeholder:text-[#B0B7C3]"
            />
          </div>
        </div>
        <div className="w-full md:w-[20%]">
          <Select
            value={typeFilter || "all"}
            onValueChange={(value) => {
              setTypeFilter?.(value);
              setRegistryPage?.(0);
            }}
          >
            <SelectTrigger className={``}>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="registry_name">Registry Name</SelectItem>
              <SelectItem value="registry_code">Registry Code</SelectItem>
              <SelectItem value="host_name">Host Name</SelectItem>
              <SelectItem value="host_email">Host Email</SelectItem>
              <SelectItem value="event_type">Event Type</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-[20%]">
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) => {
              setStatusFilter?.(value);
              setRegistryPage?.(0);
            }}
          >
            <SelectTrigger className={``}>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
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
      <RegistryListTable />
    </div>
  );
}
