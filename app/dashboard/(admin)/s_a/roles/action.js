"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../../utils/supabase/server";

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

export async function manageRoles(prevState, queryData) {
  const supabase = await createClient();

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role, firstname, lastname")
    .single();

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
