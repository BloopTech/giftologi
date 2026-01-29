"use server";
import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import PublicRegistryContent from "./content";
import { GuestRegistryCodeProvider } from "./context";

const formatPrice = (value) => {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return `GHS ${num.toFixed(2)}`;
};

export default async function PublicRegistry({ params }) {
  const { registry_code } = await params;

  if (!registry_code) {
    return notFound();
  }

  const supabase = await createClient();

  const { data: registry, error: registryError } = await supabase
    .from("registries")
    .select(
      `
      id,
      title,
      registry_code,
      cover_photo,
      deadline,
      welcome_note,
      shipping_instructions,
      event:events(
        id,
        host_id,
        type,
        title,
        date,
        cover_photo,
        location,
        description,
        street_address,
        street_address_2,
        city,
        state_province,
        postal_code,
        gps_location
      )
    `,
    )
    .eq("registry_code", registry_code)
    .maybeSingle();

  if (registryError || !registry) {
    return notFound();
  }

  const event = Array.isArray(registry.event)
    ? registry.event[0]
    : registry.event;

  const { data: hostProfile } = event?.host_id
    ? await supabase
        .from("profiles")
        .select("id, firstname, lastname, email, image")
        .eq("id", event.host_id)
        .maybeSingle()
    : { data: null };

  const { data: registryItems } = await supabase
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
        images,
        category_id
      )
    `,
    )
    .eq("registry_id", registry.id);

  // Fetch categories for filtering
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name");

  const products = Array.isArray(registryItems)
    ? registryItems.map((item) => {
        const product = item.product || {};
        const images = Array.isArray(product.images) ? product.images : [];
        return {
          id: item.id,
          productId: product.id,
          title: product.name || "Gift item",
          image: images[0] || "/host/toaster.png",
          price: formatPrice(product.price),
          rawPrice: product.price,
          desired: item.quantity_needed ?? 0,
          purchased: item.purchased_qty ?? 0,
          categoryId: product.category_id,
        };
      })
    : [];

  // Build shipping address from event data
  const shippingAddress = event
    ? {
        name: hostProfile
          ? `${hostProfile.firstname || ""} ${hostProfile.lastname || ""}`.trim()
          : null,
        streetAddress: event.street_address || null,
        streetAddress2: event.street_address_2 || null,
        city: event.city || null,
        stateProvince: event.state_province || null,
        postalCode: event.postal_code || null,
        gpsLocation: event.gps_location || null,
      }
    : null;

  return (
    <GuestRegistryCodeProvider
      initialRegistry={registry}
      initialEvent={event}
      initialHost={hostProfile}
      initialProducts={products}
      initialShippingAddress={shippingAddress}
      initialCategories={categories || []}
    >
      <PublicRegistryContent />
    </GuestRegistryCodeProvider>
  );
}
