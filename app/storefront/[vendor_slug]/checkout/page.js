"use server";
import React from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../utils/supabase/server";
import CheckoutContent from "./content";
import { createMetadata, getSeoDefaults } from "../../../utils/seo";

const formatPrice = (value) => {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return `GHS ${num.toFixed(2)}`;
};

const normalizeVariations = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((variation) => variation && typeof variation === "object");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((variation) => variation && typeof variation === "object")
        : [];
    } catch {
      return [];
    }
  }
  return [];
};

const buildVariationOptions = (variations = []) =>
  variations
    .map((variation, index) => ({
      key: String(variation?.id || variation?.sku || index),
      label:
        variation?.label ||
        [variation?.color, variation?.size].filter(Boolean).join(" / ") ||
        `Option ${index + 1}`,
      price: variation?.price,
      stock_qty: variation?.stock_qty ?? null,
      raw: variation,
    }))
    .filter((option) => option.label);

export async function generateMetadata({ params }) {
  const { vendor_slug } = await params;
  const supabase = await createClient();
  const defaults = await getSeoDefaults();

  const { data: vendor } = await supabase
    .from("vendors")
    .select("business_name")
    .eq("slug", vendor_slug)
    .single();

  return createMetadata({
    title: `Checkout - ${vendor?.business_name || "Shop"}`,
    description: `Complete your purchase from ${vendor?.business_name || "our store"}. Secure checkout with ExpressPay.`,
    canonical: `${defaults.siteUrl}/storefront/${vendor_slug}/checkout`,
    noIndex: true,
  });
}

export default async function CheckoutPage({ params, searchParams }) {
  const { vendor_slug } = await params;
  const { product: productId, qty, variant, cart, registry_id: registryId } = await searchParams;
  const isCartCheckout = cart === "1" || cart === "true";

  if (!vendor_slug || (!isCartCheckout && !productId)) {
    return notFound();
  }

  const quantity = Math.max(1, parseInt(qty || "1", 10) || 1);
  const variantKey = typeof variant === "string" ? variant : "";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Both cart and direct product checkout allow guest access.

  // Fetch user profile for prefilling contact & shipping
  let userProfile = null;
  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("firstname, lastname, email, phone, address_street, address_city, address_state, digital_address")
      .eq("id", user.id)
      .single();
    userProfile = profile;
  }

  // Fetch vendor
  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select(`
      id,
      business_name,
      description,
      logo,
      logo_url,
      slug,
      shop_status,
      category,
      verified,
      address_city,
      address_state,
      address_country,
      address_street,
      digital_address,
      phone,
      email
    `)
    .eq("slug", vendor_slug)
    .maybeSingle();

  if (vendorError || !vendor) {
    return notFound();
  }

  // Block checkout for unapproved vendors
  if (!vendor.verified) {
    return notFound();
  }

  // Check if shop is closed
  if ((vendor.shop_status || "").toLowerCase() === "closed") {
    redirect(`/storefront/${vendor_slug}`);
  }

  if (isCartCheckout) {
    return <CheckoutContent vendor={vendor} cartMode registryId={registryId || null} userProfile={userProfile} />;
  }

  // Fetch product
  const { data: product, error: productError } = await supabase
    .from("products")
    .select(`
      id,
      name,
      price,
      weight_kg,
      service_charge,
      variations,
      images,
      description,
      stock_qty,
      status,
      product_code,
      sale_price,
      sale_starts_at,
      sale_ends_at
    `)
    .eq("id", productId)
    .eq("vendor_id", vendor.id)
    .eq("status", "approved")
    .eq("active", true)
    .single();

  if (productError || !product) {
    return notFound();
  }

  // Check general stock
  if (product.stock_qty <= 0) {
    redirect(`/storefront/${vendor_slug}/${product.product_code}`);
  }

  const images = Array.isArray(product.images) ? product.images : [];
  const variations = normalizeVariations(product.variations);
  const variationOptions = buildVariationOptions(variations);
  const selectedVariation = variantKey
    ? variationOptions.find((option) => option.key === variantKey) || null
    : null;

  if (variations.length > 0 && !selectedVariation) {
    redirect(`/storefront/${vendor_slug}/${product.product_code}`);
  }

  // Determine effective stock: variation stock_qty if selected, else general
  const effectiveStock =
    selectedVariation && selectedVariation.stock_qty != null
      ? Number(selectedVariation.stock_qty)
      : product.stock_qty;

  // If the selected variation is out of stock, redirect back
  if (effectiveStock <= 0) {
    redirect(`/storefront/${vendor_slug}/${product.product_code}`);
  }

  const actualQuantity = Math.min(quantity, effectiveStock);
  const basePrice = Number(product.price);
  const serviceCharge = Number(product.service_charge || 0);
  const baseWithCharge = Number.isFinite(basePrice)
    ? basePrice + serviceCharge
    : serviceCharge;

  // Compute effective price accounting for active sale
  let effectiveBaseWithCharge = baseWithCharge;
  let isOnSale = false;
  const rawSalePrice = Number(product.sale_price);
  if (Number.isFinite(rawSalePrice) && rawSalePrice > 0) {
    const now = Date.now();
    const sStarts = product.sale_starts_at ? new Date(product.sale_starts_at).getTime() : null;
    const sEnds = product.sale_ends_at ? new Date(product.sale_ends_at).getTime() : null;
    const saleActive =
      (!sStarts || (!Number.isNaN(sStarts) && now >= sStarts)) &&
      (!sEnds || (!Number.isNaN(sEnds) && now <= sEnds));
    if (saleActive) {
      effectiveBaseWithCharge = rawSalePrice + serviceCharge;
      isOnSale = true;
    }
  }

  const formattedProduct = {
    id: product.id,
    name: product.name || "Product",
    image: images[0] || "/host/toaster.png",
    price: formatPrice(effectiveBaseWithCharge),
    rawPrice: Number.isFinite(effectiveBaseWithCharge) ? effectiveBaseWithCharge : product.price,
    basePrice: Number.isFinite(baseWithCharge) ? baseWithCharge : null,
    originalPrice: isOnSale ? formatPrice(baseWithCharge) : null,
    isOnSale,
    serviceCharge,
    weightKg: product.weight_kg ?? null,
    description: product.description || "",
    stock: product.stock_qty ?? 0,
  };

  return (
    <CheckoutContent
      vendor={vendor}
      product={formattedProduct}
      initialQuantity={actualQuantity}
      selectedVariation={selectedVariation}
      userProfile={userProfile}
    />
  );
}
