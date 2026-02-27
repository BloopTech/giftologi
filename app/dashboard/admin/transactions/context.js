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

const ViewTransactionsContext = createContext();

const parseJsonObject = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const pickPaymentValue = (source, keys) => {
  if (!source || typeof source !== "object") return null;

  for (const key of keys) {
    const value = source[key];
    if (value === null || typeof value === "undefined") continue;
    const text = String(value).trim();
    if (text) return text;
  }

  return null;
};

const hasExpressPaySignature = (source) => {
  if (!source || typeof source !== "object") return false;
  return Boolean(
    pickPaymentValue(source, ["transaction-id", "auth-code"]) ||
      (pickPaymentValue(source, ["result", "result-text"]) &&
        pickPaymentValue(source, ["order-id", "token"]))
  );
};

const mapPaymentMethodLabel = (value) => {
  if (!value) return "Unrecorded";

  const methodValue = String(value).toLowerCase();
  if (methodValue === "momo") return "MoMo";
  if (methodValue === "mtn_momo") return "MTN MoMo";
  if (methodValue === "telecel_cash") return "Telecel Cash";
  if (methodValue === "at_momo") return "AT MoMo";
  if (methodValue === "card") return "Card";
  if (methodValue === "bank") return "Bank Transfer";

  return methodValue.charAt(0).toUpperCase() + methodValue.slice(1);
};

const resolvePaymentMethod = ({ paymentRow, orderRow }) => {
  const paymentMeta = parseJsonObject(paymentRow?.meta);
  const orderResponse = parseJsonObject(orderRow?.payment_response);

  return (
    paymentRow?.method ||
    pickPaymentValue(paymentMeta, [
      "method",
      "payment_method",
      "payment-method",
      "paymentMode",
      "payment_mode",
      "payment-option-type",
      "channel",
      "network",
    ]) ||
    orderRow?.payment_method ||
    pickPaymentValue(orderResponse, [
      "method",
      "payment_method",
      "payment-method",
      "paymentMode",
      "payment_mode",
      "payment-option-type",
      "channel",
      "network",
    ]) ||
    ""
  );
};

const resolvePaymentProvider = ({ paymentRow, orderRow }) => {
  const paymentMeta = parseJsonObject(paymentRow?.meta);
  const orderResponse = parseJsonObject(orderRow?.payment_response);
  const paymentMetaProvider = pickPaymentValue(paymentMeta, [
    "provider",
    "gateway",
    "payment_provider",
    "paymentProvider",
  ]);
  const orderResponseProvider = pickPaymentValue(orderResponse, [
    "provider",
    "gateway",
    "payment_provider",
    "paymentProvider",
  ]);

  return (
    paymentRow?.provider ||
    paymentMetaProvider ||
    orderResponseProvider ||
    (hasExpressPaySignature(paymentMeta) || hasExpressPaySignature(orderResponse)
      ? "expresspay"
      : "") ||
    "Unrecorded"
  );
};

const resolvePaymentReference = ({ paymentRow, orderRow }) => {
  const paymentMeta = parseJsonObject(paymentRow?.meta);
  const orderResponse = parseJsonObject(orderRow?.payment_response);

  return (
    paymentRow?.provider_ref ||
    pickPaymentValue(paymentMeta, ["provider_ref", "reference", "payment_reference", "transaction_id", "transaction-id"]) ||
    orderRow?.payment_reference ||
    pickPaymentValue(orderResponse, ["provider_ref", "reference", "payment_reference", "transaction_id", "transaction-id"]) ||
    ""
  );
};

export const ViewTransactionsProvider = ({ children }) => {
  const value = useViewTransactionsProviderValue();

  return (
    <ViewTransactionsContext.Provider value={value}>
      {children}
    </ViewTransactionsContext.Provider>
  );
};

function useViewTransactionsProviderValue() {
  const [transactions, setTransactions] = useState([]);
  const [pageSize] = useState(10);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [errorTransactions, setErrorTransactions] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshTransactions = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, [setRefreshKey]);

  const [metrics, setMetrics] = useState({
    totalRevenue: null,
    paidOrders: null,
    disputedOrders: null,
    totalOrders: null,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState(null);

  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );
  const [typeParam, setTypeParam] = useQueryState(
    "type",
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

  const [methodParam, setMethodParam] = useQueryState(
    "method",
    parseAsString.withDefault("all")
  );
  const [fromParam, setFromParam] = useQueryState(
    "from",
    parseAsString.withDefault("")
  );
  const [toParam, setToParam] = useQueryState(
    "to",
    parseAsString.withDefault("")
  );

  const searchTerm = searchParam || "";
  const typeFilter = (typeParam || "all").toLowerCase();
  const statusFilter = (statusParam || "all").toLowerCase();
  const paymentMethodFilter = (methodParam || "all").toLowerCase();
  const fromDate = fromParam || "";
  const toDate = toParam || "";

  const focusId = focusIdParam || "";
  const lastAppliedFocusIdRef = useRef("");

  const transactionsPage = useMemo(() => {
    const num = parseInt(pageParam || "1", 10);
    if (Number.isNaN(num) || num < 1) return 0;
    return num - 1;
  }, [pageParam]);

  const setTransactionsPage = useCallback(
    (next) => {
      const resolved =
        typeof next === "function" ? next(transactionsPage) : Number(next);
      const safe = Number.isFinite(resolved) && resolved >= 0 ? resolved : 0;
      setPageParam(String(safe + 1));
    },
    [transactionsPage, setPageParam]
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

        const [
          {
            data: ordersData,
            error: ordersError,
            count: ordersCount,
          },
          { data: paymentsData, error: paymentsError },
        ] = await Promise.all([
          supabase
            .from("orders")
            .select("id, total_amount, status", { count: "exact" }),
          supabase.from("order_payments").select("amount, status"),
        ]);

        if (ignore) return;

        if (ordersError || paymentsError) {
          const message =
            ordersError?.message ||
            paymentsError?.message ||
            "Failed to load order metrics";
          setMetricsError(message);
        }

        const totalOrders =
          typeof ordersCount === "number"
            ? ordersCount
            : Array.isArray(ordersData)
            ? ordersData.length
            : null;

        let paidOrders = null;
        let disputedOrders = null;
        if (Array.isArray(ordersData)) {
          paidOrders = ordersData.filter((row) => {
            const status = (row.status || "").toLowerCase();
            return (
              status === "paid" ||
              status === "shipped" ||
              status === "delivered"
            );
          }).length;

          disputedOrders = ordersData.filter((row) => {
            const status = (row.status || "").toLowerCase();
            return status === "disputed";
          }).length;
        }

        let totalRevenue = null;
        if (Array.isArray(paymentsData)) {
          const successful = paymentsData.filter(
            (row) => (row.status || "").toLowerCase() === "success"
          );
          totalRevenue = successful.reduce(
            (sum, row) => sum + Number(row.amount || 0),
            0
          );
        }

        setMetrics({
          totalRevenue,
          paidOrders,
          disputedOrders,
          totalOrders,
        });
      } catch (error) {
        if (!ignore) {
          setMetricsError(error?.message || "Failed to load order metrics");
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

    const fetchTransactions = async () => {
      setLoadingTransactions(true);
      setErrorTransactions(null);

      try {
        const supabase = createSupabaseClient();
        const from = transactionsPage * pageSize;
        const to = from + pageSize - 1;
        const selectedPaymentMethod =
          paymentMethodFilter && paymentMethodFilter !== "all"
            ? paymentMethodFilter
            : "";

        let filteredOrderIds = null;
        if (selectedPaymentMethod) {
          const [legacyMethodRows, methodPaymentRows] = await Promise.all([
            supabase
              .from("orders")
              .select("id")
              .eq("payment_method", selectedPaymentMethod),
            supabase
              .from("order_payments")
              .select("order_id")
              .eq("method", selectedPaymentMethod),
          ]);

          const filterFetchError =
            legacyMethodRows?.error?.message || methodPaymentRows?.error?.message;
          if (filterFetchError) {
            if (!ignore) {
              setErrorTransactions(filterFetchError);
              setTransactions([]);
              setTransactionsTotal(0);
            }
            return;
          }

          const ids = new Set();
          for (const row of legacyMethodRows?.data || []) {
            if (row?.id) ids.add(row.id);
          }
          for (const row of methodPaymentRows?.data || []) {
            if (row?.order_id) ids.add(row.order_id);
          }

          filteredOrderIds = Array.from(ids);

          if (!filteredOrderIds.length) {
            if (!ignore) {
              setTransactions([]);
              setTransactionsTotal(0);
            }
            return;
          }
        }

        let query = supabase
          .from("orders")
          .select(
            "id, order_code, registry_id, buyer_id, total_amount, status, payment_method, payment_reference, payment_response, created_at, updated_at, buyer_firstname, buyer_lastname, buyer_email, buyer_phone, shipping_address, shipping_city, shipping_region, shipping_digital_address, shipping_fee",
            { count: "exact" }
          );

        if (filteredOrderIds) {
          query = query.in("id", filteredOrderIds);
        }

        if (statusFilter && statusFilter !== "all") {
          query = query.eq("status", statusFilter);
        }

        if (fromDate) {
          const fromDateObj = new Date(fromDate);
          if (!Number.isNaN(fromDateObj.getTime())) {
            query = query.gte("created_at", fromDateObj.toISOString());
          }
        }

        if (toDate) {
          const toDateObj = new Date(toDate);
          if (!Number.isNaN(toDateObj.getTime())) {
            const endOfDay = new Date(
              toDateObj.getFullYear(),
              toDateObj.getMonth(),
              toDateObj.getDate(),
              23,
              59,
              59,
              999
            );
            query = query.lte("created_at", endOfDay.toISOString());
          }
        }

        const {
          data: orderRows,
          error: ordersError,
          count,
        } = await query
          .order("created_at", { ascending: false })
          .range(from, to);

        if (ordersError) {
          if (!ignore) {
            setErrorTransactions(ordersError.message);
            setTransactions([]);
            setTransactionsTotal(0);
          }
          return;
        }

        if (!orderRows || !orderRows.length) {
          if (!ignore) {
            setTransactions([]);
            setTransactionsTotal(count ?? 0);
          }
          return;
        }

        const registryIds = orderRows
          .map((row) => row.registry_id)
          .filter(Boolean);
        const buyerIds = orderRows.map((row) => row.buyer_id).filter(Boolean);
        const orderIds = orderRows.map((row) => row.id).filter(Boolean);

        const registriesPromise = registryIds.length
          ? supabase
              .from("registries")
              .select("id, title, registry_code")
              .in("id", registryIds)
          : Promise.resolve({ data: [], error: null });

        const buyersPromise = buyerIds.length
          ? supabase
              .from("profiles")
              .select("id, firstname, lastname, email")
              .in("id", buyerIds)
          : Promise.resolve({ data: [], error: null });

        const orderItemsPromise = orderIds.length
          ? supabase
              .from("order_items")
              .select(
                "id, order_id, product_id, quantity, price, gift_message, wrapping, variation, gift_wrap_option_id, vendor_id, registry_item_id, tracking_number, fulfillment_status, gift_wrap_options(id, name, fee)"
              )
              .in("order_id", orderIds)
          : Promise.resolve({ data: [], error: null });

        const orderPaymentsPromise = orderIds.length
          ? supabase
              .from("order_payments")
              .select(
                "id, order_id, provider, method, provider_ref, created_at, meta"
              )
              .in("order_id", orderIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null });

        const [
          { data: registriesData, error: registriesError },
          { data: buyersData, error: buyersError },
          { data: orderItemsData, error: orderItemsError },
          { data: orderPaymentsData, error: orderPaymentsError },
        ] = await Promise.all([
          registriesPromise,
          buyersPromise,
          orderItemsPromise,
          orderPaymentsPromise,
        ]);

        if (registriesError || buyersError || orderItemsError || orderPaymentsError) {
          const message =
            registriesError?.message ||
            buyersError?.message ||
            orderItemsError?.message ||
            orderPaymentsError?.message ||
            "Failed to load order details";
          if (!ignore) {
            setErrorTransactions(message);
          }
        }

        let vendorsData = [];
        let vendorsError = null;

        let vendorIds = [];
        if (Array.isArray(orderItemsData)) {
          const setVendorIds = new Set();
          for (const row of orderItemsData) {
            if (row?.vendor_id) setVendorIds.add(row.vendor_id);
          }
          vendorIds = Array.from(setVendorIds);
        }

        if (vendorIds.length) {
          const { data, error } = await supabase
            .from("vendors")
            .select("id, business_name")
            .in("id", vendorIds);
          vendorsData = data || [];
          vendorsError = error || null;
        }

        if (vendorsError && !ignore) {
          setErrorTransactions(
            vendorsError.message || "Failed to load vendors for orders"
          );
        }

        if (ignore) return;

        const registriesById = new Map();
        if (Array.isArray(registriesData)) {
          for (const reg of registriesData) {
            if (reg?.id) registriesById.set(reg.id, reg);
          }
        }

        const buyersById = new Map();
        if (Array.isArray(buyersData)) {
          for (const buyer of buyersData) {
            if (buyer?.id) buyersById.set(buyer.id, buyer);
          }
        }

        const vendorsById = new Map();
        if (Array.isArray(vendorsData)) {
          for (const vendor of vendorsData) {
            if (vendor?.id) vendorsById.set(vendor.id, vendor);
          }
        }

        const itemsByOrderId = {};
        if (Array.isArray(orderItemsData)) {
          for (const item of orderItemsData) {
            if (!item?.order_id) continue;
            if (!itemsByOrderId[item.order_id]) {
              itemsByOrderId[item.order_id] = [];
            }
            itemsByOrderId[item.order_id].push(item);
          }
        }

        const latestPaymentByOrderId = new Map();
        if (Array.isArray(orderPaymentsData)) {
          for (const payment of orderPaymentsData) {
            if (!payment?.order_id) continue;
            if (latestPaymentByOrderId.has(payment.order_id)) continue;
            latestPaymentByOrderId.set(payment.order_id, payment);
          }
        }

        const baseTransactions = orderRows.map((order) => {
          const registry = order.registry_id
            ? registriesById.get(order.registry_id)
            : null;
          const buyer = order.buyer_id
            ? buyersById.get(order.buyer_id)
            : null;
          const items = itemsByOrderId[order.id] || [];

          const guestNameParts = [];
          if (buyer?.firstname) guestNameParts.push(buyer.firstname);
          if (buyer?.lastname) guestNameParts.push(buyer.lastname);
          if (!guestNameParts.length && order.buyer_firstname) {
            guestNameParts.push(order.buyer_firstname);
          }
          if (!guestNameParts.length && order.buyer_lastname) {
            guestNameParts.push(order.buyer_lastname);
          }
          const guestName =
            guestNameParts.join(" ") ||
            buyer?.email ||
            order.buyer_email ||
            "—";

          const vendorIdsForOrder = Array.from(
            new Set(items.map((row) => row.vendor_id).filter(Boolean))
          );

          let vendorName = "—";
          if (vendorIdsForOrder.length === 1) {
            const vendor = vendorsById.get(vendorIdsForOrder[0]);
            vendorName = vendor?.business_name || "—";
          } else if (vendorIdsForOrder.length > 1) {
            vendorName = "Multiple vendors";
          }

          let deliveryStatus = null;
          if (items.length) {
            const statuses = items
              .map((row) =>
                row.fulfillment_status
                  ? String(row.fulfillment_status).toLowerCase()
                  : ""
              )
              .filter(Boolean);

            if (statuses.includes("delivered")) {
              deliveryStatus = "Delivered";
            } else if (statuses.includes("shipped")) {
              deliveryStatus = "Shipped";
            } else if (statuses.includes("paid")) {
              deliveryStatus = "Paid";
            } else if (statuses.includes("pending")) {
              deliveryStatus = "Pending";
            } else if (statuses.includes("cancelled")) {
              deliveryStatus = "Cancelled";
            }
          }

          const orderStatus = order.status || "pending";
          const normalizedStatus = String(orderStatus).toLowerCase();
          const statusLabel =
            normalizedStatus.charAt(0).toUpperCase() +
            normalizedStatus.slice(1);

          const latestPayment = latestPaymentByOrderId.get(order.id) || null;
          const paymentMethodValue = String(
            resolvePaymentMethod({
              paymentRow: latestPayment,
              orderRow: order,
            }) || ""
          ).toLowerCase();
          const paymentMethodLabel = mapPaymentMethodLabel(paymentMethodValue);
          const paymentProviderLabel = resolvePaymentProvider({
            paymentRow: latestPayment,
            orderRow: order,
          });
          const paymentReference = resolvePaymentReference({
            paymentRow: latestPayment,
            orderRow: order,
          });

          const amountValue = Number(order.total_amount || 0);
          const amountLabel = Number.isNaN(amountValue)
            ? "—"
            : amountValue.toLocaleString("en-GH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });

          const createdAtLabel = order.created_at
            ? new Date(order.created_at).toLocaleDateString()
            : "—";

          const orderId = String(order.id || "");
          const orderCode = order.order_code ||
            (orderId ? `ORD-${orderId.slice(0, 4).toUpperCase()}` : "—");

          return {
            id: order.id,
            orderCode,
            registryCode:
              registry?.registry_code || registry?.title || "—",
            guestName,
            email: buyer?.email || order.buyer_email || null,
            vendorName,
            paymentMethodValue,
            paymentMethodLabel,
            paymentProviderLabel,
            paymentReference,
            amount: amountValue,
            amountLabel,
            status: orderStatus,
            statusLabel,
            normalizedStatus,
            deliveryStatus,
            createdAt: order.created_at,
            createdAtLabel,
            __raw: {
              order,
              registry,
              buyer,
              items,
              payment: latestPayment,
            },
          };
        });

        const focusValue = focusId ? String(focusId).trim() : "";
        if (focusValue && lastAppliedFocusIdRef.current !== focusValue) {
          const inPage = baseTransactions.some(
            (row) =>
              String(row.id) === focusValue ||
              String(row.orderCode || "") === focusValue
          );

          if (!inPage) {
            const focusLookup = await supabase
              .from("orders")
              .select("id, created_at")
              .eq("id", focusValue)
              .maybeSingle();

            if (focusLookup?.data?.id && focusLookup.data.created_at) {
              let verifyQuery = supabase
                .from("orders")
                .select("id")
                .eq("id", focusLookup.data.id);

              if (statusFilter && statusFilter !== "all") {
                verifyQuery = verifyQuery.eq("status", statusFilter);
              }

              if (filteredOrderIds) {
                verifyQuery = verifyQuery.in("id", filteredOrderIds);
              }

              if (fromDate) {
                const fromDateObj = new Date(fromDate);
                if (!Number.isNaN(fromDateObj.getTime())) {
                  verifyQuery = verifyQuery.gte(
                    "created_at",
                    fromDateObj.toISOString()
                  );
                }
              }

              if (toDate) {
                const toDateObj = new Date(toDate);
                if (!Number.isNaN(toDateObj.getTime())) {
                  const endOfDay = new Date(
                    toDateObj.getFullYear(),
                    toDateObj.getMonth(),
                    toDateObj.getDate(),
                    23,
                    59,
                    59,
                    999
                  );
                  verifyQuery = verifyQuery.lte(
                    "created_at",
                    endOfDay.toISOString()
                  );
                }
              }

              const verifyResult = await verifyQuery.maybeSingle();

              if (verifyResult?.data?.id) {
                let rankQuery = supabase
                  .from("orders")
                  .select("id", { count: "exact", head: true })
                  .gt("created_at", focusLookup.data.created_at);

                if (statusFilter && statusFilter !== "all") {
                  rankQuery = rankQuery.eq("status", statusFilter);
                }

                if (filteredOrderIds) {
                  rankQuery = rankQuery.in("id", filteredOrderIds);
                }

                if (fromDate) {
                  const fromDateObj = new Date(fromDate);
                  if (!Number.isNaN(fromDateObj.getTime())) {
                    rankQuery = rankQuery.gte(
                      "created_at",
                      fromDateObj.toISOString()
                    );
                  }
                }

                if (toDate) {
                  const toDateObj = new Date(toDate);
                  if (!Number.isNaN(toDateObj.getTime())) {
                    const endOfDay = new Date(
                      toDateObj.getFullYear(),
                      toDateObj.getMonth(),
                      toDateObj.getDate(),
                      23,
                      59,
                      59,
                      999
                    );
                    rankQuery = rankQuery.lte(
                      "created_at",
                      endOfDay.toISOString()
                    );
                  }
                }

                const rankResult = await rankQuery;
                const beforeCount =
                  typeof rankResult?.count === "number" ? rankResult.count : 0;
                const desiredPage = Math.floor(beforeCount / pageSize);
                lastAppliedFocusIdRef.current = focusValue;

                if (desiredPage !== transactionsPage) {
                  setPageParam(String(desiredPage + 1));
                  setTransactions([]);
                  setTransactionsTotal(count ?? 0);
                  return;
                }
              }
            }
          } else {
            lastAppliedFocusIdRef.current = focusValue;
          }
        }

        let filtered = baseTransactions;
        const trimmedSearch = searchTerm
          ? searchTerm.trim().toLowerCase()
          : "";

        if (trimmedSearch) {
          const type = typeFilter || "all";
          filtered = filtered.filter((row) => {
            const orderCode = row.orderCode?.toLowerCase() || "";
            const guestName = row.guestName?.toLowerCase() || "";
            const registryCode = String(row.registryCode || "").toLowerCase();
            const vendorName = row.vendorName?.toLowerCase() || "";

            switch (type) {
              case "order_id":
                return orderCode.includes(trimmedSearch);
              case "guest_name":
                return guestName.includes(trimmedSearch);
              case "registry":
                return registryCode.includes(trimmedSearch);
              case "vendor":
                return vendorName.includes(trimmedSearch);
              default:
                return (
                  orderCode.includes(trimmedSearch) ||
                  guestName.includes(trimmedSearch) ||
                  registryCode.includes(trimmedSearch) ||
                  vendorName.includes(trimmedSearch)
                );
            }
          });
        }

        if (statusFilter && statusFilter !== "all") {
          const desired = statusFilter.toLowerCase();
          filtered = filtered.filter(
            (row) => row.normalizedStatus === desired
          );
        }

        if (focusValue) {
          const focusRow = baseTransactions.find(
            (row) =>
              String(row.id) === focusValue ||
              String(row.orderCode || "") === focusValue
          );

          if (focusRow && !filtered.some((row) => row.id === focusRow.id)) {
            filtered = [focusRow, ...filtered];
          }
        }

        setTransactions(filtered);
        setTransactionsTotal(count ?? (filtered ? filtered.length : 0));
      } catch (error) {
        if (!ignore) {
          setErrorTransactions(
            error?.message || "Failed to load transactions"
          );
          setTransactions([]);
          setTransactionsTotal(0);
        }
      } finally {
        if (!ignore) {
          setLoadingTransactions(false);
        }
      }
    };

    fetchTransactions();
    return () => {
      ignore = true;
    };
  }, [
    transactionsPage,
    pageSize,
    searchTerm,
    typeFilter,
    statusFilter,
    paymentMethodFilter,
    fromDate,
    toDate,
    refreshKey,
    focusId,
    setPageParam,
  ]);

  return useMemo(
    () => ({
      transactions,
      transactionsPage,
      pageSize,
      transactionsTotal,
      loadingTransactions,
      errorTransactions,
      setTransactionsPage,
      refreshTransactions,
      metrics,
      loadingMetrics,
      metricsError,
      searchTerm,
      setSearchTerm: setSearchParam,
      typeFilter,
      setTypeFilter: setTypeParam,
      statusFilter,
      setStatusFilter: setStatusParam,
      paymentMethodFilter,
      setPaymentMethodFilter: setMethodParam,
      fromDate,
      setFromDate: setFromParam,
      toDate,
      setToDate: setToParam,
      focusId,
      setFocusId,
    }),
    [
      transactions,
      transactionsPage,
      pageSize,
      transactionsTotal,
      loadingTransactions,
      errorTransactions,
      metrics,
      loadingMetrics,
      metricsError,
      searchTerm,
      typeFilter,
      statusFilter,
      paymentMethodFilter,
      fromDate,
      toDate,
      focusId,
      setFocusId,
      setSearchParam,
      setTypeParam,
      setStatusParam,
      setMethodParam,
      setFromParam,
      setToParam,
    ]
  );
}

export const useViewTransactionsContext = () =>
  useContext(ViewTransactionsContext);
