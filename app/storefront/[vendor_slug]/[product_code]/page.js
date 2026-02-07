"use server";

import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "../../../utils/supabase/server";
import { createMetadata, getSeoDefaults } from "../../../utils/seo";
import { ProductDetailProvider } from "./context";
import ProductCodeDetailContent from "./content";

export async function generateMetadata({ params }) {
  const { vendor_slug, product_code } = await params;
  const supabase = await createClient();
  const defaults = await getSeoDefaults();

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, business_name, slug")
    .eq("slug", vendor_slug)
    .maybeSingle();

  if (!vendor?.id) {
    return createMetadata({
      title: "Product Not Found",
      description: "The requested product could not be found.",
      noIndex: true,
    });
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, name, description, price, service_charge, images, product_code")
    .eq("vendor_id", vendor.id)
    .eq("product_code", product_code)
    .maybeSingle();

  if (!product) {
    return createMetadata({
      title: "Product Not Found",
      description: "The requested product could not be found.",
      noIndex: true,
    });
  }

  const images = Array.isArray(product.images) ? product.images : [];
  const ogImage = images[0] || defaults.ogImage;
  const basePrice = Number(product.price);
  const serviceCharge = Number(product.service_charge || 0);
  const totalPrice = Number.isFinite(basePrice)
    ? basePrice + serviceCharge
    : serviceCharge;

  return createMetadata({
    title: `${product.name} - ${vendor.business_name || "Shop"}`,
    description:
      product.description?.slice(0, 160) ||
      `Shop ${product.name} at ${vendor.business_name || "our store"}.`,
    keywords: [product.name, vendor.business_name, "gift", "shop", "buy online"].filter(Boolean),
    canonical: `${defaults.siteUrl}/storefront/${vendor_slug}/${product_code}`,
    ogImage,
    ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description,
      image: images,
      offers: {
        "@type": "Offer",
        price: Number.isFinite(totalPrice) ? totalPrice : product.price,
        priceCurrency: "GHS",
        availability: "https://schema.org/InStock",
        url: `${defaults.siteUrl}/storefront/${vendor_slug}/${product_code}`,
      },
      brand: {
        "@type": "Brand",
        name: vendor.business_name,
      },
    },
  });
}

export default async function ProductCodeDetailPage({ params }) {
  const { vendor_slug, product_code } = await params;

  if (!vendor_slug || !product_code) {
    return notFound();
  }

  return (
    <ProductDetailProvider vendorSlug={vendor_slug} productCode={product_code}>
      <ProductCodeDetailContent />
    </ProductDetailProvider>
  );
}
