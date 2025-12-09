"use client";

import React, { useActionState, useEffect, useMemo, useState } from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/app/components/Dialog";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import { toast } from "sonner";
import { LoaderCircle, Search } from "lucide-react";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";
import { createVendorApplication } from "./action";
import { VENDOR_CATEGORIES } from "../vendorCategories";
import { useDebounce } from "use-debounce";

const TABS = [
  { id: "business", label: "Business Info" },
  { id: "owner", label: "Owner Details" },
  { id: "documents", label: "Documents" },
  { id: "financial", label: "Financial Info" },
];

const TAB_STEPS = {
  business: 2,
  owner: 2,
  documents: 2,
  financial: 2,
};

const MAX_VENDOR_DOC_FILE_SIZE_BYTES = 2 * 1024 * 1024;

const initialState = {
  message: "",
  errors: {
    vendorUserId: [],
    businessName: [],
    category: [],
  },
  values: {},
  data: {},
};

export default function CreateVendorApplicationDialog({ open, onOpenChange }) {
  const [state, formAction, isPending] = useActionState(
    createVendorApplication,
    initialState
  );

  const [activeTab, setActiveTab] = useState("business");
  const [subStep, setSubStep] = useState(0);
  const [vendors, setVendors] = useState([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendorError, setVendorError] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [usedUserIds, setUsedUserIds] = useState(() => new Set());

  const [docErrors, setDocErrors] = useState({
    businessRegistrationCertificate: "",
    taxClearanceCertificate: "",
    ownerIdDocument: "",
    bankStatement: "",
    proofOfBusinessAddress: "",
  });

  const [debouncedSearch] = useDebounce(vendorSearch, 300);

  useEffect(() => {
    setSubStep(0);
  }, [activeTab]);

  useEffect(() => {
    if (!open) {
      // reset local state when dialog closes
      setSelectedVendor(null);
      setVendorSearch("");
      setActiveTab("business");
      setVendors([]);
      setUsedUserIds(new Set());
      setDocErrors({
        businessRegistrationCertificate: "",
        taxClearanceCertificate: "",
        ownerIdDocument: "",
        bankStatement: "",
        proofOfBusinessAddress: "",
      });
      return;
    }

    let ignore = false;

    const fetchUsedUserIds = async () => {
      try {
        const supabase = createSupabaseClient();
        const appsResult = await supabase
          .from("vendor_applications")
          .select("user_id");

        if (appsResult.error) throw appsResult.error;
        if (ignore) return;

        const ids = new Set();
        (appsResult.data || []).forEach((row) => {
          if (row?.user_id) ids.add(row.user_id);
        });

        setUsedUserIds(ids);
      } catch (error) {
        if (!ignore) {
          // we don't block the UI on this; search will still work but may include vendors with existing applications
          console.error("Failed to load existing vendor applications", error);
        }
      }
    };

    fetchUsedUserIds();

    return () => {
      ignore = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const term = debouncedSearch.trim();
    if (!term) {
      setVendors([]);
      return;
    }

    let ignore = false;

    const searchVendors = async () => {
      setVendorLoading(true);
      setVendorError(null);

      try {
        const supabase = createSupabaseClient();

        let query = supabase
          .from("vendors")
          .select(
            `
            id,
            profiles_id,
            business_name,
            category,
            profiles:profiles!Vendors_profiles_id_fkey (
              id,
              firstname,
              lastname,
              email
            )
          `
          )
          .limit(20);

        // Use text search on the vendors search_vector, consistent with adminGlobalSearch
        const tokens = term
          .split(/\s+/)
          .filter(Boolean)
          .map((t) => `${t}:*`)
          .join(" & ");

        if (tokens) {
          query = query.filter("search_vector", "fts", tokens);
        }

        const { data, error } = await query;

        if (error) throw error;
        if (ignore) return;

        const results = Array.isArray(data) ? data : [];

        const eligible = results.filter(
          (v) => v?.profiles_id && !usedUserIds.has(v.profiles_id)
        );

        setVendors(eligible);
      } catch (error) {
        if (!ignore) {
          setVendorError(error?.message || "Failed to search vendors.");
          setVendors([]);
        }
      } finally {
        if (!ignore) setVendorLoading(false);
      }
    };

    searchVendors();

    return () => {
      ignore = true;
    };
  }, [open, debouncedSearch, usedUserIds]);

  useEffect(() => {
    if (!state) return;

    const hasData =
      state.message && state.data && Object.keys(state.data || {}).length > 0;
    const hasErrors =
      state.message && state.errors && Object.keys(state.errors || {}).length > 0;

    if (hasErrors) {
      toast.error(
        state.message || "The vendor application was not created. Please try again."
      );
    } else if (hasData) {
      toast.success(state.message || "Vendor application created.");
      onOpenChange?.(false);
    }
  }, [state, onOpenChange]);

  const errorFor = (key) => state?.errors?.[key] ?? [];
  const hasError = (key) => (errorFor(key)?.length ?? 0) > 0;

  const filteredVendors = useMemo(() => {
    // Vendors are already filtered at the database level using the debounced search term
    return vendors;
  }, [vendors]);

  const handleSelectVendor = (vendor) => {
    const profile = vendor.profiles || {};
    const nameParts = [];
    if (profile.firstname) nameParts.push(profile.firstname);
    if (profile.lastname) nameParts.push(profile.lastname);
    const contactName = nameParts.join(" ") || profile.email || "—";

    setSelectedVendor({
      vendorId: vendor.id,
      vendorUserId: vendor.profiles_id,
      businessName: vendor.business_name || "",
      category: vendor.category || "",
      contactName,
      contactEmail: profile.email || "",
    });
  };

  const hasSelectedVendor = !!selectedVendor?.vendorUserId;

  const handleDocumentFileChange = (event, key) => {
    const file = event?.target?.files?.[0];

    if (!file) {
      setDocErrors((prev) => ({
        ...prev,
        [key]: "",
      }));
      return;
    }

    if (
      typeof file.size === "number" &&
      file.size > MAX_VENDOR_DOC_FILE_SIZE_BYTES
    ) {
      setDocErrors((prev) => ({
        ...prev,
        [key]: "File must be 2MB or smaller.",
      }));
      // Clear the selection so the oversized file is not submitted
      if (event.target) {
        event.target.value = "";
      }
    } else {
      setDocErrors((prev) => ({
        ...prev,
        [key]: "",
      }));
    }
  };

  const hasDocumentErrors = Object.values(docErrors).some(
    (message) => message && message.length > 0
  );

  const currentSteps = TAB_STEPS[activeTab] ?? 1;
  const maxSubStep = currentSteps - 1;

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Create Vendor Application
            </DialogTitle>
            <DialogDescription className="mt-1 text-[11px] text-[#717182]">
              Start a full KYC application on behalf of an existing vendor.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form
        action={formAction}
        className="mt-3 space-y-4 text-xs text-[#0A0A0A]"
      >
        {!hasSelectedVendor && (
          <section className="space-y-3">
            <p className="text-[11px] font-medium text-[#717182]">
              Step 1 · Choose Vendor (no existing application)
            </p>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-3 flex items-center text-[#9CA3AF]">
                  <Search className="size-3.5" />
                </span>
                <input
                  type="text"
                  value={vendorSearch}
                  onChange={(event) => setVendorSearch(event.target.value)}
                  placeholder="Search vendors by business name or email"
                  className={cx(
                    "w-full rounded-full border px-8 py-2 text-xs shadow-sm outline-none bg-white",
                    "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                    focusInput
                  )}
                />
              </div>
            </div>

            <div className="rounded-xl border border-[#E5E7EB] bg-white max-h-64 overflow-y-auto">
              {vendorLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-6 text-[11px] text-[#717182]">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  <span>Loading vendors…</span>
                </div>
              ) : vendorError ? (
                <div className="px-4 py-6 text-[11px] text-red-600">{vendorError}</div>
              ) : !filteredVendors.length ? (
                <div className="px-4 py-6 text-[11px] text-[#717182]">
                  No eligible vendors found. All vendors may already have applications.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredVendors.map((vendor) => {
                    const profile = vendor.profiles || {};
                    const parts = [];
                    if (profile.firstname) parts.push(profile.firstname);
                    if (profile.lastname) parts.push(profile.lastname);
                    const contactName =
                      parts.join(" ") || profile.email || "—";
                    const email = profile.email || "—";

                    const isSelected =
                      selectedVendor && selectedVendor.vendorId === vendor.id;

                    return (
                      <li
                        key={vendor.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-[#0A0A0A]">
                            {vendor.business_name || "Untitled Vendor"}
                          </span>
                          <span className="text-[11px] text-[#6A7282]">
                            {contactName} · {email}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectVendor(vendor)}
                          className={cx(
                            "rounded-full px-3 py-1 text-[11px] font-medium border cursor-pointer",
                            isSelected
                              ? "border-[#3979D2] bg-[#3979D2] text-white"
                              : "border-[#D1D5DB] bg-white text-[#0A0A0A] hover:bg-gray-50"
                          )}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        )}

        {hasSelectedVendor && (
          <>
            <input
              type="hidden"
              name="vendorUserId"
              value={selectedVendor.vendorUserId || ""}
            />

            <section className="space-y-2">
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 flex flex-col gap-1 text-[11px]">
                <span className="text-[#6B7280]">Selected Vendor</span>
                <span className="text-xs font-medium text-[#111827]">
                  {selectedVendor.businessName || "Untitled Vendor"}
                </span>
                <span className="text-[11px] text-[#6B7280]">
                  {selectedVendor.contactName} · {selectedVendor.contactEmail}
                </span>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex rounded-full bg-[#F3F4F6] p-1 text-[11px]">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cx(
                        "px-3 py-1.5 rounded-full cursor-pointer transition-colors",
                        activeTab === tab.id
                          ? "bg-white text-[#0A0A0A] shadow-sm"
                          : "text-[#6A7282] hover:text-[#0A0A0A]"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {currentSteps > 1 && (
                  <div className="flex items-center gap-2 text-[11px] text-[#717182]">
                    <span>
                      Page {subStep + 1} of {currentSteps}
                    </span>
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setSubStep((prev) => Math.max(0, prev - 1))
                        }
                        disabled={subStep === 0}
                        className={cx(
                          "rounded-full border border-[#D1D5DB] bg-white px-3 py-1 text-[11px] text-[#4B5563] hover:bg-gray-50 cursor-pointer",
                          subStep === 0 &&
                            "opacity-50 cursor-not-allowed hover:bg-white"
                        )}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSubStep((prev) => Math.min(maxSubStep, prev + 1))
                        }
                        disabled={subStep === maxSubStep}
                        className={cx(
                          "rounded-full border border-[#D1D5DB] bg-white px-3 py-1 text-[11px] text-[#4B5563] hover:bg-gray-50 cursor-pointer",
                          subStep === maxSubStep &&
                            "opacity-50 cursor-not-allowed hover:bg-white"
                        )}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {activeTab === "business" && (
                <div className="space-y-4">
                  <section
                    className={cx("space-y-2", subStep !== 0 && "hidden")}
                  >
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
                            required
                            defaultValue={
                              state?.values?.businessName ??
                              selectedVendor.businessName ??
                              ""
                            }
                            className={cx(
                              "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                              "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                              focusInput,
                              hasError("businessName") ? hasErrorInput : ""
                            )}
                            placeholder="Premium Home Goods"
                            disabled={isPending}
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
                            defaultValue={
                              state?.values?.category ?? selectedVendor.category ?? ""
                            }
                            className={cx(
                              "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                              "border-[#D6D6D6] text-[#0A0A0A]",
                              focusInput,
                              hasError("category") ? hasErrorInput : ""
                            )}
                            disabled={isPending}
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
                            Business Type
                          </label>
                          <input
                            name="businessType"
                            type="text"
                            defaultValue={state?.values?.businessType ?? ""}
                            className={cx(
                              "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                              "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                              focusInput
                            )}
                            placeholder="Limited Liability Company"
                            disabled={isPending}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-[#717182]">
                            Business Registration Number
                          </label>
                          <input
                            name="businessRegistrationNumber"
                            type="text"
                            defaultValue={
                              state?.values?.businessRegistrationNumber ?? ""
                            }
                            className={cx(
                              "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                              "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                              focusInput
                            )}
                            placeholder="BR-2024-001"
                            disabled={isPending}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-[#717182]">Tax ID</label>
                          <input
                            name="taxId"
                            type="text"
                            defaultValue={state?.values?.taxId ?? ""}
                            className={cx(
                              "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                              "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                              focusInput
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
                            defaultValue={state?.values?.yearsInBusiness ?? ""}
                            className={cx(
                              "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                              "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                              focusInput
                            )}
                            placeholder="5"
                            disabled={isPending}
                          />
                        </div>

                        <div className="col-span-2 space-y-1">
                          <label className="text-[11px] text-[#717182]">
                            Website
                          </label>
                          <input
                            name="website"
                            type="url"
                            defaultValue={state?.values?.website ?? ""}
                            className={cx(
                              "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                              "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                              focusInput
                            )}
                            placeholder="https://example.com"
                            disabled={isPending}
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section
                    className={cx("space-y-2", subStep !== 0 && "hidden")}
                  >
                    <p className="text-[11px] font-medium text-[#717182]">
                      Business Description
                    </p>
                    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                      <textarea
                        name="businessDescription"
                        rows={3}
                        defaultValue={state?.values?.businessDescription ?? ""}
                        className={cx(
                          "w-full rounded-md border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                          "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                          focusInput
                        )}
                        placeholder="Describe the business, key products, and target customers."
                        disabled={isPending}
                      />
                    </div>
                  </section>

                  <section
                    className={cx("space-y-2", subStep !== 1 && "hidden")}
                  >
                    <p className="text-[11px] font-medium text-[#717182]">
                      Business Address
                    </p>
                    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] text-[#717182]">
                          Street Address
                        </label>
                        <input
                          name="streetAddress"
                          type="text"
                          defaultValue={state?.values?.streetAddress ?? ""}
                          className={cx(
                            "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                            "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                            focusInput
                          )}
                          placeholder="123 Independence Ave"
                          disabled={isPending}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-[#717182]">City</label>
                        <input
                          name="city"
                          type="text"
                          defaultValue={state?.values?.city ?? ""}
                          className={cx(
                            "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                            "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                            focusInput
                          )}
                          placeholder="Accra"
                          disabled={isPending}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-[#717182]">Region</label>
                        <input
                          name="region"
                          type="text"
                          defaultValue={state?.values?.region ?? ""}
                          className={cx(
                            "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                            "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                            focusInput
                          )}
                          placeholder="Greater Accra"
                          disabled={isPending}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-[#717182]">
                          Postal Code
                        </label>
                        <input
                          name="postalCode"
                          type="text"
                          defaultValue={state?.values?.postalCode ?? ""}
                          className={cx(
                            "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                            "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                            focusInput
                          )}
                          placeholder="GA-000-0000"
                          disabled={isPending}
                        />
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "owner" && (
                <div className="space-y-4">
                  <section
                    className={cx("space-y-2", subStep !== 0 && "hidden")}
                  >
                    <p className="text-[11px] font-medium text-[#717182]">
                      Owner / Primary Contact
                    </p>
                    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] text-[#717182]">
                          Full Name
                        </label>
                        <input
                          name="ownerFullName"
                          type="text"
                          defaultValue={state?.values?.ownerFullName ?? ""}
                          className={cx(
                            "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                            "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                            focusInput
                          )}
                          placeholder="John Mensah"
                          disabled={isPending}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-[#717182]">
                          Email Address
                        </label>
                        <input
                          name="ownerEmail"
                          type="email"
                          defaultValue={state?.values?.ownerEmail ?? ""}
                          className={cx(
                            "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                            "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                            focusInput
                          )}
                          placeholder="john.mensah@example.com"
                          disabled={isPending}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-[#717182]">
                          Phone Number
                        </label>
                        <input
                          name="ownerPhone"
                          type="tel"
                          defaultValue={state?.values?.ownerPhone ?? ""}
                          className={cx(
                            "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                            "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                            focusInput
                          )}
                          placeholder="+233 24 000 0000"
                          disabled={isPending}
                        />
                      </div>
                    </div>
                  </section>

                  <section
                    className={cx("space-y-2", subStep !== 1 && "hidden")}
                  >
                    <p className="text-[11px] font-medium text-[#717182]">
                      Business References
                    </p>
                    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
                      {[1, 2].map((index) => (
                        <div
                          key={index}
                          className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 space-y-2"
                        >
                          <p className="text-[11px] font-medium text-[#4B5563]">
                            Reference {index}
                          </p>
                          <input
                            name={`ref${index}Name`}
                            type="text"
                            defaultValue={state?.values?.[`ref${index}Name`] ?? ""}
                            placeholder="Name"
                            className={cx(
                              "w-full rounded-full border px-3 py-1.5 text-xs shadow-sm outline-none bg-white mb-1",
                              "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                              focusInput
                            )}
                            disabled={isPending}
                          />
                          <input
                            name={`ref${index}Company`}
                            type="text"
                            defaultValue={
                              state?.values?.[`ref${index}Company`] ?? ""
                            }
                            placeholder="Company"
                            className={cx(
                              "w-full rounded-full border px-3 py-1.5 text-xs shadow-sm outline-none bg-white mb-1",
                              "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                              focusInput
                            )}
                            disabled={isPending}
                          />
                          <input
                            name={`ref${index}Phone`}
                            type="tel"
                            defaultValue={state?.values?.[`ref${index}Phone`] ?? ""}
                            placeholder="Phone"
                            className={cx(
                              "w-full rounded-full border px-3 py-1.5 text-xs shadow-sm outline-none bg-white mb-1",
                              "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                              focusInput
                            )}
                            disabled={isPending}
                          />
                          <input
                            name={`ref${index}Email`}
                            type="email"
                            defaultValue={state?.values?.[`ref${index}Email`] ?? ""}
                            placeholder="Email"
                            className={cx(
                              "w-full rounded-full border px-3 py-1.5 text-xs shadow-sm outline-none bg-white",
                              "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                              focusInput
                            )}
                            disabled={isPending}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "documents" && (
                <div className="space-y-4">
                  <section
                    className={cx("space-y-2", subStep !== 0 && "hidden")}
                  >
                    <p className="text-[11px] font-medium text-[#717182]">
                      Submitted Documents
                    </p>
                    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[11px] text-[#717182]">
                          Business Registration Certificate
                        </p>
                        <input
                          name="businessRegistrationCertificate"
                          type="file"
                          accept=".pdf,.jpeg,.jpg,.png,.docx,.doc"
                          className="block w-full text-[11px] text-[#4B5563] file:mr-3 file:rounded-full file:border file:border-[#D6D6D6] file:bg-white file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-[#0A0A0A] hover:file:bg-gray-50"
                          disabled={isPending}
                          onChange={(event) =>
                            handleDocumentFileChange(
                              event,
                              "businessRegistrationCertificate"
                            )
                          }
                        />
                        {docErrors.businessRegistrationCertificate && (
                          <p className="text-[10px] text-red-600">
                            {docErrors.businessRegistrationCertificate}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-[11px] text-[#717182]">
                          Tax Clearance Certificate
                        </p>
                        <input
                          name="taxClearanceCertificate"
                          type="file"
                          accept=".pdf,.jpeg,.jpg,.png,.docx,.doc"
                          className="block w-full text-[11px] text-[#4B5563] file:mr-3 file:rounded-full file:border file:border-[#D6D6D6] file:bg-white file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-[#0A0A0A] hover:file:bg-gray-50"
                          disabled={isPending}
                          onChange={(event) =>
                            handleDocumentFileChange(
                              event,
                              "taxClearanceCertificate"
                            )
                          }
                        />
                        {docErrors.taxClearanceCertificate && (
                          <p className="text-[10px] text-red-600">
                            {docErrors.taxClearanceCertificate}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-[11px] text-[#717182]">
                          Owner ID Card / Passport
                        </p>
                        <input
                          name="ownerIdDocument"
                          type="file"
                          accept=".pdf,.jpeg,.jpg,.png,.docx,.doc"
                          className="block w-full text-[11px] text-[#4B5563] file:mr-3 file:rounded-full file:border file:border-[#D6D6D6] file:bg-white file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-[#0A0A0A] hover:file:bg-gray-50"
                          disabled={isPending}
                          onChange={(event) =>
                            handleDocumentFileChange(event, "ownerIdDocument")
                          }
                        />
                        {docErrors.ownerIdDocument && (
                          <p className="text-[10px] text-red-600">
                            {docErrors.ownerIdDocument}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-[11px] text-[#717182]">
                          Bank Statement (Last 3 Months)
                        </p>
                        <input
                          name="bankStatement"
                          type="file"
                          accept=".pdf,.jpeg,.jpg,.png,.docx,.doc"
                          className="block w-full text-[11px] text-[#4B5563] file:mr-3 file:rounded-full file:border file:border-[#D6D6D6] file:bg-white file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-[#0A0A0A] hover:file:bg-gray-50"
                          disabled={isPending}
                          onChange={(event) =>
                            handleDocumentFileChange(event, "bankStatement")
                          }
                        />
                        {docErrors.bankStatement && (
                          <p className="text-[10px] text-red-600">
                            {docErrors.bankStatement}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <p className="text-[11px] text-[#717182]">
                          Proof of Business Address
                        </p>
                        <input
                          name="proofOfBusinessAddress"
                          type="file"
                          accept=".pdf,.jpeg,.jpg,.png,.docx,.doc"
                          className="block w-full text-[11px] text-[#4B5563] file:mr-3 file:rounded-full file:border file:border-[#D6D6D6] file:bg-white file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-[#0A0A0A] hover:file:bg-gray-50"
                          disabled={isPending}
                          onChange={(event) =>
                            handleDocumentFileChange(
                              event,
                              "proofOfBusinessAddress"
                            )
                          }
                        />
                        {docErrors.proofOfBusinessAddress && (
                          <p className="text-[10px] text-red-600">
                            {docErrors.proofOfBusinessAddress}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-[#9CA3AF]">
                      Supported formats: PDF, JPEG, JPG, PNG, DOCX, DOC. Each
                      file must be 2MB or smaller. Files are uploaded securely
                      and stored as URLs on the vendor application.
                    </p>
                  </section>

                  <section
                    className={cx("space-y-2", subStep !== 1 && "hidden")}
                  >
                    <p className="text-[11px] font-medium text-[#717182]">
                      Verification Checklist
                    </p>
                    <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
                      <textarea
                        name="verificationNotes"
                        rows={3}
                        defaultValue={state?.values?.verificationNotes ?? ""}
                        className={cx(
                          "w-full rounded-md border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                          "border-[#93C5FD] text-[#1D4ED8] placeholder:text-[#60A5FA]",
                          focusInput
                        )}
                        placeholder="Internal notes for document verification."
                        disabled={isPending}
                      />
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "financial" && (
                <div className="space-y-4">
                  <section
                    className={cx("space-y-2", subStep !== 0 && "hidden")}
                  >
                    <p className="text-[11px] font-medium text-[#717182]">
                      Bank Account Details
                    </p>
                    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] text-[#717182]">
                          Account Name
                        </label>
                        <input
                          name="bankAccountName"
                          type="text"
                          defaultValue={
                            state?.values?.bankAccountName ??
                            selectedVendor.businessName ??
                            ""
                          }
                          className={cx(
                            "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                            "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                            focusInput
                          )}
                          placeholder="Account name"
                          disabled={isPending}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-[#717182]">
                          Account Number
                        </label>
                        <input
                          name="bankAccountNumber"
                          type="text"
                          defaultValue={state?.values?.bankAccountNumber ?? ""}
                          className={cx(
                            "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                            "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                            focusInput
                          )}
                          placeholder="0000000000"
                          disabled={isPending}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-[#717182]">
                          Bank Name
                        </label>
                        <input
                          name="bankName"
                          type="text"
                          defaultValue={state?.values?.bankName ?? ""}
                          className={cx(
                            "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                            "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                            focusInput
                          )}
                          placeholder="Bank"
                          disabled={isPending}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-[#717182]">
                          Branch Code
                        </label>
                        <input
                          name="bankBranchCode"
                          type="text"
                          defaultValue={state?.values?.bankBranchCode ?? ""}
                          className={cx(
                            "w-full rounded-full border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                            "border-[#D6D6D6] text-[#0A0A0A] placeholder:text-[#B0B7C3]",
                            focusInput
                          )}
                          placeholder="Branch code"
                          disabled={isPending}
                        />
                      </div>
                    </div>
                  </section>

                  <section
                    className={cx("space-y-2", subStep !== 1 && "hidden")}
                  >
                    <p className="text-[11px] font-medium text-[#717182]">
                      Financial Verification Notes
                    </p>
                    <div className="rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] p-4">
                      <textarea
                        name="financialVerificationNotes"
                        rows={3}
                        defaultValue={
                          state?.values?.financialVerificationNotes ?? ""
                        }
                        className={cx(
                          "w-full rounded-md border px-3 py-2 text-xs shadow-sm outline-none bg-white",
                          "border-[#FBBF24] text-[#92400E] placeholder:text-[#F59E0B]",
                          focusInput
                        )}
                        placeholder="Bank account verification requirements or notes."
                        disabled={isPending}
                      />
                    </div>
                  </section>
                </div>
              )}
            </section>
          </>
        )}

        <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <DialogClose asChild>
            <button
              type="button"
              className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
              disabled={isPending}
            >
              Cancel
            </button>
          </DialogClose>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending || !hasSelectedVendor || hasDocumentErrors}
              className={cx(
                "rounded-full px-5 py-2 text-xs font-medium cursor-pointer border",
                "border-[#3979D2] text-white bg-[#3979D2] hover:bg-white hover:text-[#3979D2]",
                (!hasSelectedVendor || isPending || hasDocumentErrors) &&
                  "opacity-60 cursor-not-allowed hover:bg-[#3979D2] hover:text-white"
              )}
            >
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  <span>Creating application…</span>
                </span>
              ) : (
                "Create Vendor Application"
              )}
            </button>
          </div>
        </div>
      </form>
    </DialogContent>
  );
}
