import React from "react";
import OrderTrackingContent from "./content";

export default async function OrderTrackingPage({ params }) {
  const { order_id: orderCode } = await params;

  if (!orderCode) {
    return null;
  }

  return <OrderTrackingContent orderCode={orderCode} />;
}
