"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient as createSupabaseClient } from "../../../../utils/supabase/client";

const HostRegistryCodeContext = createContext();

export const HostRegistryCodeProvider = ({
  children,
  registryCode,
  initialRegistry,
  initialEvent,
  initialDeliveryAddress,
}) => {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [registry, setRegistry] = useState(initialRegistry ?? null);
  const [event, setEvent] = useState(initialEvent ?? null);
  const [deliveryAddress, setDeliveryAddress] = useState(
    initialDeliveryAddress ?? null
  );
  const [registryItems, setRegistryItems] = useState([]);
  const [registryInvites, setRegistryInvites] = useState([]);
  const [thankYouNotes, setThankYouNotes] = useState([]);
  const [registryOrders, setRegistryOrders] = useState([]);
  const [pageViews, setPageViews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!registryCode) return;
    setIsLoading(true);
    setError(null);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .single();

    if (profileError || !profile?.id) {
      setError(profileError || new Error("Unable to load profile"));
      setIsLoading(false);
      return;
    }

    const { data: registryData, error: registryError } = await supabase
      .from("registries")
      .select(
        `
        id,
        title,
        registry_code,
        cover_photo,
        deadline,
        welcome_note,
        price_range_min,
        price_range_max,
        event:events!inner(
          id,
          host_id,
          type,
          title,
          date,
          location,
          privacy,
          cover_photo
        )
      `
      )
      .eq("registry_code", registryCode)
      .eq("event.host_id", profile.id)
      .maybeSingle();

    if (registryError || !registryData) {
      setError(registryError || new Error("Registry not found"));
      setIsLoading(false);
      return;
    }

    const eventData = Array.isArray(registryData.event)
      ? registryData.event[0]
      : registryData.event;

    const { data: registryItemsData, error: registryItemsError } =
      await supabase
        .from("registry_items")
        .select(
          `
          id,
          quantity_needed,
          purchased_qty,
          priority,
          notes,
          color,
          size,
          variation,
          product:products(
            id,
            name,
            price,
            images
          )
        `
        )
        .eq("registry_id", registryData.id);

    if (registryItemsError) {
      setError(registryItemsError);
      setIsLoading(false);
      return;
    }

    const { data: deliveryAddressData, error: deliveryAddressError } = await supabase
      .from("registry_delivery_addresses")
      .select("*")
      .eq("registry_code", registryCode)
      .maybeSingle();

    if (deliveryAddressError) {
      setError(deliveryAddressError);
      setIsLoading(false);
      return;
    }

    const registryItemIds = (registryItemsData || [])
      .map((item) => item?.id)
      .filter(Boolean);

    const [invitesResult, thankYouResult, orderItemsResult] = await Promise.all([
      supabase
        .from("registry_invites")
        .select("id, email, status, invited_at")
        .eq("registry_id", registryData.id)
        .order("invited_at", { ascending: false }),
      supabase
        .from("registry_thank_you")
        .select(
          "id, order_id, recipient_email, recipient_name, message, sent_at, created_at"
        )
        .eq("registry_id", registryData.id)
        .order("created_at", { ascending: false }),
      registryItemIds.length
        ? supabase
            .from("order_items")
            .select("order_id, registry_item_id, quantity")
            .in("registry_item_id", registryItemIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (invitesResult.error) {
      console.error("Failed to load registry invites:", invitesResult.error);
    }

    if (thankYouResult.error) {
      console.error("Failed to load registry thank-you notes:", thankYouResult.error);
    }

    let ordersPayload = [];
    const orderItems = Array.isArray(orderItemsResult.data)
      ? orderItemsResult.data
      : [];
    const orderIds = Array.from(
      new Set(orderItems.map((item) => item?.order_id).filter(Boolean))
    );

    if (orderIds.length) {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(
          "id, status, order_type, buyer_firstname, buyer_lastname, buyer_email, gifter_firstname, gifter_lastname, gifter_email, gifter_anonymous, created_at"
        )
        .in("id", orderIds)
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Failed to load registry orders:", ordersError);
      } else {
        ordersPayload = (ordersData || []).map((order) => {
          const gifterName = [order.gifter_firstname, order.gifter_lastname]
            .filter(Boolean)
            .join(" ")
            .trim();
          const buyerName = [order.buyer_firstname, order.buyer_lastname]
            .filter(Boolean)
            .join(" ")
            .trim();
          return {
            id: order.id,
            status: order.status,
            orderType: order.order_type,
            createdAt: order.created_at,
            gifterName: gifterName || null,
            gifterEmail: order.gifter_email || null,
            buyerName: buyerName || null,
            buyerEmail: order.buyer_email || null,
            gifterAnonymous: !!order.gifter_anonymous,
          };
        });
      }
    }

    // Fetch page views for analytics (last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: viewsData } = await supabase
      .from("registry_page_views")
      .select("id, viewed_at")
      .eq("registry_id", registryData.id)
      .gte("viewed_at", ninetyDaysAgo)
      .order("viewed_at", { ascending: true });

    setRegistry(registryData);
    setEvent(eventData || null);
    setDeliveryAddress(deliveryAddressData || null);
    setRegistryItems(Array.isArray(registryItemsData) ? registryItemsData : []);
    setRegistryInvites(Array.isArray(invitesResult.data) ? invitesResult.data : []);
    setThankYouNotes(Array.isArray(thankYouResult.data) ? thankYouResult.data : []);
    setRegistryOrders(Array.isArray(ordersPayload) ? ordersPayload : []);
    setPageViews(Array.isArray(viewsData) ? viewsData : []);
    setIsLoading(false);
  }, [registryCode, supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totals = useMemo(() => {
    const items = Array.isArray(registryItems) ? registryItems : [];
    const itemsCount = items.length;
    const desiredQty = items.reduce(
      (sum, item) => sum + (item?.quantity_needed ?? 0),
      0
    );
    const purchasedQty = items.reduce(
      (sum, item) => sum + (item?.purchased_qty ?? 0),
      0
    );
    return {
      itemsCount,
      desiredQty,
      purchasedQty,
    };
  }, [registryItems]);

  const value = useMemo(
    () => ({
      registry,
      event,
      deliveryAddress,
      registryItems,
      registryInvites,
      thankYouNotes,
      registryOrders,
      pageViews,
      totals,
      isLoading,
      error,
      refresh,
    }),
    [
      registry,
      event,
      deliveryAddress,
      registryItems,
      registryInvites,
      thankYouNotes,
      registryOrders,
      pageViews,
      totals,
      isLoading,
      error,
      refresh,
    ]
  );

  return (
    <HostRegistryCodeContext.Provider value={value}>
      {children}
    </HostRegistryCodeContext.Provider>
  );
};

export const useHostRegistryCodeContext = () =>
  useContext(HostRegistryCodeContext);