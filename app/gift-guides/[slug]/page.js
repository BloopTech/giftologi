"use server";
import React from "react";
import GuideDetailContent from "./content";
import { GuideDetailProvider } from "./context";

export async function generateMetadata() {
  return {
    title: `Gift Guide | MyGiftologi`,
    description: `Explore curated gift ideas in this guide.`,
  };
}

export default async function GuideDetailPage() {
  return (
    <GuideDetailProvider>
      <GuideDetailContent />
    </GuideDetailProvider>
  );
}
