"use client";
import React, { useRef, useState } from "react";
// import { PhoneInput } from "react-simple-phone-input";
// import "react-simple-phone-input/dist/style.css";
import { Eye, EyeOff, LoaderCircle, OctagonAlert } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { createClient as createSupabaseClient } from "../../utils/supabase/client";

export default function FormInput(props) {
  const { state, formAction, isPending } = props;
  const [showPassword, setShowPassword] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);
  const emailRef = useRef(null);

  const handleGoogleSignUp = async () => {
    try {
      setIsGoogleLoading(true);
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        console.error("Google sign-up error:", error.message);
      }
      // Supabase will handle the redirect automatically
    } catch (e) {
      console.error("Google sign-up unexpected error:", e);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const email =
      emailRef.current?.value?.trim() ||
      state?.values?.email ||
      state?.data?.email;

    if (!email) {
      setResendStatus({
        type: "error",
        message: "Enter your email to resend the confirmation link.",
      });
      return;
    }

    setIsResendLoading(true);
    setResendStatus(null);

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        setResendStatus({
          type: "error",
          message: error.message || "Failed to resend confirmation email.",
        });
        return;
      }

      setResendStatus({
        type: "success",
        message: "Confirmation email sent. Check your inbox.",
      });
    } finally {
      setIsResendLoading(false);
    }
  };

  const canShowResend = Boolean(state?.data?.email);

  return (
    <div className="flex flex-col space-y-4 w-full items-center justify-center font-brasley-medium">
      <form
        action={formAction}
        className="flex flex-col w-full space-y-6 sm:space-y-8 items-center justify-center"
        aria-label="Create account form"
      >
        <div className="flex flex-col w-full space-y-4 items-center justify-center">
          {/* First Name Field */}
          <div className="flex flex-col w-full text-sm">
            <label htmlFor="firstname" className="sr-only">First name</label>
            <input
              id="firstname"
              type="text"
              name="firstname"
              placeholder="First Name"
              defaultValue={state?.values?.firstname || ""}
              className={`w-full border border-gray-200 bg-white rounded-md p-3 text-base form-input focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all ${
                Object.keys(state?.errors).length !== 0 &&
                state?.errors?.firstname?.length
                  ? "border-red-500 focus:ring-red-500"
                  : "focus:ring-[#A5914B]"
              }`}
              disabled={isPending}
              required
              autoComplete="given-name"
              aria-required="true"
              aria-invalid={state?.errors?.firstname?.length > 0 || state?.errors?.credentials?.firstname ? "true" : "false"}
              aria-describedby={state?.errors?.firstname?.length > 0 || state?.errors?.credentials?.firstname ? "firstname-error" : undefined}
            />
            <span className="text-xs mt-1" id="firstname-error" role="alert" aria-live="polite">
              {Object.keys(state?.errors).length !== 0 ? (
                state?.errors?.firstname?.length ? (
                  <span className="flex items-center space-x-2 text-red-600 font-medium bg-red-50 mt-2 p-2 border border-red-200 rounded-md">
                    <OctagonAlert className="size-5 text-red-600 pr-1 flex-shrink-0" aria-hidden="true" />
                    <span>{state.errors.firstname[0]}</span>
                  </span>
                ) : Object.keys(state?.errors?.credentials || {}).length !== 0 && state?.errors?.credentials?.firstname ? (
                  <span className="flex items-center space-x-2 text-red-600 font-medium bg-red-50 mt-2 p-2 border border-red-200 rounded-md">
                    <OctagonAlert className="size-5 text-red-600 pr-1 flex-shrink-0" aria-hidden="true" />
                    <span>{state.errors.credentials.firstname}</span>
                  </span>
                ) : null
              ) : null}
            </span>
          </div>

          {/* Last Name Field */}
          <div className="flex flex-col w-full text-sm">
            <label htmlFor="lastname" className="sr-only">Last name</label>
            <input
              id="lastname"
              type="text"
              name="lastname"
              defaultValue={state?.values?.lastname || ""}
              className={`w-full border border-gray-200 bg-white rounded-md p-3 text-base form-input focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all ${
                Object.keys(state?.errors).length !== 0 &&
                state?.errors?.lastname?.length
                  ? "border-red-500 focus:ring-red-500"
                  : "focus:ring-[#A5914B]"
              }`}
              placeholder="Last Name"
              disabled={isPending}
              required
              autoComplete="family-name"
              aria-required="true"
              aria-invalid={state?.errors?.lastname?.length > 0 || state?.errors?.credentials?.lastname ? "true" : "false"}
              aria-describedby={state?.errors?.lastname?.length > 0 || state?.errors?.credentials?.lastname ? "lastname-error" : undefined}
            />
            <span className="text-xs mt-1" id="lastname-error" role="alert" aria-live="polite">
              {Object.keys(state?.errors).length !== 0 ? (
                state?.errors?.lastname?.length ? (
                  <span className="flex items-center space-x-2 text-red-600 font-medium bg-red-50 mt-2 p-2 border border-red-200 rounded-md">
                    <OctagonAlert className="size-5 text-red-600 pr-1 flex-shrink-0" aria-hidden="true" />
                    <span>{state.errors.lastname[0]}</span>
                  </span>
                ) : Object.keys(state?.errors?.credentials || {}).length !== 0 && state?.errors?.credentials?.lastname ? (
                  <span className="flex items-center space-x-2 text-red-600 font-medium bg-red-50 mt-2 p-2 border border-red-200 rounded-md">
                    <OctagonAlert className="size-5 text-red-600 pr-1 flex-shrink-0" aria-hidden="true" />
                    <span>{state.errors.credentials.lastname}</span>
                  </span>
                ) : null
              ) : null}
            </span>
          </div>

          {/* Email Field */}
          <div className="flex flex-col w-full text-sm">
            <label htmlFor="email" className="sr-only">Email address</label>
            <input
              id="email"
              type="email"
              name="email"
              ref={emailRef}
              defaultValue={state?.values?.email || ""}
              className={`w-full border border-gray-200 bg-white rounded-md p-3 text-base form-input focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all ${
                Object.keys(state?.errors).length !== 0 &&
                (state?.errors?.email?.length ||
                  (Object.keys(state?.errors?.credentials || {}).length !== 0 &&
                    state?.errors?.credentials?.email))
                  ? "border-red-500 focus:ring-red-500"
                  : "focus:ring-[#A5914B]"
              }`}
              placeholder="Email"
              disabled={isPending}
              required
              autoComplete="email"
              aria-required="true"
              aria-invalid={state?.errors?.email?.length > 0 || state?.errors?.credentials?.email ? "true" : "false"}
              aria-describedby={state?.errors?.email?.length > 0 || state?.errors?.credentials?.email ? "email-error" : undefined}
            />
            <span className="text-xs mt-1" id="email-error" role="alert" aria-live="polite">
              {Object.keys(state?.errors).length !== 0 ? (
                state?.errors?.email?.length ? (
                  <span className="flex items-center space-x-2 text-red-600 font-medium bg-red-50 mt-2 p-2 border border-red-200 rounded-md">
                    <OctagonAlert className="size-5 text-red-600 pr-1 flex-shrink-0" aria-hidden="true" />
                    <span>{state.errors.email[0]}</span>
                  </span>
                ) : Object.keys(state?.errors?.credentials || {}).length !== 0 && state?.errors?.credentials?.email ? (
                  <span className="flex items-center space-x-2 text-red-600 font-medium bg-red-50 mt-2 p-2 border border-red-200 rounded-md">
                    <OctagonAlert className="size-5 text-red-600 pr-1 flex-shrink-0" aria-hidden="true" />
                    <span>{state.errors.credentials.email}</span>
                  </span>
                ) : null
              ) : null}
            </span>
          </div>

          {/* Password Field */}
          <div className="flex flex-col w-full text-sm">
            <label htmlFor="password" className="sr-only">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                className={`w-full border border-gray-200 bg-white rounded-md p-3 text-base form-input focus:outline-none focus:ring-2 focus:ring-offset-1 pr-12 transition-all ${
                  Object.keys(state?.errors).length !== 0 &&
                  state?.errors?.password?.length
                    ? "border-red-500 focus:ring-red-500"
                    : "focus:ring-[#A5914B]"
                }`}
                placeholder="Password"
                disabled={isPending}
                required
                autoComplete="new-password"
                aria-required="true"
                aria-invalid={state?.errors?.password?.length > 0 || state?.errors?.credentials?.password ? "true" : "false"}
                aria-describedby={state?.errors?.password?.length > 0 || state?.errors?.credentials?.password ? "password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center cursor-pointer p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#A5914B]"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-600" aria-hidden="true" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-600" aria-hidden="true" />
                )}
              </button>
            </div>
            <span className="text-xs mt-1" id="password-error" role="alert" aria-live="polite">
              {Object.keys(state?.errors).length !== 0 ? (
                state?.errors?.password?.length ? (
                  <span className="flex items-center space-x-2 text-red-600 font-medium bg-red-50 mt-2 p-2 border border-red-200 rounded-md">
                    <OctagonAlert className="size-5 text-red-600 pr-1 flex-shrink-0" aria-hidden="true" />
                    <span>{state.errors.password[0]}</span>
                  </span>
                ) : Object.keys(state?.errors?.credentials || {}).length !== 0 && state?.errors?.credentials?.password ? (
                  <span className="flex items-center space-x-2 text-red-600 font-medium bg-red-50 mt-2 p-2 border border-red-200 rounded-md">
                    <OctagonAlert className="size-5 text-red-600 pr-1 flex-shrink-0" aria-hidden="true" />
                    <span>{state.errors.credentials.password}</span>
                  </span>
                ) : null
              ) : null}
            </span>
          </div>

          {/* Submit Button */}
          <div className="w-full">
            <button
              className="disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center py-3 px-4 w-full rounded-full text-sm sm:text-base font-medium bg-[#A5914B] hover:bg-[#8a7a3d] text-white cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A5914B]"
              type="submit"
              disabled={isPending}
              aria-disabled={isPending}
            >
              {isPending ? (
                <span className="flex justify-center items-center">
                  <LoaderCircle className="animate-spin h-5 w-5 mr-2 text-white" aria-hidden="true" />
                  <span>Creating account...</span>
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </div>

          {canShowResend ? (
            <div className="w-full text-center">
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={isPending || isResendLoading}
                className="cursor-pointer text-xs text-[#A5914B] hover:text-[#8a7a3d] underline underline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#A5914B] rounded px-1"
              >
                {isResendLoading
                  ? "Sending confirmation email..."
                  : "Resend confirmation email"}
              </button>
              {resendStatus?.message ? (
                <p
                  className={`mt-2 text-xs font-medium ${
                    resendStatus.type === "success"
                      ? "text-green-700 bg-green-50 p-2 rounded"
                      : "text-red-600 bg-red-50 p-2 rounded"
                  }`}
                  role="alert"
                  aria-live="polite"
                >
                  {resendStatus.message}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Divider */}
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#fffcef] text-gray-500">or continue with</span>
            </div>
          </div>

          {/* Google Sign Up */}
          <div className="w-full">
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={isPending || isGoogleLoading}
              className="w-full disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center px-4 py-3 text-sm sm:text-base font-medium transition-all duration-200 bg-white border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A5914B]"
            >
              {isGoogleLoading ? (
                <span className="flex items-center justify-center">
                  <LoaderCircle className="animate-spin h-5 w-5 mr-2" aria-hidden="true" />
                  <span>Redirecting...</span>
                </span>
              ) : (
                <>
                  <Image
                    width={20}
                    height={20}
                    src="/google.svg"
                    alt=""
                    className="mr-3"
                    aria-hidden="true"
                  />
                  <span>Sign up with Google</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Login Link */}
        <div className="w-full flex items-center justify-center pt-2">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-[#A5914B] hover:text-[#8a7a3d] font-medium underline underline-offset-2 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#A5914B] rounded px-1">
              Log in
            </Link>
          </p>
        </div>

        {/* Terms */}
        <div className="w-full text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="text-[#A5914B] hover:text-[#8a7a3d] underline underline-offset-1 transition-colors focus:outline-none focus:ring-1 focus:ring-[#A5914B] rounded px-0.5">
              Terms of Service
            </Link>{" "}

            and{" "}
            <Link href="/privacy" className="text-[#A5914B] hover:text-[#8a7a3d] underline underline-offset-1 transition-colors focus:outline-none focus:ring-1 focus:ring-[#A5914B] rounded px-0.5">
              Privacy Policy
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
