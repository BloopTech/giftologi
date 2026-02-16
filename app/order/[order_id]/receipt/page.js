import React from "react";
import Link from "next/link";
import ReceiptPageClient from "./client";

export default async function ReceiptPage({ params }) {
  const { order_id: orderCode } = await params;

  if (!orderCode) {
    return (
      <main id="receipt-content" role="main" aria-label="Order receipt" className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">No order code provided.</p>
      </main>
    );
  }

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#receipt-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to receipt
      </Link>
      <main id="receipt-content" role="main" aria-label={`Order receipt ${orderCode}`}>
        <ReceiptPageClient orderCode={orderCode} />
      </main>
    </>
  );
}
