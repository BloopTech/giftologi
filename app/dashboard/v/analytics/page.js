"use server";
import React from "react";
import VendorAnalyticsContent from "./content";
import { VendorAnalyticsProvider } from "./context";

export default async function VendorAnalytics() {
  return (
    <>
      <VendorAnalyticsProvider>
        <VendorAnalyticsContent />
      </VendorAnalyticsProvider>
    </>
  );
}
