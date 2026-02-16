"use server";
import React from "react";
import Link from "next/link";
import TreatsContent from "./content";

export async function generateMetadata() {
  return {
    title: "Treats | MyGiftologi",
    description:
      "Browse intangible gift experiences — spa visits, cinema tickets, dining vouchers and more.",
  };
}

export default async function TreatsPage() {
  return (
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#treats-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to treats
      </Link>
      <main id="treats-content" role="main" aria-label="Gift treats and experiences">
        <TreatsContent />
      </main>
    </>
  );
}
