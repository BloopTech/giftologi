import React from "react";
import Link from "next/link";
import GlobalSearchContent from "./content";
import { createMetadata, getSeoDefaults } from "../utils/seo";

export async function generateMetadata() {
  const defaults = await getSeoDefaults();

  return createMetadata({
    title: "Search Giftologi",
    description:
      "Search Giftologi for products, public registries, and vendors in one place.",
    keywords: ["search", "gift shop", "registry search", "vendor directory"],
    canonical: `${defaults.siteUrl}/search`,
    ogType: "website",
  });
}

export default function SearchPage() {
  return (
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#search-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to search results
      </Link>
      <main id="search-content" role="main" aria-label="Search Giftologi">
        <GlobalSearchContent />
      </main>
    </>
  );
}
