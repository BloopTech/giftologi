"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { render, pretty } from "@react-email/render";
import VendorApplicationSubmittedEmail from "../../../vendor/emails/VendorApplicationSubmittedEmail";
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

const getSiteUrl = () =>
  process.env.NEXTAUTH_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : "http://localhost:3000");

const createEmailTransport = () => {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
};

const sendVendorApplicationSubmittedEmail = async ({
  to,
  applicationId,
  vendorName,
}) => {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transport = createEmailTransport();

  if (!to || !fromAddress || !transport) {
    console.warn("Email not sent: missing SMTP configuration or recipient.");
    return;
  }

  const siteUrl = getSiteUrl();
  const html = await pretty(
    await render(
      <VendorApplicationSubmittedEmail
        vendorName={vendorName}
        applicationId={applicationId}
        trackUrl={`${siteUrl}/dashboard/v/profile`}
      />,
    ),
  );

  await transport.sendMail({
    from: `Giftologi <${fromAddress}>`,
    to,
    subject: "Your vendor application was submitted",
    html,
  });
};

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

  const uploadedTitles = [];
  const uploadErrors = [];
  let currentDocuments = applicationRecord.documents;

  for (let idx = 0; ; idx++) {
    const docType = formData.get(`document_type_${idx}`);
    const docFile = formData.get(`document_file_${idx}`);

    if (docType === null && docFile === null) break;
    if (!docType) continue;

    const validation = documentUploadSchema.safeParse({ document_type: docType });
    if (!validation.success) {
      uploadErrors.push(`Row ${idx + 1}: ${validation.error.issues?.[0]?.message || "Invalid document type."}`);
      continue;
    }

    if (!isFileLike(docFile)) {
      uploadErrors.push(`Row ${idx + 1}: Please choose a file.`);
      continue;
    }

    if (typeof docFile.size === "number" && docFile.size > MAX_VENDOR_DOC_FILE_SIZE_BYTES) {
      uploadErrors.push(`Row ${idx + 1}: File exceeds ${MAX_VENDOR_DOC_FILE_SIZE_MB}MB.`);
      continue;
    }

    const prefix = `vendor-kyc/${user.id}/${docType}`;
    let documentUrl;

    try {
      documentUrl = await uploadDocumentToR2(docFile, prefix);
    } catch (error) {
      console.error("Vendor document upload failed", error);
      uploadErrors.push(`Row ${idx + 1}: Upload failed.`);
      continue;
    }

    if (!documentUrl) {
      uploadErrors.push(`Row ${idx + 1}: Invalid document.`);
      continue;
    }

    const title = DOCUMENT_TITLE_LOOKUP[docType] || "Document";
    currentDocuments = mergeDocument(currentDocuments, title, documentUrl);
    uploadedTitles.push(title);
  }

  if (uploadedTitles.length === 0 && uploadErrors.length === 0) {
    return {
      success: false,
      message: "No documents selected.",
      errors: { document_file: "Please add at least one document to upload." },
    };
  }

  if (uploadedTitles.length > 0) {
    const { error: updateError } = await supabase
      .from("vendor_applications")
      .update({ documents: currentDocuments, updated_at: new Date().toISOString() })
      .eq("id", applicationRecord.id)
      .eq("user_id", user.id);

    if (updateError) {
      return {
        success: false,
        message: updateError.message || "Failed to save documents.",
        errors: {},
      };
    }

    revalidatePath("/dashboard/v/profile");
    revalidatePath("/dashboard/v");
  }

  if (uploadErrors.length > 0) {
    return {
      success: uploadedTitles.length > 0,
      message:
        uploadedTitles.length > 0
          ? `Uploaded: ${uploadedTitles.join(", ")}. Errors: ${uploadErrors.join(" ")}`
          : uploadErrors.join(" "),
      errors: {},
      data: uploadedTitles.length > 0 ? { documents: currentDocuments } : undefined,
    };
  }

  return {
    success: true,
    message: `${uploadedTitles.join(", ")} uploaded successfully.`,
    errors: {},
    data: { documents: currentDocuments },
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

export async function getDefaultDocumentUploadState() {
  return {
    success: false,
    message: "",
    errors: {},
  };
}

const vendorSchema = z.object({
  business_name: z.string().min(1, "Business name is required").max(120),
  legal_name: z.string().min(1, "Legal name is required").max(120),
  business_type: z.string().min(1, "Business type is required").max(120),
  business_registration_number: z
    .string()
    .min(1, "Business registration number is required")
    .max(120),
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
  bank_branch: z.string().optional().or(z.literal("")),
  routing_number: z.string().optional().or(z.literal("")),
  account_type: z.string().optional().or(z.literal("")),
});

const applicationSubmissionSchema = vendorSchema.extend({
  website: z.string().url("Website is required"),
  account_name: z.string().min(1, "Account name is required"),
  bank_name: z.string().min(1, "Bank name is required"),
  bank_account: z.string().min(1, "Account number is required"),
  bank_branch: z.string().min(1, "Bank branch is required"),
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
    business_type: queryData.get("business_type")?.trim() || "",
    business_registration_number:
      queryData.get("business_registration_number")?.trim() || "",
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
    bank_branch: queryData.get("bank_branch")?.trim() || "",
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

  const vendorIdFromForm = queryData.get("vendor_id");
  const now = new Date().toISOString();
  const {
    business_name,
    legal_name,
    business_type,
    business_registration_number,
    email,
    phone,
    website,
    tax_id,
    description,
    address_street,
    address_city,
    address_state,
    digital_address,
    address_country,
  } = vendorValidation.data;
  const vendorPayload = {
    business_name,
    legal_name,
    email,
    phone,
    website: website || null,
    tax_id,
    description: description || null,
    address_street,
    address_city,
    address_state,
    digital_address,
    address_country,
    updated_at: now,
  };
  const compliancePayload = {
    business_type: business_type || null,
    business_registration_number: business_registration_number || null,
  };

  let existingVendor = null;

  const vendorSelectColumns =
    "id, verified, legal_name, tax_id, business_type, business_registration_number";

  if (vendorIdFromForm) {
    const { data, error } = await supabase
      .from("vendors")
      .select(vendorSelectColumns)
      .eq("id", vendorIdFromForm)
      .eq("profiles_id", user.id)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        message: error.message || "Vendor profile not found.",
        errors: {},
        values: rawVendor,
      };
    }

    existingVendor = data || null;
  }

  if (!existingVendor) {
    const { data, error } = await supabase
      .from("vendors")
      .select(vendorSelectColumns)
      .eq("profiles_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        message: error.message || "Vendor profile not found.",
        errors: {},
        values: rawVendor,
      };
    }

    existingVendor = data || null;
  }

  let createdVendor = false;

  if (!existingVendor) {
    const insertPayload = {
      ...vendorPayload,
      ...compliancePayload,
      profiles_id: user.id,
      verified: false,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await supabase
      .from("vendors")
      .insert([insertPayload])
      .select("id, verified, legal_name, tax_id")
      .single();

    if (error || !data) {
      return {
        success: false,
        message: error?.message || "Failed to create vendor profile.",
        errors: {},
        values: rawVendor,
      };
    }

    existingVendor = data;
    createdVendor = true;
  }

  const vendorId = existingVendor.id;
  const isVerifiedVendor = !!existingVendor.verified;
  if (isVerifiedVendor) {
    vendorPayload.legal_name = existingVendor.legal_name || vendorPayload.legal_name;
    vendorPayload.tax_id = existingVendor.tax_id || vendorPayload.tax_id;
    compliancePayload.business_type =
      existingVendor.business_type || compliancePayload.business_type;
    compliancePayload.business_registration_number =
      existingVendor.business_registration_number ||
      compliancePayload.business_registration_number;
  }

  if (!createdVendor) {
    const vendorUpdatePayload = isVerifiedVendor
      ? vendorPayload
      : { ...vendorPayload, ...compliancePayload };
    const { error: vendorError } = await supabase
      .from("vendors")
      .update(vendorUpdatePayload)
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
  }

  const paymentInfoId = queryData.get("payment_info_id");
  const paymentPayload = {
    ...paymentValidation.data,
    account_name: paymentValidation.data.account_name || null,
    bank_name: paymentValidation.data.bank_name || null,
    bank_account: paymentValidation.data.bank_account || null,
    bank_branch: paymentValidation.data.bank_branch || null,
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
    updated_at: now,
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

  let applicationNotice = null;

  if (!isVerifiedVendor) {
    const { data: applicationRecord, error: applicationError } = await supabase
      .from("vendor_applications")
      .select("id, status, draft_data")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (applicationError) {
      console.error("Vendor application lookup error", applicationError);
      applicationNotice =
        "Profile updated, but we could not submit your application. Please try again.";
    } else {
      const normalizedStatus = (applicationRecord?.status || "").toLowerCase();
      const isSubmitted = ["pending", "approved"].includes(normalizedStatus);

      if (!isSubmitted) {
        if (applicationRecord?.id) {
          const mergedDraft = {
            ...(applicationRecord.draft_data || {}),
            businessType: business_type || "",
            businessRegistrationNumber: business_registration_number || "",
          };
          const { error: draftError } = await supabase
            .from("vendor_applications")
            .update({
              ...compliancePayload,
              draft_data: mergedDraft,
              updated_at: now,
            })
            .eq("id", applicationRecord.id)
            .eq("user_id", user.id);

          if (draftError) {
            console.error("Vendor application draft update error", draftError);
          }
        }

        const submissionValidation = applicationSubmissionSchema.safeParse({
          ...rawVendor,
          account_name: rawPayment.account_name,
          bank_name: rawPayment.bank_name,
          bank_account: rawPayment.bank_account,
          bank_branch: rawPayment.bank_branch,
        });

        if (!submissionValidation.success) {
          applicationNotice =
            "Profile updated. Complete all required business and payout fields to submit your application.";
        } else {
          const applicationPayload = {
            status: "pending",
            submitted_at: now,
            updated_at: now,
            business_name: vendorPayload.business_name,
            business_type: compliancePayload.business_type,
            business_registration_number:
              compliancePayload.business_registration_number,
            tax_id: vendorPayload.tax_id,
            website: vendorPayload.website,
            business_description: vendorPayload.description,
            street_address: vendorPayload.address_street,
            city: vendorPayload.address_city,
            region: vendorPayload.address_state,
            digital_address: vendorPayload.digital_address,
            bank_account_name: paymentPayload.account_name,
            bank_name: paymentPayload.bank_name,
            bank_account_number: paymentPayload.bank_account,
            bank_branch: paymentPayload.bank_branch,
            bank_branch_code: paymentPayload.routing_number,
            owner_email: vendorPayload.email,
            owner_phone: vendorPayload.phone,
          };

          let submissionId = applicationRecord?.id || null;

          if (submissionId) {
            const { error: updateError } = await supabase
              .from("vendor_applications")
              .update(applicationPayload)
              .eq("id", submissionId)
              .eq("user_id", user.id);

            if (updateError) {
              console.error("Vendor application update error", updateError);
              submissionId = null;
            }
          } else {
            const { data: inserted, error: insertError } = await supabase
              .from("vendor_applications")
              .insert([
                {
                  user_id: user.id,
                  created_by: user.id,
                  ...applicationPayload,
                },
              ])
              .select("id")
              .single();

            if (insertError) {
              console.error("Vendor application insert error", insertError);
            } else {
              submissionId = inserted?.id || null;
            }
          }

          if (submissionId) {
            try {
              await sendVendorApplicationSubmittedEmail({
                to: vendorPayload.email || user.email,
                applicationId: submissionId,
                vendorName: vendorPayload.business_name || vendorPayload.legal_name,
              });
            } catch (emailError) {
              console.error("Failed to send vendor submission email", emailError);
            }
          } else {
            applicationNotice =
              "Profile updated, but we could not submit your application. Please try again.";
          }
        }
      }
    }
  }

  revalidatePath("/dashboard/v/profile");
  revalidatePath("/dashboard/v");

  return {
    success: true,
    message:
      applicationNotice ||
      (isVerifiedVendor
        ? "Profile updated. Payment details require support to change."
        : "Profile updated successfully."),
    errors: {},
    values: rawVendor,
  };
}
