"use server";
import React from "react";
import SignupPageLayout from "./page-layout";
import { createMetadata, getPageSeo } from "../../utils/seo";

export async function generateMetadata() {
  const pageSeo = await getPageSeo("signup");
  return createMetadata(pageSeo);
}

export default async function SignupPage() {
  return (
    <>
      <SignupPageLayout />
    </>
  );
}
