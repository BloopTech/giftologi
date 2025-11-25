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

export default function RegistryListContent() {
  return (
    <div className="flex flex-col space-y-4 w-full">
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

      <div className="flex space-x-8 w-full bg-white rounded-xl p-4 border border-[#D6D6D6]">
        {/* Active Registries */}
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Active Registries
          </h2>
          <div className="flex justify-between items-center">
            {/* {renderMetricCount(metrics?.totalRegistries)} */} 2
            <PiShoppingBagOpen className="size-4 text-[#6EA30B]" />
          </div>
          <div className="border-t-[2px] border-[#6EA30B]" />
          
        </div>
        {/* Expired */}
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Expired
          </h2>
          <div className="flex justify-between items-center">
            1
            {/* {renderMetricCount(metrics?.pendingVendorRequests)} */}
            <PiXCircle className="size-4 text-[#CB7428]" />
          </div>
          <div className="border-t-[2px] border-[#FFCA57]" />
        </div>
        {/* Flagged */}
        <div className="flex flex-col space-y-2 w-full">
          <h2 className="text-[#717182] text-xs/4 font-poppins">
            Flagged
          </h2>
          <div className="flex justify-between items-center">
            {/* {renderMetricCount(metrics?.totalOrders ?? 0)} */}1
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
            {/* {renderMetricCount(metrics?.openTickets)} */} 4
            <PiTicket className="size-4 text-[#286AD4]" />
          </div>
          <div className="border-t-[2px] border-[#5797FF]" />

        </div>
      </div>

      {/* SEARCH */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 rounded-full border border-[#D6D6D6] bg-white px-4 py-2.5">
            <Search className="size-4 text-[#717182]" />
            <input
              type="text"
            //   value={search}
            //   onChange={(event) => setSearch(event.target.value)}
              placeholder={
                "Search by host name, registry name or code"
              }
              className="w-full bg-transparent outline-none text-xs text-[#0A0A0A] placeholder:text-[#B0B7C3]"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            
          }}
          className="px-8 py-2.5 inline-flex items-center justify-center rounded-full bg-[#3979D2] text-white text-xs font-medium border border-[#3979D2] cursor-pointer hover:bg-white hover:text-[#3979D2]"
        >
          Search
        </button>
      </div>
    </div>
  );
}
