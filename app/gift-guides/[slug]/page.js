"use server";
import React from "react";
import Link from "next/link";
import GuideDetailContent from "./content";
import { GuideDetailProvider } from "./context";

export async function generateMetadata() {
  return {
    title: `Gift Guide | MyGiftologi`,
    description: `Explore curated gift ideas in this guide.`,
  };
}

export default async function GuideDetailPage() {
  return (
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#guide-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to guide content
      </Link>
      <main id="guide-content" role="main" aria-label="Gift guide details">
        <GuideDetailProvider>
          <GuideDetailContent />
        </GuideDetailProvider>
      </main>
    </>
  );
}
