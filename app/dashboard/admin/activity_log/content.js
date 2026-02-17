"use client";
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PiDownloadSimple } from "react-icons/pi";
import { tv } from "tailwind-variants";

import { Badge } from "@/app/components/Badge";
import { cx } from "@/app/components/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/Select";
import { useActivityLogContext } from "./context";
import ActivityLogTable from "./activitytable";


export default function ActivityLogContent() {
  const context = useActivityLogContext() || {};

  const {
    logs = [],
    total = 0,
    loading = false,
    error = null,
    search = "",
    actionFilter = "all",
    userFilter = "all",
    pageIndex = 0,
    pageSize = 8,
    pageCount = 1,
    pageStart = 0,
    pageEnd = 0,
    availableActions = [],
    availableUsers = [],
    exporting = false,
    exportLogs,
    hasRealData = true,
    setSearch,
    setActionFilter,
    setUserFilter,
    setPageIndex,
  } = context;

  const canPrevious = pageIndex > 0;
  const canNext = pageIndex + 1 < pageCount;

  const handleSearchChange = (event) => {
    setSearch?.(event.target.value || "");
  };

  const handlePreviousPage = () => {
    if (!setPageIndex) return;
    setPageIndex(Math.max(pageIndex - 1, 0));
  };

  const handleNextPage = () => {
    if (!setPageIndex) return;
    setPageIndex(canNext ? pageIndex + 1 : pageIndex);
  };

  const handleExport = async () => {
    if (!exportLogs) return;
    await exportLogs();
  };

  return (
    <section aria-label="Activity log" className="flex flex-col space-y-4 w-full mb-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-brasley-medium">
            View Activity Log
          </h1>
          <span className="text-[#717182] text-xs/4 font-brasley-medium">
            Track all admin actions, approvals and suspensions.
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-[11px] text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-[#D6D6D6] bg-white px-4 py-3 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1 max-w-md">
            <label className="sr-only" htmlFor="activity-log-search">
              Search logs
            </label>
            <input
              id="activity-log-search"
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search logs..."
              className="w-full rounded-full border border-[#D6D6D6] bg-white px-4 py-2 text-xs text-[#0A0A0A] placeholder:text-[#B0B7C3] outline-none"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="flex-1 min-w-[160px]">
              <label
                className="mb-1 block text-[11px] text-[#717182]"
              >
                Action
              </label>
              <Select
                value={actionFilter || "all"}
                onValueChange={(value) => setActionFilter?.(value || "all")}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {availableActions.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label
                className="mb-1 block text-[11px] text-[#717182]"
              >
                Admin User
              </label>
              <Select
                value={userFilter || "all"}
                onValueChange={(value) => setUserFilter?.(value || "all")}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.value} value={user.value}>
                      {user.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <ActivityLogTable />
    </section>
  );
}
