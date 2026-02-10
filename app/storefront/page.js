"use server";
import React from "react";
import { StorefrontDirectoryProvider } from "./context";
import StorefrontDirectoryContent from "./content";
import { createMetadata, getSeoDefaults } from "../utils/seo";

export async function generateMetadata() {
  const defaults = await getSeoDefaults();

  return createMetadata({
    title: "Browse Stores - Giftologi",
    description:
      "Discover verified vendors and gift shops on Giftologi. Browse by category, location, or search for your favourite stores.",
    keywords: [
      "gift shops",
      "vendors",
      "stores",
      "buy gifts online",
      "Ghana",
      "Giftologi",
    ],
    canonical: `${defaults.siteUrl}/storefront`,
    ogType: "website",
  });
}

export default async function StorefrontDirectoryPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  return (
    <StorefrontDirectoryProvider initialSearchParams={resolvedSearchParams}>
      <StorefrontDirectoryContent />
    </StorefrontDirectoryProvider>
  );
}
