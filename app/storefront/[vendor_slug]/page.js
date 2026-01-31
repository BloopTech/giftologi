"use server";
import React from "react";
import { notFound } from "next/navigation";
import StorefrontContent from "./content";
import { StorefrontProvider } from "./context";
import { createMetadata, getSeoDefaults } from "../../utils/seo";
import { createClient } from "../../utils/supabase/server";

const formatPrice = (value) => {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return `GHS ${num.toFixed(2)}`;
};

export async function generateMetadata({ params }) {
  const { vendor_slug } = await params;
  const supabase = await createClient();
  const defaults = await getSeoDefaults();

  const { data: vendor } = await supabase
    .from("vendors")
    .select("business_name, description, logo_url, category, address_city, address_country")
    .eq("slug", vendor_slug)
    .single();

  if (!vendor) {
    return createMetadata({
      title: "Shop Not Found",
      description: "The requested shop could not be found.",
      noIndex: true,
    });
  }

  const location = [vendor.address_city, vendor.address_country].filter(Boolean).join(", ");

  return createMetadata({
    title: `${vendor.business_name} - Shop`,
    description: vendor.description?.slice(0, 160) || `Shop quality products from ${vendor.business_name}${location ? ` in ${location}` : ""}. Secure checkout and fast delivery.`,
    keywords: [vendor.business_name, vendor.category, "shop", "gifts", "buy online", location].filter(Boolean),
    canonical: `${defaults.siteUrl}/storefront/${vendor_slug}`,
    ogImage: vendor.logo_url || defaults.ogImage,
    ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Store",
      name: vendor.business_name,
      description: vendor.description,
      image: vendor.logo_url,
      url: `${defaults.siteUrl}/storefront/${vendor_slug}`,
      address: location ? {
        "@type": "PostalAddress",
        addressLocality: vendor.address_city,
        addressCountry: vendor.address_country,
      } : undefined,
    },
  });
}

 export default async function VendorStorefront({ params }) {
  const { vendor_slug } = await params;

  if (!vendor_slug) {
    return notFound();
  }

  return (
    <StorefrontProvider vendorSlug={vendor_slug}>
      <StorefrontContent />
    </StorefrontProvider>
  );
 }
