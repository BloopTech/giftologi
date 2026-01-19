"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";
import { useQueryState, parseAsString } from "nuqs";

const RegistryListContext = createContext();

export const RegistryListProvider = ({ children }) => {
  const value = useRegistryListProviderValue();

  return (
    <RegistryListContext.Provider value={value}>
      {children}
    </RegistryListContext.Provider>
  );
};

function useRegistryListProviderValue() {
  const [registries, setRegistries] = useState([]);
  const [pageSize] = useState(10);
  const [registriesTotal, setRegistriesTotal] = useState(0);
  const [loadingRegistries, setLoadingRegistries] = useState(false);
  const [errorRegistries, setErrorRegistries] = useState(null);

  const [metrics, setMetrics] = useState({
    activeRegistries: null,
    expiredRegistries: null,
    flaggedRegistries: null,
    totalRegistries: null,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState(null);

  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );
  const [typeFilter, setTypeFilter] = useQueryState(
    "by",
    parseAsString.withDefault("all")
  );
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString.withDefault("all")
  );
  const [pageParam, setPageParam] = useQueryState(
    "page",
    parseAsString.withDefault("1")
  );
  const [externalTypeParam] = useQueryState(
    "type",
    parseAsString.withDefault("all")
  );
  const [focusIdParam, setFocusIdParam] = useQueryState(
    "focusId",
    parseAsString.withDefault("")
  );
  const searchTerm = searchParam || "";
  const externalType = (externalTypeParam || "all").toLowerCase();
  const isExternalHostOrGuest =
    externalType === "host" || externalType === "guest";
  const focusId = focusIdParam || "";
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshRegistries = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, [setRefreshKey]);

  const lastAppliedFocusIdRef = useRef("");

  const registryPage = useMemo(() => {
    const num = parseInt(pageParam || "1", 10);
    if (Number.isNaN(num) || num < 1) return 0;
    return num - 1;
  }, [pageParam]);

  const setRegistryPage = useCallback(
    (next) => {
      const resolved =
        typeof next === "function" ? next(registryPage) : Number(next);
      const safe = Number.isFinite(resolved) && resolved >= 0 ? resolved : 0;
      setPageParam(String(safe + 1));
    },
    [registryPage, setPageParam]
  );

  const setSearchTerm = useCallback(
    (value) => {
      setSearchParam(value || "");
      setPageParam("1");
    },
    [setSearchParam, setPageParam]
  );

  const setByFilter = useCallback(
    (value) => {
      setTypeFilter(value || "all");
      setPageParam("1");
    },
    [setTypeFilter, setPageParam]
  );

  const setStatus = useCallback(
    (value) => {
      setStatusFilter(value || "all");
      setPageParam("1");
    },
    [setStatusFilter, setPageParam]
  );

  const setFocusId = useCallback(
    (value) => {
      setFocusIdParam(value || "");
    },
    [setFocusIdParam]
  );

  useEffect(() => {
    let ignore = false;

    const fetchMetrics = async () => {
      setMetricsError(null);
      setLoadingMetrics(true);

      try {
        const supabase = createSupabaseClient();
        const nowIso = new Date().toISOString();

        const [
          { count: totalCount, error: totalError },
          { count: activeCount, error: activeError },
          { count: expiredCount, error: expiredError },
          { data: flaggedTickets, error: flaggedError },
        ] = await Promise.all([
          supabase.from("registries").select("id", { count: "exact" }),
          supabase
            .from("registries")
            .select("id", { count: "exact" })
            .gte("deadline", nowIso),
          supabase
            .from("registries")
            .select("id", { count: "exact" })
            .lt("deadline", nowIso),
          supabase
            .from("support_tickets")
            .select("registry_id, status")
            .eq("status", "escalated"),
        ]);

        if (ignore) return;

        if (totalError || activeError || expiredError || flaggedError) {
          const message =
            totalError?.message ||
            activeError?.message ||
            expiredError?.message ||
            flaggedError?.message ||
            "Failed to load registry metrics";
          setMetricsError(message);
        }

        let flaggedCount = null;
        if (Array.isArray(flaggedTickets)) {
          const ids = new Set();
          for (const row of flaggedTickets) {
            if (row?.registry_id) ids.add(row.registry_id);
          }
          flaggedCount = ids.size;
        }

        setMetrics({
          activeRegistries:
            typeof activeCount === "number" ? activeCount : null,
          expiredRegistries:
            typeof expiredCount === "number" ? expiredCount : null,
          flaggedRegistries: flaggedCount,
          totalRegistries: typeof totalCount === "number" ? totalCount : null,
        });
      } catch (error) {
        if (!ignore) {
          setMetricsError(error?.message || "Failed to load registry metrics");
        }
      } finally {
        if (!ignore) {
          setLoadingMetrics(false);
        }
      }
    };

    fetchMetrics();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const fetchRegistries = async () => {
      setLoadingRegistries(true);
      setErrorRegistries(null);

      try {
        const supabase = createSupabaseClient();
        const from = registryPage * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from("registries")
          .select(
            "id, title, deadline, event_id, registry_code, created_at, updated_at",
            { count: "exact" }
          );

        // Only apply FTS on registries when not coming from an external host/guest search,
        // so that host-based global searches don't drop registries prematurely.
        // Also avoid FTS for very short queries (e.g. 1-2 characters) so that
        // in-memory filtering on fields like hostEmail can still work.
        const trimmedSearch = searchTerm ? searchTerm.trim() : "";
        if (
          trimmedSearch &&
          trimmedSearch.length >= 3 &&
          !isExternalHostOrGuest &&
          (!typeFilter ||
            typeFilter === "registry_name" ||
            typeFilter === "registry_code")
        ) {
          query = query.textSearch("search_vector", trimmedSearch, {
            type: "websearch",
            config: "simple",
          });
        }

        const hasSearch = !!trimmedSearch;

        const registryQuery = hasSearch
          ? query.order("created_at", { ascending: false })
          : query.order("created_at", { ascending: false }).range(from, to);

        const {
          data: registryRows,
          error: registryError,
          count,
        } = await registryQuery;

        if (registryError) {
          if (!ignore) {
            setErrorRegistries(registryError.message);
            setRegistries([]);
            setRegistriesTotal(0);
          }
          return;
        }

        if (!registryRows || !registryRows.length) {
          if (!ignore) {
            setRegistries([]);
            setRegistriesTotal(count ?? 0);
          }
          return;
        }

        const baseRegistries = registryRows;
        const registryIds = baseRegistries.map((r) => r.id).filter(Boolean);
        const eventIds = baseRegistries.map((r) => r.event_id).filter(Boolean);

        const eventsPromise = eventIds.length
          ? supabase
              .from("events")
              .select("id, host_id, type, date")
              .in("id", eventIds)
          : Promise.resolve({ data: [], error: null });

        const registryItemsPromise = registryIds.length
          ? supabase
              .from("registry_items")
              .select("id, registry_id, quantity_needed, purchased_qty")
              .in("registry_id", registryIds)
          : Promise.resolve({ data: [], error: null });

        const ticketsPromise = registryIds.length
          ? supabase
              .from("support_tickets")
              .select("registry_id, status")
              .in("registry_id", registryIds)
              .eq("status", "escalated")
          : Promise.resolve({ data: [], error: null });

        const [
          { data: eventsData, error: eventsError },
          { data: registryItemsData, error: registryItemsError },
          { data: flaggedTickets, error: ticketsError },
        ] = await Promise.all([
          eventsPromise,
          registryItemsPromise,
          ticketsPromise,
        ]);

        if (eventsError || registryItemsError || ticketsError) {
          const message =
            eventsError?.message ||
            registryItemsError?.message ||
            ticketsError?.message ||
            "Failed to enrich registries";
          if (!ignore) {
            setErrorRegistries(message);
          }
        }

        const registryItemIds = Array.isArray(registryItemsData)
          ? registryItemsData.map((row) => row.id).filter(Boolean)
          : [];

        const {
          data: orderItemsData,
          error: orderItemsError,
        } = registryItemIds.length
          ? await supabase
              .from("order_items")
              .select("registry_item_id, quantity, price, order_id")
              .in("registry_item_id", registryItemIds)
          : { data: [], error: null };

        if (orderItemsError && !ignore) {
          setErrorRegistries(orderItemsError.message);
        }

        const hostIds = Array.isArray(eventsData)
          ? Array.from(
              new Set(eventsData.map((ev) => ev.host_id).filter(Boolean))
            )
          : [];

        const {
          data: hostProfilesData,
          error: profilesError,
        } = hostIds.length
          ? await supabase
              .from("profiles")
              .select("id, firstname, lastname, email")
              .in("id", hostIds)
          : { data: [], error: null };

        if (profilesError && !ignore) {
          setErrorRegistries(profilesError.message);
        }

        if (ignore) return;

        const eventsById = new Map();
        if (Array.isArray(eventsData)) {
          for (const ev of eventsData) {
            if (ev?.id) eventsById.set(ev.id, ev);
          }
        }

        const hostsById = new Map();
        if (Array.isArray(hostProfilesData)) {
          for (const profile of hostProfilesData) {
            if (profile?.id) hostsById.set(profile.id, profile);
          }
        }

        const flaggedRegistryIds = new Set();
        if (Array.isArray(flaggedTickets)) {
          for (const row of flaggedTickets) {
            if (row?.registry_id) flaggedRegistryIds.add(row.registry_id);
          }
        }

        const itemsByRegistryId = {};
        const registryIdByItemId = new Map();
        if (Array.isArray(registryItemsData)) {
          for (const item of registryItemsData) {
            if (!item?.registry_id) continue;
            if (!itemsByRegistryId[item.registry_id]) {
              itemsByRegistryId[item.registry_id] = [];
            }
            itemsByRegistryId[item.registry_id].push(item);
            if (item.id) {
              registryIdByItemId.set(item.id, item.registry_id);
            }
          }
        }

        // Determine which orders are actually paid
        const orderIdsForValue = Array.isArray(orderItemsData)
          ? Array.from(
              new Set(
                orderItemsData
                  .map((row) => row.order_id)
                  .filter(Boolean)
              )
            )
          : [];

        const {
          data: orderPaymentsData,
          error: orderPaymentsError,
        } = orderIdsForValue.length
          ? await supabase
              .from("order_payments")
              .select("order_id, status")
              .in("order_id", orderIdsForValue)
          : { data: [], error: null };

        if (orderPaymentsError && !ignore) {
          setErrorRegistries(orderPaymentsError.message);
        }

        const isPaidStatus = (status) => {
          if (!status) return false;
          const value = String(status).toLowerCase();
          return value === "paid" || value === "success";
        };

        const paidOrderIds = new Set();
        if (Array.isArray(orderPaymentsData)) {
          for (const payment of orderPaymentsData) {
            if (!payment?.order_id) continue;
            if (!isPaidStatus(payment.status)) continue;
            paidOrderIds.add(payment.order_id);
          }
        }

        const valueByRegistryId = {};
        if (Array.isArray(orderItemsData) && paidOrderIds.size) {
          for (const row of orderItemsData) {
            if (!row?.order_id || !paidOrderIds.has(row.order_id)) continue;
            const registryItemId = row.registry_item_id;
            if (!registryItemId) continue;
            const registryId = registryIdByItemId.get(registryItemId);
            if (!registryId) continue;
            const qty = Number(row.quantity || 0);
            const price = Number(row.price || 0);
            const amount = qty * price;
            if (!Number.isFinite(amount)) continue;
            valueByRegistryId[registryId] =
              (valueByRegistryId[registryId] || 0) + amount;
          }
        }

        const now = new Date();

        let enriched = baseRegistries.map((reg) => {
          const event = reg.event_id ? eventsById.get(reg.event_id) : null;
          const host = event?.host_id ? hostsById.get(event.host_id) : null;

          const items = itemsByRegistryId[reg.id] || [];
          let totalItems = 0;
          let purchasedItems = 0;
          for (const item of items) {
            totalItems += Number(item.quantity_needed || 0);
            purchasedItems += Number(item.purchased_qty || 0);
          }

          let status = "Active";
          if (reg.deadline) {
            const deadlineDate = new Date(reg.deadline);
            if (!Number.isNaN(deadlineDate.getTime()) && deadlineDate < now) {
              status = "Expired";
            }
          }
          if (flaggedRegistryIds.has(reg.id)) {
            status = "Flagged";
          }

          const nameParts = [];
          if (host?.firstname) nameParts.push(host.firstname);
          if (host?.lastname) nameParts.push(host.lastname);
          const hostName = nameParts.join(" ") || host?.email || "—";

          const eventDate = event?.date || reg.deadline || null;

          return {
            id: reg.id,
            registryName: reg.title || "",
            hostName,
            hostEmail: host?.email || "",
            eventType: event?.type || "",
            status,
            eventDate,
            totalItems,
            purchasedItems,
            totalValue: valueByRegistryId[reg.id] || 0,
            __raw: {
              registry: reg,
              event,
              host,
            },
          };
        });

        if (searchTerm && searchTerm.trim()) {
          const term = searchTerm.trim().toLowerCase();
          const type = (typeFilter || "all").toLowerCase();
          enriched = enriched.filter((row) => {
            const name = row.hostName?.toLowerCase() || "";
            const email = row.hostEmail?.toLowerCase() || "";
            const registry = row.registryName?.toLowerCase() || "";
            const eventType = row.eventType?.toLowerCase() || "";
            const code = row.__raw?.registry?.registry_code
              ? String(row.__raw.registry.registry_code).toLowerCase()
              : "";

            let matchesSearch = true;
            if (term) {
              switch (type) {
                case "registry_name":
                  matchesSearch = registry.includes(term);
                  break;
                case "registry_code":
                  matchesSearch = code.includes(term);
                  break;
                case "host_name":
                  matchesSearch = name.includes(term);
                  break;
                case "host_email":
                  matchesSearch = email.includes(term);
                  break;
                case "event_type":
                  matchesSearch = eventType.includes(term);
                  break;
                default:
                  matchesSearch =
                    name.includes(term) ||
                    email.includes(term) ||
                    registry.includes(term) ||
                    eventType.includes(term) ||
                    code.includes(term);
                  break;
              }
            }

            return matchesSearch;
          });
        }

        if (statusFilter && statusFilter !== "all") {
          const desired = statusFilter.toLowerCase();
          enriched = enriched.filter((row) => {
            const rowStatus = (row.status || "").toLowerCase();
            return rowStatus === desired;
          });
        }

        const total = enriched ? enriched.length : 0;

        const focusValue = focusId ? String(focusId).trim() : "";
        if (focusValue && lastAppliedFocusIdRef.current !== focusValue) {
          const focusIndex = enriched.findIndex((row) => {
            if (!row) return false;
            if (String(row.id) === focusValue) return true;
            const code = row.__raw?.registry?.registry_code
              ? String(row.__raw.registry.registry_code)
              : "";
            if (code && code === focusValue) return true;
            return false;
          });

          if (focusIndex >= 0) {
            const desiredPage = Math.floor(focusIndex / pageSize);
            lastAppliedFocusIdRef.current = focusValue;
            if (desiredPage !== registryPage) {
              setPageParam(String(desiredPage + 1));
              setRegistries([]);
              setRegistriesTotal(total);
              return;
            }
          } else if (!hasSearch && (statusFilter || "all") === "all") {
            const focusLookup = await supabase
              .from("registries")
              .select("id, registry_code, created_at")
              .or(`id.eq.${focusValue},registry_code.eq.${focusValue}`)
              .maybeSingle();

            if (focusLookup?.data?.id && focusLookup.data.created_at) {
              const rankResult = await supabase
                .from("registries")
                .select("id", { count: "exact", head: true })
                .gt("created_at", focusLookup.data.created_at);

              const beforeCount =
                typeof rankResult?.count === "number" ? rankResult.count : 0;
              const desiredPage = Math.floor(beforeCount / pageSize);
              lastAppliedFocusIdRef.current = focusValue;

              if (desiredPage !== registryPage) {
                setPageParam(String(desiredPage + 1));
                setRegistries([]);
                setRegistriesTotal(total);
                return;
              }
            }
          }
        }

        if (hasSearch) {
          const startIdx = registryPage * pageSize;
          const endIdx = startIdx + pageSize;
          const pageRegistries = enriched.slice(startIdx, endIdx);

          setRegistries(pageRegistries);
          setRegistriesTotal(total);
        } else {
          setRegistries(enriched);
          setRegistriesTotal(count ?? total);
        }
      } catch (error) {
        if (!ignore) {
          setErrorRegistries(error?.message || "Failed to load registries");
          setRegistries([]);
          setRegistriesTotal(0);
        }
      } finally {
        if (!ignore) {
          setLoadingRegistries(false);
        }
      }
    };

    fetchRegistries();
    return () => {
      ignore = true;
    };
  }, [
    registryPage,
    pageSize,
    searchTerm,
    typeFilter,
    statusFilter,
    refreshKey,
    externalType,
    isExternalHostOrGuest,
    focusId,
    setPageParam,
  ]);

  return useMemo(
    () => ({
      registries,
      registryPage,
      pageSize,
      registriesTotal,
      loadingRegistries,
      errorRegistries,
      setRegistryPage,
      refreshRegistries,
      metrics,
      loadingMetrics,
      metricsError,
      searchTerm,
      setSearchTerm,
      typeFilter,
      setTypeFilter: setByFilter,
      statusFilter,
      setStatusFilter: setStatus,
      focusId,
      setFocusId,
    }),
    [
      registries,
      registryPage,
      pageSize,
      registriesTotal,
      loadingRegistries,
      errorRegistries,
      setRegistryPage,
      metrics,
      loadingMetrics,
      metricsError,
      searchTerm,
      typeFilter,
      statusFilter,
      setSearchTerm,
      setByFilter,
      setStatus,
      focusId,
      setFocusId,
    ]
  );
}

export const useRegistryListContext = () => useContext(RegistryListContext);
