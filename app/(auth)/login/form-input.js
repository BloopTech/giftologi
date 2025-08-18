"use client";
import React, { useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";

export default function FormInput(props) {
  const [showPassword, setShowPassword] = useState(false);
  const { state, formAction, isPending } = props;


  return (
    <div className="flex flex-col space-y-4 w-full px-5 lg:px-[5rem] items-center justify-center md:my-0 font-poppins">
      <div className="flex flex-col w-full items-center justify-center">
        <h3 className="font-medium text-2xl text-text dark:text-white">Login</h3>
        <p className="text-sm text-[#949ca9] font-light">Login to get started</p>
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
                placeholder="johndoe@yahoo.com"
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
        </div>
        <div className="w-full flex flex-col space-y-2">
          <button
            className="disabled:cursor-not-allowed flex items-center justify-center py-2 w-full rounded-md text-sm bg-black hover:bg-white hover:text-black border border-black text-white cursor-pointer"
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
              className="text-primary hover:text-secondary cursor-pointer"
            >
              Forgot Password
            </Link>
          </div>
        </div>
        <div className="w-full">
          <p className="text-sm text-center">
            {"Not a user?"}{" "}
            <Link
              href="/signup"
              className="text-primary hover:text-secondary cursor-pointer"
            >
              {"Sign Up"}
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
