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

const PayoutsContext = createContext();

export const PayoutsProvider = ({ children }) => {
  const value = usePayoutsProviderValue();

  return (
    <PayoutsContext.Provider value={value}>{children}</PayoutsContext.Provider>
  );
};

function usePayoutsProviderValue() {
  const [payouts, setPayouts] = useState([]);
  const [pageSize] = useState(10);
  const [payoutsTotal, setPayoutsTotal] = useState(0);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [errorPayouts, setErrorPayouts] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshPayouts = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, [setRefreshKey]);

  const [metrics, setMetrics] = useState({
    pendingPayouts: null,
    approvedPayouts: null,
    totalPendingAmount: null,
    totalPayouts: null,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState(null);

  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );
  const [statusParam, setStatusParam] = useQueryState(
    "status",
    parseAsString.withDefault("all"),
  );
  const [pageParam, setPageParam] = useQueryState(
    "page",
    parseAsString.withDefault("1"),
  );
  const [focusIdParam, setFocusIdParam] = useQueryState(
    "focusId",
    parseAsString.withDefault(""),
  );

  const searchTerm = searchParam || "";
  const statusFilter = (statusParam || "all").toLowerCase();
  const focusId = focusIdParam || "";

  const lastAppliedFocusIdRef = useRef("");

  const payoutsPage = useMemo(() => {
    const num = parseInt(pageParam || "1", 10);
    if (Number.isNaN(num) || num < 1) return 0;
    return num - 1;
  }, [pageParam]);

  const setPayoutsPage = useCallback(
    (next) => {
      const resolved =
        typeof next === "function" ? next(payoutsPage) : Number(next);
      const safe = Number.isFinite(resolved) && resolved >= 0 ? resolved : 0;
      setPageParam(String(safe + 1));
    },
    [payoutsPage, setPageParam],
  );

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

  const setFocusId = useCallback(
    (value) => {
      setFocusIdParam(value || "");
    },
    [setFocusIdParam],
  );

  useEffect(() => {
    let ignore = false;

    const fetchPayouts = async () => {
      setLoadingPayouts(true);
      setErrorPayouts(null);
      setMetricsError(null);
      setLoadingMetrics(true);

      try {
        const supabase = createSupabaseClient();

        const { data: orderItemsData, error: orderItemsError } = await supabase
          .from("order_items")
          .select(
            "id, order_id, vendor_id, quantity, price, fulfillment_status, finance_payout_approved, super_admin_payout_approved",
          );

        if (orderItemsError) {
          if (!ignore) {
            setErrorPayouts(orderItemsError.message);
            setPayouts([]);
            setPayoutsTotal(0);
            setMetrics({
              pendingPayouts: null,
              approvedPayouts: null,
              totalPendingAmount: null,
              totalPayouts: null,
            });
          }
          return;
        }

        const deliveredItems = Array.isArray(orderItemsData)
          ? orderItemsData.filter((item) => {
              const status = item?.fulfillment_status
                ? String(item.fulfillment_status).toLowerCase()
                : "";
              return status === "delivered";
            })
          : [];

        if (!deliveredItems.length) {
          if (!ignore) {
            setPayouts([]);
            setPayoutsTotal(0);
            setMetrics({
              pendingPayouts: 0,
              approvedPayouts: 0,
              totalPendingAmount: 0,
              totalPayouts: 0,
            });
          }
          return;
        }

        const orderIds = Array.from(
          new Set(
            deliveredItems
              .map((row) => row.order_id)
              .filter((value) => !!value),
          ),
        );
        const vendorIds = Array.from(
          new Set(
            deliveredItems
              .map((row) => row.vendor_id)
              .filter((value) => !!value),
          ),
        );

        const ordersPromise = orderIds.length
          ? supabase
              .from("orders")
              .select("id, created_at, payment_method")
              .in("id", orderIds)
          : Promise.resolve({ data: [], error: null });

        const vendorsPromise = vendorIds.length
          ? supabase
              .from("vendors")
              .select("id, business_name, commission_rate")
              .in("id", vendorIds)
          : Promise.resolve({ data: [], error: null });

        const paymentInfoPromise = vendorIds.length
          ? supabase
              .from("payment_info")
              .select(
                "id, vendor_id, bank_name, bank_account, bank_branch, momo_number, momo_network",
              )
              .in("vendor_id", vendorIds)
          : Promise.resolve({ data: [], error: null });

        const [
          { data: ordersData, error: ordersError },
          { data: vendorsData, error: vendorsError },
          { data: paymentInfoData, error: paymentInfoError },
        ] = await Promise.all([
          ordersPromise,
          vendorsPromise,
          paymentInfoPromise,
        ]);

        if (ordersError || vendorsError || paymentInfoError) {
          const message =
            ordersError?.message ||
            vendorsError?.message ||
            paymentInfoError?.message ||
            "Failed to load payout data";
          if (!ignore) {
            setErrorPayouts(message);
            setPayouts([]);
            setPayoutsTotal(0);
          }
        }

        if (ignore) return;

        const ordersById = new Map();
        if (Array.isArray(ordersData)) {
          for (const order of ordersData) {
            if (order?.id) ordersById.set(order.id, order);
          }
        }

        const vendorsById = new Map();
        if (Array.isArray(vendorsData)) {
          for (const vendor of vendorsData) {
            if (vendor?.id) vendorsById.set(vendor.id, vendor);
          }
        }

        const paymentInfoByVendorId = new Map();
        if (Array.isArray(paymentInfoData)) {
          for (const row of paymentInfoData) {
            if (row?.vendor_id) paymentInfoByVendorId.set(row.vendor_id, row);
          }
        }

        const aggregatedByVendor = new Map();

        for (const item of deliveredItems) {
          if (!item?.vendor_id) continue;
          const vendorId = item.vendor_id;
          const order = item.order_id ? ordersById.get(item.order_id) : null;

          const quantity = Number(item.quantity || 1);
          const price = Number(item.price || 0);
          const lineAmount = Number.isFinite(quantity * price)
            ? quantity * price
            : 0;

          let aggregated = aggregatedByVendor.get(vendorId);
          if (!aggregated) {
            const vendor = vendorsById.get(vendorId);
            const paymentInfo = paymentInfoByVendorId.get(vendorId);

            let payoutMethodLabel = "Not set";
            if (paymentInfo) {
              if (paymentInfo.bank_name || paymentInfo.bank_account) {
                payoutMethodLabel = "Bank Transfer";
              } else if (paymentInfo.momo_network || paymentInfo.momo_number) {
                payoutMethodLabel = "MoMo";
              }
            }

            let commissionRate = 0;
            if (
              vendor &&
              typeof vendor.commission_rate !== "undefined" &&
              vendor.commission_rate !== null
            ) {
              const rateNum = Number(vendor.commission_rate);
              if (Number.isFinite(rateNum) && rateNum >= 0) {
                commissionRate = rateNum;
              }
            }
            if (commissionRate > 1) {
              commissionRate = commissionRate / 100;
            }

            aggregated = {
              vendorId,
              vendorName: vendor?.business_name || "Unknown vendor",
              payoutCode: `PAY-${String(vendorId).slice(0, 4).toUpperCase()}`,
              commissionRate,
              totalSales: 0,
              totalNetAmount: 0,
              totalCommissionAmount: 0,
              pendingPayoutAmount: 0,
              totalOrdersSet: new Set(),
              firstOrderAt: null,
              lastOrderAt: null,
              payoutMethodLabel,
              totalItems: 0,
              noApprovalCount: 0,
              financeOnlyCount: 0,
              superOnlyCount: 0,
              bothApprovedCount: 0,
            };
          }

          aggregated.totalItems += 1;
          aggregated.totalSales += lineAmount;

          if (order?.id) {
            aggregated.totalOrdersSet.add(order.id);
            if (
              !aggregated.firstOrderAt ||
              order.created_at < aggregated.firstOrderAt
            ) {
              aggregated.firstOrderAt = order.created_at;
            }
            if (
              !aggregated.lastOrderAt ||
              order.created_at > aggregated.lastOrderAt
            ) {
              aggregated.lastOrderAt = order.created_at;
            }
          }

          const financeApproved = !!item.finance_payout_approved;
          const superApproved = !!item.super_admin_payout_approved;

          const rateForRow =
            typeof aggregated.commissionRate === "number" &&
            Number.isFinite(aggregated.commissionRate)
              ? aggregated.commissionRate
              : 0;
          const feeAmount = lineAmount * rateForRow;
          const vendorShare = lineAmount - feeAmount;

          aggregated.totalNetAmount += vendorShare;
          aggregated.totalCommissionAmount += feeAmount;

          if (financeApproved && superApproved) {
            aggregated.bothApprovedCount += 1;
          } else if (financeApproved && !superApproved) {
            aggregated.financeOnlyCount += 1;
            aggregated.pendingPayoutAmount += vendorShare;
          } else if (!financeApproved && superApproved) {
            aggregated.superOnlyCount += 1;
            aggregated.pendingPayoutAmount += vendorShare;
          } else {
            aggregated.noApprovalCount += 1;
            aggregated.pendingPayoutAmount += vendorShare;
          }

          aggregatedByVendor.set(vendorId, aggregated);
        }

        const allRows = Array.from(aggregatedByVendor.values()).map((row) => {
          const orderCount = row.totalOrdersSet.size;
          let normalizedStatus = "pending";

          if (row.totalItems > 0 && row.bothApprovedCount === row.totalItems) {
            normalizedStatus = "approved";
          } else if (row.financeOnlyCount > 0 && row.superOnlyCount === 0) {
            normalizedStatus = "awaiting_super_admin";
          } else if (row.superOnlyCount > 0 && row.financeOnlyCount === 0) {
            normalizedStatus = "awaiting_finance";
          } else if (
            row.bothApprovedCount > 0 &&
            (row.financeOnlyCount > 0 || row.superOnlyCount > 0)
          ) {
            normalizedStatus = "in_review";
          }

          const statusLabelMap = {
            pending: "Pending",
            awaiting_super_admin: "Awaiting Super Admin",
            awaiting_finance: "Awaiting Finance",
            in_review: "In Review",
            approved: "Approved",
          };

          const totalSalesLabel = Number(row.totalSales || 0).toLocaleString(
            "en-GH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
          );

          const pendingPayoutLabel = Number(
            row.pendingPayoutAmount || 0,
          ).toLocaleString("en-GH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });

          const formatDate = (value) => {
            if (!value) return null;
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return null;
            return date.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
          };

          const firstLabel = formatDate(row.firstOrderAt);
          const lastLabel = formatDate(row.lastOrderAt);
          let periodLabel = "—";
          if (firstLabel && lastLabel) {
            periodLabel =
              firstLabel === lastLabel
                ? firstLabel
                : `${firstLabel} - ${lastLabel}`;
          } else if (firstLabel || lastLabel) {
            periodLabel = firstLabel || lastLabel;
          }

          return {
            vendorId: row.vendorId,
            vendorName: row.vendorName,
            payoutCode: row.payoutCode,
            totalSales: row.totalSales,
            totalSalesLabel,
            pendingPayoutAmount: row.pendingPayoutAmount,
            pendingPayoutLabel,
            payoutMethodLabel: row.payoutMethodLabel,
            orderCount,
            orderIds: Array.from(row.totalOrdersSet || []),
            normalizedStatus,
            statusLabel: statusLabelMap[normalizedStatus] || "Pending",
            firstOrderAt: row.firstOrderAt,
            lastOrderAt: row.lastOrderAt,
            periodLabel,
            totalItems: row.totalItems,
            financeOnlyCount: row.financeOnlyCount,
            superOnlyCount: row.superOnlyCount,
            bothApprovedCount: row.bothApprovedCount,
            noApprovalCount: row.noApprovalCount,
          };
        });

        const metricsValues = allRows.reduce(
          (acc, row) => {
            if (row.normalizedStatus === "pending") {
              acc.pendingPayouts += 1;
            } else if (row.normalizedStatus === "approved") {
              acc.approvedPayouts += 1;
            }
            acc.totalPayouts += 1;
            acc.totalPendingAmount += Number(row.pendingPayoutAmount || 0);
            return acc;
          },
          {
            pendingPayouts: 0,
            approvedPayouts: 0,
            totalPendingAmount: 0,
            totalPayouts: 0,
          },
        );

        const trimmedSearch = searchTerm ? searchTerm.trim().toLowerCase() : "";
        let filtered = allRows;

        if (trimmedSearch) {
          filtered = filtered.filter((row) => {
            const vendorName = row.vendorName?.toLowerCase() || "";
            const payoutCode = row.payoutCode?.toLowerCase() || "";
            return (
              vendorName.includes(trimmedSearch) ||
              payoutCode.includes(trimmedSearch)
            );
          });
        }

        if (statusFilter && statusFilter !== "all") {
          const desired = statusFilter.toLowerCase();
          filtered = filtered.filter((row) => row.normalizedStatus === desired);
        }

        let resolvedPageIndex = payoutsPage ?? 0;
        const safeFocusId = focusId ? String(focusId).trim() : "";

        if (safeFocusId && lastAppliedFocusIdRef.current !== safeFocusId) {
          const focusIndex = filtered.findIndex(
            (row) =>
              String(row.vendorId) === safeFocusId ||
              String(row.payoutCode) === safeFocusId,
          );

          if (focusIndex >= 0) {
            const targetPageIndex = Math.floor(focusIndex / pageSize);
            lastAppliedFocusIdRef.current = safeFocusId;
            if (targetPageIndex !== resolvedPageIndex) {
              resolvedPageIndex = targetPageIndex;
              setPageParam(String(targetPageIndex + 1));
            }
          }
        }

        const total = filtered.length;
        const start = resolvedPageIndex * pageSize;
        const end = start + pageSize;
        const pageRows = filtered.slice(start, end);

        if (!ignore) {
          setPayouts(pageRows);
          setPayoutsTotal(total);
          setMetrics(metricsValues);
        }
      } catch (error) {
        if (!ignore) {
          setErrorPayouts(error?.message || "Failed to load payout data");
          setPayouts([]);
          setPayoutsTotal(0);
          setMetrics({
            pendingPayouts: null,
            approvedPayouts: null,
            totalPendingAmount: null,
            totalPayouts: null,
          });
        }
      } finally {
        if (!ignore) {
          setLoadingPayouts(false);
          setLoadingMetrics(false);
        }
      }
    };

    fetchPayouts();

    return () => {
      ignore = true;
    };
  }, [
    payoutsPage,
    pageSize,
    searchTerm,
    statusFilter,
    focusId,
    refreshKey,
    setPageParam,
  ]);

  return useMemo(
    () => ({
      payouts,
      payoutsPage,
      pageSize,
      payoutsTotal,
      loadingPayouts,
      errorPayouts,
      setPayoutsPage,
      refreshPayouts,
      metrics,
      loadingMetrics,
      metricsError,
      searchTerm,
      setSearchTerm,
      statusFilter,
      setStatusFilter,
      focusId,
      setFocusId,
    }),
    [
      payouts,
      payoutsPage,
      pageSize,
      payoutsTotal,
      loadingPayouts,
      errorPayouts,
      metrics,
      loadingMetrics,
      metricsError,
      searchTerm,
      statusFilter,
      setSearchTerm,
      setStatusFilter,
      focusId,
      setFocusId,
      setPayoutsPage,
    ],
  );
}

export const usePayoutsContext = () => useContext(PayoutsContext);
