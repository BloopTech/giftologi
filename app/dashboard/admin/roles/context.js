"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
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
  const refreshStaff = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, [setRefreshKey]);
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

        const staffRoles = [
          "super_admin",
          "finance_admin",
          "operations_manager_admin",
          "customer_support_admin",
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

          // Staff array includes both real staff profiles and pending invites.
          // Ensure the total used in the footer reflects both.
          setStaff(enriched);
          const totalProfiles = count ?? (baseRows ? baseRows.length : 0);
          setStaffTotal(totalProfiles + pendingInvites.length);
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
      refreshStaff,
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
      refreshStaff,
      setSearchParam,
    ]
  );

  return (
    <RolesContext.Provider value={value}>{children}</RolesContext.Provider>
  );
};

export const useRolesContext = () => useContext(RolesContext);
