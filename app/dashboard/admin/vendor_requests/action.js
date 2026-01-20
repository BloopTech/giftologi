"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";
import { logAdminActivityWithClient } from "../activity_log/logger";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const vendorDocsS3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  region: "auto", // R2 ignores this but the client requires a region
});

const randomObjectName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

const MAX_VENDOR_DOC_FILE_SIZE_BYTES = 2 * 1024 * 1024;

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

async function uploadVendorDocument(file, keyPrefix) {
  if (!isValidSelectedFile(file)) return null;

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
  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;

  return `${normalizedBaseUrl}/${objectKey}`;
}

const defaultApproveVendorValues = {
  applicationId: [],
};

const approveVendorSchema = z.object({
  applicationId: z.uuid({ message: "Invalid vendor request" }),
});

export async function approveVendorRequest(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to approve vendor requests.",
      errors: { ...defaultApproveVendorValues },
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
      message: "You are not authorized to approve vendor requests.",
      errors: { ...defaultApproveVendorValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    applicationId: formData.get("applicationId"),
  };

  const parsed = approveVendorSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { applicationId } = parsed.data;

  const { data: application, error: applicationError } = await supabase
    .from("vendor_applications")
    .select("id, user_id, business_name, category, status")
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) {
    return {
      message: applicationError?.message || "Vendor request not found.",
      errors: { ...defaultApproveVendorValues },
      values: raw,
      data: {},
    };
  }

  if (application.status && application.status !== "pending") {
    return {
      message: "This vendor request has already been processed.",
      errors: {},
      values: {},
      data: { applicationId },
    };
  }

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .insert([
      {
        profiles_id: application.user_id,
        business_name: application.business_name,
        category: application.category,
        description: null,
        commission_rate: null,
        verified: true,
        created_by: currentProfile?.id || user.id,
        updated_at: new Date().toISOString(),
      },
    ])
    .select("id, business_name")
    .single();

  if (vendorError) {
    return {
      message: vendorError.message,
      errors: { ...defaultApproveVendorValues },
      values: raw,
      data: {},
    };
  }

  const { error: updateError } = await supabase
    .from("vendor_applications")
    .update({
      status: "approved",
      approved_by: currentProfile?.id || user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (updateError) {
    return {
      message: updateError.message,
      errors: { ...defaultApproveVendorValues },
      values: raw,
      data: {},
    };
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "approved_vendor",
    entity: "vendors",
    targetId: applicationId,
    details: `Approved vendor application ${applicationId} (${application.business_name || ""})`,
  });

  revalidatePath("/dashboard/admin/vendor_requests");
  revalidatePath("/dashboard/admin");

  return {
    message: "Vendor request approved.",
    errors: {},
    values: {},
    data: { applicationId, vendor },
  };
}

const defaultRejectVendorValues = {
  applicationId: [],
};

const rejectVendorSchema = z.object({
  applicationId: z.string().uuid({ message: "Invalid vendor request" }),
});

export async function rejectVendorRequest(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to reject vendor requests.",
      errors: { ...defaultRejectVendorValues },
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
      message: "You are not authorized to reject vendor requests.",
      errors: { ...defaultRejectVendorValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    applicationId: formData.get("applicationId"),
  };

  const parsed = rejectVendorSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { applicationId } = parsed.data;

  const { data: application, error: applicationError } = await supabase
    .from("vendor_applications")
    .select("id, status")
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) {
    return {
      message: applicationError?.message || "Vendor request not found.",
      errors: { ...defaultRejectVendorValues },
      values: raw,
      data: {},
    };
  }

  if (application.status && application.status !== "pending") {
    return {
      message: "This vendor request has already been processed.",
      errors: {},
      values: {},
      data: { applicationId },
    };
  }

  const { error: updateError } = await supabase
    .from("vendor_applications")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (updateError) {
    return {
      message: updateError.message,
      errors: { ...defaultRejectVendorValues },
      values: raw,
      data: {},
    };
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "rejected_vendor",
    entity: "vendors",
    targetId: applicationId,
    details: `Rejected vendor application ${applicationId}`,
  });

  revalidatePath("/dashboard/admin/vendor_requests");
  revalidatePath("/dashboard/admin");

  return {
    message: "Vendor request rejected.",
    errors: {},
    values: {},
    data: { applicationId },
  };
}

const defaultFlagVendorValues = {
  applicationId: [],
  reason: [],
};

const flagVendorSchema = z.object({
  applicationId: z.uuid({ message: "Invalid vendor request" }),
  reason: z.string().trim().optional().or(z.literal("")),
});

export async function flagVendorRequest(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to flag vendor requests.",
      errors: { ...defaultFlagVendorValues },
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
      message: "You are not authorized to flag vendor requests.",
      errors: { ...defaultFlagVendorValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    applicationId: formData.get("applicationId"),
    reason: formData.get("reason") || "",
  };

  const parsed = flagVendorSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { applicationId, reason } = parsed.data;

  const { data: application, error: applicationError } = await supabase
    .from("vendor_applications")
    .select("id, business_name, user_id, status")
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) {
    return {
      message: applicationError?.message || "Vendor request not found.",
      errors: { ...defaultFlagVendorValues },
      values: raw,
      data: {},
    };
  }

  const descriptionParts = [];
  if (reason && reason.trim()) {
    descriptionParts.push(reason.trim());
  }
  descriptionParts.push(`Vendor application ID: ${applicationId}`);
  if (application.business_name) {
    descriptionParts.push(`Business: ${application.business_name}`);
  }

  const description = descriptionParts.join("\n");

  const { error: ticketError } = await supabase.from("support_tickets").insert([
    {
      registry_id: null,
      subject: "Flagged vendor application",
      description: description || "Flagged vendor application",
      status: "escalated",
      created_by: currentProfile?.id || user.id,
    },
  ]);

  if (ticketError) {
    return {
      message: ticketError.message,
      errors: { ...defaultFlagVendorValues },
      values: raw,
      data: {},
    };
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "flagged_vendor",
    entity: "vendors",
    targetId: applicationId,
    details: `Flagged vendor application ${applicationId}${reason ? `: ${reason}` : ""}`,
  });

  revalidatePath("/dashboard/admin/vendor_requests");
  revalidatePath("/dashboard/admin");

  return {
    message: "Vendor request flagged successfully.",
    errors: {},
    values: {},
    data: { applicationId },
  };
}

const defaultCreateVendorApplicationValues = {
  vendorUserId: [],
  businessName: [],
  category: [],
  businessType: [],
  businessRegistrationNumber: [],
  taxId: [],
  website: [],
  streetAddress: [],
  city: [],
  region: [],
  postalCode: [],
  ownerFullName: [],
  ownerEmail: [],
  ownerPhone: [],
  bankAccountName: [],
  bankName: [],
  bankAccountNumber: [],
  bankBranchCode: [],
};

const createVendorApplicationSchema = z.object({
  vendorUserId: z.uuid({ message: "Select a vendor" }),
  businessName: z
    .string()
    .trim()
    .min(1, { message: "Business name is required" })
    .max(50, { message: "Business name must be 50 characters or less" }),
  category: z.string().trim().min(1, { message: "Category is required" }),
  businessType: z
    .string()
    .trim()
    .min(1, { message: "Business type is required" })
    .max(50, { message: "Business type must be 50 characters or less" }),
  businessRegistrationNumber: z
    .string()
    .trim()
    .min(1, { message: "Business registration number is required" })
    .max(50, {
      message: "Business registration number must be 50 characters or less",
    }),
  taxId: z
    .string()
    .trim()
    .min(1, { message: "Tax ID is required" })
    .max(50, { message: "Tax ID must be 50 characters or less" }),
  yearsInBusiness: z
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
  website: z.preprocess(
    (v) => {
      if (v == null) return undefined;

      if (typeof v === "string") {
        const s = v.trim();
        return s === "" ? undefined : s;
      }
      return v;
    },
    z.url({ message: "Website URL needed" }).refine(
      (val) => {
        try {
          if (!/^https:\/\//i.test(val)) return false; // must start with https://
          const u = new URL(val);
          if (u.protocol !== "https:") return false;
          if (u.port) return false; // enforce format without explicit port
          const host = u.hostname.toLowerCase();
          const bare = host.startsWith("www.") ? host.slice(4) : host;
          const labels = bare.split(".");
          // exactly domain.tld after optional www.
          if (labels.length !== 2) return false;
          const labelRe = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
          return labels.every((l) => labelRe.test(l));
        } catch {
          return false;
        }
      },
      {
        // Reuse existing message key to avoid adding new translations
        message: "Website URL needed",
      },
    ),
  ),
  businessDescription: z.string().trim().optional().or(z.literal("")),
  streetAddress: z
    .string()
    .trim()
    .min(1, { message: "Street address is required" })
    .max(50, { message: "Street address must be 50 characters or less" }),
  city: z
    .string()
    .trim()
    .min(1, { message: "City is required" })
    .max(50, { message: "City must be 50 characters or less" }),
  region: z
    .string()
    .trim()
    .min(1, { message: "Region is required" })
    .max(50, { message: "Region must be 50 characters or less" }),
  postalCode: z
    .string()
    .trim()
    .min(1, { message: "Digital address is required" })
    .max(50, { message: "Digital address must be 50 characters or less" }),
  ownerFullName: z
    .string()
    .trim()
    .min(1, { message: "Owner full name is required" })
    .max(50, { message: "Owner full name must be 50 characters or less" }),
  ownerEmail: z
    .string()
    .trim()
    .min(1, { message: "Owner email is required" })
    .email({ message: "Invalid email address" })
    .max(50, { message: "Owner email must be 50 characters or less" }),
  ownerPhone: z
    .string()
    .trim()
    .min(1, { message: "Owner phone is required" })
    .max(15, { message: "Owner phone must be 15 characters or less" })
    .regex(/^[+]?[\d\s\-\(\)]+$/, { message: "Invalid phone number format" }),
  ref1Name: z.string().trim().optional().or(z.literal("")),
  ref1Company: z.string().trim().optional().or(z.literal("")),
  ref1Phone: z.string().trim().optional().or(z.literal("")),
  ref1Email: z.string().trim().optional().or(z.literal("")),
  ref2Name: z.string().trim().optional().or(z.literal("")),
  ref2Company: z.string().trim().optional().or(z.literal("")),
  ref2Phone: z.string().trim().optional().or(z.literal("")),
  ref2Email: z.string().trim().optional().or(z.literal("")),
  verificationNotes: z.string().trim().optional().or(z.literal("")),
  bankAccountName: z
    .string()
    .trim()
    .min(1, { message: "Account name is required" })
    .max(50, { message: "Account name must be 50 characters or less" })
    .regex(/^(?=.*\p{L})[\p{L}\p{N} \-]*[\p{L}\p{N}]$/u, {
      message:
        "Account name must contain only letters, numbers, spaces, and hyphens",
    }),
  bankName: z
    .string()
    .trim()
    .min(1, { message: "Bank name is required" })
    .max(50, { message: "Bank name must be 50 characters or less" })
    .regex(/^(?=.*\p{L})[\p{L}\p{N} \-]*[\p{L}\p{N}]$/u, {
      message:
        "Bank name must contain only letters, numbers, spaces, and hyphens",
    }),
  bankAccountNumber: z
    .string()
    .trim()
    .min(1, { message: "Account number is required" })
    .regex(/^\d+$/, { message: "Account number must be numeric" })
    .max(20, { message: "Account number too long" }),
  bankBranchCode: z
    .string()
    .trim()
    .min(1, { message: "Branch code is required" })
    .regex(/^\d+$/, { message: "Branch code must be numeric" })
    .max(10, { message: "Branch code must be 10 characters or less" }),
  financialVerificationNotes: z.string().trim().optional().or(z.literal("")),
});

const updateVendorApplicationSchema = createVendorApplicationSchema
  .omit({ vendorUserId: true })
  .extend({
    applicationId: z.uuid({ message: "Invalid vendor request" }),
  });

const defaultUpdateVendorApplicationValues = {
  ...defaultCreateVendorApplicationValues,
  applicationId: [],
};

export async function createVendorApplication(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to create vendor applications.",
      errors: { ...defaultCreateVendorApplicationValues },
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
      message: "You are not authorized to create vendor applications.",
      errors: { ...defaultCreateVendorApplicationValues },
      values: {},
      data: {},
    };
  }
  console.log("form data.............", formData);

  const raw = {
    vendorUserId: formData.get("vendorUserId") || "",
    businessName: formData.get("businessName") || "",
    category: formData.get("category") || "",
    businessType: formData.get("businessType") || "",
    businessRegistrationNumber:
      formData.get("businessRegistrationNumber") || "",
    taxId: formData.get("taxId") || "",
    yearsInBusiness: formData.get("yearsInBusiness") || "",
    website: formData.get("website") || "",
    businessDescription: formData.get("businessDescription") || "",
    streetAddress: formData.get("streetAddress") || "",
    city: formData.get("city") || "",
    region: formData.get("region") || "",
    postalCode: formData.get("postalCode") || "",
    ownerFullName: formData.get("ownerFullName") || "",
    ownerEmail: formData.get("ownerEmail") || "",
    ownerPhone: formData.get("ownerPhone") || "",
    ref1Name: formData.get("ref1Name") || "",
    ref1Company: formData.get("ref1Company") || "",
    ref1Phone: formData.get("ref1Phone") || "",
    ref1Email: formData.get("ref1Email") || "",
    ref2Name: formData.get("ref2Name") || "",
    ref2Company: formData.get("ref2Company") || "",
    ref2Phone: formData.get("ref2Phone") || "",
    ref2Email: formData.get("ref2Email") || "",
    verificationNotes: formData.get("verificationNotes") || "",
    bankAccountName: formData.get("bankAccountName") || "",
    bankName: formData.get("bankName") || "",
    bankAccountNumber: formData.get("bankAccountNumber") || "",
    bankBranchCode: formData.get("bankBranchCode") || "",
    financialVerificationNotes:
      formData.get("financialVerificationNotes") || "",
  };

  const parsed = createVendorApplicationSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const {
    vendorUserId,
    businessName,
    category,
    businessType,
    businessRegistrationNumber,
    taxId,
    yearsInBusiness,
    website,
    businessDescription,
    streetAddress,
    city,
    region,
    postalCode,
    ownerFullName,
    ownerEmail,
    ownerPhone,
    ref1Name,
    ref1Company,
    ref1Phone,
    ref1Email,
    ref2Name,
    ref2Company,
    ref2Phone,
    ref2Email,
    verificationNotes,
    bankAccountName,
    bankName,
    bankAccountNumber,
    bankBranchCode,
    financialVerificationNotes,
  } = parsed.data;

  const businessReferences = [];

  if (ref1Name || ref1Company || ref1Phone || ref1Email) {
    businessReferences.push({
      name: ref1Name || null,
      company: ref1Company || null,
      phone: ref1Phone || null,
      email: ref1Email || null,
    });
  }

  if (ref2Name || ref2Company || ref2Phone || ref2Email) {
    businessReferences.push({
      name: ref2Name || null,
      company: ref2Company || null,
      phone: ref2Phone || null,
      email: ref2Email || null,
    });
  }

  const businessRegistrationFile = formData.get(
    "businessRegistrationCertificate",
  );
  const taxClearanceFile = formData.get("taxClearanceCertificate");
  const ownerIdFile = formData.get("ownerIdDocument");
  const bankStatementFile = formData.get("bankStatement");
  const proofOfAddressFile = formData.get("proofOfBusinessAddress");

  const requiredDocuments = [
    {
      file: businessRegistrationFile,
      label: "Business Registration Certificate",
    },
    { file: taxClearanceFile, label: "Tax Clearance Certificate" },
    { file: ownerIdFile, label: "Owner ID Card/Passport" },
    { file: bankStatementFile, label: "Bank Statement (Last 3 Months)" },
    { file: proofOfAddressFile, label: "Proof of Business Address" },
  ];

  const missingDocs = requiredDocuments.filter(
    ({ file }) => !isValidSelectedFile(file),
  );

  if (missingDocs.length > 0) {
    const labels = missingDocs.map((doc) => doc.label);
    return {
      message:
        labels.length === 1
          ? `${labels[0]} is required.`
          : `Missing required documents: ${labels.join(", ")}.`,
      errors: { ...defaultCreateVendorApplicationValues },
      values: raw,
      data: {},
    };
  }

  const fileSizeErrors = [];

  const validateFileSize = (file, label) => {
    if (!isFileLike(file)) return;
    if (
      typeof file.size === "number" &&
      file.size > MAX_VENDOR_DOC_FILE_SIZE_BYTES
    ) {
      fileSizeErrors.push(`${label} must be 2MB or less.`);
    }
  };

  validateFileSize(
    businessRegistrationFile,
    "Business Registration Certificate",
  );
  validateFileSize(taxClearanceFile, "Tax Clearance Certificate");
  validateFileSize(ownerIdFile, "Owner ID Card/Passport");
  validateFileSize(bankStatementFile, "Bank Statement (Last 3 Months)");
  validateFileSize(proofOfAddressFile, "Proof of Business Address");

  if (fileSizeErrors.length > 0) {
    return {
      message:
        fileSizeErrors.length === 1
          ? fileSizeErrors[0]
          : "One or more documents exceed the 2MB size limit.",
      errors: { ...defaultCreateVendorApplicationValues },
      values: raw,
      data: {},
    };
  }

  let businessRegistrationUrl = null;
  let taxClearanceUrl = null;
  let ownerIdUrl = null;
  let bankStatementUrl = null;
  let proofOfAddressUrl = null;

  try {
    const prefix = `vendor-kyc/${vendorUserId}`;

    const [brUrl, tcUrl, oiUrl, bsUrl, paUrl] = await Promise.all([
      uploadVendorDocument(
        businessRegistrationFile,
        `${prefix}/business-registration-certificate`,
      ),
      uploadVendorDocument(
        taxClearanceFile,
        `${prefix}/tax-clearance-certificate`,
      ),
      uploadVendorDocument(ownerIdFile, `${prefix}/owner-id-document`),
      uploadVendorDocument(
        bankStatementFile,
        `${prefix}/bank-statement-last-3-months`,
      ),
      uploadVendorDocument(
        proofOfAddressFile,
        `${prefix}/proof-of-business-address`,
      ),
    ]);

    businessRegistrationUrl = brUrl;
    taxClearanceUrl = tcUrl;
    ownerIdUrl = oiUrl;
    bankStatementUrl = bsUrl;
    proofOfAddressUrl = paUrl;
  } catch (error) {
    console.error("Failed to upload vendor KYC documents", error);
    return {
      message: "Failed to upload KYC documents. Please try again.",
      errors: { ...defaultCreateVendorApplicationValues },
      values: raw,
      data: {},
    };
  }

  const mergeDocument = (docs, title, url) => {
    if (!url) return docs;
    const normalizedTitle = title.toLowerCase();
    const filtered = docs.filter((doc) => {
      const candidate =
        (doc?.title || doc?.label || doc?.name || "").toString().toLowerCase();
      return candidate !== normalizedTitle;
    });
    return [...filtered, { title, url }];
  };

  let documents = [];
  documents = mergeDocument(
    documents,
    "Business Registration Certificate",
    businessRegistrationUrl,
  );
  documents = mergeDocument(documents, "Tax Clearance Certificate", taxClearanceUrl);
  documents = mergeDocument(documents, "Owner ID Card/Passport", ownerIdUrl);
  documents = mergeDocument(
    documents,
    "Bank Statement (Last 3 Months)",
    bankStatementUrl,
  );
  documents = mergeDocument(
    documents,
    "Proof of Business Address",
    proofOfAddressUrl,
  );

  const insertPayload = {
    user_id: vendorUserId,
    business_name: businessName,
    category,
    status: "pending",
    created_by: currentProfile?.id || user.id,
    business_type: businessType || null,
    business_registration_number: businessRegistrationNumber || null,
    tax_id: taxId || null,
    years_in_business:
      typeof yearsInBusiness === "number" ? yearsInBusiness : null,
    website: website || null,
    business_description: businessDescription || null,
    street_address: streetAddress || null,
    city: city || null,
    region: region || null,
    postal_code: postalCode || null,
    owner_full_name: ownerFullName || null,
    owner_email: ownerEmail || null,
    owner_phone: ownerPhone || null,
    business_references:
      businessReferences.length > 0 ? businessReferences : null,
    documents: documents.length > 0 ? documents : null,
    verification_notes: verificationNotes || null,
    bank_account_name: bankAccountName || null,
    bank_name: bankName || null,
    bank_account_number: bankAccountNumber || null,
    bank_branch_code: bankBranchCode || null,
    financial_verification_notes: financialVerificationNotes || null,
    updated_at: new Date().toISOString(),
  };
  const { data: application, error: insertError } = await supabase
    .from("vendor_applications")
    .insert([insertPayload])
    .select("id, business_name, status")
    .single();
  if (insertError || !application) {
    return {
      message: insertError?.message || "Failed to create vendor application.",
      errors: { ...defaultCreateVendorApplicationValues },
      values: raw,
      data: {},
    };
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "created_vendor_application",
    entity: "vendor_applications",
    targetId: application.id,
    details: `Created vendor application ${application.id} (${businessName})`,
  });

  revalidatePath("/dashboard/admin/vendor_requests");
  revalidatePath("/dashboard/admin");

  return {
    message: "Vendor application created.",
    errors: {},
    values: {},
    data: { applicationId: application.id },
  };
}

export async function updateVendorApplication(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to update vendor applications.",
      errors: { ...defaultUpdateVendorApplicationValues },
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
      message: "You are not authorized to update vendor applications.",
      errors: { ...defaultUpdateVendorApplicationValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    applicationId: formData.get("applicationId") || "",
    businessName: formData.get("businessName") || "",
    category: formData.get("category") || "",
    businessType: formData.get("businessType") || "",
    businessRegistrationNumber:
      formData.get("businessRegistrationNumber") || "",
    taxId: formData.get("taxId") || "",
    yearsInBusiness: formData.get("yearsInBusiness") || "",
    website: formData.get("website") || "",
    businessDescription: formData.get("businessDescription") || "",
    streetAddress: formData.get("streetAddress") || "",
    city: formData.get("city") || "",
    region: formData.get("region") || "",
    postalCode: formData.get("postalCode") || "",
    ownerFullName: formData.get("ownerFullName") || "",
    ownerEmail: formData.get("ownerEmail") || "",
    ownerPhone: formData.get("ownerPhone") || "",
    ref1Name: formData.get("ref1Name") || "",
    ref1Company: formData.get("ref1Company") || "",
    ref1Phone: formData.get("ref1Phone") || "",
    ref1Email: formData.get("ref1Email") || "",
    ref2Name: formData.get("ref2Name") || "",
    ref2Company: formData.get("ref2Company") || "",
    ref2Phone: formData.get("ref2Phone") || "",
    ref2Email: formData.get("ref2Email") || "",
    verificationNotes: formData.get("verificationNotes") || "",
    bankAccountName: formData.get("bankAccountName") || "",
    bankName: formData.get("bankName") || "",
    bankAccountNumber: formData.get("bankAccountNumber") || "",
    bankBranchCode: formData.get("bankBranchCode") || "",
    financialVerificationNotes:
      formData.get("financialVerificationNotes") || "",
  };

  const parsed = updateVendorApplicationSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const {
    applicationId,
    businessName,
    category,
    businessType,
    businessRegistrationNumber,
    taxId,
    yearsInBusiness,
    website,
    businessDescription,
    streetAddress,
    city,
    region,
    postalCode,
    ownerFullName,
    ownerEmail,
    ownerPhone,
    ref1Name,
    ref1Company,
    ref1Phone,
    ref1Email,
    ref2Name,
    ref2Company,
    ref2Phone,
    ref2Email,
    verificationNotes,
    bankAccountName,
    bankName,
    bankAccountNumber,
    bankBranchCode,
    financialVerificationNotes,
  } = parsed.data;

  const { data: application, error: applicationError } = await supabase
    .from("vendor_applications")
    .select("id, status, user_id, documents")
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) {
    return {
      message: applicationError?.message || "Vendor application not found.",
      errors: { ...defaultUpdateVendorApplicationValues },
      values: raw,
      data: {},
    };
  }

  if ((application.status || "").toLowerCase() === "approved") {
    return {
      message: "Approved applications cannot be edited.",
      errors: { applicationId: ["Approved applications cannot be edited."] },
      values: raw,
      data: {},
    };
  }

  const businessReferences = [];
  if (ref1Name || ref1Company || ref1Phone || ref1Email) {
    businessReferences.push({
      name: ref1Name || null,
      company: ref1Company || null,
      phone: ref1Phone || null,
      email: ref1Email || null,
    });
  }
  if (ref2Name || ref2Company || ref2Phone || ref2Email) {
    businessReferences.push({
      name: ref2Name || null,
      company: ref2Company || null,
      phone: ref2Phone || null,
      email: ref2Email || null,
    });
  }

  const existingDocuments = Array.isArray(application.documents)
    ? application.documents
    : [];

  const businessRegistrationFile = formData.get(
    "businessRegistrationCertificate",
  );
  const taxClearanceFile = formData.get("taxClearanceCertificate");
  const ownerIdFile = formData.get("ownerIdDocument");
  const bankStatementFile = formData.get("bankStatement");
  const proofOfAddressFile = formData.get("proofOfBusinessAddress");

  const fileSizeErrors = [];
  const validateFileSize = (file, label) => {
    if (!isFileLike(file)) return;
    if (
      typeof file.size === "number" &&
      file.size > MAX_VENDOR_DOC_FILE_SIZE_BYTES
    ) {
      fileSizeErrors.push(`${label} must be 2MB or less.`);
    }
  };

  validateFileSize(
    businessRegistrationFile,
    "Business Registration Certificate",
  );
  validateFileSize(taxClearanceFile, "Tax Clearance Certificate");
  validateFileSize(ownerIdFile, "Owner ID Card/Passport");
  validateFileSize(bankStatementFile, "Bank Statement (Last 3 Months)");
  validateFileSize(proofOfAddressFile, "Proof of Business Address");

  if (fileSizeErrors.length > 0) {
    return {
      message:
        fileSizeErrors.length === 1
          ? fileSizeErrors[0]
          : "One or more documents exceed the 2MB size limit.",
      errors: { ...defaultUpdateVendorApplicationValues },
      values: raw,
      data: {},
    };
  }

  let businessRegistrationUrl = null;
  let taxClearanceUrl = null;
  let ownerIdUrl = null;
  let bankStatementUrl = null;
  let proofOfAddressUrl = null;

  try {
    const prefix = `vendor-kyc/${application.user_id}`;
    const [brUrl, tcUrl, oiUrl, bsUrl, paUrl] = await Promise.all([
      uploadVendorDocument(
        businessRegistrationFile,
        `${prefix}/business-registration-certificate`,
      ),
      uploadVendorDocument(
        taxClearanceFile,
        `${prefix}/tax-clearance-certificate`,
      ),
      uploadVendorDocument(ownerIdFile, `${prefix}/owner-id-document`),
      uploadVendorDocument(
        bankStatementFile,
        `${prefix}/bank-statement-last-3-months`,
      ),
      uploadVendorDocument(
        proofOfAddressFile,
        `${prefix}/proof-of-business-address`,
      ),
    ]);

    businessRegistrationUrl = brUrl;
    taxClearanceUrl = tcUrl;
    ownerIdUrl = oiUrl;
    bankStatementUrl = bsUrl;
    proofOfAddressUrl = paUrl;
  } catch (error) {
    console.error("Failed to upload vendor KYC documents", error);
    return {
      message: "Failed to upload KYC documents. Please try again.",
      errors: { ...defaultUpdateVendorApplicationValues },
      values: raw,
      data: {},
    };
  }

  const mergeDocument = (docs, title, url) => {
    if (!url) return docs;
    const normalizedTitle = title.toLowerCase();
    const filtered = docs.filter((doc) => {
      const candidate =
        (doc?.title || doc?.label || doc?.name || "").toString().toLowerCase();
      return candidate !== normalizedTitle;
    });
    return [...filtered, { title, url }];
  };

  let documents = existingDocuments;
  documents = mergeDocument(
    documents,
    "Business Registration Certificate",
    businessRegistrationUrl,
  );
  documents = mergeDocument(documents, "Tax Clearance Certificate", taxClearanceUrl);
  documents = mergeDocument(documents, "Owner ID Card/Passport", ownerIdUrl);
  documents = mergeDocument(
    documents,
    "Bank Statement (Last 3 Months)",
    bankStatementUrl,
  );
  documents = mergeDocument(
    documents,
    "Proof of Business Address",
    proofOfAddressUrl,
  );
  const updatePayload = {
    business_name: businessName,
    category,
    business_type: businessType || null,
    business_registration_number: businessRegistrationNumber || null,
    tax_id: taxId || null,
    years_in_business:
      typeof yearsInBusiness === "number" ? yearsInBusiness : null,
    website: website || null,
    business_description: businessDescription || null,
    street_address: streetAddress || null,
    city: city || null,
    region: region || null,
    postal_code: postalCode || null,
    owner_full_name: ownerFullName || null,
    owner_email: ownerEmail || null,
    owner_phone: ownerPhone || null,
    business_references:
      businessReferences.length > 0 ? businessReferences : null,
    documents: documents.length > 0 ? documents : null,
    verification_notes: verificationNotes || null,
    bank_account_name: bankAccountName || null,
    bank_name: bankName || null,
    bank_account_number: bankAccountNumber || null,
    bank_branch_code: bankBranchCode || null,
    financial_verification_notes: financialVerificationNotes || null,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error: updateError } = await supabase
    .from("vendor_applications")
    .update(updatePayload)
    .eq("id", applicationId)
    .select("id, business_name, status")
    .single();

  if (updateError || !updated) {
    return {
      message: updateError?.message || "Failed to update vendor application.",
      errors: { ...defaultUpdateVendorApplicationValues },
      values: raw,
      data: {},
    };
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "updated_vendor_application",
    entity: "vendor_applications",
    targetId: updated.id,
    details: `Updated vendor application ${updated.id} (${businessName})`,
  });

  revalidatePath("/dashboard/admin/vendor_requests");
  revalidatePath("/dashboard/admin");

  return {
    message: "Vendor application updated.",
    errors: {},
    values: {},
    data: { applicationId: updated.id },
  };
}
