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
  payouts: [],
  paymentInfo: null,
  transactions: [],
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
        { data: payoutsData, error: payoutsError },
        { data: paymentInfoData, error: paymentInfoError },
        { data: transactionsData, error: transactionsError },
      ] = await Promise.all([
        supabase
          .from("vendor_payouts")
          .select(
            "id, status, total_net_amount, total_gross_amount, total_commission_amount, total_orders, from_date, to_date, created_at",
          )
          .eq("vendor_id", vendorRecord.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("payment_info")
          .select(
            "id, vendor_id, bank_name, bank_account, bank_branch, momo_number, momo_network, account_name, account_type, routing_number",
          )
          .eq("vendor_id", vendorRecord.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("order_items")
          .select(
            "id, order_id, product_id, quantity, price, vendor_status, fulfillment_status, created_at, vendor_payout_id, products ( name ), vendor_payouts ( id, status )",
          )
          .eq("vendor_id", vendorRecord.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (payoutsError || paymentInfoError || transactionsError) {
        throw payoutsError || paymentInfoError || transactionsError;
      }

      setData({
        vendor: vendorRecord,
        commissionRate: vendorRecord?.commission_rate ?? null,
        payouts: payoutsData || [],
        paymentInfo: paymentInfoData || null,
        transactions: transactionsData || [],
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
      payouts: data.payouts,
      paymentInfo: data.paymentInfo,
      transactions: data.transactions,
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