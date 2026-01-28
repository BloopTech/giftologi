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
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";

const CloseRequestsContext = createContext();

export const CloseRequestsProvider = ({ children }) => {
  const value = useCloseRequestsProviderValue();

  return (
    <CloseRequestsContext.Provider value={value}>
      {children}
    </CloseRequestsContext.Provider>
  );
};

function useCloseRequestsProviderValue() {
  const [requests, setRequests] = useState([]);
  const [pageSize] = useState(10);
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [errorRequests, setErrorRequests] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshRequests = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const [pageParam, setPageParam] = useQueryState(
    "page",
    parseAsString.withDefault("1"),
  );
  const parsedPage = useMemo(() => {
    const raw = typeof pageParam === "string" ? pageParam.trim() : "";
    const value = Number.parseInt(raw || "1", 10);
    if (Number.isNaN(value) || value < 1) return 1;
    return value;
  }, [pageParam]);
  const requestsPage = Math.max(0, parsedPage - 1);

  const setRequestsPage = useCallback(
    (valueOrUpdater) => {
      const prev = requestsPage;
      const nextRaw =
        typeof valueOrUpdater === "function" ? valueOrUpdater(prev) : valueOrUpdater;
      const next =
        typeof nextRaw === "number" && Number.isFinite(nextRaw) ? nextRaw : 0;
      const normalized = Math.max(0, Math.floor(next));
      setPageParam(String(normalized + 1));
    },
    [requestsPage, setPageParam],
  );

  const [statusParam, setStatusParam] = useQueryState(
    "status",
    parseAsString.withDefault("all"),
  );
  const statusFilter = (statusParam || "all").toLowerCase();

  useEffect(() => {
    let ignore = false;

    const fetchRequests = async () => {
      setLoadingRequests(true);
      setErrorRequests(null);

      try {
        const supabase = createSupabaseClient();
        const from = requestsPage * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from("vendor_close_requests")
          .select(
            "id, vendor_id, user_id, reason, reason_type, status, created_at, reviewed_at, admin_notes",
            { count: "exact" },
          )
          .order("created_at", { ascending: false });

        if (statusFilter !== "all") {
          query = query.eq("status", statusFilter);
        }

        const { data, error, count } = await query.range(from, to);

        if (error) {
          if (!ignore) {
            setErrorRequests(error.message);
            setRequests([]);
            setRequestsTotal(0);
          }
          return;
        }

        const requestRows = Array.isArray(data) ? data : [];
        const vendorIds = Array.from(
          new Set(requestRows.map((row) => row?.vendor_id).filter(Boolean)),
        );
        const userIds = Array.from(
          new Set(requestRows.map((row) => row?.user_id).filter(Boolean)),
        );

        const vendorById = new Map();
        const profileById = new Map();

        if (vendorIds.length > 0) {
          const { data: vendorRows } = await supabase
            .from("vendors")
            .select("id, business_name, profiles_id")
            .in("id", vendorIds)
            .order("created_at", { ascending: false });

          (vendorRows || []).forEach((vendor) => {
            if (vendor?.id) vendorById.set(vendor.id, vendor);
          });
        }

        if (userIds.length > 0) {
          const { data: profileRows } = await supabase
            .from("profiles")
            .select("id, firstname, lastname, email")
            .in("id", userIds);

          (profileRows || []).forEach((profile) => {
            if (profile?.id) profileById.set(profile.id, profile);
          });
        }

        if (!ignore) {
          const enriched = requestRows.map((row) => {
            const vendor = vendorById.get(row.vendor_id);
            const requester = profileById.get(row.user_id);
            const requesterName = [requester?.firstname, requester?.lastname]
              .filter(Boolean)
              .join(" ")
              .trim();

            return {
              id: row.id,
              vendorId: row.vendor_id,
              vendorName: vendor?.business_name || "Unknown Vendor",
              reason: row.reason || "—",
              reasonType: row.reason_type || "—",
              status: row.status || "pending",
              createdAt: row.created_at,
              reviewedAt: row.reviewed_at,
              adminNotes: row.admin_notes || "",
              requesterName: requesterName || requester?.email || "—",
              requesterEmail: requester?.email || "",
            };
          });

          setRequests(enriched);
          setRequestsTotal(count ?? enriched.length);
        }
      } catch (error) {
        if (!ignore) {
          setErrorRequests(error?.message || "Failed to load close requests");
          setRequests([]);
          setRequestsTotal(0);
        }
      } finally {
        if (!ignore) {
          setLoadingRequests(false);
        }
      }
    };

    fetchRequests();
    return () => {
      ignore = true;
    };
  }, [requestsPage, pageSize, statusFilter, refreshKey]);

  const setStatusFilter = useCallback(
    (value) => {
      setStatusParam(value || "all");
      setPageParam("1");
    },
    [setStatusParam, setPageParam],
  );

  return useMemo(
    () => ({
      requests,
      requestsPage,
      pageSize,
      requestsTotal,
      loadingRequests,
      errorRequests,
      setRequestsPage,
      refreshRequests,
      statusFilter,
      setStatusFilter,
    }),
    [
      requests,
      requestsPage,
      pageSize,
      requestsTotal,
      loadingRequests,
      errorRequests,
      setRequestsPage,
      refreshRequests,
      statusFilter,
      setStatusFilter,
    ],
  );
}

export const useCloseRequestsContext = () => useContext(CloseRequestsContext);
