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

const AdminSupportContext = createContext();

export const AdminSupportProvider = ({ children }) => {
  const value = useAdminSupportProviderValue();
  return (
    <AdminSupportContext.Provider value={value}>
      {children}
    </AdminSupportContext.Provider>
  );
};

export function useAdminSupportContext() {
  return useContext(AdminSupportContext);
}

function useAdminSupportProviderValue() {
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const [metrics, setMetrics] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  });

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Fetch all tickets
  useEffect(() => {
    let ignore = false;
    const fetchTickets = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("support_tickets")
        .select(
          `
          id,
          subject,
          description,
          category,
          status,
          priority,
          order_id,
          assigned_admin_id,
          guest_email,
          guest_name,
          created_by,
          created_at,
          updated_at,
          resolved_at,
          closed_at,
          creator:profiles!support_tickets_created_by_fkey(id, firstname, lastname, email, image)
        `
        )
        .order("created_at", { ascending: false });

      if (ignore) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const rows = data || [];
      setTickets(rows);

      setMetrics({
        total: rows.length,
        open: rows.filter((t) => t.status === "open").length,
        in_progress: rows.filter((t) => t.status === "in_progress").length,
        resolved: rows.filter((t) => t.status === "resolved").length,
        closed: rows.filter((t) => t.status === "closed").length,
      });

      setLoading(false);
    };

    fetchTickets();
    return () => {
      ignore = true;
    };
  }, [supabase, refreshKey]);

  // Fetch messages for selected ticket
  const fetchMessages = useCallback(
    async (ticketId) => {
      if (!ticketId) return;
      setLoadingMessages(true);
      const { data } = await supabase
        .from("support_ticket_messages")
        .select("id, sender_id, sender_role, message, attachments, created_at")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      setLoadingMessages(false);
    },
    [supabase]
  );

  useEffect(() => {
    if (selectedTicket?.id) {
      fetchMessages(selectedTicket.id);
    } else {
      setMessages([]);
    }
  }, [selectedTicket?.id, fetchMessages]);

  const filteredTickets = useMemo(() => {
    let result = tickets;

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.subject?.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term) ||
          t.guest_email?.toLowerCase().includes(term) ||
          t.guest_name?.toLowerCase().includes(term) ||
          t.creator?.email?.toLowerCase().includes(term) ||
          t.creator?.firstname?.toLowerCase().includes(term) ||
          t.creator?.lastname?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [tickets, statusFilter, categoryFilter, searchTerm]);

  return {
    tickets: filteredTickets,
    allTickets: tickets,
    loading,
    error,
    metrics,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    searchTerm,
    setSearchTerm,
    refresh,
    selectedTicket,
    setSelectedTicket,
    messages,
    loadingMessages,
    fetchMessages,
  };
}
