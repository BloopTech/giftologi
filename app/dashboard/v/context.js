"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient as createSupabaseClient } from "../../utils/supabase/client";

const VendorDashboardContext = createContext();

const createInitialVendorData = () => ({
  profile: null,
  vendor: null,
  products: [],
  orderItems: [],
  payouts: [],
  categories: [],
});

export const VendorDashboardProvider = ({ children }) => {
  const [vendorData, setVendorData] = useState(createInitialVendorData);
  const [loadingVendorData, setLoadingVendorData] = useState(true);
  const [vendorError, setVendorError] = useState(null);

  const fetchVendorData = useCallback(async () => {
    setLoadingVendorData(true);
    setVendorError(null);

    const supabase = createSupabaseClient();

    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      const userId = userResult?.user?.id;

      if (!userId) {
        setVendorData(createInitialVendorData());
        setVendorError("You must be signed in to view the vendor dashboard.");
        return;
      }

      const [
        { data: profileData, error: profileError },
        { data: vendorRecord, error: vendorSelectError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, firstname, lastname, role")
          .eq("id", userId)
          .single(),
        supabase
          .from("vendors")
          .select(
            "id, business_name, slug, category, verified, created_at, shop_status, close_requested_at, closed_at",
          )
          .eq("profiles_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileError) {
        throw profileError;
      }

      if (vendorSelectError && vendorSelectError.code !== "PGRST116") {
        throw vendorSelectError;
      }

      let products = [];
      let orderItems = [];
      let payouts = [];
      let categories = [];

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name, slug, parent_category_id")
        .order("name");

      if (categoriesError) {
        console.error("Categories fetch error:", categoriesError);
      } else {
        categories = categoriesData || [];
      }

      if (vendorRecord?.id) {
        const windowStart = new Date();
        windowStart.setDate(windowStart.getDate() - 30);
        const windowIso = windowStart.toISOString();

        const [
          { data: productsData, error: productsError },
          { data: orderItemsData, error: orderItemsError },
          { data: payoutsData, error: payoutsError },
        ] = await Promise.all([
          supabase
            .from("products")
            .select("id, name, price, stock_qty, status, category_id, created_at")
            .eq("vendor_id", vendorRecord.id),
          supabase
            .from("order_items")
            .select("order_id, product_id, quantity, price, created_at, orders!inner(status)")
            .eq("vendor_id", vendorRecord.id)
            .eq("orders.status", "paid")
            .gte("created_at", windowIso),
          supabase
            .from("vendor_payouts")
            .select("status, total_net_amount, created_at")
            .eq("vendor_id", vendorRecord.id),
        ]);

        if (productsError || orderItemsError || payoutsError) {
          throw (
            productsError ||
            orderItemsError ||
            payoutsError ||
            new Error("Failed to load vendor data")
          );
        }

        products = productsData || [];
        orderItems = orderItemsData || [];
        payouts = payoutsData || [];
      }

      setVendorData({
        profile: profileData || null,
        vendor: vendorRecord || null,
        products,
        orderItems,
        payouts,
        categories,
      });
    } catch (error) {
      console.error("Vendor dashboard fetch error", error);
      setVendorError(error?.message || "Failed to load vendor data");
      setVendorData(createInitialVendorData());
    } finally {
      setLoadingVendorData(false);
    }
  }, []);

  useEffect(() => {
    fetchVendorData();
  }, [fetchVendorData]);

  const value = useMemo(
    () => ({
      profile: vendorData.profile,
      vendor: vendorData.vendor,
      products: vendorData.products,
      orderItems: vendorData.orderItems,
      payouts: vendorData.payouts,
      categories: vendorData.categories,
      loadingVendorData,
      vendorError,
      refreshVendorData: fetchVendorData,
    }),
    [vendorData, loadingVendorData, vendorError, fetchVendorData],
  );

  return (
    <VendorDashboardContext.Provider value={value}>
      {children}
    </VendorDashboardContext.Provider>
  );
};

export const useVendorDashboardContext = () =>
  useContext(VendorDashboardContext);
