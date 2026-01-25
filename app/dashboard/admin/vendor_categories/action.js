"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";
import { logAdminActivityWithClient } from "../activity_log/logger";

const allowedRoles = ["super_admin", "operations_manager_admin"];

const defaultCreateValues = {
  name: [],
  sortOrder: [],
};

const defaultUpdateValues = {
  categoryId: [],
  name: [],
  sortOrder: [],
};

const parseSortOrder = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === "number") return value;
  return null;
};

const createSchema = z.object({
  name: z.string().trim().min(1, { message: "Category name is required" }),
  sortOrder: z.preprocess(parseSortOrder, z.number().int().min(0).nullable()),
});

const updateSchema = z.object({
  categoryId: z.string().uuid({ message: "Invalid category" }),
  name: z.string().trim().min(1, { message: "Category name is required" }),
  sortOrder: z.preprocess(parseSortOrder, z.number().int().min(0).nullable()),
  isActive: z.preprocess(
    (value) => {
      if (value === true || value === "true") return true;
      if (value === false || value === "false") return false;
      return true;
    },
    z.boolean(),
  ),
});

const getCurrentAdmin = async (supabase) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, firstname, lastname, email")
    .eq("id", user.id)
    .single();

  return { user, profile };
};

export async function createVendorCategory(prevState, formData) {
  const supabase = await createClient();
  const { user, profile } = await getCurrentAdmin(supabase);

  if (!user || !profile || !allowedRoles.includes(profile.role)) {
    return {
      message: "You are not authorized to create vendor categories.",
      errors: { ...defaultCreateValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    name: formData.get("name") || "",
    sortOrder: formData.get("sortOrder"),
  };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: { ...defaultCreateValues, ...parsed.error.flatten().fieldErrors },
      values: raw,
      data: {},
    };
  }

  const { name, sortOrder } = parsed.data;

  const { data: existing, error: existingError } = await supabase
    .from("vendor_categories")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  if (existingError) {
    return {
      message: existingError.message,
      errors: { ...defaultCreateValues },
      values: raw,
      data: {},
    };
  }

  if (existing) {
    return {
      message: "Category already exists.",
      errors: { ...defaultCreateValues, name: ["Category already exists."] },
      values: raw,
      data: {},
    };
  }

  const { data: category, error } = await supabase
    .from("vendor_categories")
    .insert([
      {
        name,
        sort_order: typeof sortOrder === "number" ? sortOrder : 0,
        updated_at: new Date().toISOString(),
      },
    ])
    .select("id, name")
    .single();

  if (error || !category) {
    return {
      message: error?.message || "Failed to create category.",
      errors: { ...defaultCreateValues },
      values: raw,
      data: {},
    };
  }

  const adminNameParts = [];
  if (profile?.firstname) adminNameParts.push(profile.firstname);
  if (profile?.lastname) adminNameParts.push(profile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: profile.id,
    adminRole: profile.role,
    adminEmail: profile.email || user.email || null,
    adminName,
    action: "created_vendor_category",
    entity: "vendor_categories",
    targetId: category.id,
    details: `Created vendor category ${category.name}`,
  });

  revalidatePath("/dashboard/admin/vendor_categories");
  revalidatePath("/dashboard/admin");

  return {
    message: "Vendor category created.",
    errors: {},
    values: {},
    data: { category },
  };
}

export async function updateVendorCategory(prevState, formData) {
  const supabase = await createClient();
  const { user, profile } = await getCurrentAdmin(supabase);

  if (!user || !profile || !allowedRoles.includes(profile.role)) {
    return {
      message: "You are not authorized to update vendor categories.",
      errors: { ...defaultUpdateValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    categoryId: formData.get("categoryId") || "",
    name: formData.get("name") || "",
    sortOrder: formData.get("sortOrder"),
    isActive: formData.get("isActive"),
  };

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: { ...defaultUpdateValues, ...parsed.error.flatten().fieldErrors },
      values: raw,
      data: {},
    };
  }

  const { categoryId, name, sortOrder, isActive } = parsed.data;

  const { data: existing, error: existingError } = await supabase
    .from("vendor_categories")
    .select("id")
    .ilike("name", name)
    .neq("id", categoryId)
    .maybeSingle();

  if (existingError) {
    return {
      message: existingError.message,
      errors: { ...defaultUpdateValues },
      values: raw,
      data: {},
    };
  }

  if (existing) {
    return {
      message: "Category name already exists.",
      errors: { ...defaultUpdateValues, name: ["Category name already exists."] },
      values: raw,
      data: {},
    };
  }

  const { data: category, error } = await supabase
    .from("vendor_categories")
    .update({
      name,
      sort_order: typeof sortOrder === "number" ? sortOrder : 0,
      is_active: !!isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId)
    .select("id, name")
    .single();

  if (error || !category) {
    return {
      message: error?.message || "Failed to update category.",
      errors: { ...defaultUpdateValues },
      values: raw,
      data: {},
    };
  }

  const adminNameParts = [];
  if (profile?.firstname) adminNameParts.push(profile.firstname);
  if (profile?.lastname) adminNameParts.push(profile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: profile.id,
    adminRole: profile.role,
    adminEmail: profile.email || user.email || null,
    adminName,
    action: "updated_vendor_category",
    entity: "vendor_categories",
    targetId: category.id,
    details: `Updated vendor category ${category.name}`,
  });

  revalidatePath("/dashboard/admin/vendor_categories");
  revalidatePath("/dashboard/admin");

  return {
    message: "Vendor category updated.",
    errors: {},
    values: {},
    data: { category },
  };
}
