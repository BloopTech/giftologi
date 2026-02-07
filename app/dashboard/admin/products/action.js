"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";
import {
  createNotification,
  fetchVendorNotificationPreferences,
} from "../../../utils/notifications";
import { logAdminActivityWithClient } from "../activity_log/logger";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const productImagesS3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  region: "auto",
});

const parseCategoryIds = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return [...new Set(value.map((id) => String(id).trim()).filter(Boolean))];
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return [
          ...new Set(parsed.map((id) => String(id).trim()).filter(Boolean)),
        ];
      }
    } catch (_) {
      return [
        ...new Set(
          trimmed
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean),
        ),
      ];
    }
  }
  return [];
};

const randomImageName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

const isFileLike = (value) => {
  if (!value) return false;
  const tag = Object.prototype.toString.call(value);
  if (tag === "[object File]" || tag === "[object Blob]") return true;
  return (
    typeof value === "object" &&
    typeof value.name === "string" &&
    typeof value.size === "number" &&
    typeof value.type === "string" &&
    (typeof value.arrayBuffer === "function" ||
      typeof value.stream === "function")
  );
};

const isValidSelectedFile = (file) => {
  if (!isFileLike(file)) return false;
  const name = typeof file.name === "string" ? file.name.trim() : "";
  if (
    !name ||
    name.toLowerCase() === "undefined" ||
    name.toLowerCase() === "null"
  ) {
    return false;
  }
  if (typeof file.size !== "number" || file.size <= 0) return false;
  return true;
};

const MAX_PRODUCT_IMAGE_FILE_SIZE_BYTES = 1 * 1024 * 1024;

async function uploadProductImage(file, keyPrefix) {
  if (!isValidSelectedFile(file)) return null;

  if (
    typeof file.size === "number" &&
    file.size > MAX_PRODUCT_IMAGE_FILE_SIZE_BYTES
  ) {
    throw new Error("Each product image must be 1MB or smaller.");
  }

  const buffer = await file.arrayBuffer();
  const originalName = typeof file.name === "string" ? file.name : "image";
  const parts = originalName.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "bin";
  const objectKey = `${keyPrefix}/${randomImageName()}.${ext}`;

  const putParams = {
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: objectKey,
    Body: Buffer.from(buffer),
    ContentType: file.type || "application/octet-stream",
  };

  const putCommand = new PutObjectCommand(putParams);
  await productImagesS3Client.send(putCommand);

  const baseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || "";
  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;

  return `${normalizedBaseUrl}/${objectKey}`;
}

const generateProductCode = () =>
  `P-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

const parseVariationsPayload = (raw) => {
  if (!raw || typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  let parsed = [];
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const label = typeof entry.label === "string" ? entry.label.trim() : "";
      const color = typeof entry.color === "string" ? entry.color.trim() : "";
      const size = typeof entry.size === "string" ? entry.size.trim() : "";
      const sku = typeof entry.sku === "string" ? entry.sku.trim() : "";
      const rawPrice = entry.price;
      const priceValue =
        rawPrice === null || typeof rawPrice === "undefined" || rawPrice === ""
          ? null
          : Number(rawPrice);
      const price = Number.isFinite(priceValue) ? priceValue : null;

      if (!label && !color && !size && !sku && price == null) return null;

      const variation = {};
      if (label) variation.label = label;
      if (color) variation.color = color;
      if (size) variation.size = size;
      if (sku) variation.sku = sku;
      if (price != null) variation.price = price;
      return variation;
    })
    .filter(Boolean);
};

const slugifyCategory = (value) => {
  const base = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "category";
};

const isValidDecimalInput = (value) => {
  const normalized = String(value || "").replace(/,/g, "").trim();
  return /^\d+(\.\d+)?$/.test(normalized);
};

const defaultApproveProductValues = {
  productId: [],
  serviceCharge: [],
};

const approveProductSchema = z.object({
  productId: z.string().uuid({ message: "Invalid product" }),
  serviceCharge: z
    .string()
    .trim()
    .min(1, { message: "Service charge is required" })
    .refine((value) => {
      if (!isValidDecimalInput(value)) return false;
      const num = Number(value.replace(/,/g, ""));
      return Number.isFinite(num) && num >= 0;
    }, "Enter a valid service charge"),
});

const defaultFeaturedStateValues = {
  productId: [],
  featured: [],
};

const setFeaturedProductSchema = z.object({
  productId: z.string().uuid({ message: "Invalid product" }),
  featured: z
    .string()
    .trim()
    .transform((value) => value === "1" || value.toLowerCase() === "true"),
});

export async function approveProduct(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to approve products.",
      errors: { ...defaultApproveProductValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const allowedRoles = [
    "super_admin",
    "operations_manager_admin",
    "store_manager_admin",
  ];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to approve products.",
      errors: { ...defaultApproveProductValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    productId: formData.get("productId"),
    serviceCharge: formData.get("serviceCharge") || "",
  };

  const parsed = approveProductSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { productId, serviceCharge } = parsed.data;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, status, name, vendor_id")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return {
      message: productError?.message || "Product not found.",
      errors: { ...defaultApproveProductValues },
      values: raw,
      data: {},
    };
  }

  if (product.status && product.status !== "pending") {
    return {
      message: "This product has already been processed.",
      errors: {},
      values: {},
      data: { productId },
    };
  }

  const serviceChargeNumber = Number(serviceCharge.replace(/,/g, ""));

  const { error: updateError } = await supabase
    .from("products")
    .update({
      status: "approved",
      active: true,
      service_charge: Number.isFinite(serviceChargeNumber)
        ? serviceChargeNumber
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateError) {
    return {
      message: updateError.message,
      errors: { ...defaultApproveProductValues },
      values: raw,
      data: {},
    };
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "approved_product",
    entity: "products",
    targetId: productId,
    details: `Approved product ${productId}`,
  });

  if (product?.vendor_id) {
    try {
      const { data: vendor, error: vendorError } = await supabase
        .from("vendors")
        .select("id, profiles_id")
        .eq("id", product.vendor_id)
        .maybeSingle();

      if (vendorError) {
        throw vendorError;
      }

      if (vendor?.profiles_id) {
        const { data: preferences } =
          await fetchVendorNotificationPreferences({
            client: supabase,
            vendorId: vendor.id,
          });

        if (preferences?.product_reviews) {
          await createNotification({
            client: supabase,
            userId: vendor.profiles_id,
            type: "product_review",
            message: product?.name
              ? `Your product "${product.name}" has been approved.`
              : "Your product has been approved.",
            link: "/dashboard/v/products",
            data: {
              product_id: productId,
              vendor_id: vendor.id,
              status: "approved",
            },
          });
        }
      }
    } catch (error) {
      console.error("Failed to notify vendor product approval", error);
    }
  }

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/admin");

  return {
    message: "Product approved.",
    errors: {},
    values: {},
    data: { productId },
  };
}

export async function setFeaturedProduct(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to update featured products.",
      errors: { ...defaultFeaturedStateValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const allowedRoles = [
    "super_admin",
    "operations_manager_admin",
    "store_manager_admin",
  ];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to feature products.",
      errors: { ...defaultFeaturedStateValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    productId: formData.get("productId"),
    featured: formData.get("featured"),
  };

  const parsed = setFeaturedProductSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { productId, featured } = parsed.data;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();

  if (productError || !product) {
    return {
      message: productError?.message || "Product not found.",
      errors: { ...defaultFeaturedStateValues },
      values: raw,
      data: {},
    };
  }

  if (featured) {
    const now = new Date().toISOString();
    const { error: upsertError } = await supabase
      .from("featured_products")
      .upsert(
        {
          product_id: productId,
          active: true,
          updated_at: now,
        },
        { onConflict: "product_id" },
      );

    if (upsertError) {
      return {
        message: upsertError.message || "Failed to feature product.",
        errors: { ...defaultFeaturedStateValues },
        values: raw,
        data: {},
      };
    }
  } else {
    const { error: updateError } = await supabase
      .from("featured_products")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("product_id", productId);

    if (updateError) {
      return {
        message: updateError.message || "Failed to unfeature product.",
        errors: { ...defaultFeaturedStateValues },
        values: raw,
        data: {},
      };
    }
  }

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/admin");

  return {
    message: featured ? "Product featured" : "Product unfeatured",
    errors: {},
    values: {},
    data: { productId, featured },
  };
}

const defaultRejectProductValues = {
  productId: [],
  reason: [],
};

const rejectProductSchema = z.object({
  productId: z.string().uuid({ message: "Invalid product" }),
  reason: z
    .string()
    .trim()
    .min(1, { message: "Rejection reason is required" })
    .max(500, { message: "Reason must be less than 500 characters" }),
});

export async function rejectProduct(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to reject products.",
      errors: { ...defaultRejectProductValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const allowedRoles = [
    "super_admin",
    "operations_manager_admin",
    "store_manager_admin",
  ];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to reject products.",
      errors: { ...defaultRejectProductValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    productId: formData.get("productId"),
    reason: formData.get("reason"),
  };

  const parsed = rejectProductSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { productId, reason } = parsed.data;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, status")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return {
      message: productError?.message || "Product not found.",
      errors: { ...defaultRejectProductValues },
      values: raw,
      data: {},
    };
  }

  if (product.status && product.status !== "pending") {
    return {
      message: "This product has already been processed.",
      errors: {},
      values: {},
      data: { productId },
    };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({
      status: "rejected",
      active: false,
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateError) {
    return {
      message: updateError.message,
      errors: { ...defaultRejectProductValues },
      values: raw,
      data: {},
    };
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "rejected_product",
    entity: "products",
    targetId: productId,
    details: `Rejected product ${productId}. Reason: ${reason}`,
  });

  if (product?.vendor_id) {
    try {
      const { data: vendor, error: vendorError } = await supabase
        .from("vendors")
        .select("id, profiles_id")
        .eq("id", product.vendor_id)
        .maybeSingle();

      if (vendorError) {
        throw vendorError;
      }

      if (vendor?.profiles_id) {
        const { data: preferences } =
          await fetchVendorNotificationPreferences({
            client: supabase,
            vendorId: vendor.id,
          });

        if (preferences?.product_reviews) {
          await createNotification({
            client: supabase,
            userId: vendor.profiles_id,
            type: "product_review",
            message: product?.name
              ? `Your product "${product.name}" was rejected.`
              : "Your product was rejected.",
            link: "/dashboard/v/products",
            data: {
              product_id: productId,
              vendor_id: vendor.id,
              status: "rejected",
              reason,
            },
          });
        }
      }
    } catch (error) {
      console.error("Failed to notify vendor product rejection", error);
    }
  }

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/admin");

  return {
    message: "Product rejected.",
    errors: {},
    values: {},
    data: { productId },
  };
}

const defaultFlagProductValues = {
  productId: [],
  reason: [],
};

const flagProductSchema = z.object({
  productId: z.string().uuid({ message: "Invalid product" }),
  reason: z.string().trim().optional().or(z.literal("")),
});

export async function flagProduct(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to flag products.",
      errors: { ...defaultFlagProductValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const allowedRoles = [
    "super_admin",
    "operations_manager_admin",
    "store_manager_admin",
  ];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to flag products.",
      errors: { ...defaultFlagProductValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    productId: formData.get("productId"),
    reason: formData.get("reason") || "",
  };

  const parsed = flagProductSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { productId, reason } = parsed.data;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, vendor_id, status")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return {
      message: productError?.message || "Product not found.",
      errors: { ...defaultFlagProductValues },
      values: raw,
      data: {},
    };
  }

  const descriptionParts = [];
  if (reason && reason.trim()) {
    descriptionParts.push(reason.trim());
  }
  descriptionParts.push(`Product ID: ${productId}`);
  if (product.name) {
    descriptionParts.push(`Name: ${product.name}`);
  }

  const description = descriptionParts.join("\n");

  const { error: ticketError } = await supabase.from("support_tickets").insert([
    {
      registry_id: null,
      subject: "Flagged product",
      description: description || "Flagged product",
      status: "escalated",
      created_by: currentProfile?.id || user.id,
    },
  ]);

  if (ticketError) {
    return {
      message: ticketError.message,
      errors: { ...defaultFlagProductValues },
      values: raw,
      data: {},
    };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({
      status: "flagged",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateError) {
    return {
      message: updateError.message,
      errors: { ...defaultFlagProductValues },
      values: raw,
      data: {},
    };
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "flagged_product",
    entity: "products",
    targetId: productId,
    details: `Flagged product ${productId}${reason ? `: ${reason}` : ""}`,
  });

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/admin");

  return {
    message: "Product flagged successfully.",
    errors: {},
    values: {},
    data: { productId },
  };
}

const defaultUnflagProductValues = {
  productId: [],
};

const unflagProductSchema = z.object({
  productId: z.string().uuid({ message: "Invalid product" }),
});

export async function unflagProduct(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to unflag products.",
      errors: { ...defaultUnflagProductValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const allowedRoles = [
    "super_admin",
    "operations_manager_admin",
    "store_manager_admin",
  ];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to unflag products.",
      errors: { ...defaultUnflagProductValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    productId: formData.get("productId"),
  };

  const parsed = unflagProductSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { productId } = parsed.data;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, status")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return {
      message: productError?.message || "Product not found.",
      errors: { ...defaultUnflagProductValues },
      values: raw,
      data: {},
    };
  }

  if ((product.status || "").toLowerCase() !== "flagged") {
    return {
      message: "Product is not flagged.",
      errors: {},
      values: {},
      data: { productId },
    };
  }

  const { error: unflagError } = await supabase
    .from("products")
    .update({
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (unflagError) {
    return {
      message: unflagError.message,
      errors: { ...defaultUnflagProductValues },
      values: raw,
      data: {},
    };
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "unflagged_product",
    entity: "products",
    targetId: productId,
    details: `Unflagged product ${productId}`,
  });

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/admin");

  return {
    message: "Product unflagged successfully.",
    errors: {},
    values: {},
    data: { productId },
  };
}

const defaultCreateProductValues = {
  vendorId: [],
  mode: [],
  name: [],
  description: [],
  price: [],
  weightKg: [],
  serviceCharge: [],
  stockQty: [],
  productCode: [],
  categoryIds: [],
  variations: [],
  images: [],
  featuredImageIndex: [],
  bulkFile: [],
  bulkMapping: [],
  bulkCategoryIds: [],
};

const defaultUpdateProductValues = {
  productId: [],
  name: [],
  description: [],
  price: [],
  weightKg: [],
  serviceCharge: [],
  stockQty: [],
  categoryIds: [],
  variations: [],
  images: [],
  featuredImageIndex: [],
  existingImages: [],
};

const defaultCreateCategoryValues = {
  name: [],
  subcategories: [],
};

const defaultUpdateCategoryValues = {
  name: [],
};

const defaultDeleteCategoryValues = {};

const updateProductSchema = z.object({
  productId: z.string().uuid({ message: "Invalid product" }),
  name: z.string().trim().min(1, { message: "Product name is required" }),
  description: z.string().trim().optional().or(z.literal("")),
  price: z
    .string()
    .trim()
    .min(1, { message: "Enter a price" })
    .refine((value) => {
      const num = Number(value.replace(/,/g, ""));
      return Number.isFinite(num) && num >= 0;
    }, "Enter a valid price"),
  weightKg: z
    .string()
    .trim()
    .min(1, { message: "Weight is required" })
    .refine((value) => {
      if (!isValidDecimalInput(value)) return false;
      const num = Number(value.replace(/,/g, ""));
      return Number.isFinite(num) && num > 0;
    }, "Enter a valid weight"),
  stockQty: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => {
      if (!value) return true;
      const num = Number(value.replace(/,/g, ""));
      return Number.isInteger(num) && num >= 0;
    }, "Enter a valid stock quantity"),
  categoryIds: z
    .array(z.string().trim().uuid({ message: "Select a valid category" }))
    .min(1, { message: "Select at least one category" }),
  serviceCharge: z
    .string()
    .trim()
    .min(1, { message: "Service charge is required" })
    .refine((value) => {
      if (!isValidDecimalInput(value)) return false;
      const num = Number(value.replace(/,/g, ""));
      return Number.isFinite(num) && num >= 0;
    }, "Enter a valid service charge"),
  variations: z.string().trim().optional().or(z.literal("")),
  featuredImageIndex: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => {
      if (!value) return true;
      const idx = Number(value);
      return Number.isInteger(idx) && idx >= 0 && idx <= 2;
    }, "Invalid featured image selection"),
  existingImages: z.string().optional().or(z.literal("")),
});

const createCategorySchema = z.object({
  name: z.string().trim().min(1, { message: "Category name is required" }),
  parentCategoryId: z.string().trim().optional().or(z.literal("")),
  subcategories: z.string().trim().optional().or(z.literal("")),
});

export async function createCategory(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to create categories.",
      errors: { ...defaultCreateCategoryValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role, firstname, lastname, email")
    .eq("id", user.id)
    .single();

  const allowedRoles = [
    "super_admin",
    "operations_manager_admin",
    "store_manager_admin",
  ];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to create categories.",
      errors: { ...defaultCreateCategoryValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    name: formData.get("name") || "",
    parentCategoryId: formData.get("parentCategoryId") || "",
    subcategories: formData.get("subcategories") || "",
  };

  const parsed = createCategorySchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: {
        ...defaultCreateCategoryValues,
        ...parsed.error.flatten().fieldErrors,
      },
      values: raw,
      data: {},
    };
  }

  const { name, parentCategoryId, subcategories } = parsed.data;

  let parentCategory = null;
  const trimmedParentCategoryId =
    typeof parentCategoryId === "string" ? parentCategoryId.trim() : "";

  if (trimmedParentCategoryId) {
    const parentUuidParse = z.string().uuid().safeParse(trimmedParentCategoryId);

    if (!parentUuidParse.success) {
      return {
        message: "Select a valid parent category.",
        errors: {
          ...defaultCreateCategoryValues,
          parentCategoryId: ["Select a valid parent category."],
        },
        values: raw,
        data: {},
      };
    }

    const { data: parent, error: parentError } = await supabase
      .from("categories")
      .select("id, slug")
      .eq("id", parentUuidParse.data)
      .maybeSingle();

    if (parentError || !parent) {
      return {
        message: parentError?.message || "Select a valid parent category.",
        errors: {
          ...defaultCreateCategoryValues,
          parentCategoryId: ["Select a valid parent category."],
        },
        values: raw,
        data: {},
      };
    }

    parentCategory = parent;
  }

  const baseSlug = slugifyCategory(name);
  const slug = parentCategory?.slug
    ? `${parentCategory.slug}-${baseSlug}`
    : baseSlug;

  const { data: existingCategory, error: existingError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingError) {
    return {
      message: existingError.message,
      errors: { ...defaultCreateCategoryValues },
      values: raw,
      data: {},
    };
  }

  if (existingCategory) {
    return {
      message: "Category already exists.",
      errors: {
        ...defaultCreateCategoryValues,
        name: ["Category already exists."],
      },
      values: raw,
      data: {},
    };
  }

  const nowIso = new Date().toISOString();

  const { data: category, error: insertError } = await supabase
    .from("categories")
    .insert([
      {
        name,
        slug,
        parent_category_id: parentCategory?.id || null,
        created_at: nowIso,
        updated_at: nowIso,
      },
    ])
    .select("id, name, slug")
    .single();

  if (insertError) {
    return {
      message: insertError.message,
      errors: { ...defaultCreateCategoryValues },
      values: raw,
      data: {},
    };
  }

  const rawSubcategories = typeof subcategories === "string" ? subcategories : "";
  const parsedSubcategoryNames = rawSubcategories
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);

  const uniqueSubcategoryNames = Array.from(new Set(parsedSubcategoryNames));

  if (uniqueSubcategoryNames.length) {
    const childRows = uniqueSubcategoryNames.map((childName) => {
      const childSlug = `${slug}-${slugifyCategory(childName)}`;
      return {
        name: childName,
        slug: childSlug,
        parent_category_id: category.id,
        created_at: nowIso,
        updated_at: nowIso,
      };
    });

    const childSlugs = childRows.map((row) => row.slug);

    const { data: existingChildren, error: existingChildError } = await supabase
      .from("categories")
      .select("slug")
      .in("slug", childSlugs);

    if (existingChildError) {
      await supabase.from("categories").delete().eq("id", category.id);

      return {
        message: existingChildError.message,
        errors: { ...defaultCreateCategoryValues },
        values: raw,
        data: {},
      };
    }

    if (Array.isArray(existingChildren) && existingChildren.length) {
      await supabase.from("categories").delete().eq("id", category.id);

      return {
        message: "One or more subcategories already exist.",
        errors: {
          ...defaultCreateCategoryValues,
          subcategories: ["One or more subcategories already exist."],
        },
        values: raw,
        data: {},
      };
    }

    const { error: insertChildrenError } = await supabase
      .from("categories")
      .insert(childRows);

    if (insertChildrenError) {
      await supabase.from("categories").delete().eq("id", category.id);

      return {
        message: insertChildrenError.message,
        errors: { ...defaultCreateCategoryValues },
        values: raw,
        data: {},
      };
    }
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: currentProfile?.email || user.email || null,
    adminName,
    action: "created_category",
    entity: "categories",
    targetId: category?.id,
    details: `Created category ${category?.name || name}`,
  });

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/admin");

  return {
    message: "Category created.",
    errors: {},
    values: {},
    data: { category },
  };
}

export async function updateCategory(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to update categories.",
      errors: { ...defaultUpdateCategoryValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role, firstname, lastname, email")
    .eq("id", user.id)
    .single();

  const allowedRoles = [
    "super_admin",
    "operations_manager_admin",
    "store_manager_admin",
  ];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to update categories.",
      errors: { ...defaultUpdateCategoryValues },
      values: {},
      data: {},
    };
  }

  const categoryId = formData.get("categoryId");
  const name = (formData.get("name") || "").trim();

  if (!categoryId) {
    return {
      message: "Category ID is required.",
      errors: { ...defaultUpdateCategoryValues },
      values: { name },
      data: {},
    };
  }

  if (!name) {
    return {
      message: "Category name is required.",
      errors: {
        ...defaultUpdateCategoryValues,
        name: ["Category name is required."],
      },
      values: { name },
      data: {},
    };
  }

  const { data: existingCategory, error: fetchError } = await supabase
    .from("categories")
    .select("id, name, slug, parent_category_id")
    .eq("id", categoryId)
    .single();

  if (fetchError || !existingCategory) {
    return {
      message: "Category not found.",
      errors: { ...defaultUpdateCategoryValues },
      values: { name },
      data: {},
    };
  }

  let slugPrefix = "";

  if (existingCategory?.parent_category_id) {
    const { data: parentCategory, error: parentError } = await supabase
      .from("categories")
      .select("slug")
      .eq("id", existingCategory.parent_category_id)
      .maybeSingle();

    if (parentError) {
      return {
        message: parentError.message,
        errors: { ...defaultUpdateCategoryValues },
        values: { name },
        data: {},
      };
    }

    slugPrefix = parentCategory?.slug ? `${parentCategory.slug}-` : "";
  }

  const newSlug = `${slugPrefix}${slugifyCategory(name)}`;
  const { data: slugConflict, error: slugError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", newSlug)
    .neq("id", categoryId)
    .maybeSingle();

  if (slugError) {
    return {
      message: slugError.message,
      errors: { ...defaultUpdateCategoryValues },
      values: { name },
      data: {},
    };
  }

  if (slugConflict) {
    return {
      message: "A category with this name already exists.",
      errors: {
        ...defaultUpdateCategoryValues,
        name: ["A category with this name already exists."],
      },
      values: { name },
      data: {},
    };
  }

  const nowIso = new Date().toISOString();

  const { data: category, error: updateError } = await supabase
    .from("categories")
    .update({
      name,
      slug: newSlug,
      updated_at: nowIso,
    })
    .eq("id", categoryId)
    .select("id, name, slug")
    .single();

  if (updateError) {
    return {
      message: updateError.message,
      errors: { ...defaultUpdateCategoryValues },
      values: { name },
      data: {},
    };
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: currentProfile?.email || user.email || null,
    adminName,
    action: "updated_category",
    entity: "categories",
    targetId: category?.id,
    details: `Updated category ${category?.name || name}`,
  });

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/admin");

  return {
    message: "Category updated.",
    errors: {},
    values: {},
    data: { category },
  };
}

export async function deleteCategory(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to delete categories.",
      errors: { ...defaultDeleteCategoryValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role, firstname, lastname, email")
    .eq("id", user.id)
    .single();

  const allowedRoles = [
    "super_admin",
    "operations_manager_admin",
    "store_manager_admin",
  ];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to delete categories.",
      errors: { ...defaultDeleteCategoryValues },
      values: {},
      data: {},
    };
  }

  const categoryId = formData.get("categoryId");

  if (!categoryId) {
    return {
      message: "Category ID is required.",
      errors: { ...defaultDeleteCategoryValues },
      values: {},
      data: {},
    };
  }

  const { data: category, error: fetchError } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("id", categoryId)
    .single();

  if (fetchError || !category) {
    return {
      message: "Category not found.",
      errors: { ...defaultDeleteCategoryValues },
      values: {},
      data: {},
    };
  }

  const { data: productsUsingCategory, error: usageError } = await supabase
    .from("products")
    .select("id")
    .eq("category_id", categoryId)
    .limit(1);

  if (usageError) {
    return {
      message: usageError.message,
      errors: { ...defaultDeleteCategoryValues },
      values: {},
      data: {},
    };
  }

  if (productsUsingCategory && productsUsingCategory.length > 0) {
    return {
      message: "Cannot delete category because it is being used by products.",
      errors: { ...defaultDeleteCategoryValues },
      values: {},
      data: {},
    };
  }

  const { data: childCategory, error: childError } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_category_id", categoryId)
    .limit(1);

  if (childError) {
    return {
      message: childError.message,
      errors: { ...defaultDeleteCategoryValues },
      values: {},
      data: {},
    };
  }

  if (Array.isArray(childCategory) && childCategory.length > 0) {
    return {
      message: "Cannot delete category because it has subcategories.",
      errors: { ...defaultDeleteCategoryValues },
      values: {},
      data: {},
    };
  }

  const { error: deleteError } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (deleteError) {
    return {
      message: deleteError.message,
      errors: { ...defaultDeleteCategoryValues },
      values: {},
      data: {},
    };
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: currentProfile?.email || user.email || null,
    adminName,
    action: "deleted_category",
    entity: "categories",
    targetId: category?.id,
    details: `Deleted category ${category?.name}`,
  });

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/admin");

  return {
    message: "Category deleted.",
    errors: {},
    values: {},
    data: { category },
  };
}

export async function updateProduct(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to update products.",
      errors: { ...defaultUpdateProductValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const allowedRoles = [
    "super_admin",
    "operations_manager_admin",
    "store_manager_admin",
  ];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to update products.",
      errors: { ...defaultUpdateProductValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    productId: formData.get("productId"),
    name: formData.get("name") || "",
    description: formData.get("description") || "",
    price: formData.get("price") || "",
    weightKg: formData.get("weightKg") || "",
    stockQty: formData.get("stockQty") || "",
    categoryIds: parseCategoryIds(formData.get("categoryIds")),
    serviceCharge: formData.get("serviceCharge") || "",
    variations: formData.get("variations") || "",
    featuredImageIndex: formData.get("featuredImageIndex") || "",
    existingImages: formData.get("existing_images") || "",
  };

  const parsed = updateProductSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: {
        ...defaultUpdateProductValues,
        ...parsed.error.flatten().fieldErrors,
      },
      values: raw,
      data: {},
    };
  }

  const {
    productId,
    name,
    description,
    price,
    weightKg,
    stockQty,
    categoryIds,
    serviceCharge,
    variations: variationsRaw,
    featuredImageIndex,
    existingImages: existingImagesRaw,
  } = parsed.data;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, vendor_id, images")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return {
      message: productError?.message || "Product not found.",
      errors: { ...defaultUpdateProductValues },
      values: raw,
      data: {},
    };
  }

  const { data: categoryRows, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .in("id", categoryIds);

  if (
    categoryError ||
    !Array.isArray(categoryRows) ||
    categoryRows.length !== categoryIds.length
  ) {
    return {
      message: categoryError?.message || "Select a valid category.",
      errors: {
        ...defaultUpdateProductValues,
        categoryIds: ["Select at least one valid category."],
      },
      values: raw,
      data: {},
    };
  }

  const priceNumber = Number(price.replace(/,/g, ""));
  const weightNumber = Number(weightKg.replace(/,/g, ""));
  const serviceChargeNumber = serviceCharge
    ? Number(serviceCharge.replace(/,/g, ""))
    : null;
  const stockNumber = stockQty ? Number(stockQty.replace(/,/g, "")) : null;
  const variations = parseVariationsPayload(variationsRaw);

  let existingImages = Array.isArray(product.images) ? product.images : [];
  if (typeof existingImagesRaw === "string" && existingImagesRaw.trim()) {
    try {
      const parsedImages = JSON.parse(existingImagesRaw);
      if (Array.isArray(parsedImages)) {
        existingImages = parsedImages.filter(
          (url) => typeof url === "string" && url.trim(),
        );
      }
    } catch (error) {
      console.error("Failed to parse existing images:", error);
    }
  }

  const rawImages = formData.getAll("product_images");
  const validImageFiles = Array.isArray(rawImages)
    ? rawImages.filter((file) => isValidSelectedFile(file))
    : [];

  const remainingImageSlots = Math.max(0, 3 - existingImages.length);

  if (validImageFiles.length > 3) {
    const message = "You can upload a maximum of 3 images per product.";
    return {
      message,
      errors: {
        ...defaultUpdateProductValues,
        images: [message],
      },
      values: raw,
      data: {},
    };
  }

  let nextImages = existingImages;

  if (validImageFiles.length) {
    const uploads = [];
    for (const file of validImageFiles) {
      uploads.push(uploadProductImage(file, `products/${product.vendor_id || "admin"}`));
    }

    if (uploads.length) {
      try {
        const results = await Promise.all(uploads);
        nextImages = [...existingImages, ...results.filter(Boolean)].slice(0, 3);
      } catch (error) {
        return {
          message:
            error?.message ||
            "Failed to upload one or more product images. Please try again.",
          errors: { ...defaultUpdateProductValues },
          values: raw,
          data: {},
        };
      }
    }
  }

  let orderedImages = nextImages;
  if (featuredImageIndex && orderedImages.length) {
    const idx = Number(featuredImageIndex);
    if (Number.isInteger(idx) && idx >= 0 && idx < orderedImages.length) {
      const clone = [...orderedImages];
      const [featured] = clone.splice(idx, 1);
      orderedImages = featured ? [featured, ...clone] : clone;
    }
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({
      name,
      description: description || null,
      price: Number.isFinite(priceNumber) ? priceNumber : null,
      weight_kg: Number.isFinite(weightNumber) ? weightNumber : null,
      service_charge:
        serviceChargeNumber != null && Number.isFinite(serviceChargeNumber)
          ? serviceChargeNumber
          : null,
      stock_qty:
        stockNumber != null && Number.isFinite(stockNumber)
          ? stockNumber
          : null,
      category_id: categoryIds[0] || null,
      variations: variations.length ? variations : null,
      images: orderedImages.length ? orderedImages : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateError) {
    return {
      message: updateError.message,
      errors: { ...defaultUpdateProductValues },
      values: raw,
      data: {},
    };
  }

  const { error: deleteCategoriesError } = await supabase
    .from("product_categories")
    .delete()
    .eq("product_id", productId);

  if (deleteCategoriesError) {
    return {
      message:
        deleteCategoriesError.message ||
        "Failed to update product categories.",
      errors: { ...defaultUpdateProductValues },
      values: raw,
      data: {},
    };
  }

  if (categoryIds.length) {
    const categoryRows = categoryIds.map((categoryId) => ({
      product_id: productId,
      category_id: categoryId,
    }));
    const { error: insertCategoriesError } = await supabase
      .from("product_categories")
      .insert(categoryRows);

    if (insertCategoriesError) {
      return {
        message:
          insertCategoriesError.message ||
          "Failed to update product categories.",
        errors: { ...defaultUpdateProductValues },
        values: raw,
        data: {},
      };
    }
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "updated_product",
    entity: "products",
    targetId: productId,
    details: `Updated product ${product.name || productId}`,
  });

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/admin");

  return {
    message: "Product updated successfully.",
    errors: {},
    values: {},
    data: { productId },
  };
}

const createProductsBaseSchema = z.object({
  mode: z
    .string()
    .trim()
    .transform((value) => (value === "bulk" ? "bulk" : "single")),
  vendorId: z
    .string()
    .uuid({ message: "Select a valid vendor before creating products." }),
});

const createSingleProductSchema = z.object({
  name: z.string().trim().min(1, { message: "Product name is required" }),
  description: z.string().trim().optional().or(z.literal("")),
  price: z
    .string()
    .trim()
    .min(1, { message: "Enter a price" })
    .refine((value) => {
      const num = Number(value.replace(/,/g, ""));
      return Number.isFinite(num) && num >= 0;
    }, "Enter a valid price"),
  weightKg: z
    .string()
    .trim()
    .min(1, { message: "Weight is required" })
    .refine((value) => {
      if (!isValidDecimalInput(value)) return false;
      const num = Number(value.replace(/,/g, ""));
      return Number.isFinite(num) && num > 0;
    }, "Enter a valid weight"),
  serviceCharge: z
    .string()
    .trim()
    .min(1, { message: "Service charge is required" })
    .refine((value) => {
      if (!isValidDecimalInput(value)) return false;
      const num = Number(value.replace(/,/g, ""));
      return Number.isFinite(num) && num >= 0;
    }, "Enter a valid service charge"),
  stockQty: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => {
      if (!value) return true;
      const num = Number(value.replace(/,/g, ""));
      return Number.isInteger(num) && num >= 0;
    }, "Enter a valid stock quantity"),
  productCode: z.string().trim().optional().or(z.literal("")),
  categoryIds: z
    .array(z.string().trim().uuid({ message: "Select a valid category" }))
    .min(1, { message: "Select at least one category" }),
  variations: z.string().trim().optional().or(z.literal("")),
  featuredImageIndex: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => {
      if (!value) return true;
      const idx = Number(value);
      return Number.isInteger(idx) && idx >= 0 && idx <= 2;
    }, "Invalid featured image selection"),
});

const MAX_BULK_PRODUCTS = 200;

const createBulkMappingSchema = z.object({
  name: z.string().trim().min(1, { message: "Map a column to product name" }),
  price: z.string().trim().min(1, { message: "Map a column to price" }),
  weightKg: z.string().trim().min(1, { message: "Map a column to weight" }),
  description: z.string().trim().optional().or(z.literal("")),
  stockQty: z.string().trim().optional().or(z.literal("")),
  imageUrl: z.string().trim().optional().or(z.literal("")),
});

const bulkRowSchema = z.object({
  name: z.string().trim().min(1, { message: "Row is missing a product name" }),
  description: z.string().trim().optional().or(z.literal("")),
  price: z.number().nonnegative({ message: "Price must be zero or greater" }),
  weightKg: z.number().positive({ message: "Weight must be greater than zero" }),
  stockQty: z.number().int().nonnegative().optional(),
  imageUrl: z
    .string()
    .trim()
    .url({ message: "Image URL must be a valid URL" })
    .optional(),
});

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export async function createVendorProducts(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to create products.",
      errors: { ...defaultCreateProductValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const allowedRoles = [
    "super_admin",
    "operations_manager_admin",
    "store_manager_admin",
  ];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to create products.",
      errors: { ...defaultCreateProductValues },
      values: {},
      data: {},
    };
  }

  const vendorIdRaw = formData.get("vendorId");
  const rawBase = {
    mode: formData.get("mode") || "single",
    vendorId: typeof vendorIdRaw === "string" ? vendorIdRaw : "",
  };

  const parsedBase = createProductsBaseSchema.safeParse(rawBase);

  if (!parsedBase.success) {
    return {
      message:
        parsedBase.error.issues?.[0]?.message ||
        "Validation failed for product creation.",
      errors: {
        ...defaultCreateProductValues,
        ...parsedBase.error.flatten().fieldErrors,
      },
      values: rawBase,
      data: {},
    };
  }

  const { mode, vendorId } = parsedBase.data;

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id, business_name")
    .eq("id", vendorId)
    .maybeSingle();

  if (vendorError || !vendor) {
    return {
      message: vendorError?.message || "Selected vendor was not found.",
      errors: {
        ...defaultCreateProductValues,
        vendorId: ["Select a valid vendor."],
      },
      values: rawBase,
      data: {},
    };
  }

  if (mode === "single") {
    const rawSingle = {
      name: formData.get("name") || "",
      description: formData.get("description") || "",
      price: formData.get("price") || "",
      weightKg: formData.get("weightKg") || "",
      serviceCharge: formData.get("serviceCharge") || "",
      stockQty: formData.get("stockQty") || "",
      productCode: formData.get("productCode") || "",
      categoryIds: parseCategoryIds(formData.get("categoryIds")),
      variations: formData.get("variations") || "",
      featuredImageIndex: formData.get("featuredImageIndex") || "",
    };

    const parsedSingle = createSingleProductSchema.safeParse(rawSingle);

    if (!parsedSingle.success) {
      return {
        message:
          parsedSingle.error.issues?.[0]?.message ||
          "Validation failed for product.",
        errors: {
          ...defaultCreateProductValues,
          ...parsedSingle.error.flatten().fieldErrors,
        },
        values: { ...rawBase, ...rawSingle },
        data: {},
      };
    }

    const single = parsedSingle.data;

    // Ensure the selected categories exist
    const { data: categoryRows, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .in("id", single.categoryIds);

    if (
      categoryError ||
      !Array.isArray(categoryRows) ||
      categoryRows.length !== single.categoryIds.length
    ) {
      return {
        message: categoryError?.message || "Select a valid category.",
        errors: {
          ...defaultCreateProductValues,
          categoryIds: ["Select at least one valid category."],
        },
        values: { ...rawBase, ...rawSingle },
        data: {},
      };
    }
    const rawImages = formData.getAll("product_images");
    const validImageFiles = Array.isArray(rawImages)
      ? rawImages.filter((file) => isValidSelectedFile(file))
      : [];

    if (validImageFiles.length > 3) {
      const message = "You can upload a maximum of 3 images per product.";
      return {
        message,
        errors: {
          ...defaultCreateProductValues,
          images: [message],
        },
        values: { ...rawBase, ...rawSingle },
        data: {},
      };
    }

    let imageUrls = [];

    if (validImageFiles.length) {
      const uploads = [];
      for (const file of validImageFiles) {
        uploads.push(uploadProductImage(file, `products/${vendorId}`));
      }

      if (uploads.length) {
        try {
          const results = await Promise.all(uploads);
          imageUrls = results.filter(Boolean);
        } catch (error) {
          return {
            message:
              error?.message ||
              "Failed to upload one or more product images. Please try again.",
            errors: { ...defaultCreateProductValues },
            values: { ...rawBase, ...rawSingle },
            data: {},
          };
        }
      }
    }

    // Reorder images so the selected featured image (if any) is first
    let orderedImageUrls = imageUrls;
    if (single.featuredImageIndex && orderedImageUrls.length) {
      const idx = Number(single.featuredImageIndex);
      if (Number.isInteger(idx) && idx >= 0 && idx < orderedImageUrls.length) {
        const clone = [...orderedImageUrls];
        const [featured] = clone.splice(idx, 1);
        orderedImageUrls = [featured, ...clone];
      }
    }

    const priceNumber = Number(single.price.replace(/,/g, ""));
    const weightNumber = Number(single.weightKg.replace(/,/g, ""));
    const serviceChargeNumber = single.serviceCharge
      ? Number(single.serviceCharge.replace(/,/g, ""))
      : null;
    const stockNumber = single.stockQty
      ? Number(single.stockQty.replace(/,/g, ""))
      : null;
    const variations = parseVariationsPayload(single.variations);
    const nowIso = new Date().toISOString();

    const productPayload = {
      vendor_id: vendorId,
      category_id: single.categoryIds[0] || null,
      name: single.name,
      description: single.description || null,
      price: Number.isFinite(priceNumber) ? priceNumber : null,
      weight_kg: Number.isFinite(weightNumber) ? weightNumber : null,
      service_charge:
        serviceChargeNumber != null && Number.isFinite(serviceChargeNumber)
          ? serviceChargeNumber
          : null,
      stock_qty:
        stockNumber != null && Number.isFinite(stockNumber)
          ? stockNumber
          : null,
      variations: variations.length ? variations : null,
      images: orderedImageUrls.length ? orderedImageUrls : null,
      status: "approved",
      active: true,
      created_at: nowIso,
      updated_at: nowIso,
    };

    if (single.productCode && single.productCode.trim()) {
      productPayload.product_code = single.productCode.trim();
    } else {
      productPayload.product_code = generateProductCode();
    }

    const { data: created, error: insertError } = await supabase
      .from("products")
      .insert([productPayload])
      .select("id, product_code")
      .single();

    if (insertError) {
      return {
        message: insertError.message,
        errors: { ...defaultCreateProductValues },
        values: { ...rawBase, ...rawSingle },
        data: {},
      };
    }

    if (single.categoryIds.length) {
      const categoryRows = single.categoryIds.map((categoryId) => ({
        product_id: created.id,
        category_id: categoryId,
      }));
      const { error: categoryInsertError } = await supabase
        .from("product_categories")
        .insert(categoryRows);

      if (categoryInsertError) {
        await supabase.from("products").delete().eq("id", created.id);
        return {
          message:
            categoryInsertError.message ||
            "Failed to save product categories.",
          errors: { ...defaultCreateProductValues },
          values: { ...rawBase, ...rawSingle },
          data: {},
        };
      }
    }

    await logAdminActivityWithClient(supabase, {
      adminId: currentProfile?.id || user.id,
      adminRole: currentProfile?.role || null,
      adminEmail: user.email || null,
      adminName: null,
      action: "created_product",
      entity: "products",
      targetId: created?.id || null,
      details: `Created product for vendor ${vendor.business_name || vendorId}`,
    });

    revalidatePath("/dashboard/admin/products");
    revalidatePath("/dashboard/admin");

    return {
      message: "Product created successfully.",
      errors: {},
      values: {},
      data: {
        mode: "single",
        productId: created?.id || null,
      },
    };
  }

  const bulkFile = formData.get("bulk_file");
  const rawMappingString = formData.get("bulk_mapping") || "";
  const rawBulkCategoryIds = formData.get("bulkCategoryIds") || "";
  const bulkCategoryIds = parseCategoryIds(rawBulkCategoryIds);

  if (!isFileLike(bulkFile)) {
    return {
      message: "Upload a CSV file to create multiple products.",
      errors: {
        ...defaultCreateProductValues,
        bulkFile: ["Please upload a valid CSV file."],
      },
      values: rawBase,
      data: {},
    };
  }

  // Optional: validate default categories for all bulk rows
  if (bulkCategoryIds.length) {
    const { data: bulkCategories, error: bulkCategoryError } = await supabase
      .from("categories")
      .select("id")
      .in("id", bulkCategoryIds);

    if (
      bulkCategoryError ||
      !Array.isArray(bulkCategories) ||
      bulkCategories.length !== bulkCategoryIds.length
    ) {
      return {
        message:
          bulkCategoryError?.message || "Select valid default categories.",
        errors: {
          ...defaultCreateProductValues,
          bulkCategoryIds: ["Select valid default categories."],
        },
        values: rawBase,
        data: {},
      };
    }
  }

  let mappingJson = null;
  try {
    mappingJson = rawMappingString ? JSON.parse(rawMappingString) : null;
  } catch (_) {
    return {
      message: "Column mapping is invalid. Please re-map the CSV columns.",
      errors: {
        ...defaultCreateProductValues,
        bulkMapping: ["Invalid mapping configuration"],
      },
      values: rawBase,
      data: {},
    };
  }

  const parsedMapping = createBulkMappingSchema.safeParse(mappingJson || {});

  if (!parsedMapping.success) {
    return {
      message:
        parsedMapping.error.issues?.[0]?.message ||
        "Please complete the required column mappings.",
      errors: {
        ...defaultCreateProductValues,
        bulkMapping: parsedMapping.error.flatten().formErrors,
      },
      values: rawBase,
      data: {},
    };
  }

  const mapping = parsedMapping.data;

  const text = await bulkFile.text();
  const allLines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (!allLines.length) {
    return {
      message: "The CSV file is empty.",
      errors: {
        ...defaultCreateProductValues,
        bulkFile: ["CSV must include a header row and at least one data row."],
      },
      values: rawBase,
      data: {},
    };
  }

  const headerLine = allLines[0];
  const headerColumns = parseCsvLine(headerLine).map((h) => h.trim());

  if (!headerColumns.length) {
    return {
      message: "Could not read header row from CSV.",
      errors: {
        ...defaultCreateProductValues,
        bulkFile: ["CSV header row is required."],
      },
      values: rawBase,
      data: {},
    };
  }

  const columnIndexByName = new Map();
  headerColumns.forEach((name, index) => {
    columnIndexByName.set(name.toLowerCase(), index);
  });

  const getIndex = (columnName) => {
    if (!columnName) return -1;
    return columnIndexByName.get(columnName.toLowerCase()) ?? -1;
  };

  const nameIndex = getIndex(mapping.name);
  const priceIndex = getIndex(mapping.price);
  const weightIndex = getIndex(mapping.weightKg);

  if (nameIndex === -1 || priceIndex === -1 || weightIndex === -1) {
    return {
      message:
        "Mapped name, price, or weight column was not found in the CSV header.",
      errors: {
        ...defaultCreateProductValues,
        bulkMapping: ["Mapped columns must exist in the CSV header."],
      },
      values: rawBase,
      data: {},
    };
  }

  const descriptionIndex = getIndex(mapping.description);
  const stockQtyIndex = getIndex(mapping.stockQty);
  const imageUrlIndex = getIndex(mapping.imageUrl);

  const rows = [];

  for (let i = 1; i < allLines.length; i++) {
    if (rows.length >= MAX_BULK_PRODUCTS) break;

    const line = allLines[i];
    if (!line.trim()) continue;

    const values = parseCsvLine(line);

    const nameValue = (values[nameIndex] || "").trim();
    const priceRaw = (values[priceIndex] || "").trim();
    const weightRaw = (values[weightIndex] || "").trim();

    if (!nameValue) continue;
    const priceNumber = Number(priceRaw.replace(/,/g, ""));
    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      continue;
    }
    const weightNumber = Number(weightRaw.replace(/,/g, ""));
    if (!Number.isFinite(weightNumber) || weightNumber <= 0) {
      continue;
    }

    let descriptionValue = "";
    if (descriptionIndex >= 0 && descriptionIndex < values.length) {
      descriptionValue = (values[descriptionIndex] || "").trim();
    }

    let stockQtyNumber = null;
    if (stockQtyIndex >= 0 && stockQtyIndex < values.length) {
      const stockRaw = (values[stockQtyIndex] || "").trim();
      if (stockRaw) {
        const parsedStock = Number(stockRaw.replace(/,/g, ""));
        if (Number.isInteger(parsedStock) && parsedStock >= 0) {
          stockQtyNumber = parsedStock;
        }
      }
    }

    let imageUrlValue = null;
    if (imageUrlIndex >= 0 && imageUrlIndex < values.length) {
      const raw = (values[imageUrlIndex] || "").trim();
      if (raw && /^https?:\/\//i.test(raw)) {
        imageUrlValue = raw;
      }
    }

    const candidate = {
      name: nameValue,
      description: descriptionValue,
      price: priceNumber,
      weightKg: weightNumber,
      stockQty: stockQtyNumber == null ? undefined : stockQtyNumber,
      imageUrl: imageUrlValue || undefined,
    };

    const parsedRow = bulkRowSchema.safeParse(candidate);
    if (!parsedRow.success) {
      continue;
    }

    rows.push(parsedRow.data);
  }

  if (!rows.length) {
    return {
      message: "No valid rows were found in the CSV file.",
      errors: {
        ...defaultCreateProductValues,
        bulkFile: ["CSV rows are empty or invalid."],
      },
      values: rawBase,
      data: {},
    };
  }

  const nowIso = new Date().toISOString();
  const payloads = rows.map((row) => ({
    vendor_id: vendorId,
    category_id: bulkCategoryIds[0] || null,
    name: row.name,
    description: row.description || null,
    price: row.price,
    weight_kg: row.weightKg,
    stock_qty:
      typeof row.stockQty === "number" && Number.isFinite(row.stockQty)
        ? row.stockQty
        : null,
    images: row.imageUrl ? [row.imageUrl] : null,
    status: "approved",
    active: true,
    created_at: nowIso,
    updated_at: nowIso,
    product_code: generateProductCode(),
  }));

  const { data: createdBulk, error: bulkError } = await supabase
    .from("products")
    .insert(payloads)
    .select("id");

  if (bulkError) {
    return {
      message: bulkError.message,
      errors: { ...defaultCreateProductValues },
      values: rawBase,
      data: {},
    };
  }

  if (bulkCategoryIds.length && Array.isArray(createdBulk)) {
    const categoryRows = createdBulk.flatMap((created) =>
      bulkCategoryIds.map((categoryId) => ({
        product_id: created.id,
        category_id: categoryId,
      })),
    );
    if (categoryRows.length) {
      const { error: bulkCategoryInsertError } = await supabase
        .from("product_categories")
        .insert(categoryRows);
      if (bulkCategoryInsertError) {
        return {
          message:
            bulkCategoryInsertError.message ||
            "Products were created but categories failed to save.",
          errors: { ...defaultCreateProductValues },
          values: rawBase,
          data: {},
        };
      }
    }
  }

  const createdCount = Array.isArray(createdBulk)
    ? createdBulk.length
    : payloads.length;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "created_products_bulk",
    entity: "products",
    targetId: null,
    details: `Created ${createdCount} products for vendor ${vendor.business_name || vendorId}`,
  });

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/admin");

  return {
    message: `Created ${createdCount} products (maximum ${MAX_BULK_PRODUCTS} per upload).`,
    errors: {},
    values: {},
    data: {
      mode: "bulk",
      createdCount,
    },
  };
}
