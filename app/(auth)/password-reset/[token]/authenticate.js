"use server";
import { z } from "zod";
import { createClient } from "../../../utils/supabase/server";

const defaultResetValues = {
  password: [],
  confirm_password: [],
};

export async function resetPassword(prevState, queryData) {

  const defaultResetSchema = z
    .object({
      password: z
        .string()
        .trim()
        .min(1, { message: "Password must be at least 1 character long" })
        .min(8, { message: "Password must be at least 8 characters long" })
        .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
        .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
        .regex(/[^A-Za-z0-9]/, {
          message: "Password must contain at least one special character",
        }),
      confirm_password: z
        .string()
        .trim()
        .min(1, { message: "Confirm Password required" })
        .min(8, { message: "Confirm Password must be at least 8 characters long" })
        .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
        .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
        .regex(/[^A-Za-z0-9]/, {
          message: "Password must contain at least one special character",
        }),
    })
    .refine((data) => data.password === data.confirm_password, {
      message: "Passwords do not match",
      path: ["confirm_password"], // path of error
    });

  const getPassword = queryData.get("password");
  const getConfirmPassword = queryData.get("confirm_password");

  const validatedFields = defaultResetSchema.safeParse({
    password: getPassword,
    confirm_password: getConfirmPassword,
  });

  if (!validatedFields.success) {
    return {
      message: validatedFields?.error?.issues[0]?.message,
      errors: validatedFields.error.flatten().fieldErrors,
      values: {
        password: getPassword,
        confirm_password: getConfirmPassword,
      },
      data: {},
    };
  }

  const { password } = validatedFields.data;

  // Update password using Supabase recovery session
  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      message: error.message,
      errors: {
        ...defaultResetValues,
        credentials: { global: error.message },
      },
      values: {
        password: getPassword,
        confirm_password: getConfirmPassword,
      },
      data: {},
      status_code: 400,
    };
  }

  return {
    message: "Password updated successfully.",
    status: "success",
    errors: {},
    data: data?.user || {},
    values: {},
    status_code: 200,
  };
}
