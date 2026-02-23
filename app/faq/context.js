"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const FaqContext = createContext(null);

export function FaqProvider({ children }) {
  const value = useFaqValue();
  return <FaqContext.Provider value={value}>{children}</FaqContext.Provider>;
}

export function useFaqContext() {
  return useContext(FaqContext);
}

function useFaqValue() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/faqs", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load FAQs");
        }

        if (!ignore) {
          setFaqs(Array.isArray(payload?.faqs) ? payload.faqs : []);
        }
      } catch (err) {
        if (!ignore) {
          setError(err?.message || "Failed to load FAQs");
          setFaqs([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const normalizedQuery = String(searchQuery || "")
    .toLowerCase()
    .trim();

  const filteredFaqs = useMemo(() => {
    if (!normalizedQuery) return faqs;

    return faqs.filter((faq) => {
      const haystack = `${faq?.question || ""} ${faq?.answer || ""} ${faq?.category || ""}`
        .toLowerCase()
        .trim();
      return haystack.includes(normalizedQuery);
    });
  }, [faqs, normalizedQuery]);

  const groupedFaqs = useMemo(() => {
    return filteredFaqs.reduce((acc, faq) => {
      const category = String(faq?.category || "General").trim() || "General";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(faq);
      return acc;
    }, {});
  }, [filteredFaqs]);

  const categories = useMemo(
    () =>
      Object.keys(groupedFaqs).sort((a, b) => {
        if (a === "General") return -1;
        if (b === "General") return 1;
        return a.localeCompare(b);
      }),
    [groupedFaqs],
  );

  return {
    faqs,
    filteredFaqs,
    groupedFaqs,
    categories,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    refresh,
  };
}
