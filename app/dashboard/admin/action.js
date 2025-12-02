"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import { logAdminActivityWithClient } from "./activity_log/logger";

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
    .string()
    .uuid({ message: "Invalid staff member" }),
  mode: z.enum(["suspend", "delete"], {
    errorMap: () => ({ message: "Select an action" }),
  }),
  confirmText: z
    .string()
    .trim()
    .min(1, { message: "Type the confirmation text to continue" }),
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
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .single();

  if (existingProfile) {
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
  }

  // Sign up staff user in Supabase Auth (sends confirmation email)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return {
      message: authError.message,
      errors: {
        ...defaultManageRolesValues,
        email: [authError.message],
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

  const userId = authData?.user?.id;

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

  return {
    message: "Staff member created.",
    errors: {},
    data: {
      user: authData.user,
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

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
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

  const { data, error } = await supabase
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
    .single();

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

  return {
    message: "Staff details updated successfully.",
    errors: {},
    values: {},
    data: {
      profile: data,
    },
  };
}

export async function updateStaffStatus(prevState, formData) {
  const supabase = await createClient();

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
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
  email: [],
  password: [],
  fullName: [],
  phone: [],
};

const createVendorSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(1, { message: "Business name is required" }),
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

  const { businessName, email, password, fullName, phone } = parsed.data;

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .single();

  if (existingProfile) {
    return {
      message: "Email already exists",
      errors: {
        ...defaultCreateVendorValues,
        email: ["Email already exists"],
      },
      values: raw,
      data: {},
    };
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return {
      message: authError.message,
      errors: {
        ...defaultCreateVendorValues,
        email: [authError.message],
      },
      values: raw,
      data: {},
    };
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
    ])
    .select("*")
    .single();

  if (signupProfileError) {
    return {
      message: signupProfileError.message,
      errors: {
        ...defaultCreateVendorValues,
        email: [signupProfileError.message],
      },
      values: raw,
      data: {},
    };
  }

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .insert([
      {
        profiles_id: userId,
        business_name: businessName,
        description: null,
        commission_rate: null,
        verified: true,
        created_by: currentProfile?.id || null,
        updated_at: new Date().toISOString(),
      },
    ])
    .select("id, business_name")
    .single();

  if (vendorError) {
    return {
      message: vendorError.message,
      errors: {
        ...defaultCreateVendorValues,
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
    action: "created_vendor",
    entity: "vendors",
    targetId: vendor?.id || userId,
    details: `Created vendor ${businessName} (${email})`,
  });

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

    vendorQuery = vendorQuery.textSearch("search_vector", term, {
      type: "websearch",
      config: "simple",
    });

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
