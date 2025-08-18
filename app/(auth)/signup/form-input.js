"use client";
import React, { useState } from "react";
import { PhoneInput } from "react-simple-phone-input";
import "react-simple-phone-input/dist/style.css";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";

export default function FormInput(props) {
  const { state, formAction, isPending } = props;
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col space-y-4 w-full px-5 lg:px-[5rem] items-center justify-center font-poppins">
      <div className="flex flex-col w-full items-center justify-center">
        <h3 className="font-medium text-2xl text-text dark:text-white">Sign Up</h3>
        <p className="text-sm text-[#949ca9] font-light">Create an account to get started</p>
      </div>
      <form
        action={formAction}
        className="flex flex-col w-full space-y-8 items-center justify-center"
      >
        <div className="flex flex-col w-full space-y-4 items-center justify-center">
          <div className="flex flex-col w-full space-y-2 text-sm">
            <label>
              First Name
              <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col w-full">
              <input
                type="text"
                name="firstname"
                defaultValue={state?.values?.firstname || ""}
                className={`w-full border border-gray-200 rounded-md p-2 form-input focus:outline-none focus:ring-2  ${
                  Object.keys(state?.errors).length !== 0 &&
                  state?.errors?.firstname?.length
                    ? "border-red-500 focus:ring-red-500"
                    : "focus:ring-primary"
                }`}
                placeholder="John"
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
          </div>
          <div className="flex flex-col w-full space-y-2 text-sm">
            <label>
              Last Name
              <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col w-full">
              <input
                type="text"
                name="lastname"
                defaultValue={state?.values?.lastname || ""}
                className={`w-full border border-gray-200 rounded-md p-2 form-input focus:outline-none focus:ring-2  ${
                  Object.keys(state?.errors).length !== 0 &&
                  state?.errors?.lastname?.length
                    ? "border-red-500 focus:ring-red-500"
                    : "focus:ring-primary"
                }`}
                placeholder="Doe"
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
          </div>

          <div className="flex flex-col w-full space-y-2 text-sm">
            <label>
              Email
              <span className="text-red-500">*</span>
            </label>
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

          <div className="flex flex-col w-full space-y-2 text-sm">
            <label>
              Phone
              <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col w-full">
              <PhoneInput
                country="GH"
                value={phone}
                onChange={(data) => {
                  // Safety guard — trims if needed
                  if (data?.valueWithoutPlus?.length > 15) {
                    setPhone({
                      ...data,
                      value: "+" + data.valueWithoutPlus.slice(0, 15),
                      valueWithoutPlus: data.valueWithoutPlus.slice(0, 15)
                    });
                    return;
                  }
                  setPhone(data);
                }}
                inputProps={{
                  onKeyDown: (e) => {
                    const digitsOnly = phone?.valueWithoutPlus || "";
                    const isNumberKey = /^[0-9]$/.test(e.key);
              
                    if (isNumberKey && digitsOnly.length >= 15) {
                      e.preventDefault(); // Block typing
                    }
                  },
                  onPaste: (e) => {
                    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
                    const current = phone?.valueWithoutPlus || "";
              
                    if (current.length + pasted.length > 15) {
                      e.preventDefault(); // Block pasting too many digits
                    }
                  }
                }}
                containerStyle={{
                  width: "100%",
                  borderRadius: "4px",
                  backgroundColor: isDark ? "#0a0a0a" : "#fff",
                  border: isDark ? "1px solid #374151" : "1px solid #e5e7eb",
                }}
                inputStyle={{
                  width: "100%",
                  backgroundColor: isDark ? "#0a0a0a" : "#fff",
                  color: isDark ? "#fff" : "#111827",
                }}
                buttonStyle={{
                  backgroundColor: "#fff",
                }}
                dropdownStyle={{
                  top: "auto",
                  bottom: "100%",
                  backgroundColor: isDark ? "#111827" : "#fff",
                  color: isDark ? "#fff" : "#111827",
                  border: isDark ? "1px solid #374151" : "1px solid #e5e7eb",
                }}
                placeholder="xxx xxx xxxx"
              />
              <span className="text-xs text-red-500">
                {Object.keys(state?.errors).length !== 0
                  ? state?.errors?.phone?.length
                    ? state.errors.phone[0]
                    : Object.keys(state?.errors?.credentials || {}).length !==
                        0 && state?.errors?.credentials?.phone
                    ? state.errors.credentials.phone
                    : null
                  : null}
              </span>
            </div>
            <input
              hidden
              name="phone"
              value={
                phone?.value && phone.dialCode
                  ? phone.value.startsWith(phone.dialCode + "0")
                    ? phone.value.replace(phone.dialCode + "0", phone.dialCode)
                    : phone.value
                  : ""
              }
              onChange={(data) => setPhone(data)}
            />
          </div>

          <div className="flex items-center w-full space-x-4 text-sm">
            <div className="flex flex-col w-full space-y-2 text-sm h-[4.5rem]">
              <label>
                Password
                <span className="text-red-500">*</span>
              </label>

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
            <div className="flex flex-col w-full space-y-2 text-sm h-[4.5rem]">
              <label>
                Confirm Password
                <span className="text-red-500">*</span>
              </label>

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
        </div>
        <div className="w-full">
          <button
            className="disabled:cursor-not-allowed border border-black flex items-center justify-center py-2 w-full rounded-md text-sm bg-black hover:bg-white text-white hover:text-black cursor-pointer"
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
        <div className="w-full">
          <p className="text-sm text-center">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary cursor-pointer hover:text-secondary"
            >
              Login
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
