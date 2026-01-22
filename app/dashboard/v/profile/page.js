"use server";
import React from "react";
import VendorProfileContent from "./content";
import { VendorProfileProvider } from "./context";

export default async function VendorProfile() {
  return (
    <>
      <VendorProfileProvider>
        <VendorProfileContent />
      </VendorProfileProvider>
    </>
  );
}
