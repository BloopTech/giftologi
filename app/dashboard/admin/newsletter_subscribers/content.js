"use client";

import React from "react";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/Select";
import { useNewsletterSubscribersContext } from "./context";
import NewsletterSubscribersTable from "./NewsletterSubscribersTable";

export default function NewsletterSubscribersContent() {
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    setPage,
    clearFilters,
    sources,
  } = useNewsletterSubscribersContext() || {};

  const [search, setSearch] = React.useState(searchTerm || "");

  React.useEffect(() => {
    setSearch(searchTerm || "");
  }, [searchTerm]);

  const handleSearch = () => {
    setSearchTerm?.(search);
    setPage?.(1);
  };

  return (
    <section
      aria-label="Newsletter subscribers management"
      className="flex flex-col space-y-4 w-full mb-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-brasley-medium">
            Newsletter Subscribers
          </h1>
          <span className="text-[#717182] text-xs/4 font-brasley-medium">
            Manage and filter subscriptions by status, source, and date.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 mt-2">
        <div className="xl:col-span-2">
          <div className="flex items-center gap-2 rounded-full border border-[#D6D6D6] bg-white px-4 py-2.5">
            <Search className="size-4 text-[#717182]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by email"
              className="w-full bg-transparent outline-none text-xs text-[#0A0A0A] placeholder:text-[#B0B7C3]"
            />
          </div>
        </div>

        <div>
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) => {
              setStatusFilter?.(value);
              setPage?.(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="subscribed">Subscribed</SelectItem>
              <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select
            value={sourceFilter || "all"}
            onValueChange={(value) => {
              setSourceFilter?.(value);
              setPage?.(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {(Array.isArray(sources) ? sources : []).map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <input
            type="date"
            value={fromDate || ""}
            onChange={(event) => {
              setFromDate?.(event.target.value);
              setPage?.(1);
            }}
            className="w-full rounded-full border border-[#D6D6D6] bg-white px-4 py-2.5 text-xs text-[#0A0A0A] outline-none"
            aria-label="Filter from subscription date"
          />
        </div>

        <div>
          <input
            type="date"
            value={toDate || ""}
            onChange={(event) => {
              setToDate?.(event.target.value);
              setPage?.(1);
            }}
            className="w-full rounded-full border border-[#D6D6D6] bg-white px-4 py-2.5 text-xs text-[#0A0A0A] outline-none"
            aria-label="Filter to subscription date"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:justify-end">
        <button
          type="button"
          onClick={clearFilters}
          className="w-full md:w-auto px-6 py-2.5 inline-flex items-center justify-center rounded-full border border-[#D6D6D6] bg-white text-[#0A0A0A] text-xs font-medium cursor-pointer hover:bg-gray-50"
        >
          Clear Filters
        </button>
        <button
          type="button"
          onClick={handleSearch}
          className="w-full md:w-auto px-8 py-2.5 inline-flex items-center justify-center rounded-full bg-primary text-white text-xs font-medium border border-primary cursor-pointer hover:bg-white hover:text-primary"
        >
          Search
        </button>
      </div>

      <NewsletterSubscribersTable />
    </section>
  );
}
