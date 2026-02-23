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

const AdminOrdersContext = createContext(null);

const VIEWABLE_ROLES = new Set([
  "super_admin",
  "operations_manager_admin",
  "finance_admin",
  "customer_support_admin",
]);

const EDITABLE_ROLES = new Set(["super_admin", "operations_manager_admin"]);

function normalizeStatus(value) {
  const status = String(value || "pending").toLowerCase();
  return status === "canceled" ? "cancelled" : status;
}

function deriveEffectiveFulfillmentStatus(fulfillmentStatus, orderStatus) {
  const normalizedFulfillment = normalizeStatus(fulfillmentStatus);
  const normalizedOrder = normalizeStatus(orderStatus);

  if (
    normalizedFulfillment === "pending" &&
    (normalizedOrder === "cancelled" || normalizedOrder === "expired")
  ) {
    return normalizedOrder;
  }

  return normalizedFulfillment;
}

function readableName(row) {
  const first = String(row?.buyer_firstname || "").trim();
  const last = String(row?.buyer_lastname || "").trim();
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  return row?.buyer_email || "Guest";
}

export function AdminOrdersProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentAdmin, setCurrentAdmin] = useState(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user?.id) {
        setItems([]);
        setCurrentAdmin(null);
        setError("You must be logged in to view orders.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, firstname, lastname, email")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        setItems([]);
        setCurrentAdmin(null);
        setError("Unable to resolve admin profile.");
        return;
      }

      setCurrentAdmin(profile);

      if (!VIEWABLE_ROLES.has(String(profile.role || "").toLowerCase())) {
        setItems([]);
        setError("You are not authorized to view order operations.");
        return;
      }

      const { data: rows, error: rowsError } = await supabase
        .from("order_items")
        .select(
          `
          id,
          order_id,
          vendor_id,
          product_id,
          quantity,
          price,
          total_price,
          fulfillment_status,
          tracking_number,
          created_at,
          updated_at,
          orders(
            id,
            order_code,
            status,
            order_type,
            buyer_firstname,
            buyer_lastname,
            buyer_email,
            buyer_phone,
            shipping_city,
            shipping_region,
            shipping_address,
            shipping_digital_address,
            created_at
          ),
          products(
            id,
            name,
            product_code
          ),
          vendors(
            id,
            business_name
          )
        `
        )
        .order("created_at", { ascending: false });

      if (rowsError) {
        setItems([]);
        setError(rowsError.message || "Failed to load order items.");
        return;
      }

      const mapped = (rows || []).map((row) => {
        const order = row.orders || {};
        const orderStatus = normalizeStatus(order.status);
        const fulfillmentStatusRaw = normalizeStatus(row.fulfillment_status);
        const fulfillmentStatus = deriveEffectiveFulfillmentStatus(
          fulfillmentStatusRaw,
          orderStatus
        );
        const unitPrice = Number(row.price || 0);
        const quantity = Number(row.quantity || 0);
        const total = Number.isFinite(Number(row.total_price))
          ? Number(row.total_price)
          : unitPrice * quantity;

        return {
          id: row.id,
          orderId: row.order_id,
          orderCode:
            order.order_code ||
            `ORD-${String(row.order_id || "").slice(-4).toUpperCase()}`,
          orderStatus,
          orderType: String(order.order_type || "storefront").toLowerCase(),
          createdAt: row.created_at || order.created_at,
          updatedAt: row.updated_at || row.created_at || order.created_at,
          buyerName: readableName(order),
          buyerEmail: order.buyer_email || null,
          buyerPhone: order.buyer_phone || null,
          shippingCity: order.shipping_city || null,
          shippingRegion: order.shipping_region || null,
          shippingAddress: order.shipping_address || null,
          shippingDigitalAddress: order.shipping_digital_address || null,
          vendorId: row.vendor_id,
          vendorName: row.vendors?.business_name || "Unknown vendor",
          productId: row.product_id,
          productName: row.products?.name || "Product",
          productCode: row.products?.product_code || "—",
          quantity,
          unitPrice,
          totalAmount: total,
          fulfillmentStatus,
          fulfillmentStatusRaw,
          trackingNumber: row.tracking_number || "",
        };
      });

      setItems(mapped);
    } catch (err) {
      setItems([]);
      setError(err?.message || "Failed to load order operations data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const stats = useMemo(() => {
    const byStatus = {
      pending: 0,
      paid: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      expired: 0,
      total: items.length,
    };

    for (const item of items) {
      const key = normalizeStatus(item.fulfillmentStatus);
      if (Object.prototype.hasOwnProperty.call(byStatus, key)) {
        byStatus[key] += 1;
      }
    }

    return byStatus;
  }, [items]);

  const canUpdateFulfillment = useMemo(() => {
    const role = String(currentAdmin?.role || "").toLowerCase();
    return EDITABLE_ROLES.has(role);
  }, [currentAdmin?.role]);

  const value = useMemo(
    () => ({
      items,
      stats,
      loading,
      error,
      currentAdmin,
      canUpdateFulfillment,
      refreshData,
    }),
    [items, stats, loading, error, currentAdmin, canUpdateFulfillment, refreshData]
  );

  return (
    <AdminOrdersContext.Provider value={value}>
      {children}
    </AdminOrdersContext.Provider>
  );
}

export function useAdminOrdersContext() {
  return useContext(AdminOrdersContext);
}
