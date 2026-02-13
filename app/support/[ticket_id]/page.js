"use server";
import React from "react";
import TicketDetailContent from "./content";

export async function generateMetadata() {
  return {
    title: "Ticket Details | MyGiftologi Support",
  };
}

export default async function TicketDetailPage() {
  return <TicketDetailContent />;
}
