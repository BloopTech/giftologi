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
      message: validatedFields?.error?.issues[0]?.message,
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
    const message = error.message || "Invalid email or password";
    const lower = message.toLowerCase();
    const looksUnconfirmed =
      lower.includes("not confirmed") || lower.includes("confirm your email");

    if (looksUnconfirmed) {
      const resendMessage =
        "Your email is not confirmed. Please check your inbox or use Forgot Password to resend.";

      return {
        message: resendMessage,
        errors: {
          ...defaultLoginValues,
          credentials: resendMessage,
        },
        values: {
          email: getBusinessEmail,
          password: getPassword,
        },
        data: {
          email: getBusinessEmail,
          resent: false,
        },
      };
    }

    return {
      message,
      errors: {
        ...defaultLoginValues,
        credentials: message,
      },
      values: {
        email: getBusinessEmail,
        password: getPassword,
      },
      data: {},
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
      message: validatedFields?.error?.issues[0]?.message,
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

  

}

const defaultOTP2FAValues = {
  otp: [],
};

