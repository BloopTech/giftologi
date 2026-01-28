"use client";
import React, { useRef, useState } from "react";
import { Eye, EyeOff, LoaderCircle, OctagonAlert } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createClient as createSupabaseClient } from "../../utils/supabase/client";

export default function FormInput(props) {
  const [showPassword, setShowPassword] = useState(false);
  const { state, formAction, isPending } = props;

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);
  const emailRef = useRef(null);

  const handleGoogleSignIn = async () => {
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
        console.error("Google sign-in error:", error.message);
      }
      // Supabase will handle the redirect automatically
    } catch (e) {
      console.error("Google sign-in unexpected error:", e);
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
    <div className="flex flex-col space-y-4 w-full items-center justify-center font-poppins">
      <form
        action={formAction}
        className="flex flex-col w-full space-y-8 items-center justify-center"
      >
        <div className="flex flex-col w-full space-y-4 items-center justify-center">
          <div className="flex flex-col w-full space-y-4 items-center justify-center">
            <div className="flex flex-col w-full text-sm">
              <input
                type="email"
                name="email"
                ref={emailRef}
                defaultValue={state?.values?.email || ""}
                className={`w-full border border-gray-200 bg-white rounded-md p-2 form-input focus:outline-none focus:ring-2  ${
                  Object.keys(state?.errors).length !== 0 &&
                  (state?.errors?.email?.length ||
                    (Object.keys(state?.errors?.credentials || {}).length !==
                      0 &&
                      state?.errors?.credentials?.email))
                    ? "border-red-500 focus:ring-red-500"
                    : "focus:ring-primary"
                }`}
                placeholder="email"
                disabled={isPending}
                required
              />
              <span className="text-xs ">
                {Object.keys(state?.errors).length !== 0 ? (
                  state?.errors?.email?.length ? (
                    <span className="flex items-center space-x-2 text-red-500 font-medium bg-red-100 mt-2 p-2 border border-red-500 rounded-md">
                      <OctagonAlert className="size-5 text-red-500 pr-1" />
                      {state.errors.email[0]}
                    </span>
                  ) : Object.keys(state?.errors?.credentials || {}).length !==
                      0 && state?.errors?.credentials?.email ? (
                    <span className="flex items-center space-x-2 text-red-500 font-medium bg-red-100 mt-2 p-2 border border-red-500 rounded-md">
                      <OctagonAlert className="size-5 text-red-500 pr-1" />
                      {state.errors.credentials.email}
                    </span>
                  ) : !(
                      state?.errors.password?.length ||
                      state?.errors?.credentials?.password
                    ) && Object.keys(state?.errors).length !== 0 && state?.message ? (
                    <span className="flex items-center space-x-2 text-red-500 font-medium bg-red-100 mt-2 p-2 border border-red-500 rounded-md">
                      <OctagonAlert className="size-5 text-red-500 pr-1" />
                      {state.message}
                    </span>
                  ) : null
                ) : null}
              </span>
            </div>

            <div className="flex flex-col w-full text-sm">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className={`w-full border border-gray-200 bg-white rounded-md p-2 form-input focus:outline-none focus:ring-2 pr-10 ${
                    Object.keys(state?.errors).length !== 0 &&
                    state?.errors?.password?.length
                      ? "border-red-500 focus:ring-red-500"
                      : "focus:ring-primary"
                  }`}
                  placeholder="password"
                  disabled={isPending}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <span className="text-xs">
                {Object.keys(state?.errors).length !== 0 ? (
                  state?.errors?.password?.length ? (
                    <span className="flex items-center space-x-2 text-red-500 font-medium bg-red-100 mt-2 p-2 border border-red-500 rounded-md">
                      <OctagonAlert className="size-5 text-red-500 pr-1" />
                      {state.errors.password[0]}
                    </span>
                  ) : Object.keys(state?.errors?.credentials || {}).length !==
                      0 && state?.errors?.credentials?.password ? (
                    <span className="flex items-center space-x-2 text-red-500 font-medium bg-red-100 mt-2 p-2 border border-red-500 rounded-md">
                      <OctagonAlert className="size-5 text-red-500 pr-1" />
                      {state.errors.credentials.password}
                    </span>
                  ) : null
                ) : null}
              </span>
            </div>
          </div>
          <div className="w-full flex flex-col space-y-2">
            <button
              className="disabled:cursor-not-allowed flex items-center justify-center py-2 w-full rounded-4xl text-sm bg-primary hover:bg-white hover:text-primary border border-primary text-white cursor-pointer"
              type="submit"
              disabled={isPending}
            >
              {isPending ? (
                <span className="flex justify-center items-center">
                  <LoaderCircle className="animate-spin h-5 w-5 mr-3 text-white" />
                </span>
              ) : (
                "Login"
              )}
            </button>
            <div className="text-sm text-center flex justify-end">
              <Link
                href="/forgot-password"
                className="text-primary cursor-pointer"
              >
                Forgot Password
              </Link>
            </div>
            {canShowResend ? (
              <div className="text-xs text-center">
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={isPending || isResendLoading}
                  className="cursor-pointer text-primary underline disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isResendLoading
                    ? "Sending confirmation email..."
                    : "Resend confirmation email"}
                </button>
                {resendStatus?.message ? (
                  <p
                    className={`mt-2 text-xs font-medium ${
                      resendStatus.type === "success"
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {resendStatus.message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <h2 className="text-primary w-full text-sm text-center border-b leading-[0.1em] mt-[10px] mx-0 mb-[20px] ">
            <span className="bg-[#FFFCEF] text-primary px-5 py-0 mt-1">OR</span>
          </h2>
          <div className="flex lg:justify-center lg:flex-row  lg:items-center flex-col gap-4 w-full">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isPending || isGoogleLoading}
              className="w-full disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex items-center font-semibold justify-center px-6 mt-4 text-xl transition-colors duration-300 bg-white border text-gray-700 dark:text-black rounded-2xl py-2 focus:shadow-outline hover:bg-slate-200 border-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-700"
            >
              {isGoogleLoading ? (
                <span className="flex items-center">
                  <LoaderCircle className="animate-spin h-5 w-5 mr-3" />
                  <span className="text-base font-medium">Signing in…</span>
                </span>
              ) : (
                <>
                  <Image
                    width={20}
                    height={20}
                    src="/google.svg"
                    alt="google logo"
                    priority
                  />
                  <span className="text-base font-medium ml-4">
                    Sign in with Google
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
        <div className="w-full flex items-center justify-center">
          <p className="text-sm">
            {"Don't have an account?"}{" "}
            <Link href="/signup" className="text-primary cursor-pointer">
              {"Sign Up"}
            </Link>
          </p>
        </div>
        <div className="flex w-full text-xs">
          <p>
            By using Giftologi, you are agreeing to our{" "}
            <Link href="/terms" className="text-primary underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary underline">
              Privacy Policy.
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
