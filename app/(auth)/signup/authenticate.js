"use server";
import { z } from "zod";
import { createClient } from "../../utils/supabase/server";
import { redirect } from "next/navigation";

const defaultSignupValues = {
  firstname: [],
  lastname: [],
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

export async function signup(prevState, queryData) {
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .single();

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
  console.log("signup.......................................", data, error);
  if (error) {
    const message = error.message || "Signup failed";
    const lower = message.toLowerCase();
    const isAlreadyRegistered =
      lower.includes("already registered") || lower.includes("already exists");

    if (isAlreadyRegistered) {
      try {
        await supabase.auth.resend({
          type: "signup",
          email,
        });
      } catch (_) {}

      return {
        message:
          "Your account already exists but is not active. We've sent you a new confirmation email.",
        errors: {},
        values: {
          firstname: getFirstName,
          lastname: getLastName,
          email: getBusinessEmail,
          password: getPassword,
        },
        data: {
          email: getBusinessEmail,
          resent: true,
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

  const { data: check_signup_profile, error: check_signup_profileError } =
    await supabase
      .from("signup_profiles")
      .select("*")
      .eq("user_id", data.user.id)
      .single();

  if (!check_signup_profile) {
    const { data: signup_profile, error: signup_profileError } = await supabase
      .from("signup_profiles")
      .upsert(
        [
          {
            user_id: data.user.id,
            email,
            firstname,
            lastname,
            color: hashColor,
            role: "host",
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        { onConflict: "user_id" }
      )
      .select("*")
      .single();
    console.log(
      "profile....................................",
      signup_profile,
      signup_profileError
    );
    if (signup_profileError) {
      return {
        message: signup_profileError.message,
        errors: {
          ...defaultSignupValues,
          credentials: signup_profileError?.message,
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
