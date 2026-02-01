"use server";
import React from "react";
import HostDashboardRegistryListsContent from "./content";
import { HostRegistryListProvider } from "./context";

export default async function HostDashboardRegistry() {
  return (
    <>
      <HostRegistryListProvider>
        <HostDashboardRegistryListsContent />
      </HostRegistryListProvider>
    </>
  );
}
