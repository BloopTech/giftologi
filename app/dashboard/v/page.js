"use server";
import React from "react";
import VendorDashboardContent from "./content";
import Link from "next/link";

export default async function VendorDashboardPage() {
  return (
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#vendor-dashboard-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to main content
      </Link>
      <main id="vendor-dashboard-content" role="main" aria-label="Vendor dashboard">
        <VendorDashboardContent />
      </main>
    </>
  );
}
