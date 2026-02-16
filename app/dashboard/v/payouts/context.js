"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";

const VendorPayoutsContext = createContext();

const createInitialState = () => ({
  vendor: null,
  commissionRate: null,
  payoutPeriods: [],
  paymentInfo: null,
  recentLineItems: [],
});

export const VendorPayoutsProvider = ({ children }) => {
  const [data, setData] = useState(createInitialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPayoutsData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const supabase = createSupabaseClient();

    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const userId = userResult?.user?.id;
      if (!userId) {
        setData(createInitialState());
        setError("You must be signed in to view payouts.");
        return;
      }

      const { data: vendorRecord, error: vendorError } = await supabase
        .from("vendors")
        .select("id, business_name, commission_rate")
        .eq("profiles_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (vendorError && vendorError.code !== "PGRST116") throw vendorError;

      if (!vendorRecord?.id) {
        setData(createInitialState());
        setError("Complete your application.");
        return;
      }

      const [
        { data: periodsData, error: periodsError },
        { data: paymentInfoData, error: paymentInfoError },
      ] = await Promise.all([
        supabase
          .from("payout_periods")
          .select(
            "id, vendor_id, week_start, status, total_gross, total_commission, total_vendor_net, total_items, total_orders, payment_method, payment_reference, notes, approved_at, paid_at, created_at",
          )
          .eq("vendor_id", vendorRecord.id)
          .order("week_start", { ascending: false })
          .limit(50),
        supabase
          .from("payment_info")
          .select(
            "id, vendor_id, bank_name, bank_account, bank_account_masked, bank_branch, momo_number, momo_network, account_name, account_type, routing_number",
          )
          .eq("vendor_id", vendorRecord.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (periodsError) throw periodsError;
      if (paymentInfoError) throw paymentInfoError;

      let lineItemsData = [];
      const periodIds = (periodsData || []).map((p) => p.id);
      if (periodIds.length > 0) {
        const { data: liData, error: liError } = await supabase
          .from("payout_line_items")
          .select(
            "id, payout_period_id, order_item_id, gross_amount, commission_amount, vendor_net, created_at, order_items ( id, order_id, product_id, quantity, price, products ( name ) )",
          )
          .in("payout_period_id", periodIds)
          .order("created_at", { ascending: false })
          .limit(20);
        if (!liError) lineItemsData = liData || [];
      }

      setData({
        vendor: vendorRecord,
        commissionRate: vendorRecord?.commission_rate ?? null,
        payoutPeriods: periodsData || [],
        paymentInfo: paymentInfoData || null,
        recentLineItems: lineItemsData,
      });
    } catch (err) {
      console.error("Vendor payouts fetch error", err);
      setError(err?.message || "Failed to load payouts data");
      setData(createInitialState());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayoutsData();
  }, [fetchPayoutsData]);

  const value = useMemo(
    () => ({
      vendor: data.vendor,
      commissionRate: data.commissionRate,
      payoutPeriods: data.payoutPeriods,
      paymentInfo: data.paymentInfo,
      recentLineItems: data.recentLineItems,
      loading,
      error,
      refreshData: fetchPayoutsData,
    }),
    [data, loading, error, fetchPayoutsData],
  );

  return (
    <VendorPayoutsContext.Provider value={value}>
      {children}
    </VendorPayoutsContext.Provider>
  );
};

export const useVendorPayoutsContext = () =>
  useContext(VendorPayoutsContext);