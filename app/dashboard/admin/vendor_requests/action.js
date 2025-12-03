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
  if (!name || name.toLowerCase() === "undefined" || name.toLowerCase() === "null") {
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
  applicationId: z.string().uuid({ message: "Invalid vendor request" }),
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

  revalidatePath("/dashboard/admin/vendor_requests");
  revalidatePath("/dashboard/admin");

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

  revalidatePath("/dashboard/admin/vendor_requests");
  revalidatePath("/dashboard/admin");

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
  applicationId: z.string().uuid({ message: "Invalid vendor request" }),
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

  revalidatePath("/dashboard/admin/vendor_requests");
  revalidatePath("/dashboard/admin");

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
};

const createVendorApplicationSchema = z.object({
  vendorUserId: z.string().uuid({ message: "Select a vendor" }),
  businessName: z
    .string()
    .trim()
    .min(1, { message: "Business name is required" }),
  category: z
    .string()
    .trim()
    .min(1, { message: "Category is required" }),
  businessType: z.string().trim().optional().or(z.literal("")),
  businessRegistrationNumber: z.string().trim().optional().or(z.literal("")),
  taxId: z.string().trim().optional().or(z.literal("")),
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
      { message: "Years in business must be a non-negative number" }
    ),
  website: z.string().trim().optional().or(z.literal("")),
  businessDescription: z.string().trim().optional().or(z.literal("")),
  streetAddress: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  region: z.string().trim().optional().or(z.literal("")),
  postalCode: z.string().trim().optional().or(z.literal("")),
  ownerFullName: z.string().trim().optional().or(z.literal("")),
  ownerEmail: z.string().trim().optional().or(z.literal("")),
  ownerPhone: z.string().trim().optional().or(z.literal("")),
  ref1Name: z.string().trim().optional().or(z.literal("")),
  ref1Company: z.string().trim().optional().or(z.literal("")),
  ref1Phone: z.string().trim().optional().or(z.literal("")),
  ref1Email: z.string().trim().optional().or(z.literal("")),
  ref2Name: z.string().trim().optional().or(z.literal("")),
  ref2Company: z.string().trim().optional().or(z.literal("")),
  ref2Phone: z.string().trim().optional().or(z.literal("")),
  ref2Email: z.string().trim().optional().or(z.literal("")),
  verificationNotes: z.string().trim().optional().or(z.literal("")),
  bankAccountName: z.string().trim().optional().or(z.literal("")),
  bankName: z.string().trim().optional().or(z.literal("")),
  bankAccountNumber: z.string().trim().optional().or(z.literal("")),
  bankBranchCode: z.string().trim().optional().or(z.literal("")),
  financialVerificationNotes: z.string().trim().optional().or(z.literal("")),
});

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

  const raw = {
    vendorUserId: formData.get("vendorUserId"),
    businessName: formData.get("businessName"),
    category: formData.get("category"),
    businessType: formData.get("businessType") || "",
    businessRegistrationNumber: formData.get("businessRegistrationNumber") || "",
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
    financialVerificationNotes: formData.get("financialVerificationNotes") || "",
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
    "businessRegistrationCertificate"
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
    "Business Registration Certificate"
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
        `${prefix}/business-registration-certificate`
      ),
      uploadVendorDocument(
        taxClearanceFile,
        `${prefix}/tax-clearance-certificate`
      ),
      uploadVendorDocument(
        ownerIdFile,
        `${prefix}/owner-id-document`
      ),
      uploadVendorDocument(
        bankStatementFile,
        `${prefix}/bank-statement-last-3-months`
      ),
      uploadVendorDocument(
        proofOfAddressFile,
        `${prefix}/proof-of-business-address`
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

  const documents = [];

  if (businessRegistrationUrl) {
    documents.push({
      title: "Business Registration Certificate",
      url: businessRegistrationUrl,
    });
  }

  if (taxClearanceUrl) {
    documents.push({
      title: "Tax Clearance Certificate",
      url: taxClearanceUrl,
    });
  }

  if (ownerIdUrl) {
    documents.push({
      title: "Owner ID Card/Passport",
      url: ownerIdUrl,
    });
  }

  if (bankStatementUrl) {
    documents.push({
      title: "Bank Statement (Last 3 Months)",
      url: bankStatementUrl,
    });
  }

  if (proofOfAddressUrl) {
    documents.push({
      title: "Proof of Business Address",
      url: proofOfAddressUrl,
    });
  }

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

  revalidatePath("/dashboard/admin/vendor_requests");
  revalidatePath("/dashboard/admin");

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

  return {
    message: "Vendor application created.",
    errors: {},
    values: {},
    data: { applicationId: application.id },
  };
}
