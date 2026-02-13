"use server";
import React from "react";
import SupportContent from "./content";
import { SupportProvider } from "./context";

export async function generateMetadata() {
  return {
    title: "Support | MyGiftologi",
    description: "Get help with your orders, registries, and account.",
  };
}

export default async function SupportPage() {
  return (
    <SupportProvider>
      <SupportContent />
    </SupportProvider>
  );
}
