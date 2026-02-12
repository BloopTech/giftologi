import React from "react";
import ReceiptPageClient from "./client";

export default async function ReceiptPage({ params }) {
  const { order_id: orderCode } = await params;

  if (!orderCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">No order code provided.</p>
      </div>
    );
  }

  return <ReceiptPageClient orderCode={orderCode} />;
}
