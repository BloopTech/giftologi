"use server";
import React from "react";
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
      <EventPageContent event_code={event_code} />
    </>
  );
}
