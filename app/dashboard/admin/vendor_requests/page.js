"use server";
import React from "react";
import VendorRequestsContent from "./content";
import { VendorRequestsProvider } from "./context";

export default async function VendorRequests() {
  return (
    <>
      <VendorRequestsProvider>
        <VendorRequestsContent />
      </VendorRequestsProvider>
    </>
  );
}
