"use client";
import React from "react";
import { LoaderCircle, OctagonAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function FormInput(props) {
  const { formAction, state, isPending } = props;

  return (
    <div className="flex flex-col space-y-4 w-full items-center justify-center font-brasley-medium">
      <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
        Enter your email address associated with your Giftologi account and we'll send you a link to reset your password.
      </p>
      <form
        action={formAction}
        className="flex flex-col w-full space-y-6 sm:space-y-8 items-center justify-center"
        aria-label="Password reset form"
      >
        <div className="flex flex-col w-full space-y-4 items-center justify-center">
          {/* Email Field */}
          <div className="flex flex-col w-full text-sm">
            <label htmlFor="email" className="sr-only">Email address</label>
            <input
              id="email"
              type="email"
              name="email"
              className={`w-full border border-gray-200 rounded-md bg-white p-3 text-base form-input focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all ${
                Object.keys(state?.errors).length !== 0 &&
                (state?.errors?.email?.length ||
                  (Object.keys(state?.errors?.credentials || {}).length !== 0 &&
                    state?.errors?.credentials?.email))
                  ? "border-red-500 focus:ring-red-500"
                  : "focus:ring-[#A5914B]"
              }`}
              placeholder="Email address (name@email.com)"
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
        </div>
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
                <span>Sending...</span>
              </span>
            ) : (
              "Send reset link"
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
