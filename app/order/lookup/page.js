"use server";
import React from "react";
import Link from "next/link";
import OrderLookupContent from "./content";

export default async function OrderLookupPage() {
  return (
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#order-lookup-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to order lookup
      </Link>
      <main id="order-lookup-content" role="main" aria-label="Order lookup">
        <OrderLookupContent />
      </main>
    </>
  );
}
