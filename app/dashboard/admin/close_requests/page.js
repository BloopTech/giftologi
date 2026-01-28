"use server";

import React from "react";
import CloseRequestsContent from "./content";
import { CloseRequestsProvider } from "./context";

export default async function CloseRequestsPage() {
  return (
    <CloseRequestsProvider>
      <CloseRequestsContent />
    </CloseRequestsProvider>
  );
}
