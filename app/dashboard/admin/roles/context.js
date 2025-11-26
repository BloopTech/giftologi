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

const RolesContext = createContext();

export const RolesProvider = ({ children }) => {
  const [staff, setStaff] = useState([]);
  const [staffPage, setStaffPage] = useState(0);
  const [pageSize] = useState(10);
  const [staffTotal, setStaffTotal] = useState(0);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [errorStaff, setErrorStaff] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );
  const staffSearchTerm = searchParam || "";
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [loadingCurrentAdmin, setLoadingCurrentAdmin] = useState(true);

  useEffect(() => {
    let ignore = false;

    const fetchStaff = async () => {
      setLoadingStaff(true);
      setErrorStaff(null);

      try {
        const supabase = createSupabaseClient();
        const from = staffPage * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from("profiles")
          .select(
            "id, email, firstname, lastname, phone, role, status, created_at, updated_at, created_by",
            { count: "exact" }
          )
          .in("role", [
            "super_admin",
            "finance_admin",
            "operations_manager_admin",
            "customer_support_admin",
          ]);

        if (staffSearchTerm && staffSearchTerm.trim()) {
          const term = staffSearchTerm.trim();
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
            setErrorStaff(error.message);
            setStaff([]);
            setStaffTotal(0);
          }
          return;
        }

        if (!ignore) {
          let enriched = data || [];

          try {
            const creatorIds = Array.from(
              new Set(
                (enriched || [])
                  .map((row) => row.created_by)
                  .filter(Boolean)
              )
            );

            let creatorMap = {};

            if (creatorIds.length) {
              const { data: creators } = await supabase
                .from("profiles")
                .select("id, firstname, lastname, email")
                .in("id", creatorIds);

              if (creators && Array.isArray(creators)) {
                creatorMap = creators.reduce((acc, profile) => {
                  const nameParts = [profile.firstname, profile.lastname].filter(
                    Boolean
                  );
                  const name =
                    (nameParts.length
                      ? nameParts.join(" ")
                      : profile.email || "") || "—";
                  acc[profile.id] = name;
                  return acc;
                }, {});
              }
            }

            enriched = enriched.map((row) => ({
              ...row,
              created_by_label: row.created_by
                ? creatorMap[row.created_by] || "—"
                : "—",
            }));
          } catch (_) {
            // best-effort enrichment; ignore errors here
          }

          setStaff(enriched);
          setStaffTotal(count ?? (enriched ? enriched.length : 0));
        }
      } catch (error) {
        if (!ignore) {
          setErrorStaff(error?.message || "Failed to load staff");
          setStaff([]);
          setStaffTotal(0);
        }
      } finally {
        if (!ignore) {
          setLoadingStaff(false);
        }
      }
    };

    fetchStaff();
    return () => {
      ignore = true;
    };
  }, [staffPage, pageSize, refreshKey, staffSearchTerm]);

  useEffect(() => {
    let ignore = false;

    const fetchCurrentAdmin = async () => {
      try {
        const supabase = createSupabaseClient();
        const {
          data: userResult,
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !userResult?.user) {
          if (!ignore) {
            setCurrentAdmin(null);
          }
          return;
        }

        const userId = userResult.user.id;

        const { data, error } = await supabase
          .from("profiles")
          .select("id, role, firstname, lastname, email")
          .eq("id", userId)
          .single();

        if (!ignore) {
          if (!error) {
            setCurrentAdmin(data || null);
          } else {
            setCurrentAdmin(null);
          }
        }
      } catch (_) {
        if (!ignore) {
          setCurrentAdmin(null);
        }
      } finally {
        if (!ignore) {
          setLoadingCurrentAdmin(false);
        }
      }
    };

    fetchCurrentAdmin();
    return () => {
      ignore = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      staff,
      staffPage,
      pageSize,
      staffTotal,
      loadingStaff,
      errorStaff,
      setStaffPage,
      refreshStaff: () => setRefreshKey((prev) => prev + 1),
      staffSearchTerm,
      setStaffSearchTerm: setSearchParam,
      currentAdmin,
      loadingCurrentAdmin,
    }),
    [
      staff,
      staffPage,
      pageSize,
      staffTotal,
      loadingStaff,
      errorStaff,
      staffSearchTerm,
      currentAdmin,
      loadingCurrentAdmin,
      setSearchParam,
    ]
  );

  return (
    <RolesContext.Provider value={value}>{children}</RolesContext.Provider>
  );
};

export const useRolesContext = () => useContext(RolesContext);
