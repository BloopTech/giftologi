"use server";
import React from "react";
import { AdminOrdersProvider } from "./context";
import AdminOrdersContent from "./content";

export default async function AdminOrdersPage() {
  return (
    <AdminOrdersProvider>
      <AdminOrdersContent />
    </AdminOrdersProvider>
  );
}
