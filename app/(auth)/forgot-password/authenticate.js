"use server";
import { z } from "zod";


const defaultValues = {
  business_email: [],
};

export async function forgotPassword(prevState, queryData) {


  const defaultForgotSchema = z.object({

    business_email: z
      .string()
      .trim()
      .min(1, { message: "Email is required" })
      .email({ message: "Email is invalid" }),
  });

  const getBusinessEmail = queryData.get("business_email");

  const validatedFields = defaultForgotSchema.safeParse({
    business_email: getBusinessEmail,
  });

  if (!validatedFields.success) {
    return {
      message: validatedFields.error.errors[0].message,
      errors: validatedFields.error.flatten().fieldErrors,
      values: {
        business_email: getBusinessEmail,
      },
      data: {},
    };
  }

  const { business_email } = validatedFields.data;

  const payload = {
    email: business_email,
  };

  const response = await fetch(
    `https://auth-ms.test.vmt-pay.com/api/v1/auth/password-reset/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  const res = await response.json();
  console.log("res..........", res);
  if (res?.status === "error") {
    return {
      message: res?.message,
      errors: {
        ...defaultValues,
        credentials: res?.message,
      },
      values: {
        business_email: getBusinessEmail,
      },
      data: {},
    };
  }

  return {
    message: res?.message,
    errors: {},
    data: res?.data,
    values: {},
  };
}
