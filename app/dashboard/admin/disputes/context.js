"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";

const DisputesContext = createContext();

export const DisputesProvider = ({ children }) => {
  const value = useDisputesProviderValue();
  return (
    <DisputesContext.Provider value={value}>
      {children}
    </DisputesContext.Provider>
  );
};

function useDisputesProviderValue() {
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Metrics
  const [metrics, setMetrics] = useState({
    total: 0,
    open: 0,
    investigating: 0,
    resolved: 0,
    closed: 0,
  });

  // Selected dispute for detail panel
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Fetch disputes
  useEffect(() => {
    let ignore = false;
    const fetchDisputes = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("disputes")
        .select(
          `
          id,
          order_id,
          order_item_id,
          return_request_id,
          dispute_type,
          status,
          priority,
          subject,
          description,
          guest_email,
          guest_name,
          assigned_to,
          resolution,
          resolved_at,
          closed_at,
          created_at,
          updated_at,
          order:orders(id, order_code, total_amount, buyer_email, gifter_email, status)
        `
        )
        .order("created_at", { ascending: false });

      if (ignore) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      setDisputes(rows);

      // Compute metrics
      const m = { total: rows.length, open: 0, investigating: 0, resolved: 0, closed: 0 };
      for (const d of rows) {
        if (d.status === "open") m.open++;
        else if (d.status === "investigating") m.investigating++;
        else if (d.status === "resolved") m.resolved++;
        else if (d.status === "closed") m.closed++;
      }
      setMetrics(m);
      setLoading(false);
    };

    fetchDisputes();
    return () => { ignore = true; };
  }, [supabase, refreshKey]);

  // Fetch return requests that don't have a dispute yet (for auto-creation)
  const [pendingReturns, setPendingReturns] = useState([]);
  const [loadingReturns, setLoadingReturns] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchPendingReturns = async () => {
      setLoadingReturns(true);

      // Get return requests that are pending and not linked to any dispute
      const { data: returns } = await supabase
        .from("return_requests")
        .select(
          `
          id,
          order_id,
          order_item_id,
          request_type,
          status,
          reason,
          details,
          guest_email,
          guest_name,
          created_at,
          order:orders(id, order_code, total_amount, buyer_email)
        `
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (ignore) return;

      // Filter out those already linked to a dispute
      const linkedIds = new Set(
        disputes
          .filter((d) => d.return_request_id)
          .map((d) => d.return_request_id)
      );
      const unlinked = (returns || []).filter((r) => !linkedIds.has(r.id));
      setPendingReturns(unlinked);
      setLoadingReturns(false);
    };

    fetchPendingReturns();
    return () => { ignore = true; };
  }, [supabase, disputes, refreshKey]);

  // Fetch notes for selected dispute
  useEffect(() => {
    if (!selectedDispute?.id) {
      setNotes([]);
      return;
    }

    let ignore = false;
    const fetchNotes = async () => {
      setLoadingNotes(true);
      const { data } = await supabase
        .from("dispute_notes")
        .select("id, author_id, author_name, content, created_at")
        .eq("dispute_id", selectedDispute.id)
        .order("created_at", { ascending: true });

      if (!ignore) {
        setNotes(Array.isArray(data) ? data : []);
        setLoadingNotes(false);
      }
    };

    fetchNotes();
    return () => { ignore = true; };
  }, [supabase, selectedDispute?.id, refreshKey]);

  // Filtered disputes
  const filteredDisputes = useMemo(() => {
    let result = [...disputes];

    if (statusFilter !== "all") {
      result = result.filter((d) => d.status === statusFilter);
    }
    if (priorityFilter !== "all") {
      result = result.filter((d) => d.priority === priorityFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.subject?.toLowerCase().includes(term) ||
          d.guest_email?.toLowerCase().includes(term) ||
          d.guest_name?.toLowerCase().includes(term) ||
          d.order?.order_code?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [disputes, statusFilter, priorityFilter, searchTerm]);

  return {
    disputes: filteredDisputes,
    allDisputes: disputes,
    loading,
    error,
    metrics,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    searchTerm,
    setSearchTerm,
    refresh,
    selectedDispute,
    setSelectedDispute,
    notes,
    loadingNotes,
    pendingReturns,
    loadingReturns,
  };
}

export const useDisputesContext = () => useContext(DisputesContext);
