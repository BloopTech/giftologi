"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../utils/supabase/server";
import { logAdminActivityWithClient } from "./activity_log/logger";
import { generateUniqueVendorSlug } from "../../utils/vendorSlug";

const defaultManageRolesValues = {
  email: [],
  password: [],
  fullName: [],
  role: [],
  phone: [],
};

const manageRolesSchema = z.object({
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
  fullName: z.string().trim().min(1, { message: "Full name is required" }),
  role: z.string().trim().min(1, { message: "Role is required" }),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
});

const defaultUpdateStaffValues = {
  staffId: [],
  fullName: [],
  role: [],
  phone: [],
};

const updateStaffDetailsSchema = z.object({
  staffId: z
    .string()
    .uuid({ message: "Invalid staff member" }),
  fullName: z
    .string()
    .trim()
    .min(1, { message: "Full name is required" }),
  role: z.string().trim().min(1, { message: "Role is required" }),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
});

const defaultUpdateStaffStatusValues = {
  staffId: [],
  mode: [],
  confirmText: [],
};

const updateStaffStatusSchema = z.object({
  staffId: z
    .uuid({ message: "Invalid staff member" }),
  mode: z.enum(["suspend", "delete"], {
    errorMap: () => ({ message: "Select an action" }),
  }),
  confirmText: z
    .string()
    .trim()
    .min(1, { message: "Type the confirmation text to continue" }),
});

const defaultResendInviteValues = {
  staffId: [],
};

const resendStaffInviteSchema = z.object({
  staffId: z
    .uuid({ message: "Invalid staff member" }),
});

export async function manageRoles(prevState, queryData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to create staff members.",
      errors: {
        ...defaultManageRolesValues,
      },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role, firstname, lastname")
    .eq("id", user.id)
    .single();
  if (!currentProfile || currentProfile.role !== "super_admin") {
    return {
      message: "You are not authorized to create staff members.",
      errors: {
        ...defaultManageRolesValues,
      },
      values: {},
      data: {},
    };
  }

  const getBusinessEmail = queryData.get("email");
  const getPassword = queryData.get("password");
  const getFullName = queryData.get("fullName");
  const getRole = queryData.get("role");
  const getPhone = queryData.get("phone");

  const validatedFields = manageRolesSchema.safeParse({
    email: getBusinessEmail,
    password: getPassword,
    fullName: getFullName,
    role: getRole,
    phone: getPhone,
  });

  if (!validatedFields.success) {
    return {
      message: validatedFields?.error?.issues[0]?.message,
      errors: validatedFields.error.flatten().fieldErrors,
      values: {
        email: getBusinessEmail,
        password: getPassword,
        fullName: getFullName,
        role: getRole,
        phone: getPhone,
      },
      data: {},
    };
  }

  const { email, password, fullName, role, phone } = validatedFields.data;

  // Prevent duplicate staff emails by checking existing profiles
  const staffRoles = [
    "super_admin",
    "finance_admin",
    "operations_manager_admin",
    "customer_support_admin",
    "store_manager_admin",
    "marketing_admin",
    "ops_hr_admin",
  ];

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, email, role, status")
    .eq("email", email)
    .maybeSingle();

  let userId = null;
  let reactivatedFromDeleted = false;
  let authData = null;

  if (existingProfile) {
    const isStaffRole = staffRoles.includes(existingProfile.role);
    const isDeleted = existingProfile.status === "Deleted";

    if (isDeleted) {
      // Reactivate a previously deleted staff member: reuse their account
      userId = existingProfile.id;
      reactivatedFromDeleted = true;

      // No automatic password reset email to avoid triggering Supabase limits.
      // Admins should ask the staff member to use "Forgot Password" if needed.
    } else if (isStaffRole) {
      return {
        message: "Email already exists",
        errors: {
          ...defaultManageRolesValues,
          email: ["Email already exists"],
        },
        values: {
          email: getBusinessEmail,
          password: getPassword,
          fullName: getFullName,
          role: getRole,
          phone: getPhone,
        },
        data: {},
      };
    } else {
      return {
        message: "Email already belongs to another account.",
        errors: {
          ...defaultManageRolesValues,
          email: ["Email already belongs to another account."],
        },
        values: {
          email: getBusinessEmail,
          password: getPassword,
          fullName: getFullName,
          role: getRole,
          phone: getPhone,
        },
        data: {},
      };
    }
  }

  if (!reactivatedFromDeleted) {
    // Sign up staff user in Supabase Auth (sends confirmation email)
    const { data: signUpData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      const message = authError.message || "Unable to create staff user.";

      if (message.toLowerCase().includes("registered")) {
        return {
          message:
            "This email is already registered. Ask them to log in or use Forgot Password to regain access.",
          errors: {},
          values: {},
          data: {
            email: getBusinessEmail,
            needsManualReset: true,
          },
        };
      }

      return {
        message,
        errors: {
          ...defaultManageRolesValues,
          email: [message],
        },
        values: {
          email: getBusinessEmail,
          password: getPassword,
          fullName: getFullName,
          role: getRole,
          phone: getPhone,
        },
        data: {},
      };
    }

    authData = signUpData;
    userId = signUpData?.user?.id;

    if (!userId) {
      return {
        message: "Failed to create staff account",
        errors: {
          ...defaultManageRolesValues,
          email: ["Unable to create staff user. Please try again."],
        },
        values: {
          email: getBusinessEmail,
          password: getPassword,
          fullName: getFullName,
          role: getRole,
          phone: getPhone,
        },
        data: {},
      };
    }
  }

  // Split full name into first and last for signup_profiles
  const nameParts = fullName.trim().split(" ");
  const firstname = nameParts[0] || "";
  const lastname = nameParts.slice(1).join(" ") || "";

  // Generate a random hex color (same pattern as signup)
  let colorCharacters = "0123456789ABCDEF";
  let hashColor = "#";
  for (let i = 0; i < 6; i++) {
    hashColor += colorCharacters[Math.floor(Math.random() * 16)];
  }

  // Insert or update signup_profiles so middleware can create profiles row later
  const { data: signupProfile, error: signupProfileError } = await supabase
    .from("signup_profiles")
    .upsert([
      {
        user_id: userId,
        email,
        firstname,
        lastname,
        phone,
        color: hashColor,
        role,
        created_by: currentProfile?.id || null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])
    .select("*")
    .single();

  if (signupProfileError) {
    return {
      message: signupProfileError.message,
      errors: {
        ...defaultManageRolesValues,
        email: [signupProfileError.message],
      },
      values: {
        email: getBusinessEmail,
        password: getPassword,
        fullName: getFullName,
        role: getRole,
        phone: getPhone,
      },
      data: {},
    };
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName,
    action: "created_staff",
    entity: "staff",
    targetId: userId,
    details: `Created staff ${email} with role ${role}`,
  });

  revalidatePath("/dashboard/admin");

  const successMessage = reactivatedFromDeleted
    ? "Staff member reactivated. Ask them to log in or use Forgot Password to regain access."
    : "Staff member created.";

  return {
    message: successMessage,
    errors: {},
    data: {
      user: authData?.user || null,
      signup_profile: signupProfile,
      credentials: {
        email,
        password,
      },
    },
    status_code: 200,
    email: getBusinessEmail,
    values: {},
  };
}

export async function updateStaffDetails(prevState, formData) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to update staff members.",
      errors: {
        ...defaultUpdateStaffValues,
      },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!currentProfile || currentProfile.role !== "super_admin") {
    return {
      message: "You are not authorized to update staff members.",
      errors: {
        ...defaultUpdateStaffValues,
      },
      values: {},
      data: {},
    };
  }

  const raw = {
    staffId: formData.get("staffId"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    phone: formData.get("phone"),
  };

  const validated = updateStaffDetailsSchema.safeParse(raw);

  if (!validated.success) {
    return {
      message: validated.error.issues?.[0]?.message || "Validation failed",
      errors: validated.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { staffId, fullName, role, phone } = validated.data;

  const nameParts = fullName.trim().split(" ");
  const firstname = nameParts[0] || "";
  const lastname = nameParts.slice(1).join(" ") || "";

  const { data, error } = await adminClient
    .from("profiles")
    .update({
      firstname,
      lastname,
      phone: phone || null,
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", staffId)
    .select("id, firstname, lastname, email, role, phone, status")
    .maybeSingle();

  if (error) {
    return {
      message: error.message,
      errors: {
        ...defaultUpdateStaffValues,
      },
      values: raw,
      data: {},
    };
  }

  if (!data) {
    return {
      message:
        "We couldn't update this staff member. Please confirm the account exists and try again.",
      errors: {
        ...defaultUpdateStaffValues,
      },
      values: raw,
      data: {},
    };
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile.id,
    adminRole: currentProfile.role,
    adminEmail: null,
    adminName: null,
    action: "updated_staff",
    entity: "staff",
    targetId: staffId,
    details: `Updated staff ${staffId} details (role: ${role})`,
  });

  revalidatePath("/dashboard/admin");

  return {
    message: "Staff details updated successfully.",
    errors: {},
    values: {},
    data: {
      profile: data,
    },
  };
}

export async function resendStaffInvite(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to resend invitations.",
      errors: {
        ...defaultResendInviteValues,
      },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role, email, firstname, lastname")
    .eq("id", user.id)
    .single();

  if (!currentProfile || currentProfile.role !== "super_admin") {
    return {
      message: "You are not authorized to resend staff invitations.",
      errors: {
        ...defaultResendInviteValues,
      },
      values: {},
      data: {},
    };
  }

  const raw = {
    staffId: formData.get("staffId"),
  };

  const validated = resendStaffInviteSchema.safeParse(raw);

  if (!validated.success) {
    return {
      message: validated.error.issues?.[0]?.message || "Validation failed",
      errors: validated.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { staffId } = validated.data;

  const { data: signupProfile, error: signupError } = await supabase
    .from("signup_profiles")
    .select("user_id, email, firstname, lastname, role, created_by")
    .eq("user_id", staffId)
    .single();

  if (signupError || !signupProfile) {
    return {
      message: "We couldn't find a pending invite for this staff member.",
      errors: {
        ...defaultResendInviteValues,
      },
      values: raw,
      data: {},
    };
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("id", staffId)
    .maybeSingle();

  if (existingProfile && existingProfile.status !== "Deleted") {
    return {
      message: "This staff member already has an active account.",
      errors: {
        ...defaultResendInviteValues,
      },
      values: raw,
      data: {},
    };
  }

  try {
    await supabase.auth.resetPasswordForEmail(signupProfile.email);
  } catch (e) {
    return {
      message:
        e?.message || "Failed to resend invitation. Please try again.",
      errors: {
        ...defaultResendInviteValues,
      },
      values: raw,
      data: {},
    };
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile.id,
    adminRole: currentProfile.role,
    adminEmail: currentProfile.email || user.email || null,
    adminName,
    action: "resent_staff_invite",
    entity: "staff",
    targetId: staffId,
    details: `Resent staff invite to ${signupProfile.email} (${signupProfile.role})`,
  });

  revalidatePath("/dashboard/admin");

  return {
    message: "We've sent a new invite email to this staff member.",
    errors: {},
    values: {},
    data: {
      staffId,
    },
  };
}

export async function updateStaffStatus(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to change staff status.",
      errors: {
        ...defaultUpdateStaffStatusValues,
      },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!currentProfile || currentProfile.role !== "super_admin") {
    return {
      message: "You are not authorized to change staff status.",
      errors: {
        ...defaultUpdateStaffStatusValues,
      },
      values: {},
      data: {},
    };
  }

  const raw = {
    staffId: formData.get("staffId"),
    mode: formData.get("mode"),
    confirmText: formData.get("confirmText"),
  };

  const validated = updateStaffStatusSchema.safeParse(raw);

  if (!validated.success) {
    return {
      message: validated.error.issues?.[0]?.message || "Validation failed",
      errors: validated.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { staffId, mode, confirmText } = validated.data;

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("id, status, email")
    .eq("id", staffId)
    .maybeSingle();

  if (existingProfileError) {
    return {
      message: existingProfileError.message,
      errors: {
        ...defaultUpdateStaffStatusValues,
      },
      values: raw,
      data: {},
    };
  }

  const expectedConfirm =
    mode === "suspend" ? "SUSPEND" : "DELETE STAFF";

  if (confirmText.trim().toUpperCase() !== expectedConfirm) {
    return {
      message: "Confirmation text does not match.",
      errors: {
        ...defaultUpdateStaffStatusValues,
        confirmText: [
          mode === "suspend"
            ? "Type SUSPEND to confirm."
            : "Type DELETE STAFF to confirm.",
        ],
      },
      values: raw,
      data: {},
    };
  }

  if (mode === "delete" && !existingProfile) {
    try {
      const adminClient = createAdminClient();

      const { error: signupDeleteError } = await adminClient
        .from("signup_profiles")
        .delete()
        .eq("user_id", staffId);

      if (signupDeleteError) {
        return {
          message: signupDeleteError.message,
          errors: {
            ...defaultUpdateStaffStatusValues,
          },
          values: raw,
          data: {},
        };
      }

      const { error: authDeleteError } =
        await adminClient.auth.admin.deleteUser(staffId);

      if (authDeleteError && authDeleteError.message !== "User not found") {
        return {
          message: "Failed to delete staff auth account.",
          errors: {
            ...defaultUpdateStaffStatusValues,
          },
          values: raw,
          data: {},
        };
      }
    } catch (err) {
      return {
        message: "Failed to delete staff member.",
        errors: {
          ...defaultUpdateStaffStatusValues,
        },
        values: raw,
        data: {},
      };
    }

    await logAdminActivityWithClient(supabase, {
      adminId: currentProfile.id,
      adminRole: currentProfile.role,
      adminEmail: null,
      adminName: null,
      action: "deleted_staff",
      entity: "staff",
      targetId: staffId,
      details: `Deleted pending staff invite ${staffId}`,
    });

    revalidatePath("/dashboard/admin");

    return {
      message: "Staff member has been deleted.",
      errors: {},
      values: {},
      data: {
        staffId,
        mode: "delete",
      },
    };
  }

  if (!existingProfile) {
    return {
      message: "We could not find this staff member profile.",
      errors: {
        ...defaultUpdateStaffStatusValues,
      },
      values: raw,
      data: {},
    };
  }

  const updates = {
    updated_at: new Date().toISOString(),
  };

  if (mode === "suspend") {
    updates.status = "Suspended";
  } else {
    updates.status = "Deleted";
    updates.role = null;
    updates.firstname = null;
    updates.lastname = null;
    updates.phone = null;
    updates.address = null;
    updates.image = null;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", staffId);

  if (error) {
    return {
      message: error.message,
      errors: {
        ...defaultUpdateStaffStatusValues,
      },
      values: raw,
      data: {},
    };
  }

  const activityAction = mode === "suspend" ? "suspended_account" : "deleted_staff";
  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile.id,
    adminRole: currentProfile.role,
    adminEmail: null,
    adminName: null,
    action: activityAction,
    entity: "staff",
    targetId: staffId,
    details:
      mode === "suspend"
        ? `Suspended staff member ${staffId}`
        : `Deleted staff member ${staffId}`,
  });

  revalidatePath("/dashboard/admin");

  return {
    message:
      mode === "suspend"
        ? "Staff member has been suspended."
        : "Staff member has been deleted.",
    errors: {},
    values: {},
    data: {
      staffId,
      mode,
    },
  };
}

const defaultCreateVendorValues = {
  businessName: [],
  category: [],
  email: [],
  password: [],
  fullName: [],
  phone: [],
};

const CREATE_VENDOR_EMAIL_IN_USE_ERROR =
  "This email is already linked to an existing account. Use another email or ask the vendor to reset their password.";
const CREATE_VENDOR_VENDOR_EXISTS_ERROR =
  "A vendor account already exists for this user. Refresh and try again.";
const GENERIC_CREATE_VENDOR_ERROR =
  "Unable to create vendor account. Please try again or contact support.";

function mapCreateVendorError(error) {
  if (!error) {
    return { message: GENERIC_CREATE_VENDOR_ERROR, field: null };
  }

  const message = String(error?.message || "").trim();
  const details = String(error?.details || "").trim();
  const hint = String(error?.hint || "").trim();
  const combined = `${message} ${details} ${hint}`.toLowerCase();
  const constraint =
    combined.match(/constraint\s+"?([a-z0-9_]+)"?/i)?.[1] || "";

  const isDuplicateError =
    error?.code === "23505" ||
    combined.includes("duplicate key value violates unique") ||
    combined.includes("duplicate key") ||
    combined.includes("already registered") ||
    combined.includes("already exists");

  if (isDuplicateError) {
    if (
      combined.includes("email") ||
      combined.includes("signup_profiles_email_key") ||
      combined.includes("profiles_email_key") ||
      constraint.includes("email")
    ) {
      return {
        message: CREATE_VENDOR_EMAIL_IN_USE_ERROR,
        field: "email",
      };
    }

    if (
      combined.includes("vendors_profiles_id_key") ||
      combined.includes("profiles_id") ||
      constraint.includes("vendors_profiles_id")
    ) {
      return {
        message: CREATE_VENDOR_VENDOR_EXISTS_ERROR,
        field: null,
      };
    }

    return {
      message: "This vendor already exists. Refresh and try again.",
      field: null,
    };
  }

  if (combined.includes("foreign key") || error?.code === "23503") {
    return {
      message:
        "Some related account records could not be linked. Refresh and try again.",
      field: null,
    };
  }

  if (combined.includes("permission denied") || error?.code === "42501") {
    return {
      message: "You do not have permission to create this vendor.",
      field: null,
    };
  }

  return { message: GENERIC_CREATE_VENDOR_ERROR, field: null };
}

function buildCreateVendorErrorResponse(rawValues, mappedError) {
  const message = mappedError?.message || GENERIC_CREATE_VENDOR_ERROR;
  const field = mappedError?.field;

  return {
    message,
    errors: {
      ...defaultCreateVendorValues,
      ...(field ? { [field]: [message] } : {}),
    },
    values: rawValues,
    data: {},
  };
}

const createVendorSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(1, { message: "Business name is required" }),
  category: z
    .array(z.string().trim().min(1))
    .min(1, { message: "Category is required" }),
  email: z.email({ message: "Email is invalid" }),
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
  fullName: z.string().trim().min(1, { message: "Full name is required" }),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
});

export async function createVendor(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to create vendors.",
      errors: {
        ...defaultCreateVendorValues,
      },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role, firstname, lastname, email")
    .eq("id", user.id)
    .single();

  if (!currentProfile || currentProfile.role !== "super_admin") {
    return {
      message: "You are not authorized to create vendors.",
      errors: {
        ...defaultCreateVendorValues,
      },
      values: {},
      data: {},
    };
  }

  const raw = {
    businessName: formData.get("businessName"),
    category: formData
      .getAll("category")
      .map((value) => (value == null ? "" : String(value).trim()))
      .filter(Boolean),
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  };

  const parsed = createVendorSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { businessName, category, email, password, fullName, phone } = parsed.data;

  const categoryPayload = JSON.stringify(category);

  const vendorSlug = await generateUniqueVendorSlug(supabase, businessName);

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (existingProfileError) {
    return buildCreateVendorErrorResponse(
      raw,
      mapCreateVendorError(existingProfileError),
    );
  }

  if (existingProfile) {
    return buildCreateVendorErrorResponse(raw, {
      message: CREATE_VENDOR_EMAIL_IN_USE_ERROR,
      field: "email",
    });
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return buildCreateVendorErrorResponse(raw, mapCreateVendorError(authError));
  }

  const userId = authData?.user?.id;

  if (!userId) {
    return {
      message: "Failed to create vendor account",
      errors: {
        ...defaultCreateVendorValues,
        email: ["Unable to create vendor user. Please try again."],
      },
      values: raw,
      data: {},
    };
  }

  const nameParts = fullName.trim().split(" ");
  const firstname = nameParts[0] || "";
  const lastname = nameParts.slice(1).join(" ") || "";

  let colorCharacters = "0123456789ABCDEF";
  let hashColor = "#";
  for (let i = 0; i < 6; i++) {
    hashColor += colorCharacters[Math.floor(Math.random() * 16)];
  }

  const { data: signupProfile, error: signupProfileError } = await supabase
    .from("signup_profiles")
    .upsert([
      {
        user_id: userId,
        email,
        firstname,
        lastname,
        phone,
        color: hashColor,
        role: "vendor",
        created_by: currentProfile?.id || null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ], { onConflict: "user_id" })
    .select("*")
    .single();

  if (signupProfileError) {
    return buildCreateVendorErrorResponse(
      raw,
      mapCreateVendorError(signupProfileError),
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert([
      {
        id: userId,
        email,
        firstname,
        lastname,
        phone,
        color: hashColor,
        role: "vendor",
        created_by: currentProfile?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select("id")
    .single();

  if (profileError) {
    return buildCreateVendorErrorResponse(raw, mapCreateVendorError(profileError));
  }

  const { data: existingVendor, error: existingVendorError } = await supabase
    .from("vendors")
    .select("id, business_name")
    .eq("profiles_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingVendorError) {
    return buildCreateVendorErrorResponse(
      raw,
      mapCreateVendorError(existingVendorError),
    );
  }

  let vendor = existingVendor;

  if (vendor) {
    const { data: updatedVendor, error: updateVendorError } = await supabase
      .from("vendors")
      .update({
        business_name: businessName,
        category: categoryPayload,
        slug: vendorSlug,
        verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vendor.id)
      .select("id, business_name")
      .single();

    if (updateVendorError) {
      return buildCreateVendorErrorResponse(
        raw,
        mapCreateVendorError(updateVendorError),
      );
    }

    vendor = updatedVendor;
  } else {
    const { data: insertedVendor, error: vendorError } = await supabase
      .from("vendors")
      .insert([
        {
          profiles_id: userId,
          business_name: businessName,
          category: categoryPayload,
          slug: vendorSlug,
          description: null,
          commission_rate: null,
          verified: true,
          created_by: currentProfile?.id || null,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ])
      .select("id, business_name")
      .single();

    if (vendorError) {
      return buildCreateVendorErrorResponse(raw, mapCreateVendorError(vendorError));
    }

    vendor = insertedVendor;
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: currentProfile?.email || user.email || null,
    adminName,
    action: "created_vendor",
    entity: "vendors",
    targetId: vendor?.id || userId,
    details: `Created vendor ${businessName} (${email})`,
  });

  revalidatePath("/dashboard/admin");

  return {
    message: "Vendor created.",
    errors: {},
    data: {
      user: authData.user,
      signup_profile: signupProfile,
      vendor,
      credentials: {
        email,
        password,
      },
    },
    status_code: 200,
    email,
    values: {},
  };
}

const defaultSearchErrors = {
  query: [],
  type: [],
  status: [],
};

const searchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, { message: "Enter a search term" }),
  type: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || "vendor"),
  status: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
});

export async function adminGlobalSearch(prevState, formData) {
  const supabase = await createClient();

  const raw = {
    query: formData.get("query") || "",
    type: formData.get("type") || "vendor",
    status: formData.get("status") || "",
  };

  const parsed = searchSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      message:
        parsed.error.issues?.[0]?.message || "Invalid search parameters",
      errors: {
        ...defaultSearchErrors,
        ...fieldErrors,
      },
      values: raw,
      results: [],
    };
  }

  const { query, type, status } = parsed.data;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to search.",
      errors: {
        ...defaultSearchErrors,
      },
      values: parsed.data,
      results: [],
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const allowedRoles = [
    "super_admin",
    "finance_admin",
    "operations_manager_admin",
    "customer_support_admin",
    "store_manager_admin",
    "marketing_admin",
  ];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to use admin search.",
      errors: {
        ...defaultSearchErrors,
      },
      values: parsed.data,
      results: [],
    };
  }

  const term = query.trim();

  const results = [];

  if (!term) {
    return {
      message: "Enter a search term",
      errors: {
        ...defaultSearchErrors,
        query: ["Enter a search term"],
      },
      values: parsed.data,
      results: [],
    };
  }

  if (type === "vendor" || type === "all" || !type) {
    let vendorQuery = supabase
      .from("vendors")
      .select(
        `
        id,
        business_name,
        description,
        verified,
        profiles!Vendors_profiles_id_fkey (
          id,
          firstname,
          lastname,
          email,
          phone,
          status
        )
      `
      )
      .limit(20);

    if (status === "Active") {
      vendorQuery = vendorQuery.eq("verified", true);
    } else if (status === "Inactive") {
      vendorQuery = vendorQuery.or("verified.is.false,verified.is.null");
    }

    const vendorTokens = term
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => `${t}:*`)
      .join(" & ");

    if (vendorTokens) {
      vendorQuery = vendorQuery.filter("search_vector", "fts", vendorTokens);
    }

    const { data: vendorRows, error: vendorError } = await vendorQuery;

    if (vendorError) {
      return {
        message: vendorError.message,
        errors: {
          ...defaultSearchErrors,
        },
        values: parsed.data,
        results: [],
      };
    }

    if (Array.isArray(vendorRows)) {
      for (const row of vendorRows) {
        const profile = row.profiles || null;
        const nameParts = [];
        if (profile?.firstname) {
          nameParts.push(profile.firstname);
        }
        if (profile?.lastname) {
          nameParts.push(profile.lastname);
        }
        const fullName = nameParts.join(" ");

        const title =
          row.business_name || fullName || profile?.email || "Vendor";
        const subtitle = fullName || profile?.email || profile?.phone || "";
        const statusLabel =
          profile?.status || (row.verified ? "Verified" : "Unverified");

        results.push({
          id: row.id,
          entityType: "vendor",
          title,
          subtitle,
          status: statusLabel,
          navigate: {
            path: "/dashboard/admin/vendor_requests",
            query: {
              q: term,
              type: "vendor",
              focusId: row.id,
              page: "1",
            },
          },
        });
      }
    }
  }
  if (type === "host" || type === "all") {
    let hostQuery = supabase
      .from("profiles")
      .select(
        `
        id,
        firstname,
        lastname,
        email,
        phone,
        status,
        role
      `
      )
      .eq("role", "host")
      .limit(20);

    if (status === "Active") {
      hostQuery = hostQuery.eq("status", "Active");
    } else if (status === "Inactive") {
      hostQuery = hostQuery.neq("status", "Active");
    }

    hostQuery = hostQuery.textSearch("search_vector", term, {
      type: "websearch",
      config: "simple",
    });

    const { data: hostRows, error: hostError } = await hostQuery;

    if (hostError) {
      return {
        message: hostError.message,
        errors: {
          ...defaultSearchErrors,
        },
        values: parsed.data,
        results: [],
      };
    }

    if (Array.isArray(hostRows)) {
      for (const row of hostRows) {
        const nameParts = [];
        if (row.firstname) {
          nameParts.push(row.firstname);
        }
        if (row.lastname) {
          nameParts.push(row.lastname);
        }
        const fullName = nameParts.join(" ");

        const title = fullName || row.email || "Host";
        const subtitle = row.email || row.phone || "";
        const statusLabel = row.status || "";

        results.push({
          id: row.id,
          entityType: "host",
          title,
          subtitle,
          status: statusLabel,
          navigate: {
            path: "/dashboard/admin/registry_list",
            query: {
              q: term,
              type: "host",
              focusId: row.id,
              page: "1",
            },
          },
        });
      }
    }
  }

  if (type === "guest" || type === "all") {
    let guestQuery = supabase
      .from("profiles")
      .select(
        `
        id,
        firstname,
        lastname,
        email,
        phone,
        status,
        role
      `
      )
      .eq("role", "guest")
      .limit(20);

    if (status === "Active") {
      guestQuery = guestQuery.eq("status", "Active");
    } else if (status === "Inactive") {
      guestQuery = guestQuery.neq("status", "Active");
    }

    guestQuery = guestQuery.textSearch("search_vector", term, {
      type: "websearch",
      config: "simple",
    });

    const { data: guestRows, error: guestError } = await guestQuery;

    if (guestError) {
      return {
        message: guestError.message,
        errors: {
          ...defaultSearchErrors,
        },
        values: parsed.data,
        results: [],
      };
    }

    if (Array.isArray(guestRows)) {
      for (const row of guestRows) {
        const nameParts = [];
        if (row.firstname) {
          nameParts.push(row.firstname);
        }
        if (row.lastname) {
          nameParts.push(row.lastname);
        }
        const fullName = nameParts.join(" ");

        const title = fullName || row.email || "Guest";
        const subtitle = row.email || row.phone || "";
        const statusLabel = row.status || "";

        results.push({
          id: row.id,
          entityType: "guest",
          title,
          subtitle,
          status: statusLabel,
          navigate: {
            path: "/dashboard/admin/registry_list",
            query: {
              q: term,
              type: "guest",
              focusId: row.id,
              page: "1",
            },
          },
        });
      }
    }
  }
console.log("results se,,,,,,,................", results)
  return {
    message: results.length ? "" : "No results found",
    errors: {
      ...defaultSearchErrors,
    },
    values: parsed.data,
    results,
  };
}

const defaultRejectVendorValues = {
  applicationId: [],
  reason: [],
};

const rejectVendorSchema = z.object({
  applicationId: z
    .string()
    .uuid({ message: "Invalid application ID" }),
  reason: z
    .string()
    .trim()
    .min(1, { message: "Rejection reason is required" })
    .max(500, { message: "Reason must be less than 500 characters" }),
});

export async function rejectVendorApplication(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to reject vendor applications.",
      errors: {
        ...defaultRejectVendorValues,
      },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role, firstname, lastname, email")
    .eq("id", user.id)
    .single();

  if (!currentProfile || currentProfile.role !== "super_admin") {
    return {
      message: "You are not authorized to reject vendor applications.",
      errors: {
        ...defaultRejectVendorValues,
      },
      values: {},
      data: {},
    };
  }

  const raw = {
    applicationId: formData.get("applicationId"),
    reason: formData.get("reason"),
  };

  const validated = rejectVendorSchema.safeParse(raw);

  if (!validated.success) {
    return {
      message: validated.error.issues?.[0]?.message || "Validation failed",
      errors: validated.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { applicationId, reason } = validated.data;

  // Check if application exists and is in pending status
  const { data: application, error: applicationError } = await supabase
    .from("vendor_applications")
    .select("id, user_id, business_name, owner_email, status")
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) {
    return {
      message: "Vendor application not found.",
      errors: {
        ...defaultRejectVendorValues,
      },
      values: raw,
      data: {},
    };
  }

  if (application.status !== "pending") {
    return {
      message: "This application has already been processed.",
      errors: {
        ...defaultRejectVendorValues,
      },
      values: raw,
      data: {},
    };
  }

  // Update application status to rejected with reason
  const { error: updateError } = await supabase
    .from("vendor_applications")
    .update({
      status: "rejected",
      reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (updateError) {
    return {
      message: updateError.message,
      errors: {
        ...defaultRejectVendorValues,
      },
      values: raw,
      data: {},
    };
  }

  const adminNameParts = [];
  if (currentProfile?.firstname) adminNameParts.push(currentProfile.firstname);
  if (currentProfile?.lastname) adminNameParts.push(currentProfile.lastname);
  const adminName = adminNameParts.join(" ") || null;

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: currentProfile?.email || user.email || null,
    adminName,
    action: "rejected_vendor_application",
    entity: "vendor_applications",
    targetId: applicationId,
    details: `Rejected vendor application for ${application.business_name} (${application.owner_email}). Reason: ${reason}`,
  });

  revalidatePath("/dashboard/admin/vendor_requests");

  return {
    message: "Vendor application rejected successfully.",
    errors: {},
    values: {},
    data: {
      applicationId,
      businessName: application.business_name,
      ownerEmail: application.owner_email,
    },
  };
}
