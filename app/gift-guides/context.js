"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const GiftGuidesContext = createContext(null);

const buildLabelMap = (arr) => {
  const map = {};
  (arr || []).forEach((item) => {
    if (item?.value && item?.label) map[item.value] = item.label;
  });
  return map;
};

export function GiftGuidesProvider({ children }) {
  const value = useGiftGuidesProviderValue();
  return (
    <GiftGuidesContext.Provider value={value}>{children}</GiftGuidesContext.Provider>
  );
}

export function useGiftGuidesContext() {
  const context = useContext(GiftGuidesContext);
  if (!context) {
    throw new Error("useGiftGuidesContext must be used within GiftGuidesProvider");
  }
  return context;
}

function useGiftGuidesProviderValue() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [occasions, setOccasions] = useState([]);
  const [budgetRanges, setBudgetRanges] = useState([]);

  const occasionLabels = useMemo(() => buildLabelMap(occasions), [occasions]);
  const budgetLabels = useMemo(() => buildLabelMap(budgetRanges), [budgetRanges]);

  const fetchGuides = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [guidesRes, lookupsRes] = await Promise.all([
        fetch("/api/gift-guides", { cache: "no-store" }),
        fetch("/api/gift-guides/lookups", { cache: "no-store" }),
      ]);

      if (!guidesRes.ok) throw new Error("Failed to load guides");

      const guidesData = await guidesRes.json().catch(() => ({}));
      const lookupsData = lookupsRes.ok
        ? await lookupsRes.json().catch(() => ({}))
        : {};

      setGuides(Array.isArray(guidesData?.guides) ? guidesData.guides : []);
      setOccasions(
        Array.isArray(lookupsData?.occasions) ? lookupsData.occasions : []
      );
      setBudgetRanges(
        Array.isArray(lookupsData?.budgetRanges) ? lookupsData.budgetRanges : []
      );
    } catch (err) {
      setGuides([]);
      setError(err?.message || "Failed to load guides");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuides();
  }, [fetchGuides]);

  return {
    guides,
    loading,
    error,
    occasionLabels,
    budgetLabels,
    refetchGuides: fetchGuides,
  };
}
