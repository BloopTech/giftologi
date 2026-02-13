"use server";
import React from "react";
import { AdminSupportProvider } from "./context";
import AdminSupportContent from "./content";

export default async function AdminSupportPage() {
  return (
    <AdminSupportProvider>
      <AdminSupportContent />
    </AdminSupportProvider>
  );
}
