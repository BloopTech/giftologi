"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";

const defaultLoginValues = {
  email: [],
  password: [],
};

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Email is invalid" }),
  password: z
    .string()
    .trim()
    .min(1, { message: "Password is required" })
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

export async function login(prevState, queryData) {
  const supabase = await createClient();

  const getBusinessEmail = queryData.get("email");
  const getPassword = queryData.get("password");

  const validatedFields = loginSchema.safeParse({
    email: getBusinessEmail,
    password: getPassword,
  });

  if (!validatedFields.success) {
    return {
      message: validatedFields.error.errors[0].message,
      errors: validatedFields.error.flatten().fieldErrors,
      values: {
        email: getBusinessEmail,
        password: getPassword,
      },
      data: {},
    };
  }

  const { email, password } = validatedFields.data;

  const payload = {
    email,
    password,
  };

  const { data, error } = await supabase.auth.signInWithPassword(payload);

  if (error) {
    return {
      message: error.message,
      errors: {
        ...defaultLoginValues,
        credentials: error.message,
      },
    };
  }

  return {
    message: "Login successful",
    errors: {},
    data: data?.user,
    key: data?.session,
    status_code: 200,
    email: getBusinessEmail,
    values: {},
  };
}

// reslogin {
//   status: 'error',
//   key: 'validation_error',
//   status_code: 400,
//   message: 'Validation failed',
//   errors: {
//     dev_message: {
//       non_field_errors: 'Account not activated. OTP has been sent to your email address.'
//     },
//     user_message: 'Validation failed',
//     extra: {}
//   },
//   data: {}
// }

const defaultOTPValues = {
  otp: [],
};

export async function otpVerification(prevState, queryData) {
  const t = await getTranslations("otp.zod");
  const translateApiError = await getApiErrorTranslations();

  const otpSchema = z.object({
    otp: z
      .string()
      .trim()
      .min(1, { message: "OTP is required" })
      .max(6, { message: "OTP must be at least 6 characters long" }),
  });

  const getOTP = queryData.get("otp");
  const getBusinessEmail = queryData.get("email");

  const validatedFields = otpSchema.safeParse({
    otp: getOTP,
  });

  if (!validatedFields.success) {
    return {
      message: validatedFields.error.errors[0].message,
      errors: validatedFields.error.flatten().fieldErrors,
      values: {
        otp: getOTP,
      },
      data: {},
    };
  }

  const { otp } = validatedFields.data;

  const payload = {
    otp,
    email: getBusinessEmail,
  };

  const response = await fetch(
    `https://auth-ms.test.vmt-pay.com/api/v1/auth/verify-otp/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  console.log("res..................", response);
  const res = await response.json();

  if (res?.status === "error") {
    // Translate API error message
    const translatedMessage = translateApiError(res?.message);

    // Handle user_message which could be a string or an object
    let translatedUserMessage;
    if (res?.errors?.user_message) {
      translatedUserMessage = translateApiError(res.errors.user_message);
    }

    return {
      message: translatedMessage,
      errors: {
        ...defaultOTPValues,
        credentials: translatedUserMessage || translatedMessage,
      },
      values: {
        otp: getOTP,
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

const defaultOTP2FAValues = {
  otp: [],
};

export async function otp2FAVerification(prevState, queryData) {
  const t = await getTranslations("otp2FA.zod");
  const translateApiError = await getApiErrorTranslations();

  const otp2FASchema = z.object({
    otp: z
      .string()
      .trim()
      .min(1, { message: "OTP is required" })
      .max(6, { message: "OTP must be at least 6 characters long" }),
  });

  const getOTP = queryData.get("otp");
  const getBusinessEmail = queryData.get("email");

  const validatedFields = otp2FASchema.safeParse({
    otp: getOTP,
  });

  if (!validatedFields.success) {
    return {
      message: validatedFields.error.errors[0].message,
      errors: validatedFields.error.flatten().fieldErrors,
      values: {
        otp: getOTP,
      },
      data: {},
    };
  }

  const { otp } = validatedFields.data;

  const payload = {
    otp,
    email: getBusinessEmail,
  };

  const response = await fetch(
    `https://auth-ms.test.vmt-pay.com/api/v1/auth/web/login/2fa-confirm/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  console.log("res..................", response);
  const res = await response.json();
  console.log("res 2FA..................", res);

  if (res?.status === "error") {
    return {
      message: res?.message,
      errors: {
        ...defaultOTP2FAValues,
        credentials: res?.errors?.user_message || res?.message,
      },
      values: {
        otp: getOTP,
      },
      data: {},
    };
  }

  const token = res?.data?.access;
  console.log("business", res?.data);

  if (token) {
    // Store authentication data in Iron Session
    // This replaces all the cookie handling with encrypted, stateless sessions
    const session_time = 20 * 60 * 1000; // 20 minutes to match token expiry

    // Set authentication data in Iron Session
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");

  return {
    message: res?.message,
    errors: {},
    data: res?.data,
    values: {},
    status_code: res?.status_code,
  };
}
