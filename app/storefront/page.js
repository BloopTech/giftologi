"use server";
import React from "react";
import Link from "next/link";
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
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#storefront-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to storefront directory
      </Link>
      <main id="storefront-content" role="main" aria-label="Browse stores">
        <StorefrontDirectoryProvider initialSearchParams={resolvedSearchParams}>
          <StorefrontDirectoryContent />
        </StorefrontDirectoryProvider>
      </main>
    </>
  );
}
