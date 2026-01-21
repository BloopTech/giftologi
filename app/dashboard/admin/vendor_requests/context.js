"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  const [pageSize] = useState(10);
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [errorRequests, setErrorRequests] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshRequests = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, [setRefreshKey]);

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
        typeof valueOrUpdater === "function"
          ? valueOrUpdater(prev)
          : valueOrUpdater;
      const next =
        typeof nextRaw === "number" && Number.isFinite(nextRaw) ? nextRaw : 0;
      const normalized = Math.max(0, Math.floor(next));
      setPageParam(String(normalized + 1));
    },
    [requestsPage, setPageParam],
  );

  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );
  const searchTerm = searchParam || "";

  const [statusParam, setStatusParam] = useQueryState(
    "status",
    parseAsString.withDefault("all"),
  );
  const statusFilter = (statusParam || "all").toLowerCase();

  const [focusIdParam, setFocusIdParam] = useQueryState(
    "focusId",
    parseAsString.withDefault(""),
  );
  const focusId = focusIdParam || "";
  const lastAppliedFocusIdRef = useRef("");

  useEffect(() => {
    let ignore = false;

    const fetchRequests = async () => {
      setLoadingRequests(true);
      setErrorRequests(null);

      try {
        const supabase = createSupabaseClient();
        const from = requestsPage * pageSize;
        const to = from + pageSize - 1;

        const trimmedSearch = searchTerm ? searchTerm.trim() : "";
        const ftsTokens = trimmedSearch
          ? trimmedSearch
              .split(/\s+/)
              .filter(Boolean)
              .map((t) => `${t}:*`)
              .join(" & ")
          : "";

        let query = supabase
          .from("vendor_applications")
          .select(
            `
            id,
            user_id,
            business_name,
            category,
            status,
            is_flagged,
            created_at,
            business_type,
            business_registration_number,
            tax_id,
            years_in_business,
            website,
            business_description,
            street_address,
            city,
            region,
            digital_address,
            owner_full_name,
            owner_email,
            owner_phone,
            business_references,
            documents,
            verification_notes,
            bank_account_name,
            bank_name,
            bank_account_number,
            bank_branch_code,
            bank_branch,
            financial_verification_notes,
            flagged_at,
            flagged_by,
            profiles:profiles!vendor_applications_user_id_fkey (
              id,
              firstname,
              lastname,
              email
            )
          `,
            { count: "exact" },
          )
          .order("created_at", { ascending: false });

        if (statusFilter !== "all") {
          query = query.eq("status", statusFilter);
        }

        if (ftsTokens) {
          query = query.filter("search_vector", "fts", ftsTokens);
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

        if (!ignore) {
          const enriched = (data || []).map((row, index) => {
            const profile = row.profiles || null;
            const nameParts = [];
            if (profile?.firstname) nameParts.push(profile.firstname);
            if (profile?.lastname) nameParts.push(profile.lastname);
            const contactName = nameParts.join(" ") || profile?.email || "—";

            const vendorCodeSuffix = String(index + 1).padStart(3, "0");
            const vendorIdLabel = `VEN-${vendorCodeSuffix}`;

            return {
              id: row.id,
              vendorId: vendorIdLabel,
              businessName: row.business_name || contactName || "—",
              category: row.category || "",
              status: row.status || "pending",
              isFlagged: !!row.is_flagged,
              appliedDate: row.created_at,
              contactName,
              contactEmail: profile?.email || "",
              __raw: row,
            };
          });

          setRequests(enriched);
          setRequestsTotal(count ?? (enriched ? enriched.length : 0));

          if (focusId && focusId !== lastAppliedFocusIdRef.current) {
            const focusValue = String(focusId).trim();
            const focusRow = enriched.find((row) => row?.id === focusValue);

            if (!focusRow) {
              const focusLookup = await supabase
                .from("vendor_applications")
                .select("id, created_at")
                .eq("id", focusValue)
                .maybeSingle();

              if (focusLookup?.data?.id && focusLookup.data.created_at) {
                let verifyQuery = supabase
                  .from("vendor_applications")
                  .select("id")
                  .eq("id", focusLookup.data.id);

                if (statusFilter !== "all") {
                  verifyQuery = verifyQuery.eq("status", statusFilter);
                }

                if (ftsTokens) {
                  verifyQuery = verifyQuery.filter(
                    "search_vector",
                    "fts",
                    ftsTokens,
                  );
                }

                const verifyResult = await verifyQuery.maybeSingle();

                if (verifyResult?.data?.id) {
                  let rankQuery = supabase
                    .from("vendor_applications")
                    .select("id", { count: "exact", head: true })
                    .gt("created_at", focusLookup.data.created_at);

                  if (statusFilter !== "all") {
                    rankQuery = rankQuery.eq("status", statusFilter);
                  }

                  if (ftsTokens) {
                    rankQuery = rankQuery.filter(
                      "search_vector",
                      "fts",
                      ftsTokens,
                    );
                  }

                  const rankResult = await rankQuery;
                  const beforeCount =
                    typeof rankResult?.count === "number"
                      ? rankResult.count
                      : 0;
                  const desiredPage = Math.floor(beforeCount / pageSize);

                  lastAppliedFocusIdRef.current = focusValue;
                  if (desiredPage !== requestsPage) {
                    setPageParam(String(desiredPage + 1));
                    setRequests([]);
                    setRequestsTotal(count ?? 0);
                    return;
                  }
                }
              }
            } else {
              lastAppliedFocusIdRef.current = focusValue;
            }
          }
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
  }, [
    requestsPage,
    pageSize,
    searchTerm,
    statusFilter,
    focusId,
    refreshKey,
    setPageParam,
  ]);

  const setSearchTerm = useCallback(
    (value) => {
      setSearchParam(value || "");
      setPageParam("1");
    },
    [setSearchParam, setPageParam],
  );

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
      searchTerm,
      setSearchTerm,
      statusFilter,
      setStatusFilter,
      focusId,
      setFocusId: setFocusIdParam,
    }),
    [
      requests,
      requestsPage,
      pageSize,
      requestsTotal,
      loadingRequests,
      errorRequests,
      searchTerm,
      statusFilter,
      setRequestsPage,
      refreshKey,
      setSearchTerm,
      setStatusFilter,
      focusId,
      setFocusIdParam,
    ],
  );
}

export const useVendorRequestsContext = () => useContext(VendorRequestsContext);
