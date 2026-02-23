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

const AllUsersContext = createContext();

const STATUS_CANONICAL_MAP = {
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
  pending: "Pending",
  deleted: "Deleted",
};

const normalizeStatusFilter = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "all";
  const lower = raw.toLowerCase();
  if (lower === "all") return "all";
  return STATUS_CANONICAL_MAP[lower] || raw;
};

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
  const statusFilter = normalizeStatusFilter(statusParam || "all");
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
      setStatusParam(normalizeStatusFilter(value || "all"));
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
        const params = new URLSearchParams();
        if (searchTerm) params.set("q", searchTerm);
        if (roleFilter) params.set("role", roleFilter);
        if (statusFilter) params.set("status", statusFilter);

        const response = await fetch(`/api/admin/all-users?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load users");
        }

        if (!ignore) {
          const enriched = Array.isArray(payload?.rows) ? payload.rows : [];
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
