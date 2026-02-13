"use server";
import React from "react";
import TreatsContent from "./content";

export async function generateMetadata() {
  return {
    title: "Treats | MyGiftologi",
    description:
      "Browse intangible gift experiences — spa visits, cinema tickets, dining vouchers and more.",
  };
}

export default async function TreatsPage() {
  return <TreatsContent />;
}
