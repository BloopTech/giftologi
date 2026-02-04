"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import nodemailer from "nodemailer";
import { render, pretty } from "@react-email/render";
import VendorApplicationSubmittedEmail from "./emails/VendorApplicationSubmittedEmail";
import { createAdminClient, createClient } from "../utils/supabase/server";
import { generateUniqueVendorSlug } from "../utils/vendorSlug";
import { createNotifications, fetchUserIdsByRole } from "../utils/notifications";

import {
  DOCUMENT_TITLE_LOOKUP,
  DOCUMENT_TYPE_VALUES,
  MAX_VENDOR_DOC_FILE_SIZE_BYTES,
  MAX_VENDOR_DOC_FILE_SIZE_MB,
} from "../dashboard/v/profile/documentTypes";

const vendorDocsS3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  region: "auto",
});

const randomObjectName = (bytes = 32) =>
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
    typeof value.arrayBuffer === "function"
  );
};

const cleanValue = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return value;
};

const createRandomColor = () => {
  const colorCharacters = "0123456789ABCDEF";
  let hashColor = "#";
  for (let i = 0; i < 6; i += 1) {
    hashColor += colorCharacters[Math.floor(Math.random() * 16)];
  }
  return hashColor;
};

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
  const html = await pretty(await render(
    <VendorApplicationSubmittedEmail
      vendorName={vendorName}
      applicationId={applicationId}
      trackUrl={`${siteUrl}/dashboard/v/profile`}
    />,
  ));

  await transport.sendMail({
    from: `Giftologi <${fromAddress}>`,
    to,
    subject: "Your vendor application was submitted",
    html,
  });
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
  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;
  return `${normalizedBaseUrl}/${objectKey}`;
}

const buildApplicationFieldsFromDraft = (draft) => {
  const fields = {};
  if (!draft || typeof draft !== "object") return fields;

  const businessName = cleanValue(draft.businessName);
  if (businessName) fields.business_name = businessName;

  const businessType = cleanValue(draft.businessType);
  if (businessType) fields.business_type = businessType;

  const businessRegistrationNumber = cleanValue(draft.businessRegistrationNumber);
  if (businessRegistrationNumber) {
    fields.business_registration_number = businessRegistrationNumber;
  }

  const taxId = cleanValue(draft.taxId);
  if (taxId) fields.tax_id = taxId;

  const yearsInBusinessRaw = cleanValue(
    draft.yearsInBusiness ?? draft.years_in_business,
  );
  if (yearsInBusinessRaw) {
    const parsed = Number(yearsInBusinessRaw);
    if (!Number.isNaN(parsed)) fields.years_in_business = parsed;
  }

  const website = cleanValue(draft.website);
  if (website) fields.website = website;

  const businessDescription = cleanValue(draft.businessDescription);
  if (businessDescription) fields.business_description = businessDescription;

  const streetAddress = cleanValue(draft.address || draft.streetAddress);
  if (streetAddress) fields.street_address = streetAddress;

  const city = cleanValue(draft.city);
  if (city) fields.city = city;

  const region = cleanValue(draft.region);
  if (region) fields.region = region;

  const digitalAddress = cleanValue(
    draft.digitalAddress || draft.zipCode || draft.postalCode,
  );
  if (digitalAddress) fields.digital_address = digitalAddress;

  const firstName = cleanValue(draft.firstName);
  const lastName = cleanValue(draft.lastName);
  const ownerFullName = cleanValue(
    draft.ownerFullName ||
      [firstName, lastName].filter(Boolean).join(" ").trim(),
  );
  if (ownerFullName) fields.owner_full_name = ownerFullName;

  const ownerEmail = cleanValue(draft.email || draft.ownerEmail);
  if (ownerEmail) fields.owner_email = ownerEmail;

  const ownerPhone = cleanValue(draft.phoneNumber || draft.ownerPhone);
  if (ownerPhone) fields.owner_phone = ownerPhone;

  const category =
    Array.isArray(draft.productCategories) && draft.productCategories.length
      ? draft.productCategories
          .map((value) => cleanValue(value))
          .filter(Boolean)
      : [];
  const legacyCategory = cleanValue(draft.category);
  const categoryPayload = category.length
    ? JSON.stringify(category)
    : legacyCategory
      ? JSON.stringify([legacyCategory])
      : null;
  if (categoryPayload) fields.category = categoryPayload;

  const bankAccountName = cleanValue(draft.accountHolderName);
  if (bankAccountName) fields.bank_account_name = bankAccountName;

  const bankName = cleanValue(draft.bankName);
  if (bankName) fields.bank_name = bankName;

  const bankAccountNumber = cleanValue(draft.accountNumber);
  if (bankAccountNumber) fields.bank_account_number = bankAccountNumber;

  const bankBranchCode = cleanValue(draft.routingNumber);
  if (bankBranchCode) fields.bank_branch_code = bankBranchCode;

  const bankBranch = cleanValue(draft.bankBranch);
  if (bankBranch) fields.bank_branch = bankBranch;

  const businessReferences = [];
  const ref1Name = cleanValue(draft.ref1Name);
  const ref1Company = cleanValue(draft.ref1Company);
  const ref1Phone = cleanValue(draft.ref1Phone);
  const ref1Email = cleanValue(draft.ref1Email);
  if (ref1Name || ref1Company || ref1Phone || ref1Email) {
    businessReferences.push({
      name: ref1Name,
      company: ref1Company,
      phone: ref1Phone,
      email: ref1Email,
    });
  }

  const ref2Name = cleanValue(draft.ref2Name);
  const ref2Company = cleanValue(draft.ref2Company);
  const ref2Phone = cleanValue(draft.ref2Phone);
  const ref2Email = cleanValue(draft.ref2Email);
  if (ref2Name || ref2Company || ref2Phone || ref2Email) {
    businessReferences.push({
      name: ref2Name,
      company: ref2Company,
      phone: ref2Phone,
      email: ref2Email,
    });
  }

  if (businessReferences.length > 0) {
    fields.business_references = businessReferences;
  }

  return fields;
};

const defaultSignupValues = {
  firstname: [],
  lastname: [],
  email: [],
  password: [],
};

const defaultLoginValues = {
  email: [],
  password: [],
};

const signupSchema = z.object({
  firstname: z
    .string()
    .trim()
    .min(1, { message: "First Name required" })
    .regex(/^[\p{L}]+(?:-[\p{L}]+)*$/u, {
      message: "First Name should contain only letters and hyphens",
    }),
  lastname: z
    .string()
    .trim()
    .min(1, { message: "Last Name required" })
    .regex(/^[\p{L}]+(?:-[\p{L}]+)*$/u, {
      message: "Last Name should contain only letters and hyphens",
    }),
  email: z.email({ message: "Email required" }),
  password: z
    .string()
    .trim()
    .min(1, { message: "Password required" })
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[^A-Za-z0-9]/, {
      message: "Password must contain at least one special character",
    }),
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Email is invalid" }),
  password: z
    .string()
    .trim()
    .min(1, { message: "Enter Password" })
    .min(8, { message: "Invalid email or password" })
    .regex(/[A-Z]/, {
      message: "Invalid email or password",
    })
    .regex(/[a-z]/, {
      message: "Invalid email or password",
    })
    .regex(/[^A-Za-z0-9]/, {
      message: "Invalid email or password",
    }),
});

const accountSchema = loginSchema.extend({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
});

const draftSchema = z.object({
  draftData: z.record(z.any()).optional(),
  currentStep: z.number().int().min(0).max(10).optional(),
});

const submissionSchema = z.object({
  businessName: z.string().trim().min(1, { message: "Business name is required" }),
  legalBusinessName: z
    .string()
    .trim()
    .min(1, { message: "Legal business name is required" }),
  businessType: z.string().trim().min(1, { message: "Business type is required" }),
  businessRegistrationNumber: z
    .string()
    .trim()
    .min(1, { message: "Business registration number is required" }),
  taxId: z.string().trim().min(1, { message: "Tax ID is required" }),
  website: z.string().trim().min(1, { message: "Website is required" }),
  streetAddress: z.string().trim().min(1, { message: "Street address is required" }),
  city: z.string().trim().min(1, { message: "City is required" }),
  region: z.string().trim().min(1, { message: "Region is required" }),
  digitalAddress: z
    .string()
    .trim()
    .min(1, { message: "Digital address is required" }),
  country: z.string().trim().min(1, { message: "Country is required" }),
  ownerFullName: z.string().trim().min(1, { message: "Owner full name is required" }),
  ownerEmail: z
    .string()
    .trim()
    .min(1, { message: "Owner email is required" })
    .email({ message: "Enter a valid email" }),
  ownerPhone: z.string().trim().min(1, { message: "Owner phone is required" }),
  category: z.string().trim().min(1, { message: "Category is required" }),
  bankAccountName: z
    .string()
    .trim()
    .min(1, { message: "Account name is required" }),
  bankName: z.string().trim().min(1, { message: "Bank name is required" }),
  bankAccountNumber: z
    .string()
    .trim()
    .min(1, { message: "Account number is required" }),
  bankBranch: z.string().trim().min(1, { message: "Bank branch is required" }),
});

const documentUploadSchema = z.object({
  document_type: z
    .string()
    .min(1, "Select a document type.")
    .refine((value) => DOCUMENT_TYPE_VALUES.includes(value), {
      message: "Select a valid document type.",
    }),
});

const ensureVendorRoleEligibility = async ({ userId, email }) => {
  let adminClient = null;
  try {
    adminClient = createAdminClient();
  } catch (err) {
    return {
      success: false,
      message: err?.message || "Server configuration error.",
    };
  }

  const normalized = (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : "";
  const conflictMessage =
    "This email already belongs to a host or admin account. Please use a different email for your vendor application.";

  let profileResponse = null;
  if (userId) {
    profileResponse = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();
  } else if (email) {
    profileResponse = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("email", email)
      .maybeSingle();
  }

  if (profileResponse?.error) {
    return { success: false, message: profileResponse.error.message };
  }

  const profileRole = normalized(profileResponse?.data?.role);

  if (profileRole && profileRole !== "vendor") {
    return { success: false, message: conflictMessage };
  }

  if (!profileResponse?.data?.id && email) {
    const { data: signupProfile, error: signupError } = await adminClient
      .from("signup_profiles")
      .select("role")
      .eq("email", email)
      .maybeSingle();

    if (signupError) {
      return { success: false, message: signupError.message };
    }

    const signupRole = normalized(signupProfile?.role);
    if (signupRole && signupRole !== "vendor") {
      return { success: false, message: conflictMessage };
    }
  }

  return { success: true };
};

const ensureProfileExists = async ({
  userId,
  fallbackEmail,
  fallbackFirstName,
  fallbackLastName,
  fallbackColor,
}) => {
  if (!userId) {
    return { success: false, message: "Unable to resolve user profile." };
  }

  let adminClient = null;
  try {
    adminClient = createAdminClient();
  } catch (err) {
    return {
      success: false,
      message: err?.message || "Server configuration error.",
    };
  }

  const { data: existingProfile, error: existingError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existingError) {
    return { success: false, message: existingError.message };
  }

  if (existingProfile?.id) {
    return { success: true };
  }

  const { data: signupProfile } = await adminClient
    .from("signup_profiles")
    .select(
      "email, firstname, lastname, color, role, image, created_at, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  const fallbackName = fallbackEmail?.split("@")?.[0] || "";
  const profilePayload = {
    id: userId,
    email: cleanValue(signupProfile?.email || fallbackEmail),
    firstname: cleanValue(
      signupProfile?.firstname || fallbackFirstName || fallbackName,
    ),
    lastname: cleanValue(signupProfile?.lastname || fallbackLastName || ""),
    color:
      cleanValue(signupProfile?.color) ||
      cleanValue(fallbackColor) ||
      createRandomColor(),
    role: cleanValue(signupProfile?.role) || "vendor",
    image: cleanValue(signupProfile?.image),
    created_at: signupProfile?.created_at || new Date(),
    updated_at: signupProfile?.updated_at || new Date(),
  };

  const { error: insertError } = await adminClient
    .from("profiles")
    .insert([profilePayload]);

  if (insertError) {
    const insertMessage = insertError.message || "Unable to create profile.";
    const lowerMessage = insertMessage.toLowerCase();
    if (lowerMessage.includes("duplicate") || lowerMessage.includes("exists")) {
      return { success: true };
    }
    return { success: false, message: insertMessage };
  }

  return { success: true };
};

export async function vendorSignup(prevState, queryData) {
  const supabase = await createClient();

  const getFirstName = queryData.get("firstname");
  const getLastName = queryData.get("lastname");
  const getBusinessEmail = queryData.get("email");
  const getPassword = queryData.get("password");

  const validatedFields = signupSchema.safeParse({
    firstname: getFirstName,
    lastname: getLastName,
    email: getBusinessEmail,
    password: getPassword,
  });

  if (!validatedFields?.success) {
    return {
      message: validatedFields?.error?.issues[0]?.message,
      errors: validatedFields.error.flatten().fieldErrors,
      values: {
        firstname: getFirstName,
        lastname: getLastName,
        email: getBusinessEmail,
        password: getPassword,
      },
      data: {},
    };
  }

  const { firstname, lastname, email, password } = validatedFields.data;
  let colorCharacters = "0123456789ABCDEF";
  let hashColor = "#";

  for (let i = 0; i < 6; i++) {
    hashColor += colorCharacters[Math.floor(Math.random() * 16)];
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profile) {
    return {
      message: "Email already exists",
      errors: {
        ...defaultSignupValues,
        credentials: "Email already exists",
      },
      values: {
        firstname: getFirstName,
        lastname: getLastName,
        email: getBusinessEmail,
        password: getPassword,
      },
      data: {},
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    const message = error.message || "Signup failed";
    const lower = message.toLowerCase();
    const isAlreadyRegistered =
      lower.includes("already registered") || lower.includes("already exists");

    if (isAlreadyRegistered) {
      return {
        message:
          "This email already exists. Please check your inbox to confirm or log in.",
        errors: {},
        values: {
          firstname: getFirstName,
          lastname: getLastName,
          email: getBusinessEmail,
          password: getPassword,
        },
        data: {
          email: getBusinessEmail,
          resent: false,
        },
      };
    }

    return {
      message,
      errors: {
        ...defaultSignupValues,
        credentials: message,
      },
      values: {
        firstname: getFirstName,
        lastname: getLastName,
        email: getBusinessEmail,
        password: getPassword,
      },
      data: {},
    };
  }

  if (data?.user?.id) {
    await supabase.from("signup_profiles").upsert(
      [
        {
          user_id: data.user.id,
          email,
          firstname,
          lastname,
          color: hashColor,
          role: "vendor",
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      { onConflict: "user_id" },
    );

    const profileResponse = await ensureProfileExists({
      userId: data.user.id,
      fallbackEmail: email,
      fallbackFirstName: firstname,
      fallbackLastName: lastname,
      fallbackColor: hashColor,
    });

    if (!profileResponse?.success) {
      return {
        success: false,
        message: profileResponse?.message || "Unable to create your profile.",
        errors: {},
        data: { email },
      };
    }
  }

  return {
    message: "Check your email for a confirmation link.",
    errors: {},
    data: {
      email: getBusinessEmail,
    },
    values: {},
  };
}

export async function vendorLogin(prevState, queryData) {
  const supabase = await createClient();

  const getBusinessEmail = queryData.get("email");
  const getPassword = queryData.get("password");

  const validatedFields = loginSchema.safeParse({
    email: getBusinessEmail,
    password: getPassword,
  });

  if (!validatedFields.success) {
    return {
      message: validatedFields?.error?.issues[0]?.message,
      errors: validatedFields.error.flatten().fieldErrors,
      values: {
        email: getBusinessEmail,
        password: getPassword,
      },
      data: {},
    };
  }

  const { email, password } = validatedFields.data;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const message = error.message || "Invalid email or password";
    const lower = message.toLowerCase();
    const looksUnconfirmed =
      lower.includes("not confirmed") || lower.includes("confirm your email");

    if (looksUnconfirmed) {
      const resendMessage =
        "Your email is not confirmed. Please check your inbox or use Forgot Password to resend.";

      return {
        message: resendMessage,
        errors: {
          ...defaultLoginValues,
          credentials: resendMessage,
        },
        values: {
          email: getBusinessEmail,
          password: getPassword,
        },
        data: {
          email: getBusinessEmail,
          resent: false,
        },
      };
    }

    return {
      message,
      errors: {
        ...defaultLoginValues,
        credentials: message,
      },
      values: {
        email: getBusinessEmail,
        password: getPassword,
      },
      data: {},
    };
  }

  return {
    message: "Login successful",
    errors: {},
    data: data?.user,
    key: data?.session,
    status_code: 200,
    email: getBusinessEmail,
    values: {},
  };
}

export async function ensureVendorAccount(payload) {
  const supabase = await createClient();
  const parsed = accountSchema.safeParse(payload || {});

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues?.[0]?.message || "Invalid account details.",
      errors: parsed.error.flatten().fieldErrors,
      data: {},
    };
  }

  const { email, password, firstName, lastName } = parsed.data;

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (!signInError) {
    const eligibility = await ensureVendorRoleEligibility({
      userId: signInData?.user?.id,
      email,
    });

    if (!eligibility?.success) {
      return {
        success: false,
        message:
          eligibility?.message ||
          "This email cannot be used for the vendor application.",
        errors: { email: [eligibility?.message].filter(Boolean) },
        data: { email },
      };
    }

    const profileResponse = await ensureProfileExists({
      userId: signInData?.user?.id,
      fallbackEmail: email,
      fallbackFirstName: firstName,
      fallbackLastName: lastName,
    });

    if (!profileResponse?.success) {
      return {
        success: false,
        message: profileResponse?.message || "Unable to create your profile.",
        errors: {},
        data: { email },
      };
    }

    return {
      success: true,
      message: "Account signed in.",
      data: {
        email,
        mode: "login",
        loggedIn: Boolean(signInData?.session),
      },
    };
  }

  const signInMessage = signInError?.message || "Unable to sign in.";
  const signInLower = signInMessage.toLowerCase();
  const isUnconfirmed =
    signInLower.includes("not confirmed") || signInLower.includes("confirm");

  if (isUnconfirmed) {
    return {
      success: false,
      message:
        "Your email is not confirmed yet. Please check your inbox and confirm to continue.",
      errors: {},
      data: { email },
    };
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    const signUpMessage = signUpError.message || "Signup failed";
    const signUpLower = signUpMessage.toLowerCase();
    const isAlreadyRegistered =
      signUpLower.includes("already registered") ||
      signUpLower.includes("already exists");

    return {
      success: false,
      message: isAlreadyRegistered
        ? "This email already exists. Use the correct password or reset it to continue."
        : signUpMessage,
      errors: {
        email: isAlreadyRegistered ? [signUpMessage] : [],
        password: isAlreadyRegistered ? ["Invalid password."] : [],
      },
      data: { email },
    };
  }

  const userId = signUpData?.user?.id;
  if (userId) {
    const hashColor = createRandomColor();
    const fallbackName = email?.split("@")[0] || "";
    const vendorFirst = firstName?.trim() || fallbackName;
    const vendorLast = lastName?.trim() || "";

    await supabase.from("signup_profiles").upsert(
      [
        {
          user_id: userId,
          email,
          firstname: vendorFirst,
          lastname: vendorLast,
          color: hashColor,
          role: "vendor",
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      { onConflict: "user_id" },
    );

    const profileResponse = await ensureProfileExists({
      userId,
      fallbackEmail: email,
      fallbackFirstName: vendorFirst,
      fallbackLastName: vendorLast,
      fallbackColor: hashColor,
    });

    if (!profileResponse?.success) {
      return {
        success: false,
        message: profileResponse?.message || "Unable to create your profile.",
        errors: {},
        data: { email },
      };
    }
  }

  let loggedIn = Boolean(signUpData?.session);

  if (!loggedIn) {
    const { data: loginData, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (!loginError) {
      loggedIn = Boolean(loginData?.session);
    }
  }

  return {
    success: true,
    message: loggedIn
      ? "Account created and signed in."
      : "Account created. Please confirm your email to continue.",
    data: {
      email,
      mode: "signup",
      loggedIn,
    },
  };
}

export async function fetchVendorApplicationDraft() {
  try {
    const supabase = await createClient();
    const authResponse = await supabase.auth.getUser();
    const user = authResponse?.data?.user || null;

    if (authResponse?.error || !user) {
      return {
        success: false,
        message:
          authResponse?.error?.message ||
          "You must be logged in to resume your application.",
        data: null,
      };
    }

    const { data: application, error } = await supabase
      .from("vendor_applications")
      .select(
        "id, status, reason, draft_data, current_step, documents, submitted_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        message: error.message || "Unable to load your application.",
        data: null,
      };
    }

    if (!application?.id) {
      return {
        success: true,
        message: "No draft found.",
        data: null,
      };
    }

    return {
      success: true,
      message: "Draft loaded.",
      data: {
        id: application.id,
        status: application.status,
        draftData: application.draft_data || {},
        currentStep: application.current_step ?? 0,
        documents: Array.isArray(application.documents)
          ? application.documents
          : [],
        rejectionReason: application.reason || "",
        submittedAt: application.submitted_at,
      },
    };
  } catch (error) {
    console.error("fetchVendorApplicationDraft error", error);
    return {
      success: false,
      message: "An unexpected response was received from the server.",
      data: null,
    };
  }
}

export async function saveVendorApplicationDraft(payload) {
  try {
    const supabase = await createClient();
    const authResponse = await supabase.auth.getUser();
    const user = authResponse?.data?.user || null;

    if (authResponse?.error || !user) {
      return {
        success: false,
        message:
          authResponse?.error?.message ||
          "You must be logged in to save your application.",
        data: null,
      };
    }

    // Defensive: ensure payload is a plain object before parsing
    const safePayload =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? { ...payload }
        : {};

    // Manual validation instead of Zod to avoid v4 internal issues
    const draftData =
      safePayload.draftData && typeof safePayload.draftData === "object"
        ? safePayload.draftData
        : {};
    const currentStep =
      typeof safePayload.currentStep === "number" &&
      Number.isInteger(safePayload.currentStep) &&
      safePayload.currentStep >= 0 &&
      safePayload.currentStep <= 10
        ? safePayload.currentStep
        : undefined;

    const { data: existing, error: existingError } = await supabase
      .from("vendor_applications")
      .select("id, status, draft_data, current_step")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return {
        success: false,
        message: existingError.message || "Failed to load your application.",
        data: null,
      };
    }

    if (existing?.status && ["pending", "approved"].includes(existing.status)) {
      return {
        success: false,
        message: "Submitted applications can no longer be edited.",
        data: null,
      };
    }

    const mergedDraft = {
      ...(existing?.draft_data || {}),
      ...(draftData || {}),
    };

    const applicationFields = buildApplicationFieldsFromDraft(mergedDraft);
    const nextStep =
      typeof currentStep === "number"
        ? currentStep
        : existing?.current_step ?? 0;
    const now = new Date().toISOString();

    if (existing?.id) {
      const updatePayload = {
        draft_data: mergedDraft,
        current_step: nextStep,
        last_saved_at: now,
        updated_at: now,
        status: "draft",
        ...applicationFields,
      };

      const { error: updateError } = await supabase
        .from("vendor_applications")
        .update(updatePayload)
        .eq("id", existing.id)
        .eq("user_id", user.id);

      if (updateError) {
        return {
          success: false,
          message: updateError.message || "Failed to save your draft.",
          data: null,
        };
      }

      revalidatePath("/vendor");

      return {
        success: true,
        message: "Draft saved.",
        data: {
          applicationId: existing.id,
          currentStep: nextStep,
        },
      };
    }

    const insertPayload = {
      user_id: user.id,
      status: "draft",
      created_by: user.id,
      draft_data: mergedDraft,
      current_step: nextStep,
      last_saved_at: now,
      updated_at: now,
      ...applicationFields,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("vendor_applications")
      .insert([insertPayload])
      .select("id")
      .single();

    if (insertError || !inserted) {
      return {
        success: false,
        message: insertError?.message || "Failed to save your draft.",
        data: null,
      };
    }

    revalidatePath("/vendor");

    return {
      success: true,
      message: "Draft saved.",
      data: {
        applicationId: inserted.id,
        currentStep: nextStep,
      },
    };
  } catch (error) {
    console.error("saveVendorApplicationDraft error", error);
    return {
      success: false,
      message: "An unexpected response was received from the server.",
      data: null,
    };
  }
}

export async function uploadVendorApplicationDocument(prevState, formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let actingClient = supabase;

  let userId = user?.id || null;

  if (!userId) {
    let adminClient = null;
    try {
      adminClient = createAdminClient();
    } catch (err) {
      return {
        success: false,
        message: err?.message || "Unable to verify your account right now.",
        errors: {},
      };
    }

    actingClient = adminClient;

    const fallbackEmail = cleanValue(
      formData.get("email") ||
        formData.get("ownerEmail") ||
        draftData?.email ||
        draftData?.ownerEmail,
    );

    if (!fallbackEmail) {
      return {
        success: false,
        message: "An email address is required to upload documents.",
        errors: {},
      };
    }

    const eligibility = await ensureVendorRoleEligibility({ email: fallbackEmail });
    if (!eligibility?.success) {
      return {
        success: false,
        message:
          eligibility?.message ||
          "This email cannot be used for the vendor application.",
        errors: {},
      };
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", fallbackEmail)
      .maybeSingle();

    if (profileError) {
      return {
        success: false,
        message: profileError.message || "Unable to verify your account.",
        errors: {},
      };
    }

    if (profile?.id) {
      userId = profile.id;
    } else {
      const { data: signupProfile, error: signupError } = await adminClient
        .from("signup_profiles")
        .select("user_id")
        .eq("email", fallbackEmail)
        .maybeSingle();

      if (signupError) {
        return {
          success: false,
          message: signupError.message || "Unable to verify your account.",
          errors: {},
        };
      }

      userId = signupProfile?.user_id || null;
    }

    if (!userId) {
      return {
        success: false,
        message:
          "We couldn't find your account. Please confirm your email or sign in to upload documents.",
        errors: {},
      };
    }
  }

  const raw = { document_type: formData.get("document_type") || "" };
  const validation = documentUploadSchema.safeParse(raw);

  if (!validation.success) {
    return {
      success: false,
      message:
        validation.error.issues?.[0]?.message || "Select a valid document type.",
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

  const { data: applicationRecord, error: applicationError } = await actingClient
    .from("vendor_applications")
    .select("id, status, documents")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let resolvedApplication = applicationRecord;
  if (applicationError) {
    return {
      success: false,
      message: applicationError?.message || "Vendor application not found.",
      errors: {},
    };
  }

  if (!resolvedApplication?.id) {
    const currentStepRaw = formData.get("current_step");

    const parsedStep = Number(currentStepRaw);
    const currentStep = Number.isNaN(parsedStep) ? 0 : parsedStep;
    const now = new Date().toISOString();
    const applicationFields = buildApplicationFieldsFromDraft(draftData || {});

    const insertPayload = {
      user_id: userId,
      status: "draft",
      created_by: userId,
      draft_data: draftData || {},
      current_step: currentStep,
      last_saved_at: now,
      updated_at: now,
      ...applicationFields,
    };

    const { data: inserted, error: insertError } = await actingClient
      .from("vendor_applications")
      .insert([insertPayload])
      .select("id, status, documents")
      .single();

    if (insertError || !inserted) {
      return {
        success: false,
        message: insertError?.message || "Unable to create your application draft.",
        errors: {},
      };
    }

    resolvedApplication = inserted;
  }

  if (
    resolvedApplication.status &&
    ["pending", "approved"].includes(resolvedApplication.status)
  ) {
    return {
      success: false,
      message: "Submitted applications cannot be modified.",
      errors: {},
    };
  }

  const prefix = `vendor-kyc/${userId}/${documentType}`;

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
  const documents = Array.isArray(resolvedApplication.documents)
    ? resolvedApplication.documents
    : [];

  const normalizedTitle = title.toLowerCase();
  const filtered = documents.filter((doc) => {
    const candidate = (doc?.title || doc?.label || doc?.name || "")
      .toString()
      .toLowerCase();
    return candidate !== normalizedTitle;
  });
  const nextDocuments = [...filtered, { title, url: documentUrl }];

  const { error: updateError } = await actingClient
    .from("vendor_applications")
    .update({ documents: nextDocuments, updated_at: new Date().toISOString() })
    .eq("id", resolvedApplication.id)
    .eq("user_id", userId);

  if (updateError) {
    return {
      success: false,
      message: updateError.message || "Failed to save document.",
      errors: {},
    };
  }

  revalidatePath("/vendor");

  return {
    success: true,
    message: `${title} uploaded successfully.`,
    errors: {},
    data: { documents: nextDocuments },
  };
}

export async function submitVendorApplication(payload) {
  const supabase = await createClient();
  let adminClient = null;
  try {
    adminClient = createAdminClient();
  } catch (error) {
    adminClient = null;
  }

  let actingClient = supabase;
  let userId = null;
  let userEmail = null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    userId = user.id;
    userEmail = user.email;
  } else {
    let adminClient = null;
    try {
      adminClient = createAdminClient();
    } catch (err) {
      return {
        success: false,
        message: err?.message || "Unable to verify your account right now.",
        data: null,
      };
    }

    actingClient = adminClient;

    const fallbackEmail = cleanValue(
      payload?.draftData?.email || payload?.draftData?.ownerEmail,
    );

    if (!fallbackEmail) {
      return {
        success: false,
        message: "An email address is required to submit your application.",
        data: null,
      };
    }

    const eligibility = await ensureVendorRoleEligibility({ email: fallbackEmail });
    if (!eligibility?.success) {
      return {
        success: false,
        message:
          eligibility?.message ||
          "This email cannot be used for the vendor application.",
        data: null,
      };
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, email")
      .eq("email", fallbackEmail)
      .maybeSingle();

    if (profileError) {
      return {
        success: false,
        message: profileError.message || "Unable to verify your account.",
        data: null,
      };
    }

    if (profile?.id) {
      userId = profile.id;
      userEmail = profile.email || fallbackEmail;
    } else {
      const { data: signupProfile, error: signupError } = await adminClient
        .from("signup_profiles")
        .select("user_id, email")
        .eq("email", fallbackEmail)
        .maybeSingle();

      if (signupError) {
        return {
          success: false,
          message: signupError.message || "Unable to verify your account.",
          data: null,
        };
      }

      userId = signupProfile?.user_id || null;
      userEmail = signupProfile?.email || fallbackEmail;
    }

    if (!userId) {
      return {
        success: false,
        message:
          "We couldn't find your account. Please confirm your email or sign in to submit.",
        data: null,
      };
    }
  }

  const { data: existing, error: existingError } = await actingClient
    .from("vendor_applications")
    .select(
      "id, status, draft_data, current_step, documents, bank_account_number, bank_account_masked, bank_account_last4, bank_account_token",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return {
      success: false,
      message: existingError.message || "Unable to load your application.",
      data: null,
    };
  }

  if (existing?.status && ["pending", "approved"].includes(existing.status)) {
    return {
      success: false,
      message: "Your application has already been submitted.",
      data: null,
    };
  }

  const mergedDraft = {
    ...(existing?.draft_data || {}),
    ...(payload?.draftData || {}),
  };

  const normalizeString = (value) => cleanValue(value) || "";
  const ownerFullName =
    normalizeString(mergedDraft.ownerFullName) ||
    [
      normalizeString(mergedDraft.firstName),
      normalizeString(mergedDraft.lastName),
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
  const categorySelection =
    Array.isArray(mergedDraft.productCategories) && mergedDraft.productCategories.length
      ? mergedDraft.productCategories
          .map((value) => normalizeString(value))
          .filter(Boolean)
      : [];
  const category = categorySelection.length
    ? categorySelection[0]
    : normalizeString(mergedDraft.category);

  const validation = submissionSchema.safeParse({
    businessName: normalizeString(mergedDraft.businessName),
    legalBusinessName: normalizeString(mergedDraft.legalBusinessName),
    businessType: normalizeString(mergedDraft.businessType),
    businessRegistrationNumber: normalizeString(
      mergedDraft.businessRegistrationNumber,
    ),
    taxId: normalizeString(mergedDraft.taxId),
    website: normalizeString(mergedDraft.website),
    streetAddress: normalizeString(
      mergedDraft.address || mergedDraft.streetAddress,
    ),
    city: normalizeString(mergedDraft.city),
    region: normalizeString(mergedDraft.region),
    digitalAddress: normalizeString(
      mergedDraft.digitalAddress || mergedDraft.zipCode || mergedDraft.postalCode,
    ),
    country: normalizeString(mergedDraft.country),
    ownerFullName,
    ownerEmail: normalizeString(mergedDraft.ownerEmail || mergedDraft.email),
    ownerPhone: normalizeString(mergedDraft.ownerPhone || mergedDraft.phoneNumber),
    category,
    bankAccountName: normalizeString(mergedDraft.accountHolderName),
    bankName: normalizeString(mergedDraft.bankName),
    bankAccountNumber: normalizeString(mergedDraft.accountNumber),
    bankBranch: normalizeString(mergedDraft.bankBranch),
  });

  if (!validation.success) {
    return {
      success: false,
      message: validation.error.issues?.[0]?.message || "Missing required fields.",
      data: null,
    };
  }

  const now = new Date().toISOString();
  const applicationFields = buildApplicationFieldsFromDraft(mergedDraft);

  const rawBankAccount =
    cleanValue(applicationFields.bank_account_number) ||
    cleanValue(mergedDraft.accountNumber) ||
    cleanValue(existing?.bank_account_number);
  const normalizedBankAccount =
    typeof rawBankAccount === "string" ? rawBankAccount.trim() : rawBankAccount;
  const bankAccountDigits =
    typeof normalizedBankAccount === "string"
      ? normalizedBankAccount.replace(/\D/g, "")
      : "";
  const computedLast4 = bankAccountDigits ? bankAccountDigits.slice(-4) : null;
  const bankAccountLast4 = existing?.bank_account_last4 || computedLast4 || null;
  const bankAccountMasked =
    existing?.bank_account_masked ||
    (bankAccountLast4 ? `****${bankAccountLast4}` : null);
  let bankAccountToken = existing?.bank_account_token || null;

  if (!bankAccountToken && normalizedBankAccount) {
    const uniqueSecretName = `vendor_payment_${userId}_${Date.now()}`;
    const { data: secretId, error: secretError } = await actingClient.rpc(
      "create_payment_secret",
      {
        raw_value: normalizedBankAccount,
        secret_name: uniqueSecretName,
        secret_description: `Bank account for vendor ${userId}`,
      },
    );

    if (secretError) {
      return {
        success: false,
        message:
          secretError.message || "Failed to secure bank account details.",
        data: null,
      };
    }

    bankAccountToken = secretId || null;
  }

  const bankAccountFields = {
    bank_account_masked: bankAccountMasked,
    bank_account_last4: bankAccountLast4,
    bank_account_token: bankAccountToken,
  };

  const notifyAdmins = async (applicationId, vendorName) => {
    if (!adminClient || !applicationId) return;
    const { data: adminIds } = await fetchUserIdsByRole({
      client: adminClient,
      roles: ["super_admin", "operations_manager_admin"],
    });
    if (!adminIds.length) return;

    await createNotifications({
      client: adminClient,
      userIds: adminIds,
      type: "vendor_application",
      message: `New vendor application submitted${
        vendorName ? `: ${vendorName}` : "."
      }`,
      link: "/dashboard/admin/vendor_requests",
      data: {
        application_id: applicationId,
      },
    });
  };

  const syncVendorProfile = async () => {
    const { data: existingVendor, error: vendorError } = await actingClient
      .from("vendors")
      .select("id, verified")
      .eq("profiles_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (vendorError) {
      return {
        error: vendorError.message || "Failed to load vendor profile.",
      };
    }

    const vendorPayload = {
      business_name: applicationFields.business_name || null,
      category: applicationFields.category || null,
      description: applicationFields.business_description || null,
      legal_name:
        cleanValue(mergedDraft.legalBusinessName) ||
        applicationFields.business_name ||
        null,
      email: applicationFields.owner_email || userEmail || null,
      phone: applicationFields.owner_phone || null,
      website: applicationFields.website || null,
      tax_id: applicationFields.tax_id || null,
      address_street: applicationFields.street_address || null,
      address_city: applicationFields.city || null,
      address_state: applicationFields.region || null,
      digital_address: applicationFields.digital_address || null,
      address_country: cleanValue(mergedDraft.country) || null,
      business_type: applicationFields.business_type || null,
      business_registration_number:
        applicationFields.business_registration_number || null,
      updated_at: now,
    };

    const vendorSlugSource =
      vendorPayload.business_name ||
      cleanValue(mergedDraft.businessName) ||
      userEmail ||
      "vendor";

    let vendorId = existingVendor?.id || null;

    if (!vendorId) {
      const vendorSlug = await generateUniqueVendorSlug(actingClient, vendorSlugSource);
      const { data: insertedVendor, error: insertError } = await actingClient
        .from("vendors")
        .insert([
          {
            profiles_id: userId,
            created_by: userId,
            created_at: now,
            verified: false,
            slug: vendorSlug,
            ...vendorPayload,
          },
        ])
        .select("id")
        .single();

      if (insertError || !insertedVendor) {
        return {
          error: insertError?.message || "Failed to create vendor profile.",
        };
      }

      vendorId = insertedVendor.id;
    } else if (!existingVendor?.verified) {
      const vendorSlug = await generateUniqueVendorSlug(actingClient, vendorSlugSource, {
        excludeVendorId: vendorId,
      });
      const { error: updateError } = await actingClient
        .from("vendors")
        .update({ ...vendorPayload, slug: vendorSlug })
        .eq("id", vendorId)
        .eq("profiles_id", userId);

      if (updateError) {
        return {
          error: updateError.message || "Failed to update vendor profile.",
        };
      }
    }

    if (!vendorId) {
      return { error: "Unable to resolve vendor profile." };
    }

    const routingNumber =
      cleanValue(mergedDraft.routingNumber) ||
      cleanValue(applicationFields.bank_branch_code);

    const paymentInfoPayload = {
      account_name: applicationFields.bank_account_name || null,
      bank_name: applicationFields.bank_name || null,
      bank_branch: applicationFields.bank_branch || null,
      bank_branch_code: routingNumber || null,
      routing_number: routingNumber || null,
      account_type: cleanValue(mergedDraft.accountType) || null,
      bank_account_masked: bankAccountMasked || null,
      bank_account_last4: bankAccountLast4 || null,
      bank_account_token: bankAccountToken || null,
      bank_account: bankAccountMasked || null,
    };

    const hasPaymentInfoUpdates = Object.values(paymentInfoPayload).some(
      (value) => value,
    );

    if (!hasPaymentInfoUpdates) {
      return { vendorId, paymentInfoId: null, error: null };
    }

    const { data: existingPaymentInfo, error: existingPaymentError } =
      await actingClient
        .from("payment_info")
        .select("id")
        .eq("vendor_id", vendorId)
        .maybeSingle();

    if (existingPaymentError) {
      return {
        vendorId,
        error:
          existingPaymentError.message || "Failed to load payment information.",
      };
    }

    if (existingPaymentInfo?.id) {
      const { error: paymentUpdateError } = await actingClient
        .from("payment_info")
        .update({ ...paymentInfoPayload, updated_at: now })
        .eq("id", existingPaymentInfo.id)
        .eq("vendor_id", vendorId);

      if (paymentUpdateError) {
        return {
          vendorId,
          error:
            paymentUpdateError.message || "Failed to update payment information.",
        };
      }

      return {
        vendorId,
        paymentInfoId: existingPaymentInfo.id,
        error: null,
      };
    }

    const { data: insertedPayment, error: paymentInsertError } =
      await actingClient
        .from("payment_info")
        .insert({
          ...paymentInfoPayload,
          vendor_id: vendorId,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();

    if (paymentInsertError || !insertedPayment) {
      return {
        vendorId,
        error:
          paymentInsertError?.message || "Failed to create payment information.",
      };
    }

    return {
      vendorId,
      paymentInfoId: insertedPayment.id,
      error: null,
    };
  };

  if (existing?.id) {
    const updatePayload = {
      status: "pending",
      submitted_at: now,
      updated_at: now,
      draft_data: mergedDraft,
      current_step:
        typeof payload?.currentStep === "number"
          ? payload.currentStep
          : existing.current_step ?? 0,
      ...applicationFields,
      ...bankAccountFields,
    };

    const { data: updated, error: updateError } = await actingClient
      .from("vendor_applications")
      .update(updatePayload)
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select("id")
      .single();

    if (updateError || !updated) {
      return {
        success: false,
        message: updateError?.message || "Failed to submit application.",
        data: null,
      };
    }

    const syncResult = await syncVendorProfile();
    if (syncResult?.error) {
      console.error("Vendor profile sync failed", syncResult.error);
    }

    try {
      await sendVendorApplicationSubmittedEmail({
        to: mergedDraft.email || userEmail,
        applicationId: updated.id,
        vendorName: mergedDraft.businessName || mergedDraft.legalBusinessName,
      });
    } catch (emailError) {
      console.error("Failed to send vendor submission email", emailError);
    }

    revalidatePath("/vendor");

    try {
      await notifyAdmins(updated.id, applicationFields?.business_name);
    } catch (error) {
      console.error("Failed to notify admins about vendor submission", error);
    }

    return {
      success: true,
      message: syncResult?.error
        ? "Application submitted, but we couldn't finish setting up your vendor profile yet."
        : "Application submitted successfully.",
      data: { applicationId: updated.id },
    };
  } else {
    const insertPayload = {
      user_id: userId,
      status: "pending",
      created_by: userId,
      submitted_at: now,
      updated_at: now,
      draft_data: mergedDraft,
      current_step: typeof payload?.currentStep === "number" ? payload.currentStep : 0,
      documents: Array.isArray(payload?.documents) ? payload.documents : null,
      ...applicationFields,
      ...bankAccountFields,
    };

    const { data: inserted, error: insertError } = await actingClient
      .from("vendor_applications")
      .insert([insertPayload])
      .select("id")
      .single();

    if (insertError || !inserted) {
      return {
        success: false,
        message: insertError?.message || "Failed to submit application.",
        data: null,
      };
    }

    const syncResult = await syncVendorProfile();
    if (syncResult?.error) {
      console.error("Vendor profile sync failed", syncResult.error);
    }

    try {
      await sendVendorApplicationSubmittedEmail({
        to: mergedDraft.email || userEmail,
        applicationId: inserted.id,
        vendorName: mergedDraft.businessName || mergedDraft.legalBusinessName,
      });
    } catch (emailError) {
      console.error("Failed to send vendor submission email", emailError);
    }

    revalidatePath("/vendor");

    try {
      await notifyAdmins(inserted.id, applicationFields?.business_name);
    } catch (error) {
      console.error("Failed to notify admins about vendor submission", error);
    }

    return {
      success: true,
      message: syncResult?.error
        ? "Application submitted, but we couldn't finish setting up your vendor profile yet."
        : "Application submitted successfully.",
      data: { applicationId: inserted.id },
    };
  }
}