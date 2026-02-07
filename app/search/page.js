import React from "react";
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
  return <GlobalSearchContent />;
}
