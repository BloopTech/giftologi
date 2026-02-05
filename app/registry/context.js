"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryState, parseAsString } from "nuqs";

const RegistryDiscoverContext = createContext(null);
const DEFAULT_LIMIT = 12;

export function RegistryDiscoverProvider({ children, initialLimit = DEFAULT_LIMIT }) {
  const [registries, setRegistries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );
  const [typeParam, setTypeParam] = useQueryState(
    "type",
    parseAsString.withDefault("all")
  );
  const [pageParam, setPageParam] = useQueryState(
    "page",
    parseAsString.withDefault("1")
  );

  const searchQuery = searchParam || "";
  const eventType = typeParam || "all";
  const page = useMemo(() => {
    const num = Number.parseInt(pageParam || "1", 10);
    if (Number.isNaN(num) || num < 1) return 1;
    return num;
  }, [pageParam]);
  const limit = initialLimit;

  const fetchRegistries = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }
    if (eventType && eventType !== "all") {
      params.set("type", eventType);
    }
    params.set("page", String(page));
    params.set("limit", String(limit));

    try {
      const response = await fetch(`/api/registry/search?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setRegistries([]);
        setTotal(0);
        setError(body?.message || "Unable to load registries.");
        return;
      }

      const body = await response.json().catch(() => ({}));
      setRegistries(Array.isArray(body?.registries) ? body.registries : []);
      setTotal(Number.isFinite(body?.total) ? body.total : 0);
    } catch (err) {
      setRegistries([]);
      setTotal(0);
      setError(err?.message || "Unable to load registries.");
    } finally {
      setLoading(false);
    }
  }, [eventType, limit, page, searchQuery]);

  useEffect(() => {
    fetchRegistries();
  }, [fetchRegistries]);

  const totalPages = useMemo(() => {
    const calculated = Math.ceil(total / limit);
    return calculated > 0 ? calculated : 1;
  }, [limit, total]);

  const setSearchQuery = useCallback(
    (value) => {
      setSearchParam(value ? value.trim() : "");
    },
    [setSearchParam]
  );

  const setEventType = useCallback(
    (value) => {
      setTypeParam(value || "all");
    },
    [setTypeParam]
  );

  const setPage = useCallback(
    (value) => {
      const next = Number(value);
      const normalized = Number.isFinite(next) && next > 0 ? next : 1;
      setPageParam(String(normalized));
    },
    [setPageParam]
  );

  const value = useMemo(
    () => ({
      registries,
      total,
      totalPages,
      page,
      limit,
      loading,
      error,
      searchQuery,
      eventType,
      setSearchQuery,
      setEventType,
      setPage,
      refresh: fetchRegistries,
    }),
    [
      registries,
      total,
      totalPages,
      page,
      limit,
      loading,
      error,
      searchQuery,
      eventType,
      setSearchQuery,
      setEventType,
      setPage,
      fetchRegistries,
    ]
  );

  return (
    <RegistryDiscoverContext.Provider value={value}>
      {children}
    </RegistryDiscoverContext.Provider>
  );
}

export function useRegistryDiscover() {
  return useContext(RegistryDiscoverContext);
}
