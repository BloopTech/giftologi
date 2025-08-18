"use client";
import React, { useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";


export default function FormInput(props) {
  const { state, formAction, isPending, email } = props;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="flex flex-col space-y-4 w-full px-5 lg:px-[5rem] items-center justify-center md:my-0 font-poppins">
      <div className="flex flex-col w-full items-center justify-center">
        <h3 className="font-medium text-2xl text-text dark:text-white">Reset Password</h3>
        <p className="text-sm text-[#949ca9] font-light">Create an account to get started</p>
      </div>
      <form
        action={formAction}
        className="flex flex-col w-full space-y-8 items-center justify-center"
      >
        <div className="flex flex-col w-full space-y-4 items-center justify-center">
          <div className="flex flex-col w-full space-y-2 text-sm">
            <label>Password</label>

            <div className="flex flex-col w-full">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className={`w-full border border-gray-200 rounded-md p-2 form-input focus:outline-none focus:ring-2 pr-10 ${
                    Object.keys(state?.errors).length !== 0 &&
                    state?.errors?.password?.length
                      ? "border-red-500 focus:ring-red-500"
                      : "focus:ring-primary"
                  }`}
                  placeholder="********"
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
          <div className="flex flex-col w-full space-y-2 text-sm">
            <label>Confirm Password</label>

            <div className="flex flex-col w-full">
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirm_password"
                  className={`w-full border border-gray-200 rounded-md p-2 form-input focus:outline-none focus:ring-2 pr-10 ${
                    Object.keys(state?.errors).length !== 0 &&
                    state?.errors?.confirm_password?.length
                      ? "border-red-500 focus:ring-red-500"
                      : "focus:ring-primary"
                  }`}
                  placeholder="********"
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
              <span className="text-xs text-red-500">
                {Object.keys(state?.errors).length !== 0 &&
                state?.errors?.confirm_password?.length
                  ? state?.errors?.confirm_password[0]
                  : null}
              </span>
            </div>
          </div>
        </div>

        <input type="hidden" name="email" value={email} />
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
              "Reset Password"
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
