"use client";
import React, { useState } from "react";
import { PhoneInput } from "react-simple-phone-input";
import "react-simple-phone-input/dist/style.css";
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

  const handleGoogleSignUp = async () => {
    try {
      setIsGoogleLoading(true);
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
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
                type="text"
                name="firstname"
                placeholder="First Name"
                defaultValue={state?.values?.firstname || ""}
                className={`w-full border border-gray-200 bg-white rounded-md p-2 form-input focus:outline-none focus:ring-2  ${
                  Object.keys(state?.errors).length !== 0 &&
                  state?.errors?.firstname?.length
                    ? "border-red-500 focus:ring-red-500"
                    : "focus:ring-primary"
                }`}
                disabled={isPending}
                required
              />
              <span className="text-xs text-red-500">
                {Object.keys(state?.errors).length !== 0 &&
                state?.errors?.firstname?.length
                  ? state?.errors?.firstname[0]
                  : null}
              </span>
            </div>

            <div className="flex flex-col w-full text-sm">
              <input
                type="text"
                name="lastname"
                defaultValue={state?.values?.lastname || ""}
                className={`w-full border border-gray-200 bg-white rounded-md p-2 form-input focus:outline-none focus:ring-2  ${
                  Object.keys(state?.errors).length !== 0 &&
                  state?.errors?.lastname?.length
                    ? "border-red-500 focus:ring-red-500"
                    : "focus:ring-primary"
                }`}
                placeholder="Last Name"
                disabled={isPending}
                required
              />
              <span className="text-xs text-red-500">
                {Object.keys(state?.errors).length !== 0 &&
                state?.errors?.lastname?.length
                  ? state?.errors?.lastname[0]
                  : null}
              </span>
            </div>

            <div className="flex flex-col w-full text-sm">
              <input
                type="email"
                name="email"
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
                placeholder="Email"
                disabled={isPending}
                required
              />
              <span className="text-xs ">
                {Object.keys(state?.errors).length !== 0 ? (
                  state?.errors?.email?.length ? (
                    state.errors.email[0]
                  ) : Object.keys(state?.errors?.credentials || {}).length !==
                      0 && state?.errors?.credentials?.email ? (
                    <span className="flex items-center space-x-2 text-red-500 bg-red-100 mt-2 p-2 border border-red-500 rounded-md">
                      <OctagonAlert className="size-4 text-red-500" />
                      {state.errors.credentials.email}
                    </span>
                  ) : null
                ) : null}
              </span>
            </div>

            <div className="flex flex-col w-full text-sm h-[4.5rem]">
              <div className="flex flex-col w-full">
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
                    placeholder="Password"
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
                <span className="text-xs text-red-500">
                  {Object.keys(state?.errors).length !== 0 &&
                  state?.errors?.password?.length
                    ? state?.errors?.password[0]
                    : null}
                </span>
              </div>
            </div>
          </div>
          <div className="w-full">
            <button
              className="disabled:cursor-not-allowed border border-primary flex items-center justify-center py-2 w-full rounded-md text-sm bg-primary hover:bg-white text-white hover:text-primary cursor-pointer"
              type="submit"
              disabled={isPending}
            >
              {isPending ? (
                <span className="flex justify-center items-center">
                  <LoaderCircle className="animate-spin h-5 w-5 mr-3 text-white" />
                </span>
              ) : (
                "Sign Up"
              )}
            </button>
          </div>
          <h2 className="text-primary w-full text-sm text-center border-b leading-[0.1em] mt-[10px] mx-0 mb-[20px] ">
            <span className="bg-[#FFFCEF] text-primary px-5 py-0 mt-1">OR</span>
          </h2>
          <div className="flex lg:justify-center lg:flex-row  lg:items-center flex-col gap-4 w-full">
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={isPending || isGoogleLoading}
              className="w-full disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex items-center font-semibold justify-center px-6 mt-4 text-xl transition-colors duration-300 bg-white border text-gray-700 dark:text-black rounded-2xl py-2 focus:shadow-outline hover:bg-slate-200 border-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-700"
            >
              {isGoogleLoading ? (
                <span className="flex items-center">
                  <LoaderCircle className="animate-spin h-5 w-5 mr-3" />
                  <span className="text-base font-medium">Redirecting…</span>
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
                    Sign up with Google
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
        <div className="w-full">
          <p className="text-sm text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-primary cursor-pointer">
              Login
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
