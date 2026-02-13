"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "../../../utils/supabase/server";
import { logAdminActivityWithClient } from "../activity_log/logger";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import crypto from "crypto";

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  region: "auto",
});

async function uploadCoverImage(file) {
  if (!file || !(file instanceof File) || file.size === 0) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  const compressedBuffer = await sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const hash = crypto.randomBytes(8).toString("hex");
  const fileName = `gift_guides/${hash}.webp`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: fileName,
      Body: compressedBuffer,
      ContentType: "image/webp",
    })
  );

  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`;
}

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function generateUniqueSlug(admin, baseSlug) {
  let slug = baseSlug;
  let suffix = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const { data } = await admin
      .from("gift_guides")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    suffix++;
  }
}

const ADMIN_ROLES = [
  "super_admin",
  "store_manager_admin",
  "marketing_admin",
  "operations_manager_admin",
];

async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, firstname, lastname, email")
    .eq("id", user.id)
    .single();

  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    return { user, profile: null };
  }

  return { user, profile };
}

// ── Create Guide ─────────────────────────────────────────────────

const createGuideSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  occasion: z.string().optional().or(z.literal("")),
  budgetRange: z.string().optional().or(z.literal("")),
  isPublished: z.enum(["true", "false"]).optional(),
});

export async function createGuide(prevState, formData) {
  const { user, profile } = await getAdminUser();
  if (!profile) {
    return { message: "Unauthorized.", errors: {} };
  }

  const raw = {
    title: formData.get("title"),
    description: formData.get("description") || "",
    occasion: formData.get("occasion") || "",
    budgetRange: formData.get("budgetRange") || "",
    isPublished: formData.get("isPublished") || "false",
  };

  const parsed = createGuideSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
    };
  }

  const admin = createAdminClient();
  const { title, description, occasion, budgetRange, isPublished } = parsed.data;

  // Auto-generate unique slug from title
  const baseSlug = slugify(title);
  if (!baseSlug) {
    return { message: "Could not generate a valid slug from the title.", errors: {} };
  }
  const slug = await generateUniqueSlug(admin, baseSlug);

  // Handle cover image upload
  const coverFile = formData.get("coverImageFile");
  let coverImageUrl = null;
  try {
    coverImageUrl = await uploadCoverImage(coverFile);
  } catch (e) {
    return { message: `Cover image upload failed: ${e.message}`, errors: {} };
  }

  const insertPayload = {
    title,
    slug,
    description: description || null,
    cover_image: coverImageUrl,
    occasion: occasion || null,
    budget_range: budgetRange || null,
    is_published: isPublished === "true",
    created_by: user.id,
  };

  const { data: guide, error } = await admin
    .from("gift_guides")
    .insert(insertPayload)
    .select("id, title, slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { message: "A guide with this slug already exists.", errors: {} };
    }
    return { message: error.message, errors: {} };
  }

  await logAdminActivityWithClient(admin, {
    adminId: profile.id,
    adminRole: profile.role,
    adminEmail: user.email || null,
    adminName: null,
    action: "created_gift_guide",
    entityType: "gift_guide",
    entityId: guide.id,
    details: { title, slug },
  });

  revalidatePath("/dashboard/admin/gift_guides");
  return { message: "", errors: {}, success: true, data: guide };
}

// ── Update Guide ─────────────────────────────────────────────────

const updateGuideSchema = z.object({
  guideId: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  occasion: z.string().optional().or(z.literal("")),
  budgetRange: z.string().optional().or(z.literal("")),
  isPublished: z.enum(["true", "false"]).optional(),
});

export async function updateGuide(prevState, formData) {
  const { user, profile } = await getAdminUser();
  if (!profile) {
    return { message: "Unauthorized.", errors: {} };
  }

  const raw = {
    guideId: formData.get("guideId"),
    title: formData.get("title"),
    description: formData.get("description") || "",
    occasion: formData.get("occasion") || "",
    budgetRange: formData.get("budgetRange") || "",
    isPublished: formData.get("isPublished") || "false",
  };

  const parsed = updateGuideSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const admin = createAdminClient();
  const { guideId, title, description, occasion, budgetRange, isPublished } =
    parsed.data;

  // Handle optional cover image upload (keep existing if no new file)
  const coverFile = formData.get("coverImageFile");
  let coverImageUrl = undefined; // undefined = don't update
  try {
    const uploaded = await uploadCoverImage(coverFile);
    if (uploaded) coverImageUrl = uploaded;
  } catch (e) {
    return { message: `Cover image upload failed: ${e.message}`, errors: {} };
  }

  const updatePayload = {
    title,
    description: description || null,
    occasion: occasion || null,
    budget_range: budgetRange || null,
    is_published: isPublished === "true",
    updated_at: new Date().toISOString(),
  };
  if (coverImageUrl !== undefined) {
    updatePayload.cover_image = coverImageUrl;
  }

  const { error } = await admin
    .from("gift_guides")
    .update(updatePayload)
    .eq("id", guideId);

  if (error) {
    return { message: error.message, errors: {} };
  }

  await logAdminActivityWithClient(admin, {
    adminId: profile.id,
    adminRole: profile.role,
    adminEmail: user.email || null,
    adminName: null,
    action: "updated_gift_guide",
    entityType: "gift_guide",
    entityId: guideId,
    details: { title },
  });

  revalidatePath("/dashboard/admin/gift_guides");
  return { message: "", errors: {}, success: true };
}

// ── Delete Guide ─────────────────────────────────────────────────

export async function deleteGuide(prevState, formData) {
  const { user, profile } = await getAdminUser();
  if (!profile) {
    return { message: "Unauthorized.", errors: {} };
  }

  const guideId = formData.get("guideId");
  if (!guideId) return { message: "Missing guide ID.", errors: {} };

  const admin = createAdminClient();

  const { error } = await admin.from("gift_guides").delete().eq("id", guideId);

  if (error) {
    return { message: error.message, errors: {} };
  }

  await logAdminActivityWithClient(admin, {
    adminId: profile.id,
    adminRole: profile.role,
    adminEmail: user.email || null,
    adminName: null,
    action: "deleted_gift_guide",
    entityType: "gift_guide",
    entityId: guideId,
  });

  revalidatePath("/dashboard/admin/gift_guides");
  return { message: "", errors: {}, success: true };
}

// ── Add Product to Guide ─────────────────────────────────────────

const addItemSchema = z.object({
  guideId: z.string().uuid(),
  productId: z.string().uuid(),
  editorNote: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function addGuideItem(prevState, formData) {
  const { user, profile } = await getAdminUser();
  if (!profile) {
    return { message: "Unauthorized.", errors: {} };
  }

  const raw = {
    guideId: formData.get("guideId"),
    productId: formData.get("productId"),
    editorNote: formData.get("editorNote") || "",
  };

  const parsed = addItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { message: "Validation failed.", errors: parsed.error.flatten().fieldErrors };
  }

  const admin = createAdminClient();
  const { guideId, productId, editorNote } = parsed.data;

  // Get next sort_order
  const { data: maxItem } = await admin
    .from("gift_guide_items")
    .select("sort_order")
    .eq("guide_id", guideId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxItem?.sort_order ?? -1) + 1;

  const { error } = await admin.from("gift_guide_items").insert({
    guide_id: guideId,
    product_id: productId,
    sort_order: nextOrder,
    editor_note: editorNote || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { message: "Product already in this guide.", errors: {} };
    }
    return { message: error.message, errors: {} };
  }

  revalidatePath("/dashboard/admin/gift_guides");
  return { message: "", errors: {}, success: true };
}

// ── Create Occasion Label ────────────────────────────────────────

const createLabelSchema = z.object({
  value: z.string().trim().min(1, "Value is required").max(100),
  label: z.string().trim().min(1, "Label is required").max(200),
});

export async function createOccasionLabel(prevState, formData) {
  const { user, profile } = await getAdminUser();
  if (!profile) return { message: "Unauthorized.", errors: {} };

  const raw = { value: formData.get("value"), label: formData.get("label") };
  const parsed = createLabelSchema.safeParse(raw);
  if (!parsed.success) {
    return { message: "Validation failed.", errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  const admin = createAdminClient();
  const { data: maxItem } = await admin
    .from("gift_guide_occasions")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await admin.from("gift_guide_occasions").insert({
    value: parsed.data.value,
    label: parsed.data.label,
    sort_order: (maxItem?.sort_order ?? -1) + 1,
  });

  if (error) {
    if (error.code === "23505") return { message: "This occasion value already exists.", errors: {} };
    return { message: error.message, errors: {} };
  }

  revalidatePath("/dashboard/admin/gift_guides");
  return { message: "", errors: {}, success: true };
}

export async function createBudgetLabel(prevState, formData) {
  const { user, profile } = await getAdminUser();
  if (!profile) return { message: "Unauthorized.", errors: {} };

  const raw = { value: formData.get("value"), label: formData.get("label") };
  const parsed = createLabelSchema.safeParse(raw);
  if (!parsed.success) {
    return { message: "Validation failed.", errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  const admin = createAdminClient();
  const { data: maxItem } = await admin
    .from("gift_guide_budget_ranges")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await admin.from("gift_guide_budget_ranges").insert({
    value: parsed.data.value,
    label: parsed.data.label,
    sort_order: (maxItem?.sort_order ?? -1) + 1,
  });

  if (error) {
    if (error.code === "23505") return { message: "This budget value already exists.", errors: {} };
    return { message: error.message, errors: {} };
  }

  revalidatePath("/dashboard/admin/gift_guides");
  return { message: "", errors: {}, success: true };
}

// ── Delete Label ─────────────────────────────────────────────────

export async function deleteOccasionLabel(prevState, formData) {
  const { user, profile } = await getAdminUser();
  if (!profile) return { message: "Unauthorized.", errors: {} };

  const id = formData.get("id");
  if (!id) return { message: "Missing ID.", errors: {} };

  const admin = createAdminClient();
  const { error } = await admin.from("gift_guide_occasions").delete().eq("id", id);
  if (error) return { message: error.message, errors: {} };

  revalidatePath("/dashboard/admin/gift_guides");
  return { message: "", errors: {}, success: true };
}

export async function deleteBudgetLabel(prevState, formData) {
  const { user, profile } = await getAdminUser();
  if (!profile) return { message: "Unauthorized.", errors: {} };

  const id = formData.get("id");
  if (!id) return { message: "Missing ID.", errors: {} };

  const admin = createAdminClient();
  const { error } = await admin.from("gift_guide_budget_ranges").delete().eq("id", id);
  if (error) return { message: error.message, errors: {} };

  revalidatePath("/dashboard/admin/gift_guides");
  return { message: "", errors: {}, success: true };
}

// ── Fetch Unassigned Products (server-side paginated) ────────────

export async function fetchUnassignedProducts(prevState, formData) {
  const { user, profile } = await getAdminUser();
  if (!profile) return { message: "Unauthorized.", products: [], totalCount: 0 };

  const searchQuery = formData?.get?.("searchQuery")?.trim() || "";
  const pageNumber = parseInt(formData?.get?.("page") || "1", 10);
  const pageSize = parseInt(formData?.get?.("pageSize") || "20", 10);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_unassigned_products", {
    search_query: searchQuery,
    page_number: pageNumber,
    page_size: pageSize,
  });

  if (error) {
    return { message: error.message, products: [], totalCount: 0 };
  }

  const totalCount = data?.[0]?.total_count ?? 0;
  const products = (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    images: p.images,
    stock_qty: p.stock_qty,
    vendor: { id: p.vendor_id, business_name: p.vendor_name },
  }));

  return { message: "", products, totalCount: Number(totalCount), page: pageNumber, success: true };
}

// ── Remove Product from Guide ────────────────────────────────────

export async function removeGuideItem(prevState, formData) {
  const { user, profile } = await getAdminUser();
  if (!profile) {
    return { message: "Unauthorized.", errors: {} };
  }

  const itemId = formData.get("itemId");
  if (!itemId) return { message: "Missing item ID.", errors: {} };

  const admin = createAdminClient();

  const { error } = await admin.from("gift_guide_items").delete().eq("id", itemId);

  if (error) {
    return { message: error.message, errors: {} };
  }

  revalidatePath("/dashboard/admin/gift_guides");
  return { message: "", errors: {}, success: true };
}
