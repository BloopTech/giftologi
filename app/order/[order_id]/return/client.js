"use client";
import React, { useState, useCallback } from "react";
import OrderEmailGate from "../OrderEmailGate";
import ReturnRequestContent from "./content";

export default function ReturnPageClient({ orderCode }) {
  const [verifiedEmail, setVerifiedEmail] = useState(null);
  const [orderItems, setOrderItems] = useState([]);

  const handleVerified = useCallback(({ email, items }) => {
    setVerifiedEmail(email);
    setOrderItems(Array.isArray(items) ? items : []);
  }, []);

  if (!verifiedEmail) {
    return (
      <OrderEmailGate orderCode={orderCode} onVerified={handleVerified}>
        {null}
      </OrderEmailGate>
    );
  }

  return (
    <ReturnRequestContent
      orderCode={orderCode}
      verifiedEmail={verifiedEmail}
      orderItems={orderItems}
    />
  );
}
