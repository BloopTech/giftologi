"use server";
import React from "react";
import HostProfileContent from "./content";
import { HostProfileContentProvider } from "./context";

export default async function HostProfile() {
  return (
    <>
      <HostProfileContentProvider>
        <HostProfileContent />
      </HostProfileContentProvider>
    </>
  );
}
