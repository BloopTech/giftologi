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

const VendorAnalyticsContext = createContext();

const SUCCESSFUL_ORDER_STATUSES = ["paid", "shipped", "delivered"];

const createInitialState = () => ({
  vendor: null,
  products: [],
  orderItems: [],
  pageViews: [],
  reviews: [],
  categories: [],
});

export const VendorAnalyticsProvider = ({ children }) => {
  const [data, setData] = useState(createInitialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const supabase = createSupabaseClient();

    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const userId = userResult?.user?.id;
      if (!userId) {
        setData(createInitialState());
        setError("You must be signed in to view analytics.");
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

      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - 365);
      const sinceIso = windowStart.toISOString();

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, price, category_id")
        .eq("vendor_id", vendorRecord.id);

      if (productsError) {
        throw productsError;
      }

      const productIds = (productsData || []).map((product) => product.id);
      const pageViewsRequest = productIds.length
        ? supabase
            .from("product_page_views")
            .select("product_id, created_at")
            .in("product_id", productIds)
            .gte("created_at", sinceIso)
        : Promise.resolve({ data: [], error: null });
      const reviewsRequest = productIds.length
        ? supabase
            .from("product_reviews")
            .select("product_id, rating, created_at")
            .in("product_id", productIds)
            .gte("created_at", sinceIso)
        : Promise.resolve({ data: [], error: null });

      const [
        { data: orderItemsData, error: orderItemsError },
        { data: pageViewsData, error: pageViewsError },
        { data: reviewsData, error: reviewsError },
        { data: categoriesData, error: categoriesError },
      ] = await Promise.all([
        supabase
          .from("order_items")
          .select(
            "id, order_id, product_id, quantity, price, created_at, orders!inner ( buyer_id, status )",
          )
          .eq("vendor_id", vendorRecord.id)
          .in("orders.status", SUCCESSFUL_ORDER_STATUSES)
          .gte("created_at", sinceIso),
        pageViewsRequest,
        reviewsRequest,
        supabase
          .from("categories")
          .select("id, name")
          .order("name"),
      ]);

      if (orderItemsError || pageViewsError || reviewsError || categoriesError) {
        throw orderItemsError || pageViewsError || reviewsError || categoriesError;
      }

      setData({
        vendor: vendorRecord,
        products: productsData || [],
        orderItems: orderItemsData || [],
        pageViews: pageViewsData || [],
        reviews: reviewsData || [],
        categories: categoriesData || [],
      });
    } catch (err) {
      console.error("Vendor analytics fetch error", err);
      setError(err?.message || "Failed to load analytics data");
      setData(createInitialState());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const value = useMemo(
    () => ({
      vendor: data.vendor,
      products: data.products,
      orderItems: data.orderItems,
      pageViews: data.pageViews,
      reviews: data.reviews,
      categories: data.categories,
      loading,
      error,
      refreshData: fetchAnalyticsData,
    }),
    [data, loading, error, fetchAnalyticsData]
  );

  return (
    <VendorAnalyticsContext.Provider value={value}>
      {children}
    </VendorAnalyticsContext.Provider>
  );
};

export const useVendorAnalyticsContext = () =>
  useContext(VendorAnalyticsContext);