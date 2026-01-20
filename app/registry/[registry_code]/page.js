"use server";
import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import PublicRegistryContent from "./content";

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
      event:events(
        id,
        host_id,
        type,
        title,
        date,
        cover_photo
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
        images
      )
    `,
    )
    .eq("registry_id", registry.id);

  const products = Array.isArray(registryItems)
    ? registryItems.map((item) => {
        const product = item.product || {};
        const images = Array.isArray(product.images) ? product.images : [];
        return {
          id: item.id,
          title: product.name || "Gift item",
          image: images[0] || "/host/toaster.png",
          price: formatPrice(product.price),
          desired: item.quantity_needed ?? 0,
          purchased: item.purchased_qty ?? 0,
        };
      })
    : [];

  return (
    <PublicRegistryContent
      registry={registry}
      event={event}
      host={hostProfile}
      products={products}
    />
  );
}
