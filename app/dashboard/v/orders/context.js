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
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    expired: 0,
  },
});

const normalizeOrderStatus = (value) => {
  const status = String(value || "pending").toLowerCase();
  return status === "canceled" ? "cancelled" : status;
};

const deriveFulfillmentStatus = (fulfillmentStatus, orderStatus) => {
  const normalizedFulfillment = String(fulfillmentStatus || "pending").toLowerCase();
  const normalizedOrder = normalizeOrderStatus(orderStatus);

  if (
    (normalizedFulfillment === "pending" || !fulfillmentStatus) &&
    (normalizedOrder === "cancelled" || normalizedOrder === "expired")
  ) {
    return normalizedOrder;
  }

  return normalizedFulfillment;
};

const toReadableError = (err) => {
  if (!err) return "Failed to load orders data";
  if (typeof err === "string") return err;
  if (err?.message) return err.message;
  if (err?.error_description) return err.error_description;
  if (err?.details) return err.details;

  try {
    const serialized = JSON.stringify(err);
    return serialized && serialized !== "{}"
      ? serialized
      : "Failed to load orders data";
  } catch {
    return "Failed to load orders data";
  }
};

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
          variation,
          wrapping,
          gift_wrap_option_id,
          fulfillment_status,
          created_at,
          orders (
            id,
            order_code,
            status,
            registry_id,
            buyer_id,
            buyer_firstname,
            buyer_lastname,
            buyer_email,
            buyer_phone,
            shipping_address,
            shipping_city,
            shipping_region,
            shipping_digital_address,
            created_at,
            checkout_context (
              order_id,
              total_weight_kg,
              pieces
            ),
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
          )
        `)
        .eq("vendor_id", vendorRecord.id)
        .order("created_at", { ascending: false });

      if (orderItemsError) throw orderItemsError;

      const orders = (orderItemsData || []).map((item) => {
        const orderStatus = normalizeOrderStatus(item.orders?.status);
        const profile = item.orders?.profiles;

        return {
          id: item.id,
          orderId: item.order_id,
          orderCode:
            item.orders?.order_code ||
            `ORD-${String(item.order_id).slice(-4).toUpperCase()}`,
          product: item.products,
          quantity: item.quantity,
          price: item.price,
          totalAmount: item.quantity * item.price,
          orderStatus,
          status: deriveFulfillmentStatus(item.fulfillment_status, orderStatus),
          fulfillmentStatusRaw: String(item.fulfillment_status || "pending").toLowerCase(),
          createdAt: item.created_at,
          order: item.orders,
          customer: {
            firstname: profile?.firstname || item.orders?.buyer_firstname || "",
            lastname: profile?.lastname || item.orders?.buyer_lastname || "",
            email: profile?.email || item.orders?.buyer_email || "",
            phone: profile?.phone || item.orders?.buyer_phone || "",
          },
          shipping: {
            address: item.orders?.shipping_address || null,
            city: item.orders?.shipping_city || null,
            region: item.orders?.shipping_region || null,
            digitalAddress: item.orders?.shipping_digital_address || null,
          },
          registry: item.orders?.registries,
          registryOwner: item.orders?.registries?.profiles,
          variation: item.variation || null,
          wrapping: item.wrapping ?? false,
          giftWrapOptionId: item.gift_wrap_option_id || null,
          giftWrapOption: item.gift_wrap_options || null,
          checkoutContext:
            item.orders?.checkout_context?.[0] || item.orders?.checkout_context || null,
        };
      });

      const stats = {
        pending: orders.filter((o) => o.status === "pending").length,
        paid: orders.filter((o) => o.status === "paid").length,
        shipped: orders.filter((o) => o.status === "shipped").length,
        delivered: orders.filter((o) => o.status === "delivered").length,
        cancelled: orders.filter((o) => o.status === "cancelled").length,
        expired: orders.filter((o) => o.status === "expired").length,
      };

      setOrdersData({ orders, stats });
    } catch (err) {
      console.error("Orders fetch error:", err);
      setError(toReadableError(err));
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