"use client";
import React, { useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LoaderCircle,
  OctagonAlert,
} from "lucide-react";
import Link from "next/link";

export default function FormInput(props) {
  const { state, formAction, isPending, email } = props;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="flex flex-col space-y-4 w-full items-center justify-center font-brasley-medium">
      <form
        action={formAction}
        className="flex flex-col w-full space-y-6 sm:space-y-8 items-center justify-center"
        aria-label="Reset password form"
      >
        <div className="flex flex-col w-full space-y-4 items-center justify-center">
          {/* Password Field */}
          <div className="flex flex-col w-full text-sm">
            <label htmlFor="password" className="sr-only">New password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                className={`w-full border border-gray-200 rounded-md bg-white p-3 text-base form-input focus:outline-none focus:ring-2 focus:ring-offset-1 pr-12 transition-all ${
                  Object.keys(state?.errors).length !== 0 &&
                  state?.errors?.password?.length
                    ? "border-red-500 focus:ring-red-500"
                    : "focus:ring-[#A5914B]"
                }`}
                placeholder="New password"
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

          {/* Confirm Password Field */}
          <div className="flex flex-col w-full text-sm">
            <label htmlFor="confirm_password" className="sr-only">Confirm new password</label>
            <div className="relative">
              <input
                id="confirm_password"
                type={showConfirmPassword ? "text" : "password"}
                name="confirm_password"
                className={`w-full border border-gray-200 rounded-md bg-white p-3 text-base form-input focus:outline-none focus:ring-2 focus:ring-offset-1 pr-12 transition-all ${
                  Object.keys(state?.errors).length !== 0 &&
                  state?.errors?.confirm_password?.length
                    ? "border-red-500 focus:ring-red-500"
                    : "focus:ring-[#A5914B]"
                }`}
                placeholder="Confirm new password"
                disabled={isPending}
                required
                autoComplete="new-password"
                aria-required="true"
                aria-invalid={state?.errors?.confirm_password?.length > 0 || state?.errors?.credentials?.confirm_password ? "true" : "false"}
                aria-describedby={state?.errors?.confirm_password?.length > 0 || state?.errors?.credentials?.confirm_password ? "confirm-password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-3 flex items-center cursor-pointer p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#A5914B]"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-600" aria-hidden="true" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-600" aria-hidden="true" />
                )}
              </button>
            </div>
            <span className="text-xs mt-1" id="confirm-password-error" role="alert" aria-live="polite">
              {Object.keys(state?.errors).length !== 0 ? (
                state?.errors?.confirm_password?.length ? (
                  <span className="flex items-center space-x-2 text-red-600 font-medium bg-red-50 mt-2 p-2 border border-red-200 rounded-md">
                    <OctagonAlert className="size-5 text-red-600 pr-1 flex-shrink-0" aria-hidden="true" />
                    <span>{state.errors.confirm_password[0]}</span>
                  </span>
                ) : Object.keys(state?.errors?.credentials || {}).length !== 0 && state?.errors?.credentials?.confirm_password ? (
                  <span className="flex items-center space-x-2 text-red-600 font-medium bg-red-50 mt-2 p-2 border border-red-200 rounded-md">
                    <OctagonAlert className="size-5 text-red-600 pr-1 flex-shrink-0" aria-hidden="true" />
                    <span>{state.errors.credentials.confirm_password}</span>
                  </span>
                ) : null
              ) : null}
            </span>
          </div>
        </div>

        <input type="hidden" name="email" value={email} />
        <div className="w-full flex flex-col space-y-4">
          <button
            className="disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center py-3 px-4 w-full rounded-full text-sm sm:text-base font-medium bg-[#A5914B] hover:bg-[#8a7a3d] text-white cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A5914B]"
            type="submit"
            disabled={isPending}
            aria-disabled={isPending}
          >
            {isPending ? (
              <span className="flex justify-center items-center">
                <LoaderCircle className="animate-spin h-5 w-5 mr-2 text-white" aria-hidden="true" />
                <span>Resetting...</span>
              </span>
            ) : (
              "Reset password"
            )}
          </button>
          <div className="text-sm text-center">
            <Link
              href="/login"
              className="text-[#A5914B] hover:text-[#8a7a3d] font-medium cursor-pointer flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#A5914B] rounded px-2 py-1"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Back to Sign in</span>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
