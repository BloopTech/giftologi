"use server";
import React from "react";
import Link from "next/link";
import TicketDetailContent from "./content";

export async function generateMetadata() {
  return {
    title: "Ticket Details | MyGiftologi Support",
  };
}

export default async function TicketDetailPage() {
  return (
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#ticket-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to ticket details
      </Link>
      <main id="ticket-content" role="main" aria-label="Support ticket details">
        <TicketDetailContent />
      </main>
    </>
  );
}
