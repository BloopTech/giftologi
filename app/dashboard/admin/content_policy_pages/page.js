"use server";
import React from "react";
import { ContentsPolicyProvider } from "./context";
import ContentPolicyContent from "./content";

export default async function ContentPolicyPages() {
  return (
    <>
      <ContentsPolicyProvider>
        <ContentPolicyContent />
      </ContentsPolicyProvider>
    </>
  );
}
