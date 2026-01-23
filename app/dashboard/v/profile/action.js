"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import { createClient } from "../../../utils/supabase/server";
import {
  DOCUMENT_TITLE_LOOKUP,
  DOCUMENT_TYPE_VALUES,
  MAX_VENDOR_DOC_FILE_SIZE_BYTES,
  MAX_VENDOR_DOC_FILE_SIZE_MB,
} from "./documentTypes";

const vendorDocsS3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  region: "auto",
});

const randomObjectName = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

const isFileLike = (value) => {
  if (!value) return false;
  const tag = Object.prototype.toString.call(value);
  if (tag === "[object File]" || tag === "[object Blob]") return true;
  return (
    typeof value === "object" &&
    typeof value.name === "string" &&
    typeof value.size === "number" &&
    typeof value.type === "string" &&
    typeof value.arrayBuffer === "function"
  );
};

async function uploadDocumentToR2(file, keyPrefix) {
  if (!isFileLike(file)) return null;
  const buffer = await file.arrayBuffer();
  const originalName = typeof file.name === "string" ? file.name : "document";
  const parts = originalName.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "bin";
  const objectKey = `${keyPrefix}/${randomObjectName()}.${ext}`;

  const putParams = {
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: objectKey,
    Body: Buffer.from(buffer),
    ContentType: file.type || "application/octet-stream",
  };

  const putCommand = new PutObjectCommand(putParams);
  await vendorDocsS3Client.send(putCommand);

  const baseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || "";
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBaseUrl}/${objectKey}`;
}

export async function uploadVendorDocument(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in to upload documents.",
      errors: {},
    };
  }

  const raw = { document_type: formData.get("document_type") || "" };
  const validation = documentUploadSchema.safeParse(raw);

  if (!validation.success) {
    return {
      success: false,
      message: validation.error.issues?.[0]?.message || "Select a valid document type.",
      errors: { document_type: validation.error.issues?.[0]?.message },
    };
  }

  const file = formData.get("document_file");
  if (!isFileLike(file)) {
    return {
      success: false,
      message: "Select a file to upload.",
      errors: { document_file: "Please choose a document to upload." },
    };
  }

  if (typeof file.size === "number" && file.size > MAX_VENDOR_DOC_FILE_SIZE_BYTES) {
    return {
      success: false,
      message: `Files must be ${MAX_VENDOR_DOC_FILE_SIZE_MB}MB or smaller.`,
      errors: {
        document_file: `File exceeds ${MAX_VENDOR_DOC_FILE_SIZE_MB}MB.`,
      },
    };
  }

  const documentType = validation.data.document_type;

  const { data: vendorRecord, error: vendorError } = await supabase
    .from("vendors")
    .select("id, verified")
    .eq("profiles_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (vendorError || !vendorRecord?.id) {
    return {
      success: false,
      message: vendorError?.message || "Vendor profile not found.",
      errors: {},
    };
  }

  const { data: applicationRecord, error: applicationError } = await supabase
    .from("vendor_applications")
    .select("id, status, documents")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (applicationError || !applicationRecord?.id) {
    return {
      success: false,
      message: applicationError?.message || "Vendor application not found.",
      errors: {},
    };
  }

  if ((applicationRecord.status || "").toLowerCase() === "approved") {
    return {
      success: false,
      message: "Approved applications cannot be modified.",
      errors: {},
    };
  }

  const prefix = `vendor-kyc/${user.id}/${documentType}`;
  let documentUrl;

  try {
    documentUrl = await uploadDocumentToR2(file, prefix);
  } catch (error) {
    console.error("Vendor document upload failed", error);
    return {
      success: false,
      message: "Failed to upload the document. Please try again.",
      errors: {},
    };
  }

  if (!documentUrl) {
    return {
      success: false,
      message: "Invalid document selected.",
      errors: { document_file: "Please choose a different document." },
    };
  }

  const title = DOCUMENT_TITLE_LOOKUP[documentType] || "Document";
  const documents = mergeDocument(applicationRecord.documents, title, documentUrl);

  const { error: updateError } = await supabase
    .from("vendor_applications")
    .update({ documents, updated_at: new Date().toISOString() })
    .eq("id", applicationRecord.id)
    .eq("user_id", user.id);

  if (updateError) {
    return {
      success: false,
      message: updateError.message || "Failed to save document.",
      errors: {},
    };
  }

  revalidatePath("/dashboard/v/profile");
  revalidatePath("/dashboard/v");

  return {
    success: true,
    message: `${title} uploaded successfully.`,
    errors: {},
  };
}

const mergeDocument = (docs, title, url) => {
  if (!url) return docs || [];
  const normalized = title?.toLowerCase?.() || "";
  const baseDocuments = Array.isArray(docs) ? docs : [];
  const filtered = baseDocuments.filter((doc) => {
    const candidate = (doc?.title || doc?.label || doc?.name || "")
      .toString()
      .toLowerCase();
    return candidate !== normalized;
  });
  return [...filtered, { title, url }];
};

const documentUploadSchema = z.object({
  document_type: z
    .string()
    .min(1, "Select a document type.")
    .refine((value) => DOCUMENT_TYPE_VALUES.includes(value), {
      message: "Select a valid document type.",
    }),
});

export const defaultDocumentUploadState = {
  success: false,
  message: "",
  errors: {},
};

const vendorSchema = z.object({
  business_name: z.string().min(1, "Business name is required").max(120),
  legal_name: z.string().min(1, "Legal name is required").max(120),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required").max(50),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  tax_id: z.string().min(1, "Tax ID is required").max(50),
  description: z.string().max(2000).optional().or(z.literal("")),
  address_street: z.string().min(1, "Street address is required").max(200),
  address_city: z.string().min(1, "City is required").max(120),
  address_state: z.string().min(1, "State is required").max(120),
  digital_address: z.string().min(1, "Digital address is required").max(40),
  address_country: z.string().min(1, "Country is required").max(120),
});

const paymentSchema = z.object({
  account_name: z.string().optional().or(z.literal("")),
  bank_name: z.string().optional().or(z.literal("")),
  bank_account: z.string().optional().or(z.literal("")),
  routing_number: z.string().optional().or(z.literal("")),
  account_type: z.string().optional().or(z.literal("")),
});

const notificationSchema = z.object({
  new_orders: z.boolean(),
  order_updates: z.boolean(),
  payout_alerts: z.boolean(),
  low_stock_alerts: z.boolean(),
  product_reviews: z.boolean(),
  weekly_reports: z.boolean(),
  monthly_reports: z.boolean(),
  marketing_emails: z.boolean(),
});

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  return value === "true" || value === "on" || value === "1";
};

export async function manageProfile(prevState, queryData) {
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

  const action = queryData.get("action");

  if (action !== "update_profile") {
    return {
      success: false,
      message: "Invalid action.",
      errors: {},
      values: {},
    };
  }

  const rawVendor = {
    business_name: queryData.get("business_name")?.trim() || "",
    legal_name: queryData.get("legal_name")?.trim() || "",
    email: queryData.get("email")?.trim() || "",
    phone: queryData.get("phone")?.trim() || "",
    website: queryData.get("website")?.trim() || "",
    tax_id: queryData.get("tax_id")?.trim() || "",
    description: queryData.get("description")?.trim() || "",
    address_street: queryData.get("address_street")?.trim() || "",
    address_city: queryData.get("address_city")?.trim() || "",
    address_state: queryData.get("address_state")?.trim() || "",
    digital_address: queryData.get("digital_address")?.trim() || "",
    address_country: queryData.get("address_country")?.trim() || "",
  };

  const rawPayment = {
    account_name: queryData.get("account_name")?.trim() || "",
    bank_name: queryData.get("bank_name")?.trim() || "",
    bank_account: queryData.get("bank_account")?.trim() || "",
    routing_number: queryData.get("routing_number")?.trim() || "",
    account_type: queryData.get("account_type")?.trim() || "",
  };

  const rawNotifications = {
    new_orders: toBoolean(queryData.get("new_orders")),
    order_updates: toBoolean(queryData.get("order_updates")),
    payout_alerts: toBoolean(queryData.get("payout_alerts")),
    low_stock_alerts: toBoolean(queryData.get("low_stock_alerts")),
    product_reviews: toBoolean(queryData.get("product_reviews")),
    weekly_reports: toBoolean(queryData.get("weekly_reports")),
    monthly_reports: toBoolean(queryData.get("monthly_reports")),
    marketing_emails: toBoolean(queryData.get("marketing_emails")),
  };

  const vendorValidation = vendorSchema.safeParse(rawVendor);
  const paymentValidation = paymentSchema.safeParse(rawPayment);
  const notificationValidation = notificationSchema.safeParse(rawNotifications);

  if (!vendorValidation.success || !paymentValidation.success || !notificationValidation.success) {
    const errors = {};

    if (!vendorValidation.success) {
      vendorValidation.error.errors.forEach((err) => {
        const field = err.path[0];
        errors[field] = err.message;
      });
    }

    if (!paymentValidation.success) {
      paymentValidation.error.errors.forEach((err) => {
        const field = err.path[0];
        errors[field] = err.message;
      });
    }

    if (!notificationValidation.success) {
      notificationValidation.error.errors.forEach((err) => {
        const field = err.path[0];
        errors[field] = err.message;
      });
    }

    return {
      success: false,
      message: "Please fix the errors below.",
      errors,
      values: { ...rawVendor, ...rawPayment },
    };
  }

  const vendorId = queryData.get("vendor_id");
  if (!vendorId) {
    return {
      success: false,
      message: "Vendor profile not found.",
      errors: {},
      values: {},
    };
  }

  const { data: existingVendor, error: existingVendorError } = await supabase
    .from("vendors")
    .select("id, verified, legal_name, tax_id")
    .eq("id", vendorId)
    .eq("profiles_id", user.id)
    .maybeSingle();

  if (existingVendorError || !existingVendor) {
    return {
      success: false,
      message: existingVendorError?.message || "Vendor profile not found.",
      errors: {},
      values: rawVendor,
    };
  }

  const vendorPayload = {
    ...vendorValidation.data,
    website: vendorValidation.data.website || null,
    description: vendorValidation.data.description || null,
    updated_at: new Date().toISOString(),
  };

  const isVerifiedVendor = !!existingVendor.verified;
  if (isVerifiedVendor) {
    vendorPayload.legal_name = existingVendor.legal_name || vendorPayload.legal_name;
    vendorPayload.tax_id = existingVendor.tax_id || vendorPayload.tax_id;
  }

  const { error: vendorError } = await supabase
    .from("vendors")
    .update(vendorPayload)
    .eq("id", vendorId)
    .eq("profiles_id", user.id);

  if (vendorError) {
    return {
      success: false,
      message: vendorError.message || "Failed to update vendor profile.",
      errors: {},
      values: rawVendor,
    };
  }

  const paymentInfoId = queryData.get("payment_info_id");
  const paymentPayload = {
    ...paymentValidation.data,
    account_name: paymentValidation.data.account_name || null,
    bank_name: paymentValidation.data.bank_name || null,
    bank_account: paymentValidation.data.bank_account || null,
    routing_number: paymentValidation.data.routing_number || null,
    account_type: paymentValidation.data.account_type || null,
  };

  if (!isVerifiedVendor) {
    if (paymentInfoId) {
      const { error: paymentError } = await supabase
        .from("payment_info")
        .update(paymentPayload)
        .eq("id", paymentInfoId)
        .eq("vendor_id", vendorId);

      if (paymentError) {
        return {
          success: false,
          message: paymentError.message || "Failed to update payment information.",
          errors: {},
          values: rawVendor,
        };
      }
    } else if (Object.values(paymentPayload).some((value) => value)) {
      const { error: paymentError } = await supabase
        .from("payment_info")
        .insert({ ...paymentPayload, vendor_id: vendorId })
        .select("id")
        .single();

      if (paymentError) {
        return {
          success: false,
          message: paymentError.message || "Failed to create payment information.",
          errors: {},
          values: rawVendor,
        };
      }
    }
  }

  const notificationPayload = {
    ...notificationValidation.data,
    vendor_id: vendorId,
    updated_at: new Date().toISOString(),
  };

  const { error: notificationError } = await supabase
    .from("vendor_notification_preferences")
    .upsert(notificationPayload, { onConflict: "vendor_id" })
    .select("id")
    .single();

  if (notificationError) {
    return {
      success: false,
      message: notificationError.message || "Failed to save notification preferences.",
      errors: {},
      values: rawVendor,
    };
  }

  revalidatePath("/dashboard/v/profile");
  revalidatePath("/dashboard/v");

  return {
    success: true,
    message: isVerifiedVendor
      ? "Profile updated. Payment details require support to change."
      : "Profile updated successfully.",
    errors: {},
    values: rawVendor,
  };
}
