"use client";
import React, { useState } from "react";
import {
  ArrowRight,
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
    <div className="flex flex-col space-y-4 w-full items-center justify-center md:my-0 font-poppins">
      <form
        action={formAction}
        className="flex flex-col w-full space-y-8 items-center justify-center"
      >
        <div className="flex flex-col w-full space-y-4 items-center justify-center">
          <div className="flex flex-col w-full text-sm">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className={`w-full border border-gray-200 rounded-md bg-white p-2 form-input focus:outline-none focus:ring-2 pr-10 ${
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
                  s</span>
                ) : null
              ) : null}
            </span>
          </div>

          <div className="flex flex-col w-full text-sm">
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirm_password"
                className={`w-full border border-gray-200 rounded-md bg-white p-2 form-input focus:outline-none focus:ring-2 pr-10 ${
                  Object.keys(state?.errors).length !== 0 &&
                  state?.errors?.confirm_password?.length
                    ? "border-red-500 focus:ring-red-500"
                    : "focus:ring-primary"
                }`}
                placeholder="Confirm Password"
                disabled={isPending}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-3 flex items-center cursor-pointer"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <span className="text-xs">
              {Object.keys(state?.errors).length !== 0 ? (
                state?.errors?.confirm_password?.length ? (
                  <span className="flex items-center space-x-2 text-red-500 font-medium bg-red-100 mt-2 p-2 border border-red-500 rounded-md">
                    <OctagonAlert className="size-5 text-red-500 pr-1" />
                    {state.errors.confirm_password[0]}
                  </span>
                ) : Object.keys(state?.errors?.credentials || {}).length !==
                    0 && state?.errors?.credentials?.confirm_password ? (
                  <span className="flex items-center space-x-2 text-red-500 font-medium bg-red-100 mt-2 p-2 border border-red-500 rounded-md">
                    <OctagonAlert className="size-5 text-red-500 pr-1" />
                    {state.errors.credentials.confirm_password}
                  </span>
                ) : null
              ) : null}
            </span>
          </div>
        </div>

        <input type="hidden" name="email" value={email} />
        <div className="w-full flex flex-col space-y-4">
          <button
            className="disabled:cursor-not-allowed flex items-center justify-center py-2 w-full rounded-lg text-sm bg-primary hover:bg-white text-white hover:text-primary border border-primary cursor-pointer"
            type="submit"
            disabled={isPending}
          >
            {isPending ? (
              <span className="flex justify-center items-center">
                <LoaderCircle className="animate-spin h-5 w-5 mr-3 text-white" />
              </span>
            ) : (
              "Reset Password"
            )}
          </button>
          <div className="text-sm">
            <Link
              href="/login"
              className="text-primary cursor-pointer flex items-center space-x-2"
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
