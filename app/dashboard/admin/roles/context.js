"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useQueryState, parseAsString } from "nuqs";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";

const RolesContext = createContext();

export const RolesProvider = ({ children }) => {
  const [staff, setStaff] = useState([]);
  const [pageSize] = useState(10);
  const [staffTotal, setStaffTotal] = useState(0);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [errorStaff, setErrorStaff] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshStaff = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, [setRefreshKey]);
  
  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );
  const [pageParam, setPageParam] = useQueryState(
    "page",
    parseAsString.withDefault("1")
  );
  const [focusIdParam, setFocusIdParam] = useQueryState(
    "focusId",
    parseAsString.withDefault("")
  );
  const staffSearchTerm = searchParam || "";
  const focusId = focusIdParam || "";
  const lastAppliedFocusIdRef = useRef("");

  const staffPage = useMemo(() => {
    const num = parseInt(pageParam || "1", 10);
    if (Number.isNaN(num) || num < 1) return 0;
    return num - 1;
  }, [pageParam]);

  const setStaffPage = useCallback(
    (next) => {
      const resolved =
        typeof next === "function" ? next(staffPage) : Number(next);
      const safe = Number.isFinite(resolved) && resolved >= 0 ? resolved : 0;
      setPageParam(String(safe + 1));
    },
    [staffPage, setPageParam]
  );

  const setStaffSearchTerm = useCallback(
    (value) => {
      setSearchParam(value || "");
      setPageParam("1");
    },
    [setSearchParam, setPageParam]
  );

  const setFocusId = useCallback(
    (value) => {
      setFocusIdParam(value || "");
    },
    [setFocusIdParam]
  );
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

        const staffRoles = [
          "super_admin",
          "finance_admin",
          "operations_manager_admin",
          "customer_support_admin",
          "store_manager_admin",
          "marketing_admin",
        ];

        let profilesQuery = supabase
          .from("profiles")
          .select(
            "id, email, firstname, lastname, phone, role, status, created_at, updated_at, created_by",
            { count: "exact" }
          )
          .in("role", staffRoles);

        if (staffSearchTerm && staffSearchTerm.trim()) {
          const term = staffSearchTerm.trim();
          profilesQuery = profilesQuery.textSearch("search_vector", term, {
            type: "websearch",
            config: "simple",
          });
        }

        const [{ data: profileRows, error: profilesError, count }, { data: signupRows }] =
          await Promise.all([
            profilesQuery.order("created_at", { ascending: false }).range(from, to),
            supabase
              .from("signup_profiles")
              .select(
                "user_id, email, firstname, lastname, phone, role, created_at, updated_at, created_by"
              )
              .in("role", staffRoles)
              .order("created_at", { ascending: false }),
          ]);

        if (profilesError) {
          if (!ignore) {
            setErrorStaff(profilesError.message);
            setStaff([]);
            setStaffTotal(0);
          }
          return;
        }

        if (!ignore) {
          const baseRows = profileRows || [];
          const existingIds = new Set(baseRows.map((row) => row.id));

          const pendingInvites = Array.isArray(signupRows)
            ? signupRows
                .filter((row) => row.user_id && !existingIds.has(row.user_id))
                .map((row) => ({
                  id: row.user_id,
                  email: row.email,
                  firstname: row.firstname,
                  lastname: row.lastname,
                  phone: row.phone,
                  role: row.role,
                  status: "Pending",
                  created_at: row.created_at,
                  updated_at: row.updated_at,
                  created_by: row.created_by,
                }))
            : [];

          let enriched = [...pendingInvites, ...baseRows];

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

          try {
            const profileIds = Array.from(
              new Set(
                (enriched || [])
                  .map((row) => row.id)
                  .filter(Boolean)
              )
            );

            if (profileIds.length) {
              const { data: lastLoginRows } = await supabase.rpc(
                "get_last_sign_in_for_profiles",
                { profile_ids: profileIds }
              );

              if (Array.isArray(lastLoginRows)) {
                const lastLoginMap = lastLoginRows.reduce((acc, item) => {
                  if (item && item.profile_id) {
                    acc[item.profile_id] = {
                      last_sign_in_at: item.last_sign_in_at || null,
                      auth_created_at: item.created_at || null,
                    };
                  }
                  return acc;
                }, {});

                enriched = enriched.map((row) => ({
                  ...row,
                  last_sign_in_at:
                    lastLoginMap[row.id]?.last_sign_in_at ?? row.last_sign_in_at ?? null,
                  auth_created_at:
                    lastLoginMap[row.id]?.auth_created_at ?? row.auth_created_at ?? null,
                }));
              }
            }
          } catch (_) {
            // ignore auth metadata enrichment failures
          }

          const focusValue = focusId ? String(focusId).trim() : "";
          const totalProfiles = count ?? (baseRows ? baseRows.length : 0);
          const totalForFooter = totalProfiles + pendingInvites.length;

          if (focusValue && lastAppliedFocusIdRef.current !== focusValue) {
            const inPage = (enriched || []).some(
              (row) => row && String(row.id) === focusValue
            );

            if (!inPage) {
              const focusLookup = await supabase
                .from("profiles")
                .select("id, created_at")
                .eq("id", focusValue)
                .maybeSingle();

              if (focusLookup?.data?.id && focusLookup.data.created_at) {
                let verifyQuery = supabase
                  .from("profiles")
                  .select("id")
                  .eq("id", focusLookup.data.id)
                  .in("role", [
                    "super_admin",
                    "finance_admin",
                    "operations_manager_admin",
                    "customer_support_admin",
                    "store_manager_admin",
                    "marketing_admin",
                  ]);

                if (staffSearchTerm && staffSearchTerm.trim()) {
                  const term = staffSearchTerm.trim();
                  verifyQuery = verifyQuery.textSearch("search_vector", term, {
                    type: "websearch",
                    config: "simple",
                  });
                }

                const verifyResult = await verifyQuery.maybeSingle();

                if (verifyResult?.data?.id) {
                  let rankQuery = supabase
                    .from("profiles")
                    .select("id", { count: "exact", head: true })
                    .in("role", [
                      "super_admin",
                      "finance_admin",
                      "operations_manager_admin",
                      "customer_support_admin",
                      "store_manager_admin",
                      "marketing_admin",
                    ])
                    .gt("created_at", focusLookup.data.created_at);

                  if (staffSearchTerm && staffSearchTerm.trim()) {
                    const term = staffSearchTerm.trim();
                    rankQuery = rankQuery.textSearch("search_vector", term, {
                      type: "websearch",
                      config: "simple",
                    });
                  }

                  const rankResult = await rankQuery;
                  const beforeCount =
                    typeof rankResult?.count === "number" ? rankResult.count : 0;
                  const desiredPage = Math.floor(beforeCount / pageSize);
                  lastAppliedFocusIdRef.current = focusValue;

                  if (desiredPage !== staffPage) {
                    setPageParam(String(desiredPage + 1));
                    setStaff([]);
                    setStaffTotal(totalForFooter);
                    return;
                  }
                }
              }
            } else {
              lastAppliedFocusIdRef.current = focusValue;
            }
          }

          // Staff array includes both real staff profiles and pending invites.
          // Ensure the total used in the footer reflects both.
          setStaff(enriched);
          setStaffTotal(totalForFooter);
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
  }, [staffPage, pageSize, refreshKey, staffSearchTerm, focusId, setPageParam]);

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
      refreshStaff,
      staffSearchTerm,
      setStaffSearchTerm,
      focusId,
      setFocusId,
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
      setStaffSearchTerm,
      focusId,
      setFocusId,
      currentAdmin,
      loadingCurrentAdmin,
      refreshStaff,
      setStaffPage,
    ]
  );

  return (
    <RolesContext.Provider value={value}>{children}</RolesContext.Provider>
  );
};

export const useRolesContext = () => useContext(RolesContext);
