"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../utils/supabase/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  categoryIds: z
    .array(z.string().uuid("Please select a category"))
    .min(1, "Please select a category"),
  status: z.enum(["pending", "approved", "rejected", "inactive"]),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  cost_price: z.coerce.number().min(0).optional(),
  stock_qty: z.coerce.number().int().min(0, "Stock must be 0 or greater"),
  description: z.string().max(2000).optional(),
  variations: z.string().optional().or(z.literal("")),
});

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

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

async function uploadProductImage(file, vendorId, productId) {
  if (!file || file.size === 0) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "jpg";
  const key = `vendors/${vendorId}/products/${productId}/${Date.now()}.${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  );

  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
}

export async function manageVendor(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in.",
      errors: {},
      values: {},
    };
  }

  const action = formData.get("action");

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id, shop_status")
    .eq("profiles_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (vendorError || !vendor) {
    return {
      success: false,
      message: "Vendor profile not found.",
      errors: {},
      values: {},
    };
  }

  if (action === "create_product") {
    if (vendor.shop_status && vendor.shop_status !== "active") {
      return {
        success: false,
        message: "Your shop is not active. Product creation is disabled while a close request is in review.",
        errors: {},
        values: {},
      };
    }

    const rawData = {
      name: formData.get("name"),
      categoryIds: parseCategoryIds(formData.get("categoryIds")),
      status: formData.get("status") || "pending",
      price: formData.get("price"),
      cost_price: formData.get("cost_price") || undefined,
      stock_qty: formData.get("stock_qty"),
      description: formData.get("description") || "",
      variations: formData.get("variations") || "",
    };

    const validation = productSchema.safeParse(rawData);

    if (!validation.success) {
      const fieldErrors = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0];
        fieldErrors[field] = err.message;
      });
      return {
        success: false,
        message: "Please fix the errors below.",
        errors: fieldErrors,
        values: rawData,
      };
    }

    const productCode = generateProductCode();

    const variations = parseVariationsPayload(rawData.variations);
    const { data: categoryRows, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .in("id", validation.data.categoryIds);

    if (
      categoryError ||
      !Array.isArray(categoryRows) ||
      categoryRows.length !== validation.data.categoryIds.length
    ) {
      return {
        success: false,
        message: categoryError?.message || "Please select a valid category.",
        errors: {
          categoryIds: "Please select a valid category.",
        },
        values: rawData,
      };
    }
    const { data: newProduct, error: insertError } = await supabase
      .from("products")
      .insert({
        vendor_id: vendor.id,
        name: validation.data.name,
        product_code: productCode,
        category_id: validation.data.categoryIds[0] || null,
        status: validation.data.status,
        price: validation.data.price,
        stock_qty: validation.data.stock_qty,
        description: validation.data.description || null,
        variations: variations.length ? variations : null,
        images: [],
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Product insert error:", insertError);
      return {
        success: false,
        message: insertError.message || "Failed to create product.",
        errors: {},
        values: rawData,
      };
    }

    if (validation.data.categoryIds.length) {
      const categoryRows = validation.data.categoryIds.map((categoryId) => ({
        product_id: newProduct.id,
        category_id: categoryId,
      }));
      const { error: categoryInsertError } = await supabase
        .from("product_categories")
        .insert(categoryRows);

      if (categoryInsertError) {
        await supabase.from("products").delete().eq("id", newProduct.id);
        return {
          success: false,
          message:
            categoryInsertError.message ||
            "Failed to save product categories.",
          errors: {},
          values: rawData,
        };
      }
    }

    const imageFile = formData.get("image");
    if (imageFile && imageFile.size > 0) {
      try {
        const imageUrl = await uploadProductImage(imageFile, vendor.id, newProduct.id);
        if (imageUrl) {
          await supabase
            .from("products")
            .update({ images: [imageUrl] })
            .eq("id", newProduct.id);
        }
      } catch (imgErr) {
        console.error("Image upload error:", imgErr);
      }
    }

    revalidatePath("/dashboard/v/products");
    revalidatePath("/dashboard/v");

    return {
      success: true,
      message: "Product created successfully!",
      errors: {},
      values: {},
      productId: newProduct.id,
    };
  }

  return {
    success: false,
    message: "Invalid action.",
    errors: {},
    values: {},
  };
}

export async function requestCloseShop(formData) {
  const supabase = await createClient();

  const vendorId = formData.get("vendor_id");
  const reason = formData.get("reason");
  const reasonType = formData.get("reason_type");

  if (!vendorId) {
    return { success: false, error: "Vendor ID is required" };
  }

  if (!reason) {
    return { success: false, error: "Please provide a reason for closing your shop" };
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in to perform this action" };
    }

    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id, shop_status")
      .eq("id", vendorId)
      .eq("profiles_id", user.id)
      .maybeSingle();

    if (vendorError || !vendor) {
      return { success: false, error: "Vendor profile not found." };
    }

    if (vendor.shop_status === "closed") {
      return { success: false, error: "Your shop is already closed." };
    }

    if (vendor.shop_status === "closing_requested") {
      return { success: false, error: "You already have a pending close shop request." };
    }

    const { data: existingRequest, error: checkError } = await supabase
      .from("vendor_close_requests")
      .select("id, status")
      .eq("vendor_id", vendorId)
      .eq("status", "pending")
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Close shop request lookup error:", checkError);
      return { success: false, error: "Failed to validate request. Please try again." };
    }

    if (existingRequest) {
      return { success: false, error: "You already have a pending close shop request." };
    }

    const { data, error } = await supabase
      .from("vendor_close_requests")
      .insert({
        vendor_id: vendorId,
        user_id: user.id,
        reason: reason,
        reason_type: reasonType,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating close shop request:", error);
      return { success: false, error: "Failed to submit request. Please try again." };
    }

    const now = new Date().toISOString();
    const { error: vendorUpdateError } = await supabase
      .from("vendors")
      .update({ shop_status: "closing_requested", close_requested_at: now })
      .eq("id", vendorId);

    if (vendorUpdateError) {
      console.error("Error updating vendor close status:", vendorUpdateError);
    }

    try {
      await supabase.from("activity_log").insert({
        user_id: user.id,
        action: "vendor_close_request_submitted",
        entity_type: "vendor",
        entity_id: vendorId,
        details: { reason, reason_type: reasonType, request_id: data.id },
      });
    } catch (logError) {
      console.error("Activity log insert failed:", logError);
    }

    revalidatePath("/dashboard/v");

    return { success: true, data };
  } catch (err) {
    console.error("Unexpected error in requestCloseShop:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function cancelCloseShopRequest(formData) {
  const supabase = await createClient();

  const requestId = formData.get("request_id");
  const vendorId = formData.get("vendor_id");

  if (!requestId) {
    return { success: false, error: "Request ID is required" };
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in to perform this action" };
    }

    const { data, error } = await supabase
      .from("vendor_close_requests")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "pending")
      .select()
      .single();

    if (error) {
      console.error("Error cancelling close shop request:", error);
      return { success: false, error: "Failed to cancel request. Please try again." };
    }

    if (!data) {
      return { success: false, error: "Request not found or already processed" };
    }

    const { error: vendorUpdateError } = await supabase
      .from("vendors")
      .update({ shop_status: "active", close_requested_at: null })
      .eq("id", vendorId)
      .eq("profiles_id", user.id);

    if (vendorUpdateError) {
      console.error("Error updating vendor status after cancel:", vendorUpdateError);
    }

    try {
      await supabase.from("activity_log").insert({
        user_id: user.id,
        action: "vendor_close_request_cancelled",
        entity_type: "vendor",
        entity_id: vendorId,
        details: { request_id: requestId },
      });
    } catch (logError) {
      console.error("Activity log insert failed:", logError);
    }

    revalidatePath("/dashboard/v");

    return { success: true, data };
  } catch (err) {
    console.error("Unexpected error in cancelCloseShopRequest:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getCloseShopRequest(vendorId) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("vendor_close_requests")
      .select("*")
      .eq("vendor_id", vendorId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching close shop request:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Unexpected error in getCloseShopRequest:", err);
    return null;
  }
}
