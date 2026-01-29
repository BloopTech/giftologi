"use server";
import React from "react";
import { createClient } from "../../../utils/supabase/server";
import HostDashboardRegistryListsContent from "./content";

export default async function HostDashboardRegistry() {
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
      <HostDashboardRegistryListsContent registry={registry} />
    </>
  );
}
