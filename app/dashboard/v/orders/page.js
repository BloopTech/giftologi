"use server";
import React from "react";
import VendorOrdersContent from "./content";
import { VendorOrdersProvider } from "./context";

export default async function VendorOrders() {
  return (
    <>
      <VendorOrdersProvider>
        <VendorOrdersContent />
      </VendorOrdersProvider>
    </>
  );
}
