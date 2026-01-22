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
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";
import { useQueryState, parseAsString } from "nuqs";

const AllUsersContext = createContext();

export const AllUsersProvider = ({ children }) => {
  const value = useAllUsersProviderValue();

  return (
    <AllUsersContext.Provider value={value}>
      {children}
    </AllUsersContext.Provider>
  );
};

function useAllUsersProviderValue() {
  const [users, setUsers] = useState([]);
  const [pageSize] = useState(10);
  const [usersTotal, setUsersTotal] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const refreshUsers = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, [setRefreshKey]);

  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );
  const [roleParam, setRoleParam] = useQueryState(
    "role",
    parseAsString.withDefault("all")
  );
  const [statusParam, setStatusParam] = useQueryState(
    "status",
    parseAsString.withDefault("all")
  );
  const [pageParam, setPageParam] = useQueryState(
    "page",
    parseAsString.withDefault("1")
  );
  const [focusIdParam, setFocusIdParam] = useQueryState(
    "focusId",
    parseAsString.withDefault("")
  );

  const searchTerm = searchParam || "";
  const roleFilter = (roleParam || "all").toLowerCase();
  const statusFilter = statusParam || "all";
  const focusId = focusIdParam || "";

  const lastAppliedFocusIdRef = useRef("");

  const usersPage = useMemo(() => {
    const num = parseInt(pageParam || "1", 10);
    if (Number.isNaN(num) || num < 1) return 0;
    return num - 1;
  }, [pageParam]);

  const setUsersPage = useCallback(
    (next) => {
      const resolved =
        typeof next === "function" ? next(usersPage) : Number(next);
      const safe = Number.isFinite(resolved) && resolved >= 0 ? resolved : 0;
      setPageParam(String(safe + 1));
    },
    [setPageParam, usersPage]
  );

  const setSearchTerm = useCallback(
    (value) => {
      setSearchParam(value || "");
      setPageParam("1");
    },
    [setSearchParam, setPageParam]
  );

  const setRoleFilter = useCallback(
    (value) => {
      setRoleParam(value || "all");
      setPageParam("1");
    },
    [setRoleParam, setPageParam]
  );

  const setStatusFilter = useCallback(
    (value) => {
      setStatusParam(value || "all");
      setPageParam("1");
    },
    [setStatusParam, setPageParam]
  );

  useEffect(() => {
    let ignore = false;

    const fetchUsers = async () => {
      setLoadingUsers(true);
      setErrorUsers(null);

      try {
        const supabase = createSupabaseClient();

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
          );

        if (roleFilter && roleFilter !== "all") {
          if (
            roleFilter === "host" ||
            roleFilter === "vendor" ||
            roleFilter === "guest"
          ) {
            profilesQuery = profilesQuery.eq("role", roleFilter);
          } else if (roleFilter === "admin" || roleFilter === "staff") {
            profilesQuery = profilesQuery.in("role", staffRoles);
          }
        }

        if (statusFilter && statusFilter !== "all") {
          profilesQuery = profilesQuery.eq("status", statusFilter);
        }

        if (searchTerm && searchTerm.trim()) {
          const term = searchTerm.trim();
          profilesQuery = profilesQuery.textSearch("search_vector", term, {
            type: "websearch",
            config: "simple",
          });
        }

        const allInviteRoles = [
          ...staffRoles,
          "host",
          "guest",
          "vendor",
        ];

        let inviteRolesForFilter = [];
        if (!roleFilter || roleFilter === "all") {
          inviteRolesForFilter = allInviteRoles;
        } else if (roleFilter === "admin" || roleFilter === "staff") {
          inviteRolesForFilter = staffRoles;
        } else if (
          roleFilter === "host" ||
          roleFilter === "guest" ||
          roleFilter === "vendor"
        ) {
          inviteRolesForFilter = [roleFilter];
        }

        const shouldIncludeInvites =
          inviteRolesForFilter.length > 0 &&
          (statusFilter === "all" || statusFilter === "Pending");

        const signupProfilesPromise = shouldIncludeInvites
          ? supabase
              .from("signup_profiles")
              .select(
                "user_id, email, firstname, lastname, phone, role, created_at, updated_at, created_by"
              )
              .in("role", inviteRolesForFilter)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null });

        const [
          { data: profileRows, error: profilesError, count },
          { data: signupRows },
        ] = await Promise.all([
          profilesQuery.order("created_at", { ascending: false }),
          signupProfilesPromise,
        ]);

        if (profilesError) {
          if (!ignore) {
            setErrorUsers(profilesError.message);
            setUsers([]);
            setUsersTotal(0);
          }
          return;
        }

        if (!ignore) {
          const baseRows = Array.isArray(profileRows) ? profileRows : [];

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
                  __source: "invite",
                }))
            : [];

          let enriched = [...pendingInvites, ...baseRows];

          try {
            const creatorIds = Array.from(
              new Set(
                enriched
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
                  const nameParts = [
                    profile.firstname,
                    profile.lastname,
                  ].filter(Boolean);
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
          } catch (_) {}

          try {
            const profileIds = Array.from(
              new Set(
                enriched
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
                const authMetaMap = lastLoginRows.reduce((acc, item) => {
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
                    authMetaMap[row.id]?.last_sign_in_at ?? row.last_sign_in_at ?? null,
                  auth_created_at:
                    authMetaMap[row.id]?.auth_created_at ?? row.auth_created_at ?? null,
                }));
              }
            }
          } catch (_) {}

          const totalItems = enriched.length;

          if (focusId && focusId !== lastAppliedFocusIdRef.current) {
            const focusIndex = enriched.findIndex((row) => row?.id === focusId);
            if (focusIndex >= 0) {
              const desiredPage = Math.floor(focusIndex / pageSize);
              if (desiredPage !== usersPage) {
                lastAppliedFocusIdRef.current = focusId;
                setPageParam(String(desiredPage + 1));
                setUsers([]);
                setUsersTotal(totalItems);
                return;
              }
              lastAppliedFocusIdRef.current = focusId;
            }
          }

          const startIndex = usersPage * pageSize;
          const endIndex = startIndex + pageSize;
          const pageSlice = enriched.slice(startIndex, endIndex);

          setUsers(pageSlice);
          setUsersTotal(totalItems);
        }
      } catch (error) {
        if (!ignore) {
          setErrorUsers(error?.message || "Failed to load users");
          setUsers([]);
          setUsersTotal(0);
        }
      } finally {
        if (!ignore) {
          setLoadingUsers(false);
        }
      }
    };

    fetchUsers();
    return () => {
      ignore = true;
    };
  }, [
    usersPage,
    pageSize,
    searchTerm,
    roleFilter,
    statusFilter,
    focusId,
    refreshKey,
    setPageParam,
  ]);

  return useMemo(
    () => ({
      users,
      usersPage,
      pageSize,
      usersTotal,
      loadingUsers,
      errorUsers,
      setUsersPage,
      refreshUsers,
      searchTerm,
      setSearchTerm,
      roleFilter,
      setRoleFilter,
      statusFilter,
      setStatusFilter,
      focusId,
      setFocusId: (value) => setFocusIdParam(value || ""),
    }),
    [
      users,
      usersPage,
      pageSize,
      usersTotal,
      loadingUsers,
      errorUsers,
      setUsersPage,
      searchTerm,
      setSearchTerm,
      roleFilter,
      statusFilter,
      refreshUsers,
      setRoleFilter,
      setStatusFilter,
      focusId,
      setFocusIdParam,
    ]
  );
}

export const useAllUsersContext = () => useContext(AllUsersContext);
