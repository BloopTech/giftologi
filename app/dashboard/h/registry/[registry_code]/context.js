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
        event:events!inner(
          id,
          host_id,
          type,
          title,
          date,
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

    setRegistry(registryData);
    setEvent(eventData || null);
    setDeliveryAddress(deliveryAddressData || null);
    setRegistryItems(Array.isArray(registryItemsData) ? registryItemsData : []);
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
      totals,
      isLoading,
      error,
      refresh,
    }),
    [registry, event, deliveryAddress, registryItems, totals, isLoading, error, refresh]
  );

  return (
    <HostRegistryCodeContext.Provider value={value}>
      {children}
    </HostRegistryCodeContext.Provider>
  );
};

export const useHostRegistryCodeContext = () =>
  useContext(HostRegistryCodeContext);