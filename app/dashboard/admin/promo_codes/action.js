"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";
import { logAdminActivityWithClient } from "../activity_log/logger";
import { PROMO_SCOPES, normalizePromoCode } from "../../../utils/promos";

const allowedRoles = [
  "super_admin",
  "operations_manager_admin",
  "marketing_admin",
];

const defaultCreateValues = {
  code: [],
  description: [],
  percentOff: [],
  minSpend: [],
  usageLimit: [],
  perUserLimit: [],
  startAt: [],
  endAt: [],
};

const defaultUpdateValues = {
  promoId: [],
  code: [],
  description: [],
  percentOff: [],
  minSpend: [],
  usageLimit: [],
  perUserLimit: [],
  startAt: [],
  endAt: [],
};

const parseBoolean = (value) => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return true;
};

const parseRequiredNumber = (value) => {
  if (value === null || value === undefined || value === "") return NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const parseOptionalNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseOptionalInt = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
};

const parseDateInput = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString();
  }
  const str = String(value).trim();
  if (!str) return null;
  // datetime-local values are YYYY-MM-DDThh:mm without timezone — treat as UTC
  const utcStr = str.includes("T") && !str.endsWith("Z") ? str + ":00Z" : str;
  const date = new Date(utcStr);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const parseIdList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {
      return trimmed
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const dedupeIds = (list) =>
  [...new Set((list || []).map((id) => String(id).trim()).filter(Boolean))];

const createSchema = z.object({
  code: z.string().trim().min(1, { message: "Promo code is required." }),
  description: z.string().trim().optional(),
  percentOff: z.preprocess(
    parseRequiredNumber,
    z
      .number()
      .min(1, { message: "Percent off must be at least 1%." })
      .max(100, { message: "Percent off must be 100% or less." })
  ),
  minSpend: z.preprocess(
    (value) => parseOptionalNumber(value, 0),
    z.number().min(0)
  ),
  usageLimit: z.preprocess(parseOptionalInt, z.number().int().min(1).nullable()),
  perUserLimit: z.preprocess(
    (value) => {
      const parsed = parseOptionalInt(value);
      return parsed ?? 1;
    },
    z.number().int().min(1)
  ),
  startAt: z.preprocess(parseDateInput, z.string().nullable()),
  endAt: z.preprocess(parseDateInput, z.string().nullable()),
  active: z.preprocess(parseBoolean, z.boolean()),
  targetProductIds: z.preprocess(
    parseIdList,
    z.array(z.string().uuid()).optional()
  ),
  targetCategoryIds: z.preprocess(
    parseIdList,
    z.array(z.string().uuid()).optional()
  ),
  targetShippable: z.enum(["any", "shippable", "non_shippable"]).default("any"),
  targetProductType: z.enum(["any", "physical", "treat"]).default("any"),
});

const updateSchema = createSchema.extend({
  promoId: z.string().uuid({ message: "Invalid promo code." }),
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

const validateDates = (rawStartAt, rawEndAt, startAt, endAt) => {
  const now = new Date();

  if (rawStartAt && !startAt) {
    return { field: "startAt", message: "Start date/time is invalid." };
  }
  if (rawEndAt && !endAt) {
    return { field: "endAt", message: "End date/time is invalid." };
  }
  if (startAt) {
    const startDate = new Date(startAt);
    if (startDate < now) {
      return { field: "startAt", message: "Start date/time cannot be in the past." };
    }
  }
  if (endAt) {
    const endDate = new Date(endAt);
    if (endDate < now) {
      return { field: "endAt", message: "End date/time cannot be in the past." };
    }
  }
  if (startAt && endAt) {
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (startDate >= endDate) {
      return {
        field: "endAt",
        message: "End date/time must be after the start date/time.",
      };
    }
  }
  return null;
};

const filterVendorProductIds = async (supabase, productIds, vendorId) => {
  if (!vendorId || !productIds.length) return productIds;
  const { data } = await supabase
    .from("products")
    .select("id")
    .eq("vendor_id", vendorId)
    .in("id", productIds);
  return (data || []).map((row) => row.id);
};

const buildTargetsPayload = (promoId, productIds, categoryIds) => {
  const targets = [];
  productIds.forEach((id) => {
    targets.push({ promo_id: promoId, product_id: id });
  });
  categoryIds.forEach((id) => {
    targets.push({ promo_id: promoId, category_id: id });
  });
  return targets;
};

export async function createPromoCode(prevState, formData) {
  const supabase = await createClient();
  const { user, profile } = await getCurrentAdmin(supabase);

  if (!user || !profile || !allowedRoles.includes(profile.role)) {
    return {
      message: "You are not authorized to create promo codes.",
      errors: { ...defaultCreateValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    code: formData.get("code") || "",
    description: formData.get("description") || "",
    percentOff: formData.get("percentOff"),
    minSpend: formData.get("minSpend"),
    usageLimit: formData.get("usageLimit"),
    perUserLimit: formData.get("perUserLimit"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    active: formData.get("active"),
    targetProductIds: formData.get("targetProductIds"),
    targetCategoryIds: formData.get("targetCategoryIds"),
    targetShippable: formData.get("targetShippable") || "any",
    targetProductType: formData.get("targetProductType") || "any",
  };

  const startAtValue = parseDateInput(raw.startAt);
  const endAtValue = parseDateInput(raw.endAt);
  const dateError = validateDates(
    raw.startAt,
    raw.endAt,
    startAtValue,
    endAtValue
  );

  if (dateError) {
    return {
      message: dateError.message,
      errors: { ...defaultCreateValues, [dateError.field]: [dateError.message] },
      values: raw,
      data: {},
    };
  }

  const parsed = createSchema.safeParse({
    ...raw,
    startAt: startAtValue,
    endAt: endAtValue,
  });

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: { ...defaultCreateValues, ...parsed.error.flatten().fieldErrors },
      values: raw,
      data: {},
    };
  }

  const normalizedCode = normalizePromoCode(parsed.data.code);
  if (!normalizedCode) {
    return {
      message: "Promo code is required.",
      errors: { ...defaultCreateValues, code: ["Promo code is required."] },
      values: raw,
      data: {},
    };
  }

  const { data: existing, error: existingError } = await supabase
    .from("promo_codes")
    .select("id")
    .eq("scope", PROMO_SCOPES.PLATFORM)
    .ilike("code", normalizedCode)
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
      message: "A platform promo code with this name already exists.",
      errors: { ...defaultCreateValues, code: ["Promo code already exists."] },
      values: raw,
      data: {},
    };
  }

  const trimmedDescription = parsed.data.description?.trim();
  const now = new Date().toISOString();

  const { data: promo, error } = await supabase
    .from("promo_codes")
    .insert({
      code: normalizedCode,
      description: trimmedDescription || null,
      percent_off: parsed.data.percentOff,
      scope: PROMO_SCOPES.PLATFORM,
      vendor_id: null,
      active: parsed.data.active,
      start_at: parsed.data.startAt,
      end_at: parsed.data.endAt,
      min_spend: parsed.data.minSpend ?? 0,
      usage_limit: parsed.data.usageLimit ?? null,
      usage_count: 0,
      per_user_limit: parsed.data.perUserLimit ?? 1,
      target_shippable: parsed.data.targetShippable,
      target_product_type: parsed.data.targetProductType,
      created_by: profile.id,
      created_at: now,
      updated_at: now,
    })
    .select("id, code")
    .single();

  if (error || !promo) {
    return {
      message: error?.message || "Failed to create promo code.",
      errors: { ...defaultCreateValues },
      values: raw,
      data: {},
    };
  }

  const targetProductIds = dedupeIds(parsed.data.targetProductIds || []);
  const targetCategoryIds = dedupeIds(parsed.data.targetCategoryIds || []);

  if (targetProductIds.length || targetCategoryIds.length) {
    const filteredProductIds = await filterVendorProductIds(
      supabase,
      targetProductIds,
      null
    );
    const targets = buildTargetsPayload(
      promo.id,
      filteredProductIds,
      targetCategoryIds
    );
    if (targets.length) {
      await supabase.from("promo_code_targets").insert(targets);
    }
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
    action: "created_promo_code",
    entity: "promo_codes",
    targetId: promo.id,
    details: `Created promo code ${promo.code}`,
  });

  revalidatePath("/dashboard/admin/promo_codes");
  revalidatePath("/dashboard/admin");

  return {
    message: "Promo code created.",
    errors: {},
    values: {},
    data: { promo },
  };
}

export async function updatePromoCode(prevState, formData) {
  const supabase = await createClient();
  const { user, profile } = await getCurrentAdmin(supabase);

  if (!user || !profile || !allowedRoles.includes(profile.role)) {
    return {
      message: "You are not authorized to update promo codes.",
      errors: { ...defaultUpdateValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    promoId: formData.get("promoId") || "",
    code: formData.get("code") || "",
    description: formData.get("description") || "",
    percentOff: formData.get("percentOff"),
    minSpend: formData.get("minSpend"),
    usageLimit: formData.get("usageLimit"),
    perUserLimit: formData.get("perUserLimit"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    active: formData.get("active"),
    targetProductIds: formData.get("targetProductIds"),
    targetCategoryIds: formData.get("targetCategoryIds"),
    targetShippable: formData.get("targetShippable") || "any",
    targetProductType: formData.get("targetProductType") || "any",
  };

  const startAtValue = parseDateInput(raw.startAt);
  const endAtValue = parseDateInput(raw.endAt);
  const dateError = validateDates(
    raw.startAt,
    raw.endAt,
    startAtValue,
    endAtValue
  );

  if (dateError) {
    return {
      message: dateError.message,
      errors: { ...defaultUpdateValues, [dateError.field]: [dateError.message] },
      values: raw,
      data: {},
    };
  }

  const parsed = updateSchema.safeParse({
    ...raw,
    startAt: startAtValue,
    endAt: endAtValue,
  });

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: { ...defaultUpdateValues, ...parsed.error.flatten().fieldErrors },
      values: raw,
      data: {},
    };
  }

  const { data: existingPromo, error: existingError } = await supabase
    .from("promo_codes")
    .select("id, scope, vendor_id")
    .eq("id", parsed.data.promoId)
    .maybeSingle();

  if (existingError || !existingPromo) {
    return {
      message: existingError?.message || "Promo code not found.",
      errors: { ...defaultUpdateValues },
      values: raw,
      data: {},
    };
  }

  const normalizedCode = normalizePromoCode(parsed.data.code);
  if (!normalizedCode) {
    return {
      message: "Promo code is required.",
      errors: { ...defaultUpdateValues, code: ["Promo code is required."] },
      values: raw,
      data: {},
    };
  }

  let duplicateQuery = supabase
    .from("promo_codes")
    .select("id")
    .neq("id", parsed.data.promoId)
    .eq("scope", existingPromo.scope)
    .ilike("code", normalizedCode);

  if (existingPromo.scope === PROMO_SCOPES.VENDOR && existingPromo.vendor_id) {
    duplicateQuery = duplicateQuery.eq("vendor_id", existingPromo.vendor_id);
  }

  const { data: duplicate } = await duplicateQuery.maybeSingle();

  if (duplicate) {
    return {
      message: "Another promo code with this name already exists.",
      errors: { ...defaultUpdateValues, code: ["Promo code already exists."] },
      values: raw,
      data: {},
    };
  }

  const trimmedDescription = parsed.data.description?.trim();
  const now = new Date().toISOString();

  const { data: promo, error } = await supabase
    .from("promo_codes")
    .update({
      code: normalizedCode,
      description: trimmedDescription || null,
      percent_off: parsed.data.percentOff,
      active: parsed.data.active,
      start_at: parsed.data.startAt,
      end_at: parsed.data.endAt,
      min_spend: parsed.data.minSpend ?? 0,
      usage_limit: parsed.data.usageLimit ?? null,
      per_user_limit: parsed.data.perUserLimit ?? 1,
      target_shippable: parsed.data.targetShippable,
      target_product_type: parsed.data.targetProductType,
      updated_at: now,
    })
    .eq("id", parsed.data.promoId)
    .select("id, code")
    .single();

  if (error || !promo) {
    return {
      message: error?.message || "Failed to update promo code.",
      errors: { ...defaultUpdateValues },
      values: raw,
      data: {},
    };
  }

  await supabase
    .from("promo_code_targets")
    .delete()
    .eq("promo_id", parsed.data.promoId);

  const targetProductIds = dedupeIds(parsed.data.targetProductIds || []);
  const targetCategoryIds = dedupeIds(parsed.data.targetCategoryIds || []);

  if (targetProductIds.length || targetCategoryIds.length) {
    const filteredProductIds = await filterVendorProductIds(
      supabase,
      targetProductIds,
      existingPromo.vendor_id
    );
    const targets = buildTargetsPayload(
      parsed.data.promoId,
      filteredProductIds,
      targetCategoryIds
    );
    if (targets.length) {
      await supabase.from("promo_code_targets").insert(targets);
    }
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
    action: "updated_promo_code",
    entity: "promo_codes",
    targetId: promo.id,
    details: `Updated promo code ${promo.code}`,
  });

  revalidatePath("/dashboard/admin/promo_codes");
  revalidatePath("/dashboard/admin");

  return {
    message: "Promo code updated.",
    errors: {},
    values: {},
    data: { promo },
  };
}
