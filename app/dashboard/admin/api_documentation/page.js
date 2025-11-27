"use server";
import React from "react";
import { APIDocumentationProvider } from "./context";
import APIDocumentationContent from "./content";

export default async function APIDocumentation() {
  return (
    <>
      <APIDocumentationProvider>
        <APIDocumentationContent />
      </APIDocumentationProvider>
    </>
  );
}
