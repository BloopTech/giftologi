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

const ActivityLogContext = createContext();

const DEFAULT_ACTION_FILTER = "all";
const DEFAULT_USER_FILTER = "all";
const DEFAULT_PAGE = "1";
const PAGE_SIZE = 8;

const ACTION_META = {
  created_staff: { label: "created staff", variant: "success" },
  updated_staff: { label: "updated staff", variant: "neutral" },
  updated_account: { label: "updated account", variant: "neutral" },
  suspended_account: { label: "suspended account", variant: "error" },
  reactivated_account: { label: "reactivated account", variant: "success" },
  deleted_staff: { label: "deleted staff", variant: "error" },

  approved_vendor: { label: "approved vendor", variant: "success" },
  rejected_vendor: { label: "rejected vendor", variant: "error" },
  flagged_vendor: { label: "flagged vendor", variant: "warning" },

  approved_product: { label: "approved product", variant: "success" },
  rejected_product: { label: "rejected product", variant: "error" },
  flagged_product: { label: "flagged product", variant: "warning" },

  updated_registry_event: {
    label: "updated registry event",
    variant: "neutral",
  },
  flagged_registry: { label: "flagged registry", variant: "warning" },
  deleted_registry: { label: "deleted registry", variant: "error" },

  approved_payout: { label: "approved payout", variant: "success" },
  updated_order_status: {
    label: "updated order status",
    variant: "neutral",
  },

  view_report: { label: "view report", variant: "neutral" },
  system_event: { label: "system event", variant: "warning" },
};

const IMPORTANT_ACTIONS_ORDER = [
  "suspended_account",
  "deleted_staff",
  "flagged_vendor",
  "flagged_product",
  "flagged_registry",
  "approved_vendor",
  "approved_product",
  "approved_payout",
  "created_staff",
  "updated_order_status",
  "updated_registry_event",
  "updated_staff",
  "updated_account",
  "view_report",
  "system_event",
];

function normalizeActionKey(action) {
  if (!action) return "";
  return String(action).toLowerCase().replace(/\s+/g, "_");
}

function resolveActionMeta(action) {
  const key = normalizeActionKey(action);
  const meta = ACTION_META[key];

  if (meta) {
    return { key, ...meta };
  }

  const label = key
    ? key
        .replace(/_/g, " ")
        .replace(/^[a-z]/, (c) => c.toUpperCase())
    : "Unknown";

  return {
    key,
    label,
    variant: "neutral",
  };
}

function formatTimestampLabel(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (_) {
    return date.toISOString();
  }
}

function mapDbRowToActivityRow(row) {
  const createdAt = row?.created_at ?? null;
  const meta = resolveActionMeta(row?.action);

  return {
    id: row?.id,
    timestamp: createdAt,
    timestampLabel: formatTimestampLabel(createdAt),
    adminId: row?.admin_id ?? null,
    adminEmail: row?.admin_email ?? "",
    adminName: row?.admin_name ?? "",
    action: meta.key,
    actionLabel: meta.label,
    actionVariant: meta.variant,
    entity: row?.entity ?? "",
    targetId: row?.target_id ?? "",
    details: row?.details ?? "",
  };
}

function escapeCsvCell(value) {
  if (value === null || typeof value === "undefined") return "";
  const str = String(value);
  if (str.includes("\"") || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv({ fileName, columns, rows }) {
  const headerLine = columns.map((col) => escapeCsvCell(col.label)).join(",");
  const rowLines = Array.isArray(rows)
    ? rows.map((row) =>
        columns.map((col) => escapeCsvCell(row[col.key])).join(",")
      )
    : [];

  const csvContent = [headerLine, ...rowLines].join("\n");
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function useActivityLogProviderValue() {
  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );
  const [focusIdParam, setFocusIdParam] = useQueryState(
    "focusId",
    parseAsString.withDefault("")
  );
  const [actionParam, setActionParam] = useQueryState(
    "action",
    parseAsString.withDefault(DEFAULT_ACTION_FILTER)
  );
  const [userParam, setUserParam] = useQueryState(
    "user",
    parseAsString.withDefault(DEFAULT_USER_FILTER)
  );
  const [pageParam, setPageParam] = useQueryState(
    "page",
    parseAsString.withDefault(DEFAULT_PAGE)
  );

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const search = searchParam || "";
  const focusId = focusIdParam || "";
  const actionFilter = actionParam || DEFAULT_ACTION_FILTER;
  const userFilter = userParam || DEFAULT_USER_FILTER;

  const lastAppliedFocusIdRef = useRef("");

  const pageIndex = useMemo(() => {
    const num = parseInt(pageParam || DEFAULT_PAGE, 10);
    if (Number.isNaN(num) || num < 1) return 0;
    return num - 1;
  }, [pageParam]);

  const pageSize = PAGE_SIZE;

  const setSearch = useCallback(
    (value) => {
      setSearchParam(value || "");
      setPageParam(DEFAULT_PAGE);
    },
    [setSearchParam, setPageParam]
  );

  const setActionFilter = useCallback(
    (value) => {
      const next = value || DEFAULT_ACTION_FILTER;
      setActionParam(next);
      setPageParam(DEFAULT_PAGE);
    },
    [setActionParam, setPageParam]
  );

  const setUserFilter = useCallback(
    (value) => {
      const next = value || DEFAULT_USER_FILTER;
      setUserParam(next);
      setPageParam(DEFAULT_PAGE);
    },
    [setUserParam, setPageParam]
  );

  const setPageIndex = useCallback(
    (index) => {
      const safeIndex = Number.isFinite(index) && index >= 0 ? index : 0;
      setPageParam(String(safeIndex + 1));
    },
    [setPageParam]
  );

  const setFocusId = useCallback(
    (value) => {
      setFocusIdParam(value || "");
    },
    [setFocusIdParam]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createSupabaseClient();
        const from = pageIndex * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from("admin_activity_log")
          .select(
            "id, created_at, admin_id, admin_email, admin_name, action, entity, target_id, details",
            { count: "exact" }
          )
          .order("created_at", { ascending: false })
          .range(from, to);

        if (actionFilter && actionFilter !== DEFAULT_ACTION_FILTER) {
          query = query.eq("action", actionFilter);
        }

        if (userFilter && userFilter !== DEFAULT_USER_FILTER) {
          query = query.eq("admin_email", userFilter);
        }

        const trimmedSearch = search.trim();
        if (trimmedSearch) {
          query = query.textSearch("search_vector", trimmedSearch, {
            type: "websearch",
            config: "simple",
          });
        }

        const { data, error: queryError, count } = await query;

        if (cancelled) return;

        if (queryError) {
          console.error("Failed to load admin activity log", queryError);
          setError(queryError.message || "Failed to load admin activity log");
          setLogs([]);
          setTotal(0);
          return;
        }

        const rows = Array.isArray(data) ? data.map(mapDbRowToActivityRow) : [];

        const focusValue = focusId ? String(focusId).trim() : "";

        if (focusValue && lastAppliedFocusIdRef.current !== focusValue) {
          const inPage = rows.some((row) => String(row?.id) === focusValue);

          if (!inPage) {
            const supabase = createSupabaseClient();
            const focusLookup = await supabase
              .from("admin_activity_log")
              .select(
                "id, created_at, admin_id, admin_email, admin_name, action, entity, target_id, details"
              )
              .eq("id", focusValue)
              .maybeSingle();

            if (focusLookup?.data?.id && focusLookup.data.created_at) {
              let verifyQuery = supabase
                .from("admin_activity_log")
                .select("id")
                .eq("id", focusLookup.data.id);

              if (actionFilter && actionFilter !== DEFAULT_ACTION_FILTER) {
                verifyQuery = verifyQuery.eq("action", actionFilter);
              }

              if (userFilter && userFilter !== DEFAULT_USER_FILTER) {
                verifyQuery = verifyQuery.eq("admin_email", userFilter);
              }

              if (trimmedSearch) {
                verifyQuery = verifyQuery.textSearch(
                  "search_vector",
                  trimmedSearch,
                  {
                    type: "websearch",
                    config: "simple",
                  }
                );
              }

              const verifyResult = await verifyQuery.maybeSingle();

              if (verifyResult?.data?.id) {
                let rankQuery = supabase
                  .from("admin_activity_log")
                  .select("id", { count: "exact", head: true })
                  .gt("created_at", focusLookup.data.created_at);

                if (actionFilter && actionFilter !== DEFAULT_ACTION_FILTER) {
                  rankQuery = rankQuery.eq("action", actionFilter);
                }

                if (userFilter && userFilter !== DEFAULT_USER_FILTER) {
                  rankQuery = rankQuery.eq("admin_email", userFilter);
                }

                if (trimmedSearch) {
                  rankQuery = rankQuery.textSearch(
                    "search_vector",
                    trimmedSearch,
                    {
                      type: "websearch",
                      config: "simple",
                    }
                  );
                }

                const rankResult = await rankQuery;
                const beforeCount =
                  typeof rankResult?.count === "number" ? rankResult.count : 0;
                const desiredPageIndex = Math.floor(beforeCount / pageSize);

                lastAppliedFocusIdRef.current = focusValue;
                if (desiredPageIndex !== pageIndex) {
                  setPageParam(String(desiredPageIndex + 1));
                  setLogs([]);
                  setTotal(typeof count === "number" ? count : rows.length);
                  return;
                }
              }

              const focusRow = mapDbRowToActivityRow(focusLookup.data);
              if (!rows.some((row) => String(row?.id) === focusValue)) {
                rows.unshift(focusRow);
              }

              lastAppliedFocusIdRef.current = focusValue;
            }
          } else {
            lastAppliedFocusIdRef.current = focusValue;
          }
        }

        setLogs(rows);
        setTotal(typeof count === "number" ? count : rows.length);
      } catch (err) {
        if (cancelled) return;
        console.error("Unexpected error loading admin activity log", err);
        setError("Failed to load admin activity log");
        setLogs([]);
        setTotal(0);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [search, actionFilter, userFilter, pageIndex, pageSize, focusId, setPageParam]);

  const pageCount = useMemo(() => {
    if (!total) return 1;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  const pageStart = useMemo(() => {
    if (!total) return 0;
    return pageIndex * pageSize + 1;
  }, [pageIndex, pageSize, total]);

  const pageEnd = useMemo(() => {
    if (!total) return 0;
    return Math.min(total, (pageIndex + 1) * pageSize);
  }, [pageIndex, pageSize, total]);

  const availableActions = useMemo(() => {
    const set = new Set();
    logs.forEach((row) => {
      if (row?.action) set.add(row.action);
    });

    const actions = Array.from(set).map((action) => {
      const meta = resolveActionMeta(action);
      const priorityIndex = IMPORTANT_ACTIONS_ORDER.indexOf(meta.key);
      return {
        value: meta.key,
        label: meta.label,
        priority:
          priorityIndex === -1 ? Number.MAX_SAFE_INTEGER : priorityIndex,
      };
    });

    return actions
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.label.localeCompare(b.label);
      })
      .map(({ priority, ...rest }) => rest);
  }, [logs]);

  const availableUsers = useMemo(() => {
    const map = new Map();
    logs.forEach((row) => {
      const email = row?.adminEmail || "";
      if (!email) return;
      if (!map.has(email)) {
        map.set(email, row?.adminName || email);
      }
    });

    return Array.from(map.entries()).map(([email, name]) => ({
      value: email,
      label: name,
    }));
  }, [logs]);

  const exportLogs = useCallback(async () => {
    setExporting(true);

    try {
      const supabase = createSupabaseClient();

      let query = supabase
        .from("admin_activity_log")
        .select(
          "id, created_at, admin_id, admin_email, admin_name, action, entity, target_id, details",
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      if (actionFilter && actionFilter !== DEFAULT_ACTION_FILTER) {
        query = query.eq("action", actionFilter);
      }

      if (userFilter && userFilter !== DEFAULT_USER_FILTER) {
        query = query.eq("admin_email", userFilter);
      }

      const trimmedSearch = search.trim();
      if (trimmedSearch) {
        query = query.textSearch("search_vector", trimmedSearch, {
          type: "websearch",
          config: "simple",
        });
      }

      const { data, error: exportError } = await query;

      if (exportError) {
        console.error("Failed to export admin activity log", exportError);
        throw new Error(exportError.message || "Failed to export activity log");
      }

      const rows = Array.isArray(data) ? data.map(mapDbRowToActivityRow) : [];

      const columns = [
        { key: "timestampLabel", label: "Timestamp" },
        { key: "adminEmail", label: "Admin Email" },
        { key: "adminName", label: "Admin Name" },
        { key: "actionLabel", label: "Action" },
        { key: "entity", label: "Entity" },
        { key: "targetId", label: "Target ID" },
        { key: "details", label: "Details" },
      ];

      downloadCsv({
        fileName: `admin_activity_log_${new Date()
          .toISOString()
          .slice(0, 10)}`,
        columns,
        rows,
      });
    } catch (err) {
      console.error("Unexpected error exporting admin activity log", err);
      // Let the caller decide how to surface errors (e.g. toast in UI)
    } finally {
      setExporting(false);
    }
  }, [actionFilter, userFilter, search]);

  return useMemo(
    () => ({
      logs,
      total,
      loading,
      error,
      search,
      actionFilter,
      userFilter,
      pageIndex,
      pageSize,
      pageCount,
      pageStart,
      pageEnd,
      setSearch,
      setActionFilter,
      setUserFilter,
      setPageIndex,
      focusId,
      setFocusId,
      availableActions,
      availableUsers,
      exporting,
      exportLogs,
    }),
    [
      logs,
      total,
      loading,
      error,
      search,
      actionFilter,
      userFilter,
      pageIndex,
      pageSize,
      pageCount,
      pageStart,
      pageEnd,
      setSearch,
      setActionFilter,
      setUserFilter,
      setPageIndex,
      focusId,
      setFocusId,
      availableActions,
      availableUsers,
      exporting,
      exportLogs,
    ]
  );
}

export const ActivityLogProvider = ({ children }) => {
  const value = useActivityLogProviderValue();

  return (
    <ActivityLogContext.Provider value={value}>
      {children}
    </ActivityLogContext.Provider>
  );
};

export const useActivityLogContext = () =>
  useContext(ActivityLogContext);
