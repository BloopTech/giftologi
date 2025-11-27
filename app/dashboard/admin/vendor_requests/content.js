"use client";
import React from "react";
import VendorRequestsTable from "./vendorTable";

export default function VendorRequestsContent() {
  return (
    <div className="flex flex-col space-y-4 w-full mb-[2rem]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
            Vendor Requests
          </h1>
          <span className="text-[#717182] text-xs/4 font-poppins">
            Monitor, audit, and manage all vendor requests.
          </span>
        </div>
      </div>
      <VendorRequestsTable />
    </div>
  );
}
