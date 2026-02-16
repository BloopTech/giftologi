"use server";
import React from "react";
import Link from "next/link";
import SupportContent from "./content";
import { SupportProvider } from "./context";

export async function generateMetadata() {
  return {
    title: "Support | MyGiftologi",
    description: "Get help with your orders, registries, and account.",
  };
}

export default async function SupportPage() {
  return (
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#support-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to support content
      </Link>
      <main id="support-content" role="main" aria-label="Support center">
        <SupportProvider>
          <SupportContent />
        </SupportProvider>
      </main>
    </>
  );
}
