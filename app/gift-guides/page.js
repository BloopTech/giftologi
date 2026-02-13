"use server";
import React from "react";
import GiftGuidesContent from "./content";

export async function generateMetadata() {
  return {
    title: `Gift Guide | MyGiftologi`,
    description: "Curated gift ideas for every occasion — weddings, birthdays, baby showers and more.",
  };
}


export default async function GiftGuidesPage() {
  return (
    <>
      <GiftGuidesContent />
    </>
  );
}
