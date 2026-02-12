"use server";
import React from "react";
import { DisputesProvider } from "./context";
import DisputesContent from "./content";

export default async function DisputesPage() {
  return (
    <DisputesProvider>
      <DisputesContent />
    </DisputesProvider>
  );
}
