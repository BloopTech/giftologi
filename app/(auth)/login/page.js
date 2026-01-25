"use server";
import React from "react";
import LoginPageLayout from "./page-layout";
import { createMetadata, getPageSeo } from "../../utils/seo";

export async function generateMetadata() {
  const pageSeo = await getPageSeo("login");
  return createMetadata(pageSeo);
}

export default async function LoginPage() {
  return (
    <>
      <LoginPageLayout />
    </>
  );
}
