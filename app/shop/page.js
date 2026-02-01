import React from "react";
import { createClient } from "../utils/supabase/server";
import ShopContent from "./content";
import { ShopProvider } from "./context";
import { createMetadata, getSeoDefaults } from "../utils/seo";

export async function generateMetadata() {
  const defaults = await getSeoDefaults();

  return createMetadata({
    title: "Shop - Browse Gifts for Your Registry",
    description:
      "Browse our curated collection of gifts from verified vendors. Add items to your registry and share with friends and family.",
    keywords: [
      "gift registry",
      "shop",
      "gifts",
      "wedding registry",
      "baby shower",
      "birthday gifts",
    ],
    canonical: `${defaults.siteUrl}/shop`,
    ogType: "website",
  });
}

export default async function ShopPage({ searchParams }) {
  const params = await searchParams;
  const registryCodeParam = typeof params?.registry_code === "string" ? params.registry_code : "";
  const supabase = await createClient();

  // Get current user and their active registry (if host)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let activeRegistry = null;
  let hostProfile = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, firstname, lastname")
      .eq("id", user.id)
      .maybeSingle();

    hostProfile = profile;

    // If user is a host, get their most recent active registry
    if (profile?.role === "host") {
      let registryQuery = supabase
        .from("registries")
        .select(
          `
          id,
          title,
          registry_code,
          event:events!inner(
            id,
            host_id,
            type,
            date
          )
        `
        )
        .eq("registry_owner_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (registryCodeParam) {
        registryQuery = registryQuery.eq("registry_code", registryCodeParam);
      }

      const { data: registry } = await registryQuery.maybeSingle();

      if (registry) {
        activeRegistry = {
          id: registry.id,
          title: registry.title,
          registry_code: registry.registry_code,
          event: Array.isArray(registry.event)
            ? registry.event[0]
            : registry.event,
        };
      }
    }
  }

  return (
    <ShopProvider
      initialProducts={[]}
      initialCategories={[]}
      activeRegistry={activeRegistry}
      hostProfile={hostProfile}
      initialSearchParams={params}
    >
      <ShopContent />
    </ShopProvider>
  );
}
