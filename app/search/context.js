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

const GlobalSearchContext = createContext(null);

const EMPTY_RESULTS = {
  products: [],
  registries: [],
  vendors: [],
};

const EMPTY_COUNTS = {
  products: 0,
  registries: 0,
  vendors: 0,
};

export function GlobalSearchProvider({ children }) {
  const value = useGlobalSearchProviderValue();
  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearchContext() {
  const context = useContext(GlobalSearchContext);
  if (!context) {
    throw new Error("useGlobalSearchContext must be used within GlobalSearchProvider");
  }
  return context;
}

function useGlobalSearchProviderValue() {
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
  const [limitParam, setLimitParam] = useQueryState(
    "limit",
    parseAsString.withDefault("12")
  );

  const [localSearch, setLocalSearch] = useState(searchParam || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [counts, setCounts] = useState(EMPTY_COUNTS);

  const searchQuery = searchParam || "";
  const activeType = typeParam || "all";

  const page = useMemo(() => {
    const parsed = Number.parseInt(pageParam || "1", 10);
    if (Number.isNaN(parsed) || parsed < 1) return 1;
    return parsed;
  }, [pageParam]);

  const limit = useMemo(() => {
    const parsed = Number.parseInt(limitParam || "12", 10);
    if (Number.isNaN(parsed) || parsed < 1) return 12;
    return Math.min(24, parsed);
  }, [limitParam]);

  useEffect(() => {
    setLocalSearch(searchQuery || "");
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setSearchParam(localSearch);
        setPageParam("1");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, setPageParam, setSearchParam]);

  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (!trimmed) {
      setResults(EMPTY_RESULTS);
      setCounts(EMPTY_COUNTS);
      setError(null);
      setLoading(false);
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    const fetchResults = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = new URL("/api/search", window.location.origin);
        url.searchParams.set("q", trimmed);

        if (activeType && activeType !== "all") {
          url.searchParams.set("type", activeType);
          url.searchParams.set("page", String(page));
          url.searchParams.set("limit", String(limit));
        }

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          if (!ignore) {
            setError(body?.message || "Unable to load search results.");
            setResults(EMPTY_RESULTS);
            setCounts(EMPTY_COUNTS);
          }
          return;
        }

        const body = await response.json().catch(() => ({}));
        if (!ignore) {
          setResults({
            products: Array.isArray(body?.results?.products)
              ? body.results.products
              : [],
            registries: Array.isArray(body?.results?.registries)
              ? body.results.registries
              : [],
            vendors: Array.isArray(body?.results?.vendors)
              ? body.results.vendors
              : [],
          });
          setCounts({
            products: body?.counts?.products || 0,
            registries: body?.counts?.registries || 0,
            vendors: body?.counts?.vendors || 0,
          });
        }
      } catch (err) {
        if (!ignore && err?.name !== "AbortError") {
          setError(err?.message || "Unable to load search results.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchResults();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [activeType, limit, page, searchQuery]);

  const hasQuery = searchQuery.trim().length > 0;

  const handleTypeChange = useCallback(
    (nextType) => {
      setTypeParam(nextType || "all");
      setPageParam("1");
    },
    [setPageParam, setTypeParam]
  );

  const totalCount = useMemo(() => {
    if (activeType === "products") return counts.products || 0;
    if (activeType === "registries") return counts.registries || 0;
    if (activeType === "vendors") return counts.vendors || 0;
    return counts.products + counts.registries + counts.vendors;
  }, [activeType, counts]);

  const totalPages = useMemo(() => {
    if (activeType === "all") return 1;
    const pages = Math.ceil((totalCount || 0) / (limit || 1));
    return Math.max(1, pages);
  }, [activeType, limit, totalCount]);

  const canPrevious = activeType !== "all" && page > 1;
  const canNext = activeType !== "all" && page < totalPages;

  return {
    localSearch,
    setLocalSearch,
    loading,
    error,
    results,
    counts,
    searchQuery,
    activeType,
    page,
    limit,
    totalCount,
    totalPages,
    canPrevious,
    canNext,
    hasQuery,
    handleTypeChange,
    setPageParam,
    setLimitParam,
  };
}
