"use server";
import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import StorefrontContent from "./content";
import { StorefrontProductsProvider } from "./context";

const formatPrice = (value) => {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return `GHS ${num.toFixed(2)}`;
};

export default async function VendorStorefront({ params }) {
  const { vendor_slug } = await params;

  const PAGE_SIZE = 12;

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
      stock_qty,
      status
    `
    )
    .eq("vendor_id", vendor.id)
    .eq("status", "approved")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

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
          stock: product.stock_qty ?? 0,
        };
      })
    : [];

  return (
    <StorefrontProductsProvider
      vendorSlug={vendor_slug}
      initialProducts={products}
      initialPage={1}
      pageSize={PAGE_SIZE}
    >
      <StorefrontContent vendor={vendor} />
    </StorefrontProductsProvider>
  );
}
