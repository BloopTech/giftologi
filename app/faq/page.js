"use server";

import React from "react";
import FAQContent from "./content";
import { FaqProvider } from "./context";
import { createMetadata, getSeoDefaults } from "../utils/seo";

export async function generateMetadata() {
  const defaults = await getSeoDefaults();

  return createMetadata({
    title: "FAQ",
    description:
      "Get quick answers to common questions about Giftologi orders, registries, vendors, and support.",
    canonical: `${defaults.siteUrl}/faq`,
    ogType: "website",
  });
}

export default async function FAQPage() {
  return (
    <FaqProvider>
      <FAQContent />
    </FaqProvider>
  );
}
