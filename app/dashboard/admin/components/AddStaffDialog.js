"use client";
import React, { useActionState, useEffect, useMemo, useState } from "react";
import { manageRoles } from "../action";
import { toast } from "sonner";
import { Eye, EyeOff, LoaderCircle, CheckCircle2, XCircle, Copy } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/Select";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import { DialogClose } from "@/app/components/Dialog";
import { useRolesContext } from "../roles/context";

const initialState = {
  message: "",
  errors: {
    email: [],
    password: [],
    fullName: [],
    role: [],
    phone: [],
    credentials: {},
    unknown: "",
  },
  values: {},
  data: {},
};

const ROLE_OPTIONS = [
  { label: "Super Admin", value: "super_admin" },
  { label: "Operations Manager", value: "operations_manager_admin" },
  { label: "Finance", value: "finance_admin" },
  { label: "Customer Support", value: "customer_support_admin" },
  { label: "Ops/HR", value: "ops_hr_admin" },
];

const ROLE_MODULES = {
  super_admin: [
    "Dashboard",
    "Registry Lists",
    "Vendors",
    "Products",
    "Transactions",
    "Payouts",
    "Reports",
    "Support Tickets",
    "Activity Log",
    "Content & Policy",
  ],
  operations_manager_admin: [
    "Registry Lists",
    "Vendor Requests",
    "Manage Products",
    "View Transactions",
  ],
  finance_admin: ["View Payouts", "Generate Reports"],
  customer_support_admin: ["Dashboard", "Support Tickets"],
  ops_hr_admin: ["Staff Directory", "Invite Staff", "Assign Roles"],
};

function getRoleLabel(value) {
  const found = ROLE_OPTIONS.find((r) => r.value === value);
  return found ? found.label : "Select role";
}

function generateStrongPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "0123456789";
  const symbols = "!@#$%^&*()-_=+[]{}<>?";
  const all = upper + lower + digits + symbols;

  let password = "";
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  password += digits[Math.floor(Math.random() * digits.length)];

  while (password.length < 8) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export default function AddStaffDialog({ onClose }) {
  const [state, formAction, isPending] = useActionState(manageRoles, initialState);
  const { refreshStaff } = useRolesContext() || {};

  const [roleValue, setRoleValue] = useState(state?.values?.role ?? "");
  const [password, setPassword] = useState(state?.values?.password ?? "");
  const [showPassword, setShowPassword] = useState(false);

  // useEffect(() => {
  //   setRoleValue(state?.values?.role ?? "");
  //   setPassword(state?.values?.password ?? "");
  // }, [state?.values]);

  useEffect(() => {
    const hasErrors =
      state?.message &&
      state?.errors &&
      Object.keys(state.errors || {}).length > 0;

    const hasData =
      state?.message &&
      state?.data &&
      Object.keys(state.data || {}).length > 0;

    const errorMessage = (state?.message || "").trim();

    if (hasErrors) {
      toast.custom(() => (
        <div className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-[#B91C1C] bg-[#450A0A] px-4 py-3 text-white shadow-lg">
          <div className="mt-0.5">
            <XCircle className="size-6 text-[#FCA5A5]" />
          </div>
          <div className="flex-1 text-xs">
            <p className="text-sm font-semibold">Something went wrong</p>
            <p className="mt-1 text-[11px] text-[#FECACA]">
              {errorMessage ||
                "The user account was not created. Please try again."}
            </p>
          </div>
        </div>
      ));
    }

    if (hasData) {
      const credentials = state?.data?.credentials || {};
      toast.custom(() => (
        <div className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-[#15803D] bg-[#14532D] px-4 py-3 text-white shadow-lg">
          <div className="mt-0.5">
            <CheckCircle2 className="size-6 text-[#22C55E]" />
          </div>
          <div className="flex-1 text-xs">
            <p className="text-sm font-semibold">Staff Member Created</p>
            {credentials?.password ? (
              <p className="mt-1">
                Password:{" "}
                <span className="font-mono font-semibold">
                  {credentials.password}
                </span>
              </p>
            ) : null}
            <p className="mt-1 text-[11px] text-[#BBF7D0]">
              Email sent to {credentials?.email || state?.email || "the staff member"} with
              login credentials.
            </p>
          </div>
        </div>
      ));
      refreshStaff?.();
      onClose?.();
    }
  }, [state?.message, state?.errors, state?.data, state?.email, onClose, refreshStaff]);

  const errorFor = (key) => state?.errors?.[key] ?? [];
  const hasError = (key) => (errorFor(key)?.length ?? 0) > 0;

  const permissionModules = useMemo(
    () => ROLE_MODULES[roleValue] ?? [],
    [roleValue]
  );

  const handleGeneratePassword = () => {
    const generated = generateStrongPassword();
    setPassword(generated);
  };

  const handleCopyPassword = async () => {
    if (password) {
      try {
        await navigator.clipboard.writeText(password);
        toast.success("Password copied to clipboard");
      } catch (err) {
        toast.error("Failed to copy password");
      }
    }
  };

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1">
          <label
            htmlFor="fullName"
            className="text-xs font-medium text-[#0A0A0A]"
          >
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            placeholder="Joe Doe"
            className={cx(
              "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
              "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
              focusInput,
              hasError("fullName") ? hasErrorInput : ""
            )}
            disabled={isPending}
          />
          {hasError("fullName") ? (
            <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
              {errorFor("fullName").map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="email"
            className="text-xs font-medium text-[#0A0A0A]"
          >
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="joe.doe@giftologi.com"
            className={cx(
              "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
              "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
              focusInput,
              hasError("email") ? hasErrorInput : ""
            )}
            disabled={isPending}
          />
          {hasError("email") ? (
            <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
              {errorFor("email").map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="phone"
            className="text-xs font-medium text-[#0A0A0A]"
          >
            Phone Number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+233 000 0 00 0000"
            className={cx(
              "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
              "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
              focusInput,
              hasError("phone") ? hasErrorInput : ""
            )}
            disabled={isPending}
          />
          {hasError("phone") ? (
            <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
              {errorFor("phone").map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-[#717182]">
              Optional. For internal contact.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="password"
            className="text-xs font-medium text-[#0A0A0A]"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className={cx(
                "w-full rounded-full border px-4 py-2.5 pr-32 text-xs shadow-sm outline-none bg-white",
                "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                focusInput,
                hasError("password") ? hasErrorInput : ""
              )}
              placeholder="Auto-generated password"
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-24 flex items-center pr-2 text-[#717182] cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
            <button
              type="button"
              onClick={handleCopyPassword}
              className="absolute inset-y-0 right-16 flex items-center pr-2 text-[#717182] cursor-pointer"
              disabled={!password || isPending}
              title="Copy password"
            >
              <Copy className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="absolute inset-y-0 right-3 flex items-center text-[11px] font-medium text-[#3979D2] cursor-pointer"
              disabled={isPending}
            >
              Generate
            </button>
          </div>
          {hasError("password") ? (
            <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
              {errorFor("password").map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-[#717182]">
              System auto-generated. Must be at least 8 characters with upper, lower, and symbol.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[#0A0A0A]">
            Assign Role <span className="text-red-500">*</span>
          </label>
          <input type="hidden" name="role" value={roleValue} />
          <Select
            value={roleValue}
            onValueChange={setRoleValue}
            disabled={isPending}
            required
          >
            <SelectTrigger
              className={cx(
                "bg-white",
                hasError("role") ? hasErrorInput : ""
              )}
            >
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasError("role") ? (
            <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
              {errorFor("role").map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-[#717182]">
              Determines access permissions.
            </p>
          )}
        </div>

        <div className="space-y-2 pt-2">
          <p className="text-xs font-medium text-[#0A0A0A]">
            Permission Preview
          </p>
          <div className="rounded-2xl border border-[#A9C4FC] bg-[#EDF4FF] px-4 py-3 space-y-2">
            <p className="text-[11px] font-medium text-[#3979D2]">
              Accessible modules for {getRoleLabel(roleValue)}
            </p>
            <div className="flex flex-wrap gap-2">
              {permissionModules.length ? (
                permissionModules.map((module) => (
                  <span
                    key={module}
                    className="inline-flex items-center rounded-full border border-[#A9C4FC] bg-white px-3 py-1 text-[11px] text-[#3979D2]"
                  >
                    {module}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-[#717182]">
                  Select a role to preview accessible modules.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <DialogClose asChild>
          <button
            type="button"
            className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
            disabled={isPending}
          >
            Cancel
          </button>
        </DialogClose>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-full border border-[#3979D2] bg-[#3979D2] px-6 py-2 text-xs font-medium text-white hover:bg-white hover:text-[#3979D2] cursor-pointer"
        >
          {isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            "Create Staff"
          )}
        </button>
      </div>
    </form>
  );
}
