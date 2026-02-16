"use server";
import React from "react";
import Link from "next/link";
import GiftGuidesContent from "./content";

export async function generateMetadata() {
  return {
    title: `Gift Guide | MyGiftologi`,
    description: "Curated gift ideas for every occasion — weddings, birthdays, baby showers and more.",
  };
}


export default async function GiftGuidesPage() {
  return (
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#gift-guides-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to gift guides
      </Link>
      <main id="gift-guides-content" role="main" aria-label="Gift guides">
        <GiftGuidesContent />
      </main>
    </>
  );
}
