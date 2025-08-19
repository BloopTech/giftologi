"use server";
import { z } from "zod";
import { createClient } from "../../utils/supabase/server";
import { redirect } from "next/navigation";

const defaultSignupValues = {
  firstname: [],
  lastname: [],
  othernames: [],
  business_name: [],
  email: [],
  phone: [],
  password: [],
};

const signupSchema = z
  .object({
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
    email: z
      .string()
      .trim()
      .min(1, { message: "Email required" })
      .email({ message: "Email required" }),
    phone: z.string().trim().nonempty({ message: "Phone required" }),
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
    confirm_password: z
      .string()
      .trim()
      .min(1, { message: "Confirm Password required" })
      .min(8, {
        message: "Confirm Password must be at least 8 characters long",
      })
      .regex(/[A-Z]/, {
        message: "Confirm Password must contain at least one uppercase letter",
      })
      .regex(/[a-z]/, {
        message: "Confirm Password must contain at least one lowercase letter",
      })
      .regex(/[^A-Za-z0-9]/, {
        message: "Confirm Password must contain at least one special character",
      }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Confirm Password must match Password",
    path: ["confirm_password"], // path of error
  });

export async function signup(prevState, queryData) {
  const supabase = await createClient();

  const getFirstName = queryData.get("firstname");
  const getLastName = queryData.get("lastname");
  const getBusinessEmail = queryData.get("email");
  const getPhoneNumber = queryData.get("phone");
  const getPassword = queryData.get("password");
  const getConfirmPassword = queryData.get("confirm_password");

  const validatedFields = signupSchema.safeParse({
    firstname: getFirstName,
    lastname: getLastName,
    email: getBusinessEmail,
    phone: getPhoneNumber,
    password: getPassword,
    confirm_password: getConfirmPassword,
  });
  console.log("validatedFields.......................", validatedFields);
  if (!validatedFields.success) {
    return {
      message: validatedFields.error[0].message,
      errors: validatedFields.error.flatten().fieldErrors,
      values: {
        firstname: getFirstName,
        lastname: getLastName,
        email: getBusinessEmail,
        phone: getPhoneNumber,
        password: getPassword,
        confirm_password: getConfirmPassword,
      },
      data: {},
    };
  }

  const { firstname, lastname, email, phone, password, confirm_password } =
    validatedFields.data;

  const payload = {
    firstname,
    lastname,
    phone,
  };

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
        phone: getPhoneNumber,
        password: getPassword,
        confirm_password: getConfirmPassword,
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
    return {
      message: error.message,
      errors: {
        ...defaultSignupValues,
        credentials: error?.message,
      },
      values: {
        firstname: getFirstName,
        lastname: getLastName,
        email: getBusinessEmail,
        phone: getPhoneNumber,
        password: getPassword,
        confirm_password: getConfirmPassword,
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
      .insert([
        {
          user_id: data.user.id,
          email,
          firstname,
          lastname,
          phone,
          color: hashColor,
          role: "host",
          created_at: new Date(),
          updated_at: new Date(),
        },
      ])
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
          phone: getPhoneNumber,
          password: getPassword,
          confirm_password: getConfirmPassword,
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
