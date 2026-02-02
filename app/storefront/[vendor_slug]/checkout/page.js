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
  const { product: productId, qty, variant } = await searchParams;

  if (!vendor_slug || !productId) {
    return notFound();
  }

  const quantity = Math.max(1, parseInt(qty || "1", 10) || 1);
  const variantKey = typeof variant === "string" ? variant : "";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = `/storefront/${vendor_slug}/checkout?product=${productId}&qty=${quantity}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
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

  // Check if shop is closed
  if ((vendor.shop_status || "").toLowerCase() === "closed") {
    redirect(`/storefront/${vendor_slug}`);
  }

  // Fetch product
  const { data: product, error: productError } = await supabase
    .from("products")
    .select(`
      id,
      name,
      price,
      variations,
      images,
      description,
      stock_qty,
      status,
      product_code
    `)
    .eq("id", productId)
    .eq("vendor_id", vendor.id)
    .eq("status", "approved")
    .eq("active", true)
    .single();

  if (productError || !product) {
    return notFound();
  }

  // Check stock
  if (product.stock_qty <= 0) {
    redirect(`/storefront/${vendor_slug}/${product.product_code}`);
  }

  const images = Array.isArray(product.images) ? product.images : [];
  const actualQuantity = Math.min(quantity, product.stock_qty);
  const variations = normalizeVariations(product.variations);
  const variationOptions = buildVariationOptions(variations);
  const selectedVariation = variantKey
    ? variationOptions.find((option) => option.key === variantKey) || null
    : null;

  if (variations.length > 0 && !selectedVariation) {
    redirect(`/storefront/${vendor_slug}/${product.product_code}`);
  }
  const basePrice = Number(product.price);

  const formattedProduct = {
    id: product.id,
    name: product.name || "Product",
    image: images[0] || "/host/toaster.png",
    price: formatPrice(product.price),
    rawPrice: Number.isFinite(basePrice) ? basePrice : product.price,
    basePrice: Number.isFinite(basePrice) ? basePrice : null,
    description: product.description || "",
    stock: product.stock_qty ?? 0,
  };

  return (
    <CheckoutContent
      vendor={vendor}
      product={formattedProduct}
      initialQuantity={actualQuantity}
      selectedVariation={selectedVariation}
    />
  );
}
