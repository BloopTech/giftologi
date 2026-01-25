"use server";
import React from "react";
import VendorLandingPageContent from "./content";
import { VendorApplicationProvider } from "./context";
import { createMetadata, getPageSeo } from "../utils/seo";

export async function generateMetadata() {
  const pageSeo = await getPageSeo("vendor");
  return createMetadata(pageSeo);
}

export default async function VendorLandingPage() {
  return (
    <>
      <VendorApplicationProvider>
        <VendorLandingPageContent />
      </VendorApplicationProvider>
    </>
  );
}
