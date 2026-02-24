"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { parseAsString, useQueryState } from "nuqs";

const NewsletterSubscribersContext = createContext();

const normalizePage = (value) => {
  const number = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(number) || number < 1) return 1;
  return number;
};

const normalizeStatus = (value) => {
  const raw = String(value || "all").trim().toLowerCase();
  if (!raw) return "all";
  if (raw === "subscribed" || raw === "unsubscribed") return raw;
  return "all";
};

const normalizeDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  return valid ? raw : "";
};

export function NewsletterSubscribersProvider({ children }) {
  const value = useNewsletterSubscribersProviderValue();

  return (
    <NewsletterSubscribersContext.Provider value={value}>
      {children}
    </NewsletterSubscribersContext.Provider>
  );
}

function useNewsletterSubscribersProviderValue() {
  const [rows, setRows] = useState([]);
  const [sources, setSources] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pageSize] = useState(10);

  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );
  const [statusParam, setStatusParam] = useQueryState(
    "status",
    parseAsString.withDefault("all"),
  );
  const [sourceParam, setSourceParam] = useQueryState(
    "source",
    parseAsString.withDefault("all"),
  );
  const [fromParam, setFromParam] = useQueryState(
    "from",
    parseAsString.withDefault(""),
  );
  const [toParam, setToParam] = useQueryState(
    "to",
    parseAsString.withDefault(""),
  );
  const [pageParam, setPageParam] = useQueryState(
    "page",
    parseAsString.withDefault("1"),
  );

  const page = useMemo(() => normalizePage(pageParam), [pageParam]);
  const searchTerm = String(searchParam || "").trim();
  const statusFilter = normalizeStatus(statusParam);
  const sourceFilter = String(sourceParam || "all").trim() || "all";
  const fromDate = normalizeDate(fromParam);
  const toDate = normalizeDate(toParam);

  const setPage = useCallback(
    (next) => {
      const resolved =
        typeof next === "function" ? next(page) : Number.parseInt(String(next), 10);
      setPageParam(String(normalizePage(resolved)));
    },
    [page, setPageParam],
  );

  const setSearchTerm = useCallback(
    (value) => {
      setSearchParam(String(value || ""));
      setPageParam("1");
    },
    [setSearchParam, setPageParam],
  );

  const setStatusFilter = useCallback(
    (value) => {
      setStatusParam(normalizeStatus(value));
      setPageParam("1");
    },
    [setStatusParam, setPageParam],
  );

  const setSourceFilter = useCallback(
    (value) => {
      const next = String(value || "all").trim() || "all";
      setSourceParam(next);
      setPageParam("1");
    },
    [setSourceParam, setPageParam],
  );

  const setFromDate = useCallback(
    (value) => {
      setFromParam(normalizeDate(value));
      setPageParam("1");
    },
    [setFromParam, setPageParam],
  );

  const setToDate = useCallback(
    (value) => {
      setToParam(normalizeDate(value));
      setPageParam("1");
    },
    [setToParam, setPageParam],
  );

  const clearFilters = useCallback(() => {
    setSearchParam("");
    setStatusParam("all");
    setSourceParam("all");
    setFromParam("");
    setToParam("");
    setPageParam("1");
  }, [
    setSearchParam,
    setStatusParam,
    setSourceParam,
    setFromParam,
    setToParam,
    setPageParam,
  ]);

  const refresh = useCallback(() => {
    setRefreshKey((previous) => previous + 1);
  }, []);

  useEffect(() => {
    let ignore = false;

    const fetchSubscribers = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        params.set("status", statusFilter);
        params.set("source", sourceFilter || "all");
        if (searchTerm) params.set("q", searchTerm);
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);

        const response = await fetch(
          `/api/admin/newsletter-subscribers?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load newsletter subscribers.");
        }

        if (ignore) return;

        setRows(Array.isArray(payload?.rows) ? payload.rows : []);
        setSources(Array.isArray(payload?.sources) ? payload.sources : []);
        setTotal(Number(payload?.total) || 0);
      } catch (fetchError) {
        if (!ignore) {
          setRows([]);
          setTotal(0);
          setError(fetchError?.message || "Failed to load newsletter subscribers.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchSubscribers();

    return () => {
      ignore = true;
    };
  }, [
    page,
    pageSize,
    searchTerm,
    statusFilter,
    sourceFilter,
    fromDate,
    toDate,
    refreshKey,
  ]);

  return useMemo(
    () => ({
      rows,
      sources,
      total,
      loading,
      error,
      page,
      pageSize,
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
      refresh,
    }),
    [
      rows,
      sources,
      total,
      loading,
      error,
      page,
      pageSize,
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
      refresh,
    ],
  );
}

export const useNewsletterSubscribersContext = () =>
  useContext(NewsletterSubscribersContext);
