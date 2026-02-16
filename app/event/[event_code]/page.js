"use server";
import React from "react";
import Link from "next/link";
import EventPageContent from "./content";
import { notFound } from "next/navigation";
import { createClient } from "../../utils/supabase/server";

export default async function EventPage({ params }) {
  const { event_code } = await params;

  if (!event_code) {
    return notFound();
  }

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("event_code", event_code)
    .single();

  if (!event) {
    return notFound();
  }

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#event-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to event content
      </Link>
      <main id="event-content" role="main" aria-label={`Event ${event_code}`}>
        <EventPageContent event_code={event_code} />
      </main>
    </>
  );
}
