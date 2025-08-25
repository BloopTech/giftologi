"use server";
import { z } from "zod";
import { createClient } from "../../utils/supabase/server";

const defaultValues = {
  email: [],
};

export async function forgotPassword(prevState, queryData) {
  const defaultForgotSchema = z.object({
    email: z
      .string()
      .trim()
      .min(1, { message: "Email is required" })
      .email({ message: "Email is invalid" }),
  });

  const getEmail = queryData.get("email");

  const validatedFields = defaultForgotSchema.safeParse({
    email: getEmail,
  });

  if (!validatedFields.success) {
    return {
      message: validatedFields?.error?.issues[0]?.message,
      errors: validatedFields.error.flatten().fieldErrors,
      values: {
        email: getEmail,
      },
      data: {},
    };
  }

  const { email } = validatedFields.data;

  try {
    const supabase = await createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : "http://localhost:3000");
    // Point the recovery link to our reset page. The middleware will exchange the code for a session.
    // Use a constant dynamic segment so it matches `/password-reset/[token]`
    const redirectTo = `${siteUrl}/password-reset/a`;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return {
        message: error.message,
        errors: { ...defaultValues, credentials: { email: error.message } },
        values: { email },
        data: {},
      };
    }

    return {
      message:
        "If an account exists for this email, a password reset link has been sent.",
      errors: {},
      values: {},
      data: { email },
    };
  } catch (e) {
    return {
      message: "Something went wrong. Please try again.",
      errors: { ...defaultValues, credentials: { email: "Unexpected error" } },
      values: { email },
      data: {},
    };
  }
}
