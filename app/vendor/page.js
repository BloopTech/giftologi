"use server";
import React from "react";
import VendorLandingPageContent from "./content";
import { VendorApplicationProvider } from "./context";

export default async function VendorLandingPage() {
  return (
    <>
      <VendorApplicationProvider>
        <VendorLandingPageContent />
      </VendorApplicationProvider>
    </>
  );
}
