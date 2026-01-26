"use client";
import React, { useState } from "react";
import VendorRequestsTable from "./vendorTable";
import { Dialog } from "@/app/components/Dialog";
import CreateVendorApplicationDialog from "./createVendorApplication";

export default function VendorRequestsContent() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <section aria-label="Vendor requests management" className="flex flex-col space-y-4 w-full mb-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
            Vendor Requests
          </h1>
          <span className="text-[#717182] text-xs/4 font-poppins">
            Monitor, audit, and manage all vendor requests.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-full border border-primary bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-white hover:text-primary cursor-pointer"
          >
            Create Vendor Application
          </button>
        </div>
      </div>

      <VendorRequestsTable />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        {createOpen && (
          <CreateVendorApplicationDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
          />
        )}
      </Dialog>
    </section>
  );
}
