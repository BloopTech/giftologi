"use server";
import React from "react";
import VendorPayoutsContent from "./content";
import { VendorPayoutsProvider } from "./context";

export default async function VendorPayouts() {
  return (
    <>
      <VendorPayoutsProvider>
        <VendorPayoutsContent />
      </VendorPayoutsProvider>
    </>
  );
}
