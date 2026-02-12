"use client";
import React, { useState, useCallback } from "react";
import OrderEmailGate from "../OrderEmailGate";
import ReceiptContent from "./content";

export default function ReceiptPageClient({ orderCode }) {
  const [orderData, setOrderData] = useState(null);

  const handleVerified = useCallback(({ order, items }) => {
    setOrderData({ order, items });
  }, []);

  if (!orderData) {
    return (
      <OrderEmailGate orderCode={orderCode} onVerified={handleVerified}>
        {null}
      </OrderEmailGate>
    );
  }

  return (
    <ReceiptContent order={orderData.order} items={orderData.items} />
  );
}
