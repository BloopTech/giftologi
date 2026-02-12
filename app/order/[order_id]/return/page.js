import React from "react";
import ReturnPageClient from "./client";

export default async function ReturnRequestPage({ params }) {
  const { order_id: orderCode } = await params;

  if (!orderCode) {
    return null;
  }

  return <ReturnPageClient orderCode={orderCode} />;
}
