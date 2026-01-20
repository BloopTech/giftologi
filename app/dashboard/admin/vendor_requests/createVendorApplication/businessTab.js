"use client";
import React from "react";
import { VENDOR_CATEGORIES } from "../../vendorCategories";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";

export default function BusinessTab(props) {
  const {
    state,
    hasError,
    errorFor,
    isPending,
    selectedVendor,
    getFieldValue,
    onInputChange,
    disableIdentityFields = true,
  } = props;

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <p className="text-[11px] font-medium text-[#717182]">
          Business Information
        </p>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] text-[#717182]">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                name="businessName"
                type="text"
                maxLength={50}
                required
                value={getFieldValue("businessName")}
                onChange={(e) => onInputChange("businessName", e.target.value)}
                className={cx(
                  "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                  hasError("businessName") ? hasErrorInput : "",
                )}
                placeholder="Premium Home Goods"
                disabled={isPending || disableIdentityFields}
              />
              {hasError("businessName") && (
                <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                  {errorFor("businessName").map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-[#717182]">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                required
                value={getFieldValue("category")}
                onChange={(e) => onInputChange("category", e.target.value)}
                className={cx(
                  "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A]",
                  focusInput,
                  hasError("category") ? hasErrorInput : "",
                )}
                disabled={isPending || disableIdentityFields}
              >
                <option value="" disabled>
                  Select category
                </option>
                {VENDOR_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {hasError("category") && (
                <ul className="mt-1 list-disc pl-5 text-[11px] text-red-600">
                  {errorFor("category").map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-[#717182]">
                Business Type <span className="text-red-500">*</span>
              </label>
              <input
                required
                name="businessType"
                type="text"
                maxLength={50}
                value={getFieldValue("businessType")}
                onChange={(e) => onInputChange("businessType", e.target.value)}
                className={cx(
                  "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                  hasError("businessType") ? hasErrorInput : "",
                )}
                placeholder="Limited Liability Company"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-[#717182]">
                Business Registration Number{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                required
                name="businessRegistrationNumber"
                type="text"
                maxLength={50}
                value={getFieldValue("businessRegistrationNumber")}
                onChange={(e) =>
                  onInputChange("businessRegistrationNumber", e.target.value)
                }
                className={cx(
                  "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                  hasError("businessRegistrationNumber") ? hasErrorInput : "",
                )}
                placeholder="BR-2024-001"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-[#717182]">
                Tax ID <span className="text-red-500">*</span>
              </label>
              <input
                name="taxId"
                required
                type="text"
                maxLength={50}
                value={getFieldValue("taxId")}
                onChange={(e) => onInputChange("taxId", e.target.value)}
                className={cx(
                  "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                  hasError("taxId") ? hasErrorInput : "",
                )}
                placeholder="TIN-123-456"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-[#717182]">
                Years in Business
              </label>
              <input
                name="yearsInBusiness"
                type="number"
                min="0"
                value={getFieldValue("yearsInBusiness")}
                onChange={(e) =>
                  onInputChange("yearsInBusiness", e.target.value)
                }
                className={cx(
                  "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                )}
                placeholder="5"
                disabled={isPending}
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-[11px] text-[#717182]">
                Website <span className="text-red-500">*</span>
              </label>
              <input
                name="website"
                required
                maxLength={100}
                type="url"
                value={getFieldValue("website")}
                onChange={(e) => onInputChange("website", e.target.value)}
                className={cx(
                  "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                  "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                  focusInput,
                  hasError("website") ? hasErrorInput : "",
                )}
                placeholder="https://example.com"
                disabled={isPending}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[11px] font-medium text-[#717182]">
          Business Description
        </p>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <textarea
            name="businessDescription"
            rows={3}
            value={getFieldValue("businessDescription")}
            onChange={(e) =>
              onInputChange("businessDescription", e.target.value)
            }
            className={cx(
              "w-full rounded-md border px-3 py-2 text-xs shadow-sm outline-none bg-white",
              "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
              focusInput,
            )}
            placeholder="Describe the business, key products, and target customers."
            disabled={isPending}
          />
        </div>
      </section>
    </div>
  );
}
