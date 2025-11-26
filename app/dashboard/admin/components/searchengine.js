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
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedQuery] = useDebounce(query, 300);

  useEffect(() => {
    if (!open) return;
    const term = debouncedQuery.trim();

    if (!term) {
      setResults([]);
      setMessage("");
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
            setResults([]);
          }
          return;
        }

        if (!isCancelled) {
          setResults(data?.results || []);
          setMessage(
            data?.message || (data?.results?.length ? "" : "No results found")
          );
        }
      } catch (error) {
        if (!isCancelled) {
          setMessage("Unable to fetch results");
          setResults([]);
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

  const handleResultClick = (result) => {
    if (!result?.navigate?.path) return;

    const searchParams = new URLSearchParams();

    if (result.navigate?.query) {
      Object.entries(result.navigate.query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      });
    } else {
      if (query) {
        searchParams.set("q", query);
      }
      const entityType = result.entityType || "vendor";
      searchParams.set("type", entityType);
      if (result.id) {
        searchParams.set("focusId", result.id);
      }
      searchParams.set("page", "1");
    }

    router.push(`${result.navigate.path}?${searchParams.toString()}`);
    setOpen(false);
  };

  return (
    <div className="flex flex-col p-4 border border-[#D6D6D6] rounded-xl bg-white w-full space-y-4">
      <div className="flex flex-col">
        <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
          Universal Search
        </h1>
        <span className="text-[#717182] text-xs/4 font-poppins">
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
          {query ? query : "Search all users here"}
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
                placeholder="Search all users here"
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
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="host">Host</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
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
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
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
            {results.length ? (
              <ul className="space-y-1">
                {results.map((result) => (
                  <li key={`${result.entityType}-${result.id}`}>
                    <button
                      type="button"
                      onClick={() => handleResultClick(result)}
                      className="w-full flex flex-col items-start rounded-lg border border-[#D6D6D6] bg-white px-3 py-2 text-left hover:border-[#3979D2] hover:bg-[#F3F6FF] cursor-pointer"
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
                ))}
              </ul>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

