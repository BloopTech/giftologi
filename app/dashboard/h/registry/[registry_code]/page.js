"use server";
import { createClient } from "../../../../utils/supabase/server";
import { notFound } from "next/navigation";
import HostDashboardRegistryContent from "./content";
import { HostRegistryCodeProvider } from "./context";

export default async function RegistryPage({ params }) {
  const getParams = await params;
  if (!getParams?.registry_code) {
    return notFound();
  }

  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .single();

  if (profileError) {
    return notFound();
  }

  const { data: registry, error: registryError } = await supabase
    .from("registries")
    .select("*, events!inner(*)")
    .eq("registry_code", getParams.registry_code)
    .eq("events.host_id", profile.id)
    .maybeSingle();

  if (registryError || !registry) {
    return notFound();
  }

  const event = Array.isArray(registry.events)
    ? registry.events[0]
    : registry.events;

  if (!event) {
    return notFound();
  }

  return (
    <>
      <HostRegistryCodeProvider
        registryCode={getParams.registry_code}
        initialRegistry={registry}
        initialEvent={event}
      >
        <HostDashboardRegistryContent registry={registry} event={event} />
      </HostRegistryCodeProvider>
    </>
  );
}
