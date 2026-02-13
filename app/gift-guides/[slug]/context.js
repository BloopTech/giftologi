"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "next/navigation";

const GuideDetailContext = createContext();

export function GuideDetailProvider({ children }) {
  const value = useGuideDetailProviderValue();
  return (
    <GuideDetailContext.Provider value={value}>
      {children}
    </GuideDetailContext.Provider>
  );
}

export function useGuideDetailContext() {
  return useContext(GuideDetailContext);
}

const buildLabelMap = (arr) => {
  const map = {};
  (arr || []).forEach((item) => {
    if (item.value && item.label) map[item.value] = item.label;
  });
  return map;
};

function useGuideDetailProviderValue() {
  const { slug } = useParams();

  const [guide, setGuide] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [occasions, setOccasions] = useState([]);
  const [budgetRanges, setBudgetRanges] = useState([]);

  const occasionLabels = useMemo(() => buildLabelMap(occasions), [occasions]);
  const budgetLabels = useMemo(() => buildLabelMap(budgetRanges), [budgetRanges]);

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [guideRes, lookupsRes] = await Promise.all([
          fetch(`/api/gift-guides/${slug}`),
          fetch("/api/gift-guides/lookups"),
        ]);

        if (!guideRes.ok) throw new Error("Guide not found");

        const guideData = await guideRes.json();
        const lookupsData = lookupsRes.ok ? await lookupsRes.json() : {};

        if (!ignore) {
          setGuide(guideData.guide);
          setItems(guideData.items || []);
          setOccasions(lookupsData.occasions || []);
          setBudgetRanges(lookupsData.budgetRanges || []);
        }
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    if (slug) fetchData();

    return () => {
      ignore = true;
    };
  }, [slug]);

  return {
    slug,
    guide,
    items,
    loading,
    error,
    occasionLabels,
    budgetLabels,
  };
}
