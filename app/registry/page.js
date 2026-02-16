import React from "react";
import Link from "next/link";
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
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#registry-discover-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to registry search
      </Link>
      <main id="registry-discover-content" role="main" aria-label="Find a registry">
        <RegistryDiscoverProvider>
          <RegistryDiscoverContent />
        </RegistryDiscoverProvider>
      </main>
    </>
  );
}
