"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, Loader2, ChevronRight, Calendar } from "lucide-react";

const DEBOUNCE_MS = 400;
const PAGE_SIZE = 10;

export default function RegistrySelector({ selectedId, onSelect }) {
  const [query, setQuery] = useState("");
  const [registries, setRegistries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const debounceRef = useRef(null);

  const fetchRegistries = useCallback(
    async (searchQuery, pageNum, append = false) => {
      setLoading(true);
      try {
        const url = new URL("/api/shop/registries", window.location.origin);
        if (searchQuery.trim())
          url.searchParams.set("q", searchQuery.trim());
        url.searchParams.set("page", String(pageNum));
        url.searchParams.set("limit", String(PAGE_SIZE));

        const res = await fetch(url.toString());
        if (!res.ok) return;

        const body = await res.json();
        if (append) {
          setRegistries((prev) => [...prev, ...(body.registries || [])]);
        } else {
          setRegistries(body.registries || []);
        }
        setTotal(body.total || 0);
        setPage(pageNum);
      } catch {
        // ignore
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchRegistries("", 1);
  }, [fetchRegistries]);

  // Debounced search
  useEffect(() => {
    if (initialLoad) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchRegistries(query, 1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchRegistries, initialLoad]);

  const hasMore = registries.length < total;

  const loadMore = () => {
    if (loading || !hasMore) return;
    fetchRegistries(query, page + 1, true);
  };

  return (
    <div>
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search your registries..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#A5914B]/20 focus:border-[#A5914B] outline-none"
        />
      </div>

      {/* Registry list */}
      <div className="max-h-48 overflow-y-auto space-y-1">
        {initialLoad ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-gray-400" />
          </div>
        ) : registries.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            {query ? "No registries found" : "No active registries"}
          </p>
        ) : (
          registries.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-between ${
                selectedId === r.id
                  ? "bg-[#A5914B]/10 border border-[#A5914B]/30 text-[#8B7A3F]"
                  : "hover:bg-gray-50 border border-transparent text-gray-700"
              }`}
            >
              <div>
                <p className="font-medium">{r.title}</p>
                {r.event?.type && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="size-3" />
                    {r.event.type}
                    {r.deadline &&
                      ` · Due ${new Date(r.deadline).toLocaleDateString()}`}
                  </p>
                )}
              </div>
              {selectedId === r.id && (
                <ChevronRight className="size-4 text-[#A5914B]" />
              )}
            </button>
          ))
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <button
            type="button"
            onClick={loadMore}
            className="w-full text-xs text-[#A5914B] hover:text-[#8B7A3F] font-medium py-2 cursor-pointer"
          >
            Load more registries
          </button>
        )}
        {loading && !initialLoad && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="size-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
}
