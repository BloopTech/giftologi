"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const SupportContext = createContext();

export function SupportProvider({ children }) {
  const value = useSupportProviderValue();
  return (
    <SupportContext.Provider value={value}>{children}</SupportContext.Provider>
  );
}

export function useSupportContext() {
  return useContext(SupportContext);
}

function useSupportProviderValue() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let ignore = false;

    const fetchTickets = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/support");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load tickets");
        }
        const data = await res.json();
        if (!ignore) setTickets(data.tickets || []);
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchTickets();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const metrics = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "open").length;
    const inProgress = tickets.filter(
      (t) => t.status === "in_progress"
    ).length;
    const resolved = tickets.filter((t) => t.status === "resolved").length;
    return { total, open, inProgress, resolved };
  }, [tickets]);

  return {
    tickets,
    loading,
    error,
    metrics,
    refresh,
  };
}
