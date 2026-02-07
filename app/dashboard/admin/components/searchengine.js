"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/Dialog";
import { Search, X } from "lucide-react";
import { useDebounce } from "use-debounce";

export default function SearchEngine() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typeValue, setTypeValue] = useState("all");
  const [statusValue, setStatusValue] = useState("all");
  const [groups, setGroups] = useState([]);
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncedQuery] = useDebounce(query, 300);

  const flattenGroups = (inputGroups) =>
    (Array.isArray(inputGroups) ? inputGroups : []).flatMap((group) =>
      (group?.results || []).map((result) => ({
        ...result,
        __pageKey: group?.pageKey,
        __pageTitle: group?.pageTitle,
      }))
    );

  const flattenedResults = flattenGroups(groups);

  useEffect(() => {
    if (!open) return;
    const term = debouncedQuery.trim();

    if (!term) {
      setGroups([]);
      setResults([]);
      setMessage("");
      setActiveIndex(-1);
      return;
    }

    setIsLoading(true);
    let isCancelled = false;

    (async () => {
      try {
        const params = new URLSearchParams();
        params.set("q", term);
        params.set("type", typeValue);
        params.set("status", statusValue);

        const res = await fetch(`/api/admin/search?${params.toString()}`, {
          method: "GET",
        });

        let data = null;
        try {
          data = await res.json();
        } catch (e) {
          // ignore JSON parse errors
        }

        if (!res.ok) {
          if (!isCancelled) {
            setMessage(data?.message || "Unable to fetch results");
            setGroups([]);
            setResults([]);
            setActiveIndex(-1);
          }
          return;
        }

        if (!isCancelled) {
          const nextGroups = Array.isArray(data?.groups) ? data.groups : [];
          const nextResults = Array.isArray(data?.results) ? data.results : [];
          setGroups(nextGroups);
          setResults(nextGroups.length ? flattenGroups(nextGroups) : nextResults);
          setMessage(
            data?.message ||
              ((nextGroups.length || nextResults.length) ? "" : "No results found")
          );
          setActiveIndex(-1);
        }
      } catch (error) {
        if (!isCancelled) {
          setMessage("Unable to fetch results");
          setGroups([]);
          setResults([]);
          setActiveIndex(-1);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [open, debouncedQuery, typeValue, statusValue]);

  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
    }
  }, [open]);

  const handleResultClick = (result) => {
    if (!result?.navigate?.path) return;

    const searchParams = new URLSearchParams();

    if (result.navigate?.query) {
      Object.entries(result.navigate.query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      });
    }
    if (!result.navigate?.query) {
      searchParams.set("q", query);
      searchParams.set("status", statusValue);
      if (result.id) {
        searchParams.set("focusId", result.id);
      }
      searchParams.set("page", "1");
    }

    const qs = searchParams.toString();
    if (!qs) {
      router.push(result.navigate.path);
    } else if (String(result.navigate.path).includes("?")) {
      router.push(`${result.navigate.path}&${qs}`);
    } else {
      router.push(`${result.navigate.path}?${qs}`);
    }
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (!open) return;
    const list = groups?.length ? flattenedResults : results;
    if (!Array.isArray(list) || !list.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => {
        const next = prev + 1;
        return next >= list.length ? 0 : next;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? list.length - 1 : next;
      });
      return;
    }

    if (event.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < list.length) {
        event.preventDefault();
        handleResultClick(list[activeIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-col p-4 border border-[#D6D6D6] rounded-xl bg-white w-full space-y-4">
      <div className="flex flex-col">
        <h1 className="text-[#0A0A0A] font-medium text-sm font-brasley-medium">
          Universal Search
        </h1>
        <span className="text-[#717182] text-xs/4 font-brasley-medium">
          Get a quick overview of registry and vendor performance at a glance.
        </span>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex items-center w-full border border-[#D6D6D6] rounded-full py-3 px-4 text-xs bg-white text-left cursor-text hover:border-[#3979D2]"
      >
        <Search className="size-4 text-[#717182] mr-2" />
        <span className="text-[#717182]">
          {query ? query : "Search anything (users, registries, products, orders...)"}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Search results
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center space-x-2 mb-3">
            <div className="flex items-center flex-1 border border-[#D6D6D6] rounded-full px-3 py-2 bg-white">
              <Search className="size-4 text-[#717182] mr-2" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search anything (users, registries, products, orders...)"
                className="flex-1 bg-transparent text-xs outline-none text-[#0A0A0A]"
              />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-full border border-[#D6D6D6] hover:bg-[#F3F6FF]"
            >
              <X className="size-4 text-[#717182]" />
            </button>
          </div>

          <div className="flex space-x-2 mb-3">
            <div className="w-1/2">
              <Select value={typeValue} onValueChange={setTypeValue}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pages">Pages</SelectItem>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="vendor">Vendors</SelectItem>
                  <SelectItem value="host">Hosts</SelectItem>
                  <SelectItem value="guest">Guests</SelectItem>
                  <SelectItem value="registry">Registries</SelectItem>
                  <SelectItem value="products">Products</SelectItem>
                  <SelectItem value="transactions">Transactions</SelectItem>
                  <SelectItem value="payouts">Payouts</SelectItem>
                  <SelectItem value="tickets">Support Tickets</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="activity_log">Activity Log</SelectItem>
                  <SelectItem value="notifications">Notifications</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-1/2">
              <Select value={statusValue} onValueChange={setStatusValue}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-[2rem] space-y-2 max-h-80 overflow-y-auto">
            {isLoading ? (
              <p className="text-xs text-[#717182]">Searching...</p>
            ) : null}
            {!isLoading && message && !results.length ? (
              <p className="text-xs text-[#717182]">{message}</p>
            ) : null}
            {groups?.length ? (
              <div className="space-y-4">
                {groups.map((group) => (
                  <div key={group.pageKey} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[#717182]">
                        {group.pageTitle}
                      </span>
                      <span className="text-[10px] text-[#B0B7C3]">
                        {(group.results || []).length}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {(group.results || []).map((result) => {
                        const flatIndex = flattenedResults.findIndex(
                          (row) =>
                            row.id === result.id &&
                            row.entityType === result.entityType &&
                            row.__pageKey === group.pageKey
                        );
                        const isActive = flatIndex === activeIndex;

                        return (
                          <li key={`${group.pageKey}-${result.entityType}-${result.id}`}>
                            <button
                              type="button"
                              onClick={() => handleResultClick(result)}
                              className={
                                "w-full flex flex-col items-start rounded-lg border bg-white px-3 py-2 text-left cursor-pointer " +
                                (isActive
                                  ? "border-[#3979D2] bg-[#F3F6FF]"
                                  : "border-[#D6D6D6] hover:border-[#3979D2] hover:bg-[#F3F6FF]")
                              }
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs font-medium text-[#0A0A0A]">
                                  {result.title}
                                </span>
                                <span className="text-[10px] rounded-full border border-[#D6D6D6] px-2 py-0.5 text-[#717182] capitalize">
                                  {result.entityType}
                                </span>
                              </div>
                              {result.subtitle ? (
                                <p className="mt-1 text-[11px] text-[#717182]">
                                  {result.subtitle}
                                </p>
                              ) : null}
                              {result.status ? (
                                <p className="mt-1 text-[10px] text-[#3979D2]">
                                  {result.status}
                                </p>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ) : results.length ? (
              <ul className="space-y-1">
                {results.map((result, idx) => {
                  const isActive = idx === activeIndex;

                  return (
                    <li key={`${result.entityType}-${result.id}`}>
                      <button
                        type="button"
                        onClick={() => handleResultClick(result)}
                        className={
                          "w-full flex flex-col items-start rounded-lg border bg-white px-3 py-2 text-left cursor-pointer " +
                          (isActive
                            ? "border-[#3979D2] bg-[#F3F6FF]"
                            : "border-[#D6D6D6] hover:border-[#3979D2] hover:bg-[#F3F6FF]")
                        }
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-medium text-[#0A0A0A]">
                            {result.title}
                          </span>
                          <span className="text-[10px] rounded-full border border-[#D6D6D6] px-2 py-0.5 text-[#717182] capitalize">
                            {result.entityType}
                          </span>
                        </div>
                        {result.subtitle ? (
                          <p className="mt-1 text-[11px] text-[#717182]">
                            {result.subtitle}
                          </p>
                        ) : null}
                        {result.status ? (
                          <p className="mt-1 text-[10px] text-[#3979D2]">
                            {result.status}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

