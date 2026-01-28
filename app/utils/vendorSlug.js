export function slugifyVendor(value) {
  const base = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "vendor";
}

export async function generateUniqueVendorSlug(supabase, businessName, options = {}) {
  const baseSlug = slugifyVendor(businessName);
  const excludeVendorId = options.excludeVendorId || null;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;

    let query = supabase.from("vendors").select("id").eq("slug", candidate).limit(1);
    if (excludeVendorId) {
      query = query.neq("id", excludeVendorId);
    }

    const { data, error } = await query;

    if (error) {
      // If we can't validate uniqueness, fall back to base slug.
      return candidate;
    }

    if (!Array.isArray(data) || data.length === 0) {
      return candidate;
    }
  }

  // Last-resort fallback to avoid infinite loops.
  return `${baseSlug}-${Date.now()}`;
}
