"use client";
import React, { useActionState, useEffect, useState } from "react";
import { createVendor } from "../action";
import { fetchVendorCategories } from "../vendorCategories";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  CheckCircle2,
  XCircle,
  Copy,
} from "lucide-react";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import { DialogClose } from "@/app/components/Dialog";

const initialState = {
  message: "",
  errors: {
    businessName: [],
    category: [],
    email: [],
    password: [],
    fullName: [],
    phone: [],
    credentials: {},
    unknown: "",
  },
  values: {},
  data: {},
};

function toAdminFriendlyVendorError(rawMessage) {
  const message = String(rawMessage || "").trim();
  if (!message) return "";

  const normalized = message.toLowerCase();

  const duplicateLike =
    normalized.includes("duplicate key") ||
    normalized.includes("unique constraint") ||
    normalized.includes("already exists") ||
    normalized.includes("already registered");

  if (duplicateLike) {
    if (normalized.includes("email")) {
      return "This email is already linked to an existing account. Use another email or ask the vendor to reset their password.";
    }

    return "A vendor account already exists for this user. Refresh and try again.";
  }

  if (normalized.includes("permission denied")) {
    return "You do not have permission to create this vendor.";
  }

  if (normalized.includes("foreign key")) {
    return "Some related account records could not be linked. Refresh and try again.";
  }

  return message;
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

export default function AddVendorDialog({ onClose }) {
  const [state, formAction, isPending] = useActionState(
    createVendor,
    initialState,
  );

  const [password, setPassword] = useState(state?.values?.password ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState(() => {
    const raw = state?.values?.category;
    return Array.isArray(raw)
      ? raw
      : typeof raw === "string" && raw.trim()
        ? [raw.trim()]
        : [];
  });

  useEffect(() => {
    const raw = state?.values?.category;
    const next = Array.isArray(raw)
      ? raw
      : typeof raw === "string" && raw.trim()
        ? [raw.trim()]
        : [];
    setSelectedCategories(next);
  }, [state?.values?.category]);

  // useEffect(() => {
  //   setPassword(state?.values?.password ?? "");
  // }, [state?.values]);

  useEffect(() => {
    const hasErrors =
      state?.message &&
      state?.errors &&
      Object.keys(state.errors || {}).length > 0;

    const hasData =
      state?.message && state?.data && Object.keys(state.data || {}).length > 0;

    const errorMessage = toAdminFriendlyVendorError((state?.message || "").trim());

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
                "The vendor account was not created. Please try again."}
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
            <p className="text-sm font-semibold">Vendor Created</p>
            {credentials?.password ? (
              <p className="mt-1">
                Password:{" "}
                <span className="font-mono font-semibold">
                  {credentials.password}
                </span>
              </p>
            ) : null}
            <p className="mt-1 text-[11px] text-[#BBF7D0]">
              Email sent to {credentials?.email || state?.email || "the vendor"}{" "}
              with login credentials.
            </p>
          </div>
        </div>
      ));
      onClose?.();
    }
  }, [state?.message, state?.errors, state?.data, state?.email, onClose]);

  useEffect(() => {
    let ignore = false;

    const loadCategories = async () => {
      setCategoriesLoading(true);
      setCategoriesError(null);

      try {
        const data = await fetchVendorCategories();
        if (!ignore) {
          setCategories(data || []);
        }
      } catch (error) {
        if (!ignore) {
          setCategories([]);
          setCategoriesError(
            error?.message || "Unable to load vendor categories.",
          );
        }
      } finally {
        if (!ignore) {
          setCategoriesLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      ignore = true;
    };
  }, []);

  const errorFor = (key) => state?.errors?.[key] ?? [];
  const hasError = (field) => {
    return state?.errors?.[field]?.length > 0;
  };

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

  const handleCategoryToggle = (category) => {
    setSelectedCategories((prev) => {
      const next = prev.includes(category)
        ? prev.filter((value) => value !== category)
        : [...prev, category];
      return next;
    });
  };

  return (
    <form action={formAction} className="space-y-4 w-full">
      <div className="grid grid-cols-1 gap-4 w-full h-120 overflow-y-auto">
        <div className="space-y-1">
          <label
            htmlFor="businessName"
            className="text-xs font-medium text-[#0A0A0A]"
          >
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            id="businessName"
            name="businessName"
            type="text"
            required
            placeholder="Acme Gifts Limited"
            className={cx(
              "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
              "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
              focusInput,
              hasError("businessName") ? hasErrorInput : "",
            )}
            disabled={isPending}
          />
          {hasError("businessName") ? (
            <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
              {errorFor("businessName").map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="category"
            className="text-xs font-medium text-[#0A0A0A]"
          >
            Category <span className="text-red-500">*</span>
          </label>
          <div
            className={cx(
              "w-full rounded-2xl border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
              "border-[#D6D6D6] text-[#0A0A0A]",
              hasError("category") ? hasErrorInput : "",
            )}
          >
            {categoriesLoading ? (
              <p className="text-[11px] text-[#717182]">Loading categories...</p>
            ) : categoriesError ? (
              <p className="text-[11px] text-[#717182]">Unable to load categories</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => {
                  const label = cat?.name || "";
                  const key = cat?.id || label;
                  const checked = selectedCategories.includes(label);
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-[11px] text-[#0A0A0A]"
                    >
                      <input
                        type="checkbox"
                        name="category"
                        value={label}
                        checked={checked}
                        onChange={() => handleCategoryToggle(label)}
                        disabled={isPending || categoriesLoading || !label}
                        className="accent-primary"
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          {hasError("category") ? (
            <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
              {errorFor("category").map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="fullName"
            className="text-xs font-medium text-[#0A0A0A]"
          >
            Contact Full Name <span className="text-red-500">*</span>
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
              hasError("fullName") ? hasErrorInput : "",
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
          <label htmlFor="email" className="text-xs font-medium text-[#0A0A0A]">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="vendor@example.com"
            className={cx(
              "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
              "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
              focusInput,
              hasError("email") ? hasErrorInput : "",
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
          <label htmlFor="phone" className="text-xs font-medium text-[#0A0A0A]">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            placeholder="+233 000 0 00 0000"
            className={cx(
              "w-full rounded-full border px-4 py-2.5 text-xs shadow-sm outline-none bg-white",
              "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
              focusInput,
              hasError("phone") ? hasErrorInput : "",
            )}
            disabled={isPending}
          />
          {hasError("phone") ? (
            <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
              {errorFor("phone").map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          ) : null}
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
                hasError("password") ? hasErrorInput : "",
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
              System auto-generated. Must be at least 8 characters with upper,
              lower, and symbol.
            </p>
          )}
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
          className="inline-flex items-center justify-center rounded-full border border-primary bg-primary px-6 py-2 text-xs font-medium text-white hover:bg-white hover:text-primary cursor-pointer"
        >
          {isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            "Create Vendor"
          )}
        </button>
      </div>
    </form>
  );
}
