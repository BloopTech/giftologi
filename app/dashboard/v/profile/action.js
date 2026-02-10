"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { render, pretty } from "@react-email/render";
import VendorApplicationSubmittedEmail from "../../../vendor/emails/VendorApplicationSubmittedEmail";
import { createClient } from "../../../utils/supabase/server";
import { generateUniqueVendorSlug } from "../../../utils/vendorSlug";
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

const MAX_VENDOR_LOGO_FILE_SIZE_MB = 5;
const MAX_VENDOR_LOGO_FILE_SIZE_BYTES =
  MAX_VENDOR_LOGO_FILE_SIZE_MB * 1024 * 1024;

const isValidImageFile = (file) => {
  if (!isFileLike(file)) return false;
  const fileType = typeof file.type === "string" ? file.type : "";
  if (!fileType.startsWith("image/")) return false;
  if (typeof file.size === "number" && file.size <= 0) return false;
  if (
    typeof file.size === "number" &&
    file.size > MAX_VENDOR_LOGO_FILE_SIZE_BYTES
  ) {
    return false;
  }
  return true;
};

const setIfValue = (payload, key, value) => {
  if (value === undefined || value === null) return;
  if (typeof value === "string" && value.trim() === "") return;
  payload[key] = value;
};

const buildApplicationPayloadFromProfile = ({
  vendorPayload = {},
  compliancePayload = {},
  paymentPayload = {},
  applicationPayload = {},
  ownerFullName = null,
}) => {
  const payload = {};
  setIfValue(payload, "business_name", vendorPayload.business_name);
  setIfValue(payload, "category", applicationPayload.category);
  setIfValue(payload, "business_type", compliancePayload.business_type);
  setIfValue(
    payload,
    "business_registration_number",
    compliancePayload.business_registration_number,
  );
  setIfValue(payload, "tax_id", vendorPayload.tax_id);
  setIfValue(payload, "website", vendorPayload.website);
  setIfValue(payload, "business_description", vendorPayload.description);
  setIfValue(payload, "street_address", vendorPayload.address_street);
  setIfValue(payload, "city", vendorPayload.address_city);
  setIfValue(payload, "region", vendorPayload.address_state);
  setIfValue(payload, "digital_address", vendorPayload.digital_address);
  setIfValue(payload, "years_in_business", applicationPayload.years_in_business);
  setIfValue(payload, "business_references", applicationPayload.business_references);
  setIfValue(payload, "verification_notes", applicationPayload.verification_notes);
  setIfValue(
    payload,
    "financial_verification_notes",
    applicationPayload.financial_verification_notes,
  );
  setIfValue(payload, "bank_account_name", paymentPayload.account_name);
  setIfValue(payload, "bank_name", paymentPayload.bank_name);
  setIfValue(payload, "bank_account_number", paymentPayload.bank_account);
  setIfValue(payload, "bank_branch", paymentPayload.bank_branch);
  setIfValue(payload, "bank_branch_code", paymentPayload.routing_number);
  setIfValue(payload, "bank_account_masked", paymentPayload.bank_account_masked);
  setIfValue(payload, "bank_account_last4", paymentPayload.bank_account_last4);
  setIfValue(payload, "bank_account_token", paymentPayload.bank_account_token);
  setIfValue(payload, "owner_email", vendorPayload.email);
  setIfValue(payload, "owner_phone", vendorPayload.phone);
  setIfValue(payload, "owner_full_name", ownerFullName);
  return payload;
};

const buildDraftDataFromProfile = ({
  vendorPayload = {},
  compliancePayload = {},
  paymentPayload = {},
  applicationPayload = {},
}) => {
  const draft = {};
  setIfValue(draft, "businessName", vendorPayload.business_name);
  if (Array.isArray(applicationPayload.category) && applicationPayload.category.length) {
    draft.category = applicationPayload.category;
  }
  setIfValue(draft, "businessType", compliancePayload.business_type);
  setIfValue(
    draft,
    "businessRegistrationNumber",
    compliancePayload.business_registration_number,
  );
  setIfValue(draft, "taxId", vendorPayload.tax_id);
  setIfValue(draft, "website", vendorPayload.website);
  setIfValue(draft, "businessDescription", vendorPayload.description);
  setIfValue(draft, "address", vendorPayload.address_street);
  setIfValue(draft, "city", vendorPayload.address_city);
  setIfValue(draft, "region", vendorPayload.address_state);
  setIfValue(draft, "digitalAddress", vendorPayload.digital_address);
  setIfValue(draft, "yearsInBusiness", applicationPayload.years_in_business);
  setIfValue(draft, "verificationNotes", applicationPayload.verification_notes);
  setIfValue(
    draft,
    "financialVerificationNotes",
    applicationPayload.financial_verification_notes,
  );
  if (Array.isArray(applicationPayload.business_references)) {
    const [ref1, ref2] = applicationPayload.business_references;
    setIfValue(draft, "ref1Name", ref1?.name);
    setIfValue(draft, "ref1Company", ref1?.company);
    setIfValue(draft, "ref1Phone", ref1?.phone);
    setIfValue(draft, "ref1Email", ref1?.email);
    setIfValue(draft, "ref2Name", ref2?.name);
    setIfValue(draft, "ref2Company", ref2?.company);
    setIfValue(draft, "ref2Phone", ref2?.phone);
    setIfValue(draft, "ref2Email", ref2?.email);
  }
  setIfValue(draft, "accountHolderName", paymentPayload.account_name);
  setIfValue(draft, "bankName", paymentPayload.bank_name);
  setIfValue(draft, "accountNumber", paymentPayload.bank_account);
  setIfValue(draft, "bankBranch", paymentPayload.bank_branch);
  setIfValue(draft, "routingNumber", paymentPayload.routing_number);
  setIfValue(draft, "ownerEmail", vendorPayload.email);
  setIfValue(draft, "ownerPhone", vendorPayload.phone);
  return draft;
};

const ensureVendorApplication = async ({
  supabase,
  userId,
  now,
  vendorPayload = {},
  compliancePayload = {},
  paymentPayload = {},
  applicationPayload = {},
  ownerFullName = null,
}) => {
  const { data: existing, error: existingError } = await supabase
    .from("vendor_applications")
    .select("id, status, draft_data, documents")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return { application: null, error: existingError };
  }

  const nextStatus =
    typeof existing?.status === "string" && existing.status.trim()
      ? existing.status
      : "draft";

  const applicationPayloadFromProfile = buildApplicationPayloadFromProfile({
    vendorPayload,
    compliancePayload,
    paymentPayload,
    applicationPayload,
    ownerFullName,
  });
  const draftData = buildDraftDataFromProfile({
    vendorPayload,
    compliancePayload,
    paymentPayload,
    applicationPayload,
  });
  const mergedDraft = {
    ...(existing?.draft_data || {}),
    ...draftData,
  };

  const basePayload = {
    status: nextStatus,
    draft_data: mergedDraft,
    updated_at: now,
    ...applicationPayloadFromProfile,
  };

  if (existing?.id) {
    const { data: updated, error: updateError } = await supabase
      .from("vendor_applications")
      .update(basePayload)
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select("id, status, draft_data, documents")
      .maybeSingle();

    if (updateError) {
      return { application: null, error: updateError };
    }

    return { application: updated || existing, error: null, created: false };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("vendor_applications")
    .insert([
      {
        user_id: userId,
        created_by: userId,
        created_at: now,
        ...basePayload,
      },
    ])
    .select("id, status, draft_data, documents")
    .single();

  if (insertError) {
    return { application: null, error: insertError };
  }

  return { application: inserted, error: null, created: true };
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

export async function saveVendorLogo(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in.",
      errors: { logo_file: "You must be logged in." },
    };
  }

  const logoFile = formData.get("logo_file");

  if (!isValidImageFile(logoFile)) {
    return {
      success: false,
      message: `Select a valid image under ${MAX_VENDOR_LOGO_FILE_SIZE_MB}MB.`,
      errors: {
        logo_file: `Image must be under ${MAX_VENDOR_LOGO_FILE_SIZE_MB}MB and a valid format.`,
      },
    };
  }

  const vendorIdFromForm = formData.get("vendor_id");
  const vendorSelectColumns = "id";
  let vendorRecord = null;

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
      };
    }

    vendorRecord = data || null;
  }

  if (!vendorRecord) {
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
      };
    }

    vendorRecord = data || null;
  }

  if (!vendorRecord?.id) {
    return {
      success: false,
      message: "Vendor profile not found.",
      errors: {},
    };
  }

  let logoUrl;

  try {
    logoUrl = await uploadDocumentToR2(logoFile, `vendor-logos/${user.id}`);
  } catch (error) {
    console.error("Vendor logo upload failed", error);
    return {
      success: false,
      message: "Failed to upload logo.",
      errors: {},
    };
  }

  if (!logoUrl) {
    return {
      success: false,
      message: "Failed to upload logo.",
      errors: {},
    };
  }

  const { error: updateError } = await supabase
    .from("vendors")
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq("id", vendorRecord.id)
    .eq("profiles_id", user.id);

  if (updateError) {
    return {
      success: false,
      message: updateError.message || "Failed to save logo.",
      errors: {},
    };
  }

  revalidatePath("/dashboard/v/profile");
  revalidatePath("/dashboard/v");

  return {
    success: true,
    message: "Logo updated successfully.",
    data: { logo_url: logoUrl },
    errors: {},
  };
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
    .select(
      "id, verified, business_name, business_type, business_registration_number, description, email, phone, website, tax_id, address_street, address_city, address_state, digital_address",
    )
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

  const { data: profileRecord } = await supabase
    .from("profiles")
    .select("firstname, lastname")
    .eq("id", user.id)
    .maybeSingle();

  const ownerFullName =
    [profileRecord?.firstname, profileRecord?.lastname]
      .filter(Boolean)
      .join(" ")
      .trim() || null;

  const now = new Date().toISOString();
  const vendorPayload = {
    business_name: vendorRecord.business_name || null,
    email: vendorRecord.email || null,
    phone: vendorRecord.phone || null,
    website: vendorRecord.website || null,
    tax_id: vendorRecord.tax_id || null,
    description: vendorRecord.description || null,
    address_street: vendorRecord.address_street || null,
    address_city: vendorRecord.address_city || null,
    address_state: vendorRecord.address_state || null,
    digital_address: vendorRecord.digital_address || null,
  };
  const compliancePayload = {
    business_type: vendorRecord.business_type || null,
    business_registration_number: vendorRecord.business_registration_number || null,
  };
  const { application: applicationRecord, error: applicationError } =
    await ensureVendorApplication({
      supabase,
      userId: user.id,
      now,
      vendorPayload,
      compliancePayload,
      paymentPayload: {},
      ownerFullName,
    });

  if (applicationError || !applicationRecord?.id) {
    return {
      success: false,
      message:
        applicationError?.message ||
        "Unable to create a vendor application. Please save your profile first.",
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
  category: z
    .array(z.string().trim().min(1))
    .min(1, "Select at least one category"),
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

const applicationDetailsSchema = z.object({
  years_in_business: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      if (!value) return null;
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    })
    .refine(
      (value) => value === null || (typeof value === "number" && value >= 0),
      { message: "Years in business must be a non-negative number" },
    ),
  ref1_name: z.string().trim().optional().or(z.literal("")),
  ref1_company: z.string().trim().optional().or(z.literal("")),
  ref1_phone: z.string().trim().optional().or(z.literal("")),
  ref1_email: z.string().trim().optional().or(z.literal("")),
  ref2_name: z.string().trim().optional().or(z.literal("")),
  ref2_company: z.string().trim().optional().or(z.literal("")),
  ref2_phone: z.string().trim().optional().or(z.literal("")),
  ref2_email: z.string().trim().optional().or(z.literal("")),
  verification_notes: z.string().trim().optional().or(z.literal("")),
  financial_verification_notes: z.string().trim().optional().or(z.literal("")),
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
  push_notifications: z.boolean(),
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

  const { data: profileRecord } = await supabase
    .from("profiles")
    .select("firstname, lastname")
    .eq("id", user.id)
    .maybeSingle();

  const ownerFullName =
    [profileRecord?.firstname, profileRecord?.lastname]
      .filter(Boolean)
      .join(" ")
      .trim() || null;

  const getFormValue = (...keys) => {
    for (const key of keys) {
      const value = queryData.get(key);
      if (value !== null && value !== undefined) return value;
    }
    return null;
  };
  const rawCategoryValues = [
    ...queryData.getAll("category"),
    ...queryData.getAll("category[]"),
  ];
  const normalizedCategories = rawCategoryValues
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  const rawVendor = {
    business_name: queryData.get("business_name")?.trim() || "",
    legal_name: queryData.get("legal_name")?.trim() || "",
    category: normalizedCategories,
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

  const rawApplication = {
    years_in_business:
      getFormValue("years_in_business", "yearsInBusiness")?.trim() || "",
    ref1_name: getFormValue("ref1_name", "ref1Name")?.trim() || "",
    ref1_company: getFormValue("ref1_company", "ref1Company")?.trim() || "",
    ref1_phone: getFormValue("ref1_phone", "ref1Phone")?.trim() || "",
    ref1_email: getFormValue("ref1_email", "ref1Email")?.trim() || "",
    ref2_name: getFormValue("ref2_name", "ref2Name")?.trim() || "",
    ref2_company: getFormValue("ref2_company", "ref2Company")?.trim() || "",
    ref2_phone: getFormValue("ref2_phone", "ref2Phone")?.trim() || "",
    ref2_email: getFormValue("ref2_email", "ref2Email")?.trim() || "",
    verification_notes:
      getFormValue("verification_notes", "verificationNotes")?.trim() || "",
    financial_verification_notes:
      getFormValue(
        "financial_verification_notes",
        "financialVerificationNotes",
      )?.trim() || "",
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
    push_notifications: toBoolean(queryData.get("push_notifications")),
  };

  const vendorValidation = vendorSchema.safeParse(rawVendor);
  const paymentValidation = paymentSchema.safeParse(rawPayment);
  const notificationValidation = notificationSchema.safeParse(rawNotifications);
  const applicationDetailsValidation = applicationDetailsSchema.safeParse(
    rawApplication,
  );

  if (
    !vendorValidation.success ||
    !paymentValidation.success ||
    !notificationValidation.success ||
    !applicationDetailsValidation.success
  ) {
    const errors = {};

    const extractErrors = (validation) => {
      if (validation.success) return [];
      return validation.error?.errors || validation.error?.issues || [];
    };

    extractErrors(vendorValidation).forEach((err) => {
      const field = err.path?.[0];
      if (field) errors[field] = err.message;
    });
    extractErrors(paymentValidation).forEach((err) => {
      const field = err.path?.[0];
      if (field) errors[field] = err.message;
    });
    extractErrors(notificationValidation).forEach((err) => {
      const field = err.path?.[0];
      if (field) errors[field] = err.message;
    });
    extractErrors(applicationDetailsValidation).forEach((err) => {
      const field = err.path?.[0];
      if (field) errors[field] = err.message;
    });

    return {
      success: false,
      message: "Please fix the errors below.",
      errors,
      values: { ...rawVendor, ...rawPayment, ...rawApplication },
    };
  }

  const vendorIdFromForm = queryData.get("vendor_id");
  const now = new Date().toISOString();
  const {
    business_name,
    legal_name,
    category,
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
    category,
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
  const {
    years_in_business,
    ref1_name,
    ref1_company,
    ref1_phone,
    ref1_email,
    ref2_name,
    ref2_company,
    ref2_phone,
    ref2_email,
    verification_notes,
    financial_verification_notes,
  } = applicationDetailsValidation.data;
  const businessReferences = [];

  if (ref1_name || ref1_company || ref1_phone || ref1_email) {
    businessReferences.push({
      name: ref1_name || null,
      company: ref1_company || null,
      phone: ref1_phone || null,
      email: ref1_email || null,
    });
  }

  if (ref2_name || ref2_company || ref2_phone || ref2_email) {
    businessReferences.push({
      name: ref2_name || null,
      company: ref2_company || null,
      phone: ref2_phone || null,
      email: ref2_email || null,
    });
  }

  const applicationPayload = {
    category,
    years_in_business,
    business_references: businessReferences.length ? businessReferences : null,
    verification_notes,
    financial_verification_notes,
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
    const vendorSlugSource =
      vendorPayload.business_name || vendorPayload.legal_name || vendorPayload.email || "vendor";
    const vendorSlug = await generateUniqueVendorSlug(supabase, vendorSlugSource);

    const insertPayload = {
      ...vendorPayload,
      ...compliancePayload,
      profiles_id: user.id,
      verified: false,
      slug: vendorSlug,
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
    const vendorSlugSource =
      vendorPayload.business_name || vendorPayload.legal_name || vendorPayload.email || "vendor";
    const vendorSlug = await generateUniqueVendorSlug(supabase, vendorSlugSource, {
      excludeVendorId: vendorId,
    });

    const vendorUpdatePayload = isVerifiedVendor
      ? vendorPayload
      : { ...vendorPayload, ...compliancePayload };

    vendorUpdatePayload.slug = vendorSlug;

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

  const paymentInfoId = queryData.get("payment_info_id") || "";
  const rawBankAccount = paymentValidation.data.bank_account?.trim() || "";
  const bankAccountLast4 = rawBankAccount ? rawBankAccount.slice(-4) : "";
  const bankAccountMasked = bankAccountLast4 ? `****${bankAccountLast4}` : "";
  const paymentPayload = {
    account_name: paymentValidation.data.account_name || null,
    bank_name: paymentValidation.data.bank_name || null,
    bank_account: rawBankAccount || null,
    bank_branch: paymentValidation.data.bank_branch || null,
    routing_number: paymentValidation.data.routing_number || null,
    account_type: paymentValidation.data.account_type || null,
    bank_branch_code: paymentValidation.data.routing_number || null,
    bank_account_masked: null,
    bank_account_last4: null,
    bank_account_token: null,
  };

  const paymentInfoPayload = {};
  setIfValue(paymentInfoPayload, "account_name", paymentPayload.account_name);
  setIfValue(paymentInfoPayload, "bank_name", paymentPayload.bank_name);
  setIfValue(paymentInfoPayload, "bank_branch", paymentPayload.bank_branch);
  setIfValue(paymentInfoPayload, "routing_number", paymentPayload.routing_number);
  setIfValue(paymentInfoPayload, "account_type", paymentPayload.account_type);
  setIfValue(paymentInfoPayload, "bank_branch_code", paymentPayload.bank_branch_code);

  if (rawBankAccount) {
    const uniqueSecretName = `vendor_payment_${vendorId}_${Date.now()}`;
    const { data: secretId, error: secretError } = await supabase.rpc(
      "create_payment_secret",
      {
        raw_value: rawBankAccount,
        secret_name: uniqueSecretName,
        secret_description: `Bank account for vendor ${vendorId}`,
      },
    );

    if (secretError) {
      return {
        success: false,
        message: secretError.message || "Failed to secure bank account details.",
        errors: {},
        values: rawVendor,
      };
    }

    paymentInfoPayload.bank_account_masked = bankAccountMasked;
    paymentInfoPayload.bank_account_last4 = bankAccountLast4 || null;
    paymentInfoPayload.bank_account_token = secretId || null;
    paymentInfoPayload.bank_account = bankAccountMasked;

    paymentPayload.bank_account_masked = bankAccountMasked;
    paymentPayload.bank_account_last4 = bankAccountLast4 || null;
    paymentPayload.bank_account_token = secretId || null;
  }

  const hasPaymentInfoUpdates = Object.keys(paymentInfoPayload).length > 0;

  if (!isVerifiedVendor && hasPaymentInfoUpdates) {
    paymentInfoPayload.updated_at = now;
    let resolvedPaymentInfoId = paymentInfoId;

    if (!resolvedPaymentInfoId) {
      const { data: existingPaymentInfo } = await supabase
        .from("payment_info")
        .select("id")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      resolvedPaymentInfoId = existingPaymentInfo?.id || "";
    }

    if (resolvedPaymentInfoId) {
      const { error: paymentError } = await supabase
        .from("payment_info")
        .update(paymentInfoPayload)
        .eq("id", resolvedPaymentInfoId)
        .eq("vendor_id", vendorId);

      if (paymentError) {
        return {
          success: false,
          message: paymentError.message || "Failed to update payment information.",
          errors: {},
          values: rawVendor,
        };
      }
    } else {
      const { error: paymentError } = await supabase
        .from("payment_info")
        .insert({ ...paymentInfoPayload, vendor_id: vendorId, created_at: now })
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
    const { application: applicationRecord, error: applicationError } =
      await ensureVendorApplication({
        supabase,
        userId: user.id,
        now,
        vendorPayload,
        compliancePayload,
        paymentPayload,
        applicationPayload,
        ownerFullName,
      });

    if (applicationError) {
      console.error("Vendor application lookup error", applicationError);
      applicationNotice =
        "Profile updated, but we could not create your application. Please try again.";
    } else {
      const normalizedStatus = (applicationRecord?.status || "").toLowerCase();
      const isSubmitted = ["pending", "approved"].includes(normalizedStatus);

      if (!isSubmitted) {
        const draftPayment = applicationRecord?.draft_data || {};
        const submissionValidation = applicationSubmissionSchema.safeParse({
          ...rawVendor,
          account_name:
            rawPayment.account_name || draftPayment.accountHolderName || "",
          bank_name: rawPayment.bank_name || draftPayment.bankName || "",
          bank_account: rawPayment.bank_account || draftPayment.accountNumber || "",
          bank_branch: rawPayment.bank_branch || draftPayment.bankBranch || "",
        });

        if (!submissionValidation.success) {
          applicationNotice =
            "Profile updated. Complete all required business and payout fields to submit your application.";
        } else {
          const submissionPayload = {
            status: "pending",
            submitted_at: now,
            updated_at: now,
            business_name: vendorPayload.business_name,
            category: applicationPayload.category,
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
            years_in_business: applicationPayload.years_in_business,
            business_references: applicationPayload.business_references,
            verification_notes: applicationPayload.verification_notes,
            financial_verification_notes:
              applicationPayload.financial_verification_notes,
            bank_account_name: paymentPayload.account_name,
            bank_name: paymentPayload.bank_name,
            bank_account_number: paymentPayload.bank_account,
            bank_branch: paymentPayload.bank_branch,
            bank_branch_code: paymentPayload.routing_number,
            bank_account_masked: paymentPayload.bank_account_masked,
            bank_account_last4: paymentPayload.bank_account_last4,
            bank_account_token: paymentPayload.bank_account_token,
            owner_email: vendorPayload.email,
            owner_phone: vendorPayload.phone,
            owner_full_name: ownerFullName,
          };

          let submissionId = applicationRecord?.id || null;

          if (submissionId) {
            const { error: updateError } = await supabase
              .from("vendor_applications")
              .update(submissionPayload)
              .eq("id", submissionId)
              .eq("user_id", user.id);

            if (updateError) {
              console.error("Vendor application update error", updateError);
              submissionId = null;
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
