import { createClient as createSupabaseClient } from "./supabase/client";

export const fetchVendorCategories = async ({ includeInactive = false } = {}) => {
  const supabase = createSupabaseClient();
  let query = supabase
    .from("vendor_categories")
    .select("id, name, sort_order, is_active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
};
