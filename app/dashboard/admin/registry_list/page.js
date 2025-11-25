"use server";
import React from "react";
import { RegistryListProvider } from "./context";
import RegistryListContent from "./content";

export default async function RegistryList() {
  return (
    <>
      <RegistryListProvider>
        <RegistryListContent />
      </RegistryListProvider>
    </>
  );
}
