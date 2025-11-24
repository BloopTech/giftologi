"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../utils/supabase/server";

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

  return {
    message: "Staff created successfully. A confirmation link has been sent to their email.",
    errors: {},
    data: {
      user: authData.user,
      signup_profile: signupProfile,
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
