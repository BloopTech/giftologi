"use server";
import React from "react";
import { AdminGiftGuidesProvider } from "./context";
import AdminGiftGuidesContent from "./content";

export default async function AdminGiftGuidesPage() {
  return (
    <AdminGiftGuidesProvider>
      <AdminGiftGuidesContent />
    </AdminGiftGuidesProvider>
  );
}
