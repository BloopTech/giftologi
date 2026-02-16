"use server";
import React from "react";
import Link from "next/link";
import VendorLandingPageContent from "./content";
import { VendorApplicationProvider } from "./context";
import { createMetadata, getPageSeo } from "../utils/seo";

export async function generateMetadata() {
  const pageSeo = await getPageSeo("vendor");
  return createMetadata(pageSeo);
}

export default async function VendorLandingPage() {
  return (
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#vendor-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to vendor information
      </Link>
      <main id="vendor-content" role="main" aria-label="Vendor application">
        <VendorApplicationProvider>
          <VendorLandingPageContent />
        </VendorApplicationProvider>
      </main>
    </>
  );
}
