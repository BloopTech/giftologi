"use server";
import React from "react";
import { createClient } from "../../utils/supabase/server";
import HostDashboardContent from "./content";
import Link from "next/link";

const customStyles = [
  "Wedding",
  "Baby Shower",
  "Birthday",
  "Fundraiser",
  "Custom",
];

export default async function HostDashboard() {
  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .single();

  const { data: registry, error: registryError } = await supabase
    .from("registries")
    .select("*, events!inner(*)")
    .eq("events.host_id", profile.id);

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <Link
        href="#host-dashboard-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-[#A5914B] focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        Skip to main content
      </Link>
      <HostDashboardContent registry={registry} />
    </>
  );
}
