"use server";
import { z } from "zod";


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
  const getEmail = queryData.get("email");

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

  const { password, confirm_password } = validatedFields.data;

  const payload = {
    password,
    email: getEmail,
  };

  const response = await fetch(
    `https://auth-ms.test.vmt-pay.com/api/v1/auth/password-reset/complete/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  const res = await response.json();
  console.log("res reset", res);
  if (res?.status === "error") {
    return {
      message: res?.message,
      errors: {
        ...defaultResetValues,
        credentials: res?.message,
      },
      values: {
        password: getPassword,
        confirm_password: getConfirmPassword,
      },
      data: {},
      status_code: res?.status_code,
    };
  }

  return {
    message: res?.message,
    status: res?.status,
    errors: {},
    data: res?.data,
    values: {},
    status_code: res?.status_code,
  };
}
