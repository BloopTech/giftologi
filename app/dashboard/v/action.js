"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../utils/supabase/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  category_id: z.string().uuid("Please select a category"),
  status: z.enum(["pending", "approved", "rejected", "inactive"]),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  cost_price: z.coerce.number().min(0).optional(),
  stock_qty: z.coerce.number().int().min(0, "Stock must be 0 or greater"),
  description: z.string().max(2000).optional(),
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
    .select("id")
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
    const rawData = {
      name: formData.get("name"),
      category_id: formData.get("category_id"),
      status: formData.get("status") || "pending",
      price: formData.get("price"),
      cost_price: formData.get("cost_price") || undefined,
      stock_qty: formData.get("stock_qty"),
      description: formData.get("description") || "",
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

    const { data: newProduct, error: insertError } = await supabase
      .from("products")
      .insert({
        vendor_id: vendor.id,
        name: validation.data.name,
        product_code: productCode,
        category_id: validation.data.category_id,
        status: validation.data.status,
        price: validation.data.price,
        stock_qty: validation.data.stock_qty,
        description: validation.data.description || null,
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
