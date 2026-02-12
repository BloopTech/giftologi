"use server";
import React from "react";
import CategoriesContent from "./content";
import { createMetadata, getSeoDefaults } from "../utils/seo";

export async function generateMetadata() {
  const defaults = await getSeoDefaults();

  return createMetadata({
    title: "Browse Categories - Giftologi",
    description:
      "Explore gift categories on Giftologi. Find the perfect gift by browsing our curated category collections.",
    keywords: [
      "gift categories",
      "browse gifts",
      "gift shop categories",
      "wedding gifts",
      "baby shower gifts",
      "birthday gifts",
    ],
    canonical: `${defaults.siteUrl}/categories`,
    ogType: "website",
  });
}

export default async function CategoriesPage() {
  return <CategoriesContent />;
}
