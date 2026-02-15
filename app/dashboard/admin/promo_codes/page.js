"use server";

import React from "react";
import { PromoCodesProvider } from "./context";
import PromoCodesContent from "./content";

export default async function PromoCodesPage() {
  return (
    <PromoCodesProvider>
      <PromoCodesContent />
    </PromoCodesProvider>
  );
}
