"use server";
import React from "react";
import VendorProductsContent from "./content";
import { VendorProductsProvider } from "./context";

export default async function VendorProducts() {
  return (
    <>
      <VendorProductsProvider>
        <VendorProductsContent />
      </VendorProductsProvider>
    </>
  );
}
