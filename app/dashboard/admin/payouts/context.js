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

  // Vendors list for bulk payout / calendar view
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  const refreshPayouts = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, [setRefreshKey]);

  const [metrics, setMetrics] = useState({
    draftPayouts: 0,
    approvedPayouts: 0,
    completedPayouts: 0,
    totalPendingAmount: 0,
    totalPayouts: 0,
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

  // Fetch payout periods from the new table
  useEffect(() => {
    let ignore = false;

    const fetchPayouts = async () => {
      setLoadingPayouts(true);
      setErrorPayouts(null);
      setMetricsError(null);
      setLoadingMetrics(true);

      try {
        const supabase = createSupabaseClient();

        // Fetch payout periods with vendor info
        const { data: periodsData, error: periodsError } = await supabase
          .from("payout_periods")
          .select("*")
          .order("created_at", { ascending: false });

        if (periodsError) {
          if (!ignore) {
            setErrorPayouts(periodsError.message);
            setPayouts([]);
            setPayoutsTotal(0);
          }
          return;
        }

        const periods = Array.isArray(periodsData) ? periodsData : [];

        // Get unique vendor IDs
        const vendorIds = Array.from(
          new Set(periods.map((p) => p.vendor_id).filter(Boolean)),
        );

        // Fetch vendor details and masked payment info in parallel
        const [
          { data: vendorsData },
          { data: paymentData },
        ] = await Promise.all([
          vendorIds.length
            ? supabase
                .from("vendors")
                .select("id, business_name, commission_rate")
                .in("id", vendorIds)
            : Promise.resolve({ data: [] }),
          vendorIds.length
            ? supabase
                .from("payment_info_masked")
                .select(
                  "vendor_id, bank_name, bank_branch, account_name, momo_network, bank_account_display, momo_number_display, has_bank_account, has_momo_number",
                )
                .in("vendor_id", vendorIds)
            : Promise.resolve({ data: [] }),
        ]);

        if (ignore) return;

        const vendorsById = new Map();
        (vendorsData || []).forEach((v) => vendorsById.set(v.id, v));

        const paymentByVendor = new Map();
        (paymentData || []).forEach((p) => paymentByVendor.set(p.vendor_id, p));

        const formatCurrency = (val) =>
          Number(val || 0).toLocaleString("en-GH", {
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

        const statusLabelMap = {
          draft: "Draft",
          approved: "Approved",
          processing: "Processing",
          completed: "Completed",
          failed: "Failed",
        };

        const allRows = periods.map((pp) => {
          const vendor = vendorsById.get(pp.vendor_id);
          const payment = paymentByVendor.get(pp.vendor_id);

          let payoutMethodLabel = "Not set";
          let hasPaymentInfo = false;
          if (payment) {
            hasPaymentInfo = !!payment.has_bank_account || !!payment.has_momo_number;
            if (payment.has_bank_account) {
              payoutMethodLabel = `Bank (${payment.bank_account_display || "****"})`;
            } else if (payment.has_momo_number) {
              payoutMethodLabel = `MoMo (${payment.momo_number_display || "****"})`;
            }
          }

          const wsFormatted = formatDate(pp.week_start);
          const weFormatted = formatDate(pp.week_end);
          const periodLabel =
            wsFormatted && weFormatted
              ? `${wsFormatted} – ${weFormatted}`
              : wsFormatted || "—";

          return {
            id: pp.id,
            vendorId: pp.vendor_id,
            vendorName: vendor?.business_name || "Unknown vendor",
            commissionRate: vendor?.commission_rate || 0,
            weekStart: pp.week_start,
            weekEnd: pp.week_end,
            periodLabel,
            status: pp.status,
            statusLabel: statusLabelMap[pp.status] || pp.status,
            totalGross: Number(pp.total_gross || 0),
            totalCommission: Number(pp.total_commission || 0),
            totalVendorNet: Number(pp.total_vendor_net || 0),
            totalServiceCharges: Number(pp.total_service_charges || 0),
            totalPromoAdminCost: Number(pp.total_promo_admin_cost || 0),
            totalPromoVendorCost: Number(pp.total_promo_vendor_cost || 0),
            totalItems: pp.total_items || 0,
            totalOrders: pp.total_orders || 0,
            paymentMethod: pp.payment_method,
            paymentReference: pp.payment_reference,
            approvedAt: pp.approved_at,
            paidAt: pp.paid_at,
            notes: pp.notes,
            batchId: pp.batch_id,
            createdAt: pp.created_at,
            payoutMethodLabel,
            hasPaymentInfo,
            bankName: payment?.bank_name || null,
            accountName: payment?.account_name || null,
            momoNetwork: payment?.momo_network || null,
            bankAccountDisplay: payment?.bank_account_display || null,
            momoNumberDisplay: payment?.momo_number_display || null,
            vendorNetLabel: formatCurrency(pp.total_vendor_net),
            grossLabel: formatCurrency(pp.total_gross),
            commissionLabel: formatCurrency(pp.total_commission),
          };
        });

        // Compute metrics
        const metricsValues = allRows.reduce(
          (acc, row) => {
            if (row.status === "draft") acc.draftPayouts += 1;
            else if (row.status === "approved") acc.approvedPayouts += 1;
            else if (row.status === "completed") acc.completedPayouts += 1;

            if (row.status === "draft" || row.status === "approved") {
              acc.totalPendingAmount += row.totalVendorNet;
            }
            acc.totalPayouts += 1;
            return acc;
          },
          {
            draftPayouts: 0,
            approvedPayouts: 0,
            completedPayouts: 0,
            totalPendingAmount: 0,
            totalPayouts: 0,
          },
        );

        // Search and filter
        const trimmedSearch = searchTerm ? searchTerm.trim().toLowerCase() : "";
        let filtered = allRows;

        if (trimmedSearch) {
          filtered = filtered.filter((row) => {
            const vendorName = row.vendorName?.toLowerCase() || "";
            const ref = row.paymentReference?.toLowerCase() || "";
            return (
              vendorName.includes(trimmedSearch) ||
              ref.includes(trimmedSearch) ||
              row.id?.toLowerCase().includes(trimmedSearch)
            );
          });
        }

        if (statusFilter && statusFilter !== "all") {
          filtered = filtered.filter((row) => row.status === statusFilter);
        }

        let resolvedPageIndex = payoutsPage ?? 0;
        const safeFocusId = focusId ? String(focusId).trim() : "";

        if (safeFocusId && lastAppliedFocusIdRef.current !== safeFocusId) {
          const focusIndex = filtered.findIndex(
            (row) => String(row.id) === safeFocusId || String(row.vendorId) === safeFocusId,
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
            draftPayouts: 0,
            approvedPayouts: 0,
            completedPayouts: 0,
            totalPendingAmount: 0,
            totalPayouts: 0,
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

  // Fetch vendors list (for generating new payouts)
  useEffect(() => {
    let ignore = false;
    const fetchVendors = async () => {
      setLoadingVendors(true);
      try {
        const supabase = createSupabaseClient();
        const { data } = await supabase
          .from("vendors")
          .select("id, business_name, commission_rate, verified")
          .eq("verified", true)
          .order("business_name");
        if (!ignore) setVendors(data || []);
      } catch {
        if (!ignore) setVendors([]);
      } finally {
        if (!ignore) setLoadingVendors(false);
      }
    };
    fetchVendors();
    return () => { ignore = true; };
  }, [refreshKey]);

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
      vendors,
      loadingVendors,
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
      vendors,
      loadingVendors,
    ],
  );
}

export const usePayoutsContext = () => useContext(PayoutsContext);
