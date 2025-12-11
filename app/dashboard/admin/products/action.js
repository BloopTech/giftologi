"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";
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
  if (!name || name.toLowerCase() === "undefined" || name.toLowerCase() === "null") {
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

const defaultApproveProductValues = {
  productId: [],
};

const approveProductSchema = z.object({
  productId: z.string().uuid({ message: "Invalid product" }),
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

  const allowedRoles = ["super_admin", "operations_manager_admin"];

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

  const { productId } = parsed.data;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, status")
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

  const { error: updateError } = await supabase
    .from("products")
    .update({
      status: "approved",
      active: true,
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

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/admin");

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

  return {
    message: "Product approved.",
    errors: {},
    values: {},
    data: { productId },
  };
}

const defaultRejectProductValues = {
  productId: [],
};

const rejectProductSchema = z.object({
  productId: z.string().uuid({ message: "Invalid product" }),
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

  const allowedRoles = ["super_admin", "operations_manager_admin"];

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

  const { productId } = parsed.data;

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

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/admin");

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "rejected_product",
    entity: "products",
    targetId: productId,
    details: `Rejected product ${productId}`,
  });

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

  const allowedRoles = ["super_admin", "operations_manager_admin"];

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

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/admin");

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

  return {
    message: "Product flagged successfully.",
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
  stockQty: [],
  productCode: [],
  categoryId: [],
  images: [],
  featuredImageIndex: [],
  bulkFile: [],
  bulkMapping: [],
};

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
  name: z
    .string()
    .trim()
    .min(1, { message: "Product name is required" }),
  description: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  price: z
    .string()
    .trim()
    .min(1, { message: "Enter a price" })
    .refine((value) => {
      const num = Number(value.replace(/,/g, ""));
      return Number.isFinite(num) && num >= 0;
    }, "Enter a valid price"),
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
  productCode: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  categoryId: z
    .string()
    .trim()
    .uuid({ message: "Select a category" }),
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
  description: z.string().trim().optional().or(z.literal("")),
  stockQty: z.string().trim().optional().or(z.literal("")),
  imageUrl: z.string().trim().optional().or(z.literal("")),
});

const bulkRowSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Row is missing a product name" }),
  description: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  price: z
    .number()
    .nonnegative({ message: "Price must be zero or greater" }),
  stockQty: z
    .number()
    .int()
    .nonnegative()
    .optional(),
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

  const allowedRoles = ["super_admin", "operations_manager_admin"];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to create products.",
      errors: { ...defaultCreateProductValues },
      values: {},
      data: {},
    };
  }

  const rawBase = {
    mode: formData.get("mode") || "single",
    vendorId: formData.get("vendorId"),
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
      stockQty: formData.get("stockQty") || "",
      productCode: formData.get("productCode") || "",
      categoryId: formData.get("categoryId") || "",
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

    // Ensure the selected category exists
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", single.categoryId)
      .maybeSingle();

    if (categoryError || !category) {
      return {
        message: categoryError?.message || "Select a valid category.",
        errors: {
          ...defaultCreateProductValues,
          categoryId: ["Select a valid category."],
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
      if (
        Number.isInteger(idx) &&
        idx >= 0 &&
        idx < orderedImageUrls.length
      ) {
        const clone = [...orderedImageUrls];
        const [featured] = clone.splice(idx, 1);
        orderedImageUrls = [featured, ...clone];
      }
    }

    const priceNumber = Number(single.price.replace(/,/g, ""));
    const stockNumber = single.stockQty
      ? Number(single.stockQty.replace(/,/g, ""))
      : null;
    const nowIso = new Date().toISOString();

    const productPayload = {
      vendor_id: vendorId,
      category_id: single.categoryId,
      name: single.name,
      description: single.description || null,
      price: Number.isFinite(priceNumber) ? priceNumber : null,
      stock_qty:
        stockNumber != null && Number.isFinite(stockNumber)
          ? stockNumber
          : null,
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

  if (nameIndex === -1 || priceIndex === -1) {
    return {
      message: "Mapped name or price column was not found in the CSV header.",
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

    if (!nameValue) continue;
    const priceNumber = Number(priceRaw.replace(/,/g, ""));
    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
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
    name: row.name,
    description: row.description || null,
    price: row.price,
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
