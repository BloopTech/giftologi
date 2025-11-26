"use client";
import React from "react";

export default function ManageProductsContent() {
  return (
    <div className="flex flex-col space-y-4 w-full">
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
      {/* <VendorRequestsTable /> */}
    </div>
  );
}
