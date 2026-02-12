import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import { createMetadata, getSeoDefaults } from "../../utils/seo";
import { CategoryShopProvider } from "./context";
import CategoryShopContent from "./content";

export async function generateMetadata({ params }) {
  const { category_slug } = await params;
  const supabase = await createClient();
  const defaults = await getSeoDefaults();

  const { data: cat } = await supabase
    .from("categories")
    .select("name, slug")
    .eq("slug", category_slug)
    .maybeSingle();

  const name = cat?.name || "Category";

  return createMetadata({
    title: `${name} — Browse Gifts | Giftologi`,
    description: `Shop ${name} gifts on Giftologi. Browse our curated collection of ${name.toLowerCase()} from verified vendors.`,
    keywords: [name.toLowerCase(), "gifts", "gift shop", "gift registry"],
    canonical: `${defaults.siteUrl}/categories/${category_slug}`,
    ogType: "website",
  });
}

export default async function CategoryShopPage({ params, searchParams }) {
  const { category_slug } = await params;
  const search = await searchParams;
  const supabase = await createClient();

  // Fetch the category by slug
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id, name, slug, parent_category_id")
    .eq("slug", category_slug)
    .maybeSingle();

  if (catError || !category) return notFound();

  // Fetch subcategories (children of this category)
  const { data: subcategories } = await supabase
    .from("categories")
    .select("id, name, slug, parent_category_id")
    .eq("parent_category_id", category.id)
    .order("name");

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

    if (profile?.role === "host") {
      const { data: registries } = await supabase
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
        .order("created_at", { ascending: false });

      const allRegs = (registries || []).map((r) => ({
        id: r.id,
        title: r.title,
        registry_code: r.registry_code,
        event: Array.isArray(r.event) ? r.event[0] : r.event,
      }));

      const registryCodeParam =
        typeof search?.registry_code === "string" ? search.registry_code : "";

      if (registryCodeParam) {
        activeRegistry =
          allRegs.find((r) => r.registry_code === registryCodeParam) ||
          allRegs[0] ||
          null;
      } else {
        activeRegistry = allRegs[0] || null;
      }
    }
  }

  return (
    <CategoryShopProvider
      category={category}
      subcategories={subcategories || []}
      activeRegistry={activeRegistry}
      hostProfile={hostProfile}
      initialSearchParams={search}
    >
      <CategoryShopContent />
    </CategoryShopProvider>
  );
}
