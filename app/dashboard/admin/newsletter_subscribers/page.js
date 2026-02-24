"use server";

import React from "react";
import { NewsletterSubscribersProvider } from "./context";
import NewsletterSubscribersContent from "./content";

export default async function NewsletterSubscribersPage() {
  return (
    <NewsletterSubscribersProvider>
      <NewsletterSubscribersContent />
    </NewsletterSubscribersProvider>
  );
}
