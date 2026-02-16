"use server";
import React from "react";
import Link from "next/link";
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
  return (
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#categories-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to categories
      </Link>
      <main id="categories-content" role="main" aria-label="Browse gift categories">
        <CategoriesContent />
      </main>
    </>
  );
}
