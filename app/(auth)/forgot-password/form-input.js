"use client";
import React, { useActionState, useEffect } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function FormInput(props) {
  const { formAction, state, isPending } = props;

  return (
    <div className="flex flex-col space-y-4 w-full px-5 lg:px-[5rem] items-center justify-center font-poppins">
      <div className="flex flex-col w-full items-center justify-center">
        <h3 className="font-medium text-2xl text-text dark:text-white">
          Forgot Password
        </h3>
        <p className="text-sm text-[#949ca9] font-light">
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>
      </div>
      <form
        action={formAction}
        className="flex flex-col w-full space-y-8 items-center justify-center"
      >
        <div className="flex flex-col w-full space-y-4 items-center justify-center">
          <div className="flex flex-col w-full space-y-2 text-sm">
            <label>Email</label>
            <div className="flex flex-col w-full">
              <input
                type="email"
                name="email"
                defaultValue={state?.values?.email || ""}
                className={`w-full border border-gray-200 rounded-md p-2 form-input focus:outline-none focus:ring-2  ${
                  Object.keys(state?.errors).length !== 0 &&
                  (state?.errors?.email?.length ||
                    (Object.keys(state?.errors?.credentials || {}).length !==
                      0 &&
                      state?.errors?.credentials?.email))
                    ? "border-red-500 focus:ring-red-500"
                    : "focus:ring-primary"
                }`}
                placeholder="john@example.com"
                disabled={isPending}
                required
              />
              <span className="text-xs text-red-500">
                {Object.keys(state?.errors).length !== 0
                  ? state?.errors?.email?.length
                    ? state.errors.email[0]
                    : Object.keys(state?.errors?.credentials || {}).length !==
                        0 && state?.errors?.credentials?.email
                    ? state.errors.credentials.email
                    : null
                  : null}
              </span>
            </div>
          </div>
        </div>
        <div className="w-full flex flex-col space-y-4">
          <button
            className="disabled:cursor-not-allowed flex items-center justify-center py-2 w-full rounded-md text-sm bg-primary hover:bg-secondary text-white cursor-pointer"
            type="submit"
            disabled={isPending}
          >
            {isPending ? (
              <span className="flex justify-center items-center">
                <LoaderCircle className="animate-spin h-5 w-5 mr-3 text-white" />
              </span>
            ) : (
              "Send"
            )}
          </button>
          <div className="text-sm">
            <Link
              href="/login"
              className="text-primary hover:text-secondary cursor-pointer flex items-center space-x-2"
            >
              <span>Back to Login</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
