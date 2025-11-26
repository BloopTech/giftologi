"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryState, parseAsString } from "nuqs";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";

const VendorRequestsContext = createContext();

export const VendorRequestsProvider = ({ children }) => {
  const value = useVendorRequestsProviderValue();

  return (
    <VendorRequestsContext.Provider value={value}>
      {children}
    </VendorRequestsContext.Provider>
  );
};

function useVendorRequestsProviderValue() {
  const [requests, setRequests] = useState([]);
  const [requestsPage, setRequestsPage] = useState(0);
  const [pageSize] = useState(10);
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [errorRequests, setErrorRequests] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );
  const searchTerm = searchParam || "";

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
          .from("vendor_applications")
          .select(
            `
            id,
            user_id,
            business_name,
            category,
            status,
            created_at,
            profiles:profiles!vendor_applications_user_id_fkey (
              id,
              firstname,
              lastname,
              email
            )
          `,
            { count: "exact" }
          )
          .eq("status", "pending");

        if (searchTerm && searchTerm.trim()) {
          const term = searchTerm.trim();
          query = query.textSearch("search_vector", term, {
            type: "websearch",
            config: "simple",
          });
        }

        const { data, error, count } = await query
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) {
          if (!ignore) {
            setErrorRequests(error.message);
            setRequests([]);
            setRequestsTotal(0);
          }
          return;
        }

        if (!ignore) {
          const enriched = (data || []).map((row, index) => {
            const profile = row.profiles || null;
            const nameParts = [];
            if (profile?.firstname) nameParts.push(profile.firstname);
            if (profile?.lastname) nameParts.push(profile.lastname);
            const contactName =
              nameParts.join(" ") || profile?.email || "—";

            const vendorCodeSuffix = String(index + 1).padStart(3, "0");
            const vendorIdLabel = `VEN-${vendorCodeSuffix}`;

            return {
              id: row.id,
              vendorId: vendorIdLabel,
              businessName: row.business_name || contactName || "—",
              category: row.category || "",
              status: row.status || "pending",
              appliedDate: row.created_at,
              contactName,
              contactEmail: profile?.email || "",
              __raw: row,
            };
          });

          setRequests(enriched);
          setRequestsTotal(count ?? (enriched ? enriched.length : 0));
        }
      } catch (error) {
        if (!ignore) {
          setErrorRequests(error?.message || "Failed to load vendor requests");
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
  }, [requestsPage, pageSize, searchTerm, refreshKey]);

  return useMemo(
    () => ({
      requests,
      requestsPage,
      pageSize,
      requestsTotal,
      loadingRequests,
      errorRequests,
      setRequestsPage,
      refreshRequests: () => setRefreshKey((prev) => prev + 1),
      searchTerm,
      setSearchTerm: setSearchParam,
    }),
    [
      requests,
      requestsPage,
      pageSize,
      requestsTotal,
      loadingRequests,
      errorRequests,
      searchTerm,
      setSearchParam,
    ]
  );
}

export const useVendorRequestsContext = () => useContext(VendorRequestsContext);
