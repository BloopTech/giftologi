"use client";

import React from "react";
import CloseRequestsTable from "./CloseRequestsTable";
import { useCloseRequestsContext } from "./context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/Select";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export default function CloseRequestsContent() {
  const { statusFilter, setStatusFilter, errorRequests } =
    useCloseRequestsContext() || {};

  return (
    <section
      aria-label="Close shop requests management"
      className="flex flex-col space-y-4 w-full mb-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-brasley-medium">
            Close Shop Requests
          </h1>
          <span className="text-[#717182] text-xs/4 font-brasley-medium">
            Review vendor close requests and finalize shop closures.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#717182] font-brasley-medium">
            Status filter
          </label>
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) => setStatusFilter?.(value)}
          >
            <SelectTrigger className="min-w-[160px] text-xs">
              <SelectValue placeholder="Status filter" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {errorRequests && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {errorRequests}
        </div>
      )}

      <CloseRequestsTable />
    </section>
  );
}
