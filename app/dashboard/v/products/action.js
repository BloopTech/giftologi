"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const isFileLike = (value) => {
  if (!value) return false;
  const tag = Object.prototype.toString.call(value);
  if (tag === "[object File]" || tag === "[object Blob]") return true;
  return (
    typeof value === "object" &&
    typeof value.name === "string" &&
    typeof value.size === "number" &&
    typeof value.type === "string" &&
    (typeof value.arrayBuffer === "function" || typeof value.stream === "function")
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

      const rawStock = entry.stock_qty;
      const stockValue =
        rawStock === null || typeof rawStock === "undefined" || rawStock === ""
          ? null
          : Number(rawStock);
      const stock_qty = Number.isFinite(stockValue) && stockValue >= 0 ? stockValue : null;

      if (!label && !color && !size && !sku && price == null && stock_qty == null) return null;

      const variation = {};
      if (label) variation.label = label;
      if (color) variation.color = color;
      if (size) variation.size = size;
      if (sku) variation.sku = sku;
      if (price != null) variation.price = price;
      if (stock_qty != null) variation.stock_qty = stock_qty;
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

const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  categoryIds: z
    .array(z.string().uuid("Please select a category"))
    .min(1, "Please select a category"),
  status: z.enum(["pending", "inactive"]),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  weight_kg: z.coerce
    .number()
    .positive("Weight must be greater than 0"),
  cost_price: z.coerce.number().min(0).optional(),
  stock_qty: z.coerce.number().int().min(0, "Stock must be 0 or greater"),
  description: z.string().max(2000).optional(),
  variations: z.string().optional().or(z.literal("")),
});

const generateProductCode = () =>
  `P-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

async function uploadProductImage(file, vendorId, productId) {
  if (!isValidSelectedFile(file)) return null;

  if (
    typeof file.size === "number" &&
    file.size > MAX_PRODUCT_IMAGE_FILE_SIZE_BYTES
  ) {
    throw new Error("Each product image must be 1MB or smaller.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const originalName = typeof file.name === "string" ? file.name : "image";
  const parts = originalName.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "bin";
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

export async function manageProducts(prevState, formData) {
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

  const isShopInactive = vendor.shop_status && vendor.shop_status !== "active";

  if (action === "create") {
    if (isShopInactive) {
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
      weight_kg: formData.get("weight_kg"),
      cost_price: formData.get("cost_price") || undefined,
      stock_qty: formData.get("stock_qty"),
      description: formData.get("description") || "",
      variations: formData.get("variations") || "",
    };

    const validation = productSchema.safeParse(rawData);

    if (!validation.success) {
      const fieldErrors = {};
      const issues = validation.error?.errors || validation.error?.issues || [];
      issues.forEach((err) => {
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

    if (variations.length) {
      for (const v of variations) {
        const hasAttribute = Boolean(v.label || v.color || v.size || v.sku);
        if (!hasAttribute) {
          return {
            success: false,
            message: "Please fix the errors below.",
            errors: { variations: "Each variation must have at least one attribute (color, size, SKU, or label) alongside stock quantity." },
            values: rawData,
          };
        }
        if (v.stock_qty == null) {
          return {
            success: false,
            message: "Please fix the errors below.",
            errors: { variations: "Each variation must have a stock quantity." },
            values: rawData,
          };
        }
      }
    }

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
        status: validation?.data?.status || "pending",
        price: validation.data.price,
        weight_kg: validation.data.weight_kg,
        stock_qty: validation.data.stock_qty,
        description: validation.data.description || null,
        variations: variations.length ? variations : null,
        images: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active: true,
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

    const rawImages = formData.getAll("product_images");
    const validImageFiles = Array.isArray(rawImages)
      ? rawImages.filter((file) => isValidSelectedFile(file))
      : [];

    const existingImages = [];
    const remainingImageSlots = Math.max(0, 3 - existingImages.length);

    if (validImageFiles.length > 3) {
      return {
        success: false,
        message: "Please fix the errors below.",
        errors: {
          images: "Upload up to 3 images per product.",
        },
        values: rawData,
      };
    }

    if (validImageFiles.length > remainingImageSlots) {
      return {
        success: false,
        message: "Please fix the errors below.",
        errors: {
          images: "Upload up to 3 images per product.",
        },
        values: rawData,
      };
    }

    if (!validImageFiles.length) {
      const legacyImage = formData.get("image");
      if (isValidSelectedFile(legacyImage)) {
        validImageFiles.push(legacyImage);
      }
    }

    if (!validImageFiles.length) {
      const rawExistingImages = formData.get("existing_images");
      if (typeof rawExistingImages === "string" && rawExistingImages.trim()) {
        try {
          const parsed = JSON.parse(rawExistingImages);
          const existing = Array.isArray(parsed)
            ? parsed
                .filter((url) => typeof url === "string" && url.trim())
                .slice(0, 3)
            : [];

          const featuredRaw = formData.get("featuredImageIndex");
          const featuredParsed = Number.parseInt(String(featuredRaw ?? ""), 10);
          const featuredIndex = Number.isFinite(featuredParsed) ? featuredParsed : -1;

          let ordered = existing;
          if (
            ordered.length &&
            Number.isInteger(featuredIndex) &&
            featuredIndex >= 0 &&
            featuredIndex < ordered.length
          ) {
            const clone = [...ordered];
            const [picked] = clone.splice(featuredIndex, 1);
            if (picked) ordered = [picked, ...clone];
          }

          await supabase
            .from("products")
            .update({ images: ordered.length ? ordered : [] })
            .eq("id", newProduct.id)
            .eq("vendor_id", vendor.id);
        } catch (err) {
          console.error("Existing images parse error:", err);
        }
      }
    }

    if (validImageFiles.length) {
      try {
        const featuredRaw = formData.get("featuredImageIndex");
        const featuredParsed = Number.parseInt(String(featuredRaw ?? ""), 10);
        const featuredIndex = Number.isFinite(featuredParsed) ? featuredParsed : -1;

        const uploadedUrls = [];
        for (const file of validImageFiles) {
          const imageUrl = await uploadProductImage(file, vendor.id, newProduct.id);
          if (imageUrl) uploadedUrls.push(imageUrl);
        }

        if (
          uploadedUrls.length &&
          Number.isInteger(featuredIndex) &&
          featuredIndex >= 0 &&
          featuredIndex < uploadedUrls.length
        ) {
          const [picked] = uploadedUrls.splice(featuredIndex, 1);
          if (picked) uploadedUrls.unshift(picked);
        }

        if (uploadedUrls.length) {
          const { error: imgUpdateError } = await supabase
            .from("products")
            .update({ images: uploadedUrls })
            .eq("id", newProduct.id)
            .eq("vendor_id", vendor.id);
          if (imgUpdateError) {
            console.error("Image DB update error:", imgUpdateError);
          }
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

  if (action === "update") {
    if (isShopInactive) {
      return {
        success: false,
        message: "Your shop is not active. Product updates are disabled while a close request is in review.",
        errors: {},
        values: {},
      };
    }

    const productId = formData.get("product_id");

    if (!productId) {
      return {
        success: false,
        message: "Product ID is required.",
        errors: {},
        values: {},
      };
    }

    const rawData = {
      name: formData.get("name"),
      product_code: formData.get("product_code"),
      categoryIds: parseCategoryIds(formData.get("categoryIds")),
      status: formData.get("status") || "pending",
      price: formData.get("price"),
      weight_kg: formData.get("weight_kg"),
      cost_price: formData.get("cost_price") || undefined,
      stock_qty: formData.get("stock_qty"),
      description: formData.get("description") || "",
      variations: formData.get("variations") || "",
    };

    const validation = productSchema.safeParse(rawData);

    if (!validation.success) {
      const fieldErrors = {};
      const issues = validation.error?.errors || validation.error?.issues || [];
      issues.forEach((err) => {
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

    const variations = parseVariationsPayload(rawData.variations);

    if (variations.length) {
      for (const v of variations) {
        const hasAttribute = Boolean(v.label || v.color || v.size || v.sku);
        if (!hasAttribute) {
          return {
            success: false,
            message: "Please fix the errors below.",
            errors: { variations: "Each variation must have at least one attribute (color, size, SKU, or label) alongside stock quantity." },
            values: rawData,
          };
        }
        if (v.stock_qty == null) {
          return {
            success: false,
            message: "Please fix the errors below.",
            errors: { variations: "Each variation must have a stock quantity." },
            values: rawData,
          };
        }
      }
    }

    const { data: existingProduct, error: existingProductError } = await supabase
      .from("products")
      .select("id, status")
      .eq("id", productId)
      .eq("vendor_id", vendor.id)
      .maybeSingle();

    if (existingProductError || !existingProduct) {
      return {
        success: false,
        message: existingProductError?.message || "Product not found.",
        errors: {},
        values: rawData,
      };
    }

    const existingStatus = String(existingProduct.status || "pending").toLowerCase();
    const shouldReapprove = existingStatus === "approved";
    const nextStatus = shouldReapprove ? "pending" : validation.data.status;

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
    const { error: updateError } = await supabase
      .from("products")
      .update({
        name: validation.data.name,
        category_id: validation.data.categoryIds[0] || null,
        status: nextStatus,
        price: validation.data.price,
        weight_kg: validation.data.weight_kg,
        stock_qty: validation.data.stock_qty,
        description: validation.data.description || null,
        variations: variations.length ? variations : null,
        updated_at: new Date().toISOString(),
        active: true,
      })
      .eq("id", productId)
      .eq("vendor_id", vendor.id);

    if (updateError) {
      console.error("Product update error:", updateError);
      return {
        success: false,
        message: updateError.message || "Failed to update product.",
        errors: {},
        values: rawData,
      };
    }

    const { error: deleteCategoriesError } = await supabase
      .from("product_categories")
      .delete()
      .eq("product_id", productId);

    if (deleteCategoriesError) {
      return {
        success: false,
        message:
          deleteCategoriesError.message ||
          "Failed to update product categories.",
        errors: {},
        values: rawData,
      };
    }

    if (validation.data.categoryIds.length) {
      const categoryRows = validation.data.categoryIds.map((categoryId) => ({
        product_id: productId,
        category_id: categoryId,
      }));
      const { error: categoryInsertError } = await supabase
        .from("product_categories")
        .insert(categoryRows);

      if (categoryInsertError) {
        return {
          success: false,
          message:
            categoryInsertError.message ||
            "Failed to update product categories.",
          errors: {},
          values: rawData,
        };
      }
    }

    const rawImages = formData.getAll("product_images");
    const validImageFiles = Array.isArray(rawImages)
      ? rawImages.filter((file) => isValidSelectedFile(file))
      : [];

    if (validImageFiles.length > 3) {
      return {
        success: false,
        message: "Please fix the errors below.",
        errors: {
          images: "Upload up to 3 images per product.",
        },
        values: rawData,
      };
    }

    if (!validImageFiles.length) {
      const legacyImage = formData.get("image");
      if (isValidSelectedFile(legacyImage)) {
        validImageFiles.push(legacyImage);
      }
    }

    const rawExistingImages = formData.get("existing_images");
    const hasExistingImagesPayload =
      typeof rawExistingImages === "string" && rawExistingImages.trim();
    let existingImages = [];

    if (hasExistingImagesPayload) {
      try {
        const parsed = JSON.parse(rawExistingImages);
        existingImages = Array.isArray(parsed)
          ? parsed.filter((url) => typeof url === "string" && url.trim())
          : [];
      } catch (err) {
        console.error("Existing images parse error:", err);
      }
    }

    if (!validImageFiles.length && hasExistingImagesPayload) {
      const featuredRaw = formData.get("featuredImageIndex");
      const featuredParsed = Number.parseInt(String(featuredRaw ?? ""), 10);
      const featuredIndex = Number.isFinite(featuredParsed) ? featuredParsed : -1;

      let ordered = existingImages;
      if (
        ordered.length &&
        Number.isInteger(featuredIndex) &&
        featuredIndex >= 0 &&
        featuredIndex < ordered.length
      ) {
        const clone = [...ordered];
        const [picked] = clone.splice(featuredIndex, 1);
        if (picked) ordered = [picked, ...clone];
      }

      await supabase
        .from("products")
        .update({ images: ordered.length ? ordered : [] })
        .eq("id", productId)
        .eq("vendor_id", vendor.id);
    }

    if (validImageFiles.length) {
      try {
        const featuredRaw = formData.get("featuredImageIndex");
        const featuredParsed = Number.parseInt(String(featuredRaw ?? ""), 10);
        const featuredIndex = Number.isFinite(featuredParsed) ? featuredParsed : -1;

        const uploadedUrls = [];
        for (const file of validImageFiles) {
          const imageUrl = await uploadProductImage(file, vendor.id, productId);
          if (imageUrl) uploadedUrls.push(imageUrl);
        }

        if (uploadedUrls.length) {
          let combined = [...existingImages, ...uploadedUrls].slice(0, 3);
          if (
            combined.length &&
            Number.isInteger(featuredIndex) &&
            featuredIndex >= 0 &&
            featuredIndex < combined.length
          ) {
            const clone = [...combined];
            const [picked] = clone.splice(featuredIndex, 1);
            if (picked) combined = [picked, ...clone];
          }

          await supabase
            .from("products")
            .update({ images: combined })
            .eq("id", productId)
            .eq("vendor_id", vendor.id);
        }
      } catch (imgErr) {
        console.error("Image upload error:", imgErr);
      }
    }

    revalidatePath("/dashboard/v/products");
    revalidatePath("/dashboard/v");

    return {
      success: true,
      message: "Product updated successfully!",
      errors: {},
      values: {},
    };
  }

  if (action === "delete") {
    if (isShopInactive) {
      return {
        success: false,
        message: "Your shop is not active. Product deletion is disabled while a close request is in review.",
        errors: {},
        values: {},
      };
    }

    const productId = formData.get("product_id");

    if (!productId) {
      return {
        success: false,
        message: "Product ID is required.",
        errors: {},
        values: {},
      };
    }

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("vendor_id", vendor.id);

    if (deleteError) {
      console.error("Product delete error:", deleteError);
      return {
        success: false,
        message: deleteError.message || "Failed to delete product.",
        errors: {},
        values: {},
      };
    }

    revalidatePath("/dashboard/v/products");
    revalidatePath("/dashboard/v");

    return {
      success: true,
      message: "Product deleted successfully!",
      errors: {},
      values: {},
    };
  }

  return {
    success: false,
    message: "Invalid action.",
    errors: {},
    values: {},
  };
}
