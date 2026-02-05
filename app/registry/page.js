import React from "react";
import RegistryDiscoverContent from "./content";
import { RegistryDiscoverProvider } from "./context";
import { createMetadata, getSeoDefaults } from "../utils/seo";

export async function generateMetadata() {
  const defaults = await getSeoDefaults();

  return createMetadata({
    title: "Find a Registry - Giftologi",
    description:
      "Discover public gift registries by host name, registry name, event type, or registry code.",
    keywords: [
      "gift registry",
      "registry search",
      "public registry",
      "wedding registry",
      "baby shower",
      "birthday",
    ],
    canonical: `${defaults.siteUrl}/registry`,
    ogType: "website",
  });
}

export default function RegistryDiscoverPage() {
  return (
    <RegistryDiscoverProvider>
      <RegistryDiscoverContent />
    </RegistryDiscoverProvider>
  );
}
