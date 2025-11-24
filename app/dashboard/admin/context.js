"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient as createSupabaseClient } from "../../utils/supabase/client";

const DashboardContext = createContext();

export const DashboardProvider = ({ children }) => {
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [loadingCurrentAdmin, setLoadingCurrentAdmin] = useState(true);

  const [metrics, setMetrics] = useState({
    totalRegistries: null,
    pendingVendorRequests: null,
    totalOrders: null,
    totalPurchases: null,
    vendorPayouts: null,
    openTickets: null,
    pendingEscalations: null,
    topVendorName: null,
    popularRegistryType: null,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState(null);

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

  useEffect(() => {
    let ignore = false;

    const fetchMetrics = async () => {
      setMetricsError(null);
      setLoadingMetrics(true);

      try {
        const supabase = createSupabaseClient();

        const [
          { data: registriesData, error: registriesError, count: registriesCount },
          {
            data: vendorApplicationsData,
            error: vendorApplicationsError,
            count: vendorApplicationsCount,
          },
          { data: ordersData, error: ordersError, count: ordersCount },
          { data: orderPaymentsData, error: orderPaymentsError },
          {
            data: openTicketsData,
            error: openTicketsError,
            count: openTicketsCount,
          },
          {
            data: escalationsData,
            error: escalationsError,
            count: escalationsCount,
          },
        ] = await Promise.all([
          supabase
            .from("registries")
            .select("id, event_id", { count: "exact" }),
          supabase
            .from("vendor_applications")
            .select("id", { count: "exact" })
            .eq("status", "pending"),
          supabase
            .from("orders")
            .select("id, registry_id, total_amount", { count: "exact" }),
          supabase.from("order_payments").select("amount, status"),
          supabase
            .from("support_tickets")
            .select("id", { count: "exact" })
            .eq("status", "open"),
          supabase
            .from("support_tickets")
            .select("id", { count: "exact" })
            .eq("status", "escalated"),
        ]);

        const { data: orderItemsData, error: orderItemsError } = await supabase
          .from("order_items")
          .select("vendor_id, quantity, price");

        const { data: vendorsData, error: vendorsError } = await supabase
          .from("vendors")
          .select("id, business_name");

        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("id, type");

        if (ignore) {
          return;
        }

        if (
          registriesError ||
          vendorApplicationsError ||
          ordersError ||
          orderPaymentsError ||
          openTicketsError ||
          escalationsError ||
          orderItemsError ||
          vendorsError ||
          eventsError
        ) {
          const errorMessage =
            registriesError?.message ||
            vendorApplicationsError?.message ||
            ordersError?.message ||
            orderPaymentsError?.message ||
            openTicketsError?.message ||
            escalationsError?.message ||
            orderItemsError?.message ||
            vendorsError?.message ||
            eventsError?.message ||
            "Failed to load metrics";

          setMetricsError(errorMessage);
        }

        const totalRegistries =
          typeof registriesCount === "number"
            ? registriesCount
            : registriesData?.length ?? null;

        const pendingVendorRequests =
          typeof vendorApplicationsCount === "number"
            ? vendorApplicationsCount
            : vendorApplicationsData?.length ?? null;

        const totalOrders =
          typeof ordersCount === "number" ? ordersCount : ordersData?.length ?? null;

        let totalPurchases = null;
        if (Array.isArray(ordersData)) {
          totalPurchases = ordersData.reduce(
            (sum, row) => sum + Number(row.total_amount || 0),
            0
          );
        }

        let vendorPayouts = null;
        if (Array.isArray(orderPaymentsData)) {
          const successful = orderPaymentsData.filter((row) =>
            (row.status || "").toLowerCase() === "success"
          );
          vendorPayouts = successful.reduce(
            (sum, row) => sum + Number(row.amount || 0),
            0
          );
        }

        let topVendorName = null;
        if (
          !orderItemsError &&
          !vendorsError &&
          Array.isArray(orderItemsData) &&
          Array.isArray(vendorsData) &&
          orderItemsData.length &&
          vendorsData.length
        ) {
          const salesByVendor = {};
          for (const row of orderItemsData) {
            if (!row?.vendor_id) continue;
            const amount = Number(row.price || 0) * Number(row.quantity || 1);
            if (!Number.isFinite(amount)) continue;
            salesByVendor[row.vendor_id] =
              (salesByVendor[row.vendor_id] || 0) + amount;
          }

          let topVendorId = null;
          let topVendorSales = -Infinity;
          for (const [vendorId, total] of Object.entries(salesByVendor)) {
            if (total > topVendorSales) {
              topVendorSales = total;
              topVendorId = vendorId;
            }
          }

          if (topVendorId) {
            const topVendor = vendorsData.find((v) => v.id === topVendorId);
            if (topVendor?.business_name) {
              topVendorName = topVendor.business_name;
            }
          }
        }

        let popularRegistryType = null;
        if (
          !eventsError &&
          Array.isArray(eventsData) &&
          Array.isArray(registriesData) &&
          Array.isArray(ordersData) &&
          ordersData.length
        ) {
          const eventTypeById = new Map();
          for (const ev of eventsData) {
            if (ev?.id && ev?.type) {
              eventTypeById.set(ev.id, ev.type);
            }
          }

          const registryEventById = new Map();
          for (const reg of registriesData) {
            if (reg?.id) {
              registryEventById.set(reg.id, reg.event_id || null);
            }
          }

          const typeCounts = {};
          for (const order of ordersData) {
            const registryId = order?.registry_id;
            if (!registryId) continue;
            const eventId = registryEventById.get(registryId);
            if (!eventId) continue;
            const type = eventTypeById.get(eventId);
            if (!type) continue;
            typeCounts[type] = (typeCounts[type] || 0) + 1;
          }

          let maxType = null;
          let maxCount = -Infinity;
          for (const [type, count] of Object.entries(typeCounts)) {
            if (count > maxCount) {
              maxCount = count;
              maxType = type;
            }
          }

          if (maxType) {
            popularRegistryType = maxType;
          }
        }

        const openTickets =
          typeof openTicketsCount === "number"
            ? openTicketsCount
            : openTicketsData?.length ?? null;

        const pendingEscalations =
          typeof escalationsCount === "number"
            ? escalationsCount
            : escalationsData?.length ?? null;

        setMetrics({
          totalRegistries,
          pendingVendorRequests,
          totalOrders,
          totalPurchases,
          vendorPayouts,
          openTickets,
          pendingEscalations,
          topVendorName,
          popularRegistryType,
        });
      } catch (error) {
        if (!ignore) {
          setMetricsError(error?.message || "Failed to load metrics");
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

  const value = useMemo(
    () => ({
      currentAdmin,
      loadingCurrentAdmin,
      metrics,
      loadingMetrics,
      metricsError,
    }),
    [currentAdmin, loadingCurrentAdmin, metrics, loadingMetrics, metricsError]
  );

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  );
};

export const useDashboardContext = () => useContext(DashboardContext);
