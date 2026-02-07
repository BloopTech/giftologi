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

const VendorOrdersContext = createContext();

const createInitialOrdersData = () => ({
  orders: [],
  stats: {
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  },
});

export const VendorOrdersProvider = ({ children }) => {
  const [ordersData, setOrdersData] = useState(createInitialOrdersData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrdersData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const supabase = createSupabaseClient();

    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;

      const userId = userResult?.user?.id;
      if (!userId) {
        setOrdersData(createInitialOrdersData());
        setError("You must be signed in to view orders.");
        return;
      }

      const { data: vendorRecord, error: vendorError } = await supabase
        .from("vendors")
        .select("id")
        .eq("profiles_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (vendorError) throw vendorError;

      if (!vendorRecord?.id) {
        setOrdersData(createInitialOrdersData());
        setError("Complete your application.");
        return;
      }

      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from("order_items")
        .select(`
          id,
          order_id,
          product_id,
          quantity,
          price,
          wrapping,
          gift_wrap_option_id,
          vendor_status,
          created_at,
          orders (
            id,
            registry_id,
            buyer_id,
            created_at,
            registries (
              id,
              title,
              registry_owner_id,
              profiles (
                id,
                firstname,
                lastname,
                email,
                phone
              )
            ),
            profiles (
              id,
              firstname,
              lastname,
              email,
              phone
            )
          ),
          products (
            id,
            name,
            product_code,
            price,
            images,
            weight_kg
          ),
          gift_wrap_options (
            id,
            name,
            fee,
            description
          ),
          checkout_context!inner (
            order_id,
            total_weight_kg,
            pieces
          )
        `)
        .eq("vendor_id", vendorRecord.id)
        .order("created_at", { ascending: false });

      if (orderItemsError) throw orderItemsError;

      const orders = (orderItemsData || []).map((item) => ({
        id: item.id,
        orderId: item.order_id,
        orderCode: `ORD-${String(item.order_id).slice(-4).toUpperCase()}`,
        product: item.products,
        quantity: item.quantity,
        price: item.price,
        totalAmount: item.quantity * item.price,
        status: item.vendor_status || "pending",
        createdAt: item.created_at,
        order: item.orders,
        customer: item.orders?.profiles,
        registry: item.orders?.registries,
        registryOwner: item.orders?.registries?.profiles,
        wrapping: item.wrapping ?? false,
        giftWrapOptionId: item.gift_wrap_option_id || null,
        giftWrapOption: item.gift_wrap_options || null,
        checkoutContext: item.checkout_context,
      }));

      const stats = {
        pending: orders.filter((o) => o.status === "pending").length,
        confirmed: orders.filter((o) => o.status === "confirmed").length,
        processing: orders.filter((o) => o.status === "processing").length,
        shipped: orders.filter((o) => o.status === "shipped").length,
        delivered: orders.filter((o) => o.status === "delivered").length,
        cancelled: orders.filter((o) => o.status === "cancelled").length,
      };

      setOrdersData({ orders, stats });
    } catch (err) {
      console.error("Orders fetch error:", err);
      setError(err?.message || "Failed to load orders data");
      setOrdersData(createInitialOrdersData());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrdersData();
  }, [fetchOrdersData]);

  const value = useMemo(
    () => ({
      orders: ordersData.orders,
      stats: ordersData.stats,
      loading,
      error,
      refreshData: fetchOrdersData,
    }),
    [ordersData, loading, error, fetchOrdersData]
  );

  return (
    <VendorOrdersContext.Provider value={value}>
      {children}
    </VendorOrdersContext.Provider>
  );
};

export const useVendorOrdersContext = () =>
  useContext(VendorOrdersContext);