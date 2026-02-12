import React from "react";
import { notFound } from "next/navigation";
import PublicRegistryContent from "./content";
import { GuestRegistryCodeProvider } from "./context";
import { createAdminClient } from "../../utils/supabase/server";

const formatPrice = (value) => {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return `GHS ${num.toFixed(2)}`;
};

/**
 * For invite-only registries with a valid token, fetch everything server-side
 * with the admin client so RLS is bypassed.
 */
async function fetchRegistryForToken(admin, registryId) {
  const { data: registryData } = await admin
    .from("registries")
    .select(
      `
      id, title, registry_code, cover_photo, deadline, welcome_note, category_ids,
      event:events(id, host_id, type, title, date, cover_photo, location, description)
      `
    )
    .eq("id", registryId)
    .maybeSingle();

  if (!registryData) return null;

  const eventData = Array.isArray(registryData.event)
    ? registryData.event[0]
    : registryData.event;

  let hostProfile = null;
  if (eventData?.host_id) {
    const { data } = await admin
      .from("profiles")
      .select("id, firstname, lastname, email, image")
      .eq("id", eventData.host_id)
      .maybeSingle();
    hostProfile = data;
  }

  const { data: registryItems } = await admin
    .from("registry_items")
    .select(
      `
      id, quantity_needed, purchased_qty,
      product:products(
        id, name, price, weight_kg, service_charge, images, vendor_id, category_id,
        vendor:vendors(slug),
        product_categories(category_id)
      )
      `
    )
    .eq("registry_id", registryData.id);

  const registryCategoryIds = Array.isArray(registryData.category_ids)
    ? registryData.category_ids.filter(Boolean)
    : [];

  let categoriesData = [];
  if (registryCategoryIds.length > 0) {
    const { data } = await admin
      .from("categories")
      .select("id, name, slug")
      .in("id", registryCategoryIds)
      .order("name");
    categoriesData = data || [];
  }

  const products = Array.isArray(registryItems)
    ? registryItems.map((item) => {
        const product = item.product || {};
        const images = Array.isArray(product.images) ? product.images : [];
        const relatedCategoryIds = Array.isArray(product.product_categories)
          ? product.product_categories
              .map((entry) => entry?.category_id)
              .filter(Boolean)
          : [];
        const mergedCategoryIds = [
          ...new Set([...relatedCategoryIds, product.category_id].filter(Boolean)),
        ];
        const serviceCharge = Number(product.service_charge || 0);
        const basePrice = Number(product.price);
        const totalPrice = Number.isFinite(basePrice)
          ? basePrice + serviceCharge
          : serviceCharge;
        return {
          id: item.id,
          productId: product.id,
          title: product.name || "Gift item",
          image: images[0] || "/host/toaster.png",
          price: formatPrice(totalPrice),
          rawPrice: totalPrice,
          desired: item.quantity_needed ?? 0,
          purchased: item.purchased_qty ?? 0,
          vendorId: product.vendor_id,
          vendorSlug: product.vendor?.slug || null,
          categoryId: product.category_id,
          categoryIds: mergedCategoryIds,
          serviceCharge,
          weightKg: product.weight_kg ?? null,
        };
      })
    : [];

  const { data: deliveryAddress } = await admin
    .from("delivery_addresses")
    .select("*")
    .eq("registry_id", registryData.id)
    .maybeSingle();

  const shippingAddress = deliveryAddress
    ? {
        name: hostProfile
          ? `${hostProfile.firstname || ""} ${hostProfile.lastname || ""}`.trim()
          : null,
        streetAddress: deliveryAddress.street_address || null,
        streetAddress2: deliveryAddress.street_address_2 || null,
        city: deliveryAddress.city || null,
        stateProvince: deliveryAddress.state_province || null,
        postalCode: deliveryAddress.postal_code || null,
        gpsLocation: deliveryAddress.gps_location || null,
        digitalAddress: deliveryAddress.digital_address || null,
      }
    : null;

  return {
    registry: registryData,
    event: eventData || null,
    host: hostProfile,
    products,
    shippingAddress,
    categories: categoriesData,
  };
}

export default async function PublicRegistry({ params, searchParams }) {
  const { registry_code } = await params;
  const resolvedSearch = await searchParams;
  const inviteToken = resolvedSearch?.token || null;

  if (!registry_code) {
    return notFound();
  }

  const admin = createAdminClient();

  // Server-side check: does the registry exist and what is its privacy?
  const { data: registryMeta } = await admin
    .from("registries")
    .select("id, event:events(privacy)")
    .eq("registry_code", registry_code)
    .maybeSingle();

  if (!registryMeta) {
    return notFound();
  }

  const eventPrivacy = registryMeta.event?.privacy || "public";

  // For invite-only registries, validate the invite token and pre-fetch data
  let tokenValid = false;
  let prefetchedData = null;

  if (eventPrivacy === "invite-only" && inviteToken) {
    const { data: invite } = await admin
      .from("registry_invites")
      .select("id, registry_id")
      .eq("invite_token", inviteToken)
      .eq("registry_id", registryMeta.id)
      .maybeSingle();

    if (invite) {
      tokenValid = true;

      // Mark invite as accepted
      await admin
        .from("registry_invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      // Fetch all registry data server-side (bypasses RLS)
      prefetchedData = await fetchRegistryForToken(admin, registryMeta.id);
    }
  }

  return (
    <GuestRegistryCodeProvider
      registryCode={registry_code}
      registryPrivacy={eventPrivacy}
      tokenValid={tokenValid}
      initialRegistry={prefetchedData?.registry || null}
      initialEvent={prefetchedData?.event || null}
      initialHost={prefetchedData?.host || null}
      initialProducts={prefetchedData?.products || []}
      initialShippingAddress={prefetchedData?.shippingAddress || null}
      initialCategories={prefetchedData?.categories || []}
    >
      <PublicRegistryContent />
    </GuestRegistryCodeProvider>
  );
}
