"use server";
import React from "react";
import { GenerateReportsProvider } from "./context";
import GenerateReportsContent from "./content";

export default async function Reports() {
  return (
    <>
      <GenerateReportsProvider>
        <GenerateReportsContent />
      </GenerateReportsProvider>
    </>
  );
}
