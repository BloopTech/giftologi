"use server";

import React from "react";
import ContactContent from "./content";
import { ContactProvider } from "./context";
import { createMetadata, getSeoDefaults } from "../utils/seo";

export async function generateMetadata() {
  const defaults = await getSeoDefaults();

  return createMetadata({
    title: "Contact",
    description:
      "Reach the Giftologi support team, view contact details, and send a direct message.",
    canonical: `${defaults.siteUrl}/contact`,
    ogType: "website",
  });
}

export default async function ContactPage() {
  return (
    <ContactProvider>
      <ContactContent />
    </ContactProvider>
  );
}
