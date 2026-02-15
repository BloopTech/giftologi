"use server";

import React from "react";
import { VendorPromoCodesProvider } from "./context";
import VendorPromoCodesContent from "./content";

export default async function VendorPromoCodesPage() {
  return (
    <VendorPromoCodesProvider>
      <VendorPromoCodesContent />
    </VendorPromoCodesProvider>
  );
}
