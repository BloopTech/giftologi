import React from "react";
import Link from "next/link";
import ReturnPageClient from "./client";

export default async function ReturnRequestPage({ params }) {
  const { order_id: orderCode } = await params;

  if (!orderCode) {
    return null;
  }

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#return-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to return request
      </Link>
      <main id="return-content" role="main" aria-label={`Return request for order ${orderCode}`}>
        <ReturnPageClient orderCode={orderCode} />
      </main>
    </>
  );
}
