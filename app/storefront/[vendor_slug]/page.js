"use server";
import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import StorefrontContent from "./content";

const formatPrice = (value) => {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return `GHS ${num.toFixed(2)}`;
};

export default async function VendorStorefront({ params }) {
  const { vendor_slug } = await params;

  if (!vendor_slug) {
    return notFound();
  }

  const supabase = await createClient();

  // Fetch vendor by slug
  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select(
      `
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
      address_country
    `
    )
    .eq("slug", vendor_slug)
    .maybeSingle();

  if (vendorError || !vendor) {
    return notFound();
  }

  // Fetch vendor's products (only active products for public view)
  const { data: vendorProducts } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      price,
      images,
      description,
      stock,
      status
    `
    )
    .eq("vendor_id", vendor.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const products = Array.isArray(vendorProducts)
    ? vendorProducts.map((product) => {
        const images = Array.isArray(product.images) ? product.images : [];
        return {
          id: product.id,
          name: product.name || "Product",
          image: images[0] || "/host/toaster.png",
          price: formatPrice(product.price),
          rawPrice: product.price,
          description: product.description || "",
          stock: product.stock ?? 0,
        };
      })
    : [];

  return (
    <StorefrontContent
      vendor={vendor}
      products={products}
    />
  );
}
