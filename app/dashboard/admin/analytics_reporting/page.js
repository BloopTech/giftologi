"use server";
import React from "react";
import { AnalyticsReportingProvider } from "./context";
import AnalyticsReportingContent from "./content";

export default async function AnalyticsReporting() {
  return (
    <>
      <AnalyticsReportingProvider>
        <AnalyticsReportingContent />
      </AnalyticsReportingProvider>
    </>
  );
}
