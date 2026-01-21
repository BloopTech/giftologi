"use client";
import React, { useState, useEffect, useMemo, useTransition, useActionState } from "react";
import { toast } from "sonner";
import { LoaderCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useDebounce } from "use-debounce";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/app/components/Dialog";
import { cx, focusInput, hasErrorInput } from "@/app/components/utils";
import { createClient as createSupabaseClient } from "../../../../utils/supabase/client";
import { createVendorApplication } from "../action";
import BusinessTab from "./businessTab";
import BusinessAddressTab from "./businessAddressTab";
import OwnerDetailsTab from "./ownerDetailsTab";
import OwnerReferencesTab from "./referencesTab";
import DocumentsTab from "./documentsTab";
import DocumentsNotesTab from "./notesTab";
import FinancialTabs from "./financialTab";
import FinancialNotesTab from "./financialNotesTab";
import { useVendorRequestsContext } from "../context";

const TABS = [
  { id: "business", label: "Business" },
  { id: "business-address", label: "Business Address" },
  { id: "owner", label: "Owner" },
  { id: "owner-references", label: "Owner References" },
  { id: "documents", label: "Documents" },
  { id: "documents-notes", label: "Documents Notes" },
  { id: "financial", label: "Financial" },
  { id: "financial-notes", label: "Financial Notes" },
];

const MAX_VENDOR_DOC_FILE_SIZE_BYTES = 2 * 1024 * 1024;

const TAB_ORDER = TABS.map((tab) => tab.id);

const FORM_FIELDS = [
  "businessName",
  "category",
  "businessType",
  "businessRegistrationNumber",
  "taxId",
  "yearsInBusiness",
  "website",
  "businessDescription",
  "streetAddress",
  "city",
  "region",
  "digitalAddress",
  "ownerFullName",
  "ownerEmail",
  "ownerPhone",
  "ref1Name",
  "ref1Company",
  "ref1Phone",
  "ref1Email",
  "ref2Name",
  "ref2Company",
  "ref2Phone",
  "ref2Email",
  "verificationNotes",
  "bankAccountName",
  "bankName",
  "bankAccountNumber",
  "bankBranchCode",
  "bankBranch",
  "financialVerificationNotes",
];

const DOCUMENT_FIELDS = [
  "businessRegistrationCertificate",
  "taxClearanceCertificate",
  "ownerIdDocument",
  "bankStatement",
  "proofOfBusinessAddress",
];

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
  const [isPendingTransition, startTransition] = useTransition();
  const { refreshRequests } = useVendorRequestsContext() || {};

  const [activeTab, setActiveTab] = useState("business");
  const [vendors, setVendors] = useState([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendorError, setVendorError] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [usedUserIds, setUsedUserIds] = useState(() => new Set());

  // Form state to persist values across tabs
  const [formValues, setFormValues] = useState({});

  const [docErrors, setDocErrors] = useState({
    businessRegistrationCertificate: "",
    taxClearanceCertificate: "",
    ownerIdDocument: "",
    bankStatement: "",
    proofOfBusinessAddress: "",
  });
  const [docFiles, setDocFiles] = useState({
    businessRegistrationCertificate: null,
    taxClearanceCertificate: null,
    ownerIdDocument: null,
    bankStatement: null,
    proofOfBusinessAddress: null,
  });

  const [debouncedSearch] = useDebounce(vendorSearch, 300);

  useEffect(() => {
    if (!open) {
      // reset local state when dialog closes
      setSelectedVendor(null);
      setVendorSearch("");
      setActiveTab("business");
      setVendors([]);
      setUsedUserIds(new Set());
      setFormValues({});
      setDocFiles({
        businessRegistrationCertificate: null,
        taxClearanceCertificate: null,
        ownerIdDocument: null,
        bankStatement: null,
        proofOfBusinessAddress: null,
      });
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
              email,
              phone
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
      state.message &&
      state.errors &&
      Object.keys(state.errors || {}).length > 0;

    if (hasErrors) {
      toast.error(
        state.message ||
          "The vendor application was not created. Please try again."
      );
    } else if (hasData) {
      toast.success(state.message || "Vendor application created.");
      refreshRequests?.();
      onOpenChange?.(false);
    }
  }, [state, onOpenChange, refreshRequests]);

  const errorFor = (key) => state?.errors?.[key] ?? [];
  const hasError = (key) => (errorFor(key)?.length ?? 0) > 0;

  // Merge server state values with local form values for persistence
  const getFieldValue = (fieldName) => {
    // Prioritize server state values (from validation errors) over local state
    if (state?.values?.[fieldName] !== undefined && state?.values?.[fieldName] !== null) {
      return state.values[fieldName];
    }
    // Fall back to local form state for tab persistence
    if (formValues[fieldName] !== undefined && formValues[fieldName] !== null) {
      return formValues[fieldName];
    }
    // Finally, fall back to selected vendor defaults for specific fields
    if (fieldName === "businessName" && selectedVendor?.businessName) {
      return selectedVendor.businessName;
    }
    if (fieldName === "category" && selectedVendor?.category) {
      return selectedVendor.category;
    }
    if (fieldName === "ownerFullName" && selectedVendor?.contactName) {
      return selectedVendor.contactName;
    }
    if (fieldName === "ownerEmail" && selectedVendor?.contactEmail) {
      return selectedVendor.contactEmail;
    }
    if (fieldName === "ownerPhone" && selectedVendor?.contactPhone) {
      return selectedVendor.contactPhone;
    }
    return "";
  };

  // Handle input changes to persist across tabs
  const handleInputChange = (fieldName, value) => {
    setFormValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

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
      contactPhone: profile.phone || "",
    });
  };

  const hasSelectedVendor = !!selectedVendor?.vendorUserId;

  const handleDocumentFileChange = (event, key) => {
    const file = event?.target?.files?.[0] ?? null;

    if (!file) {
      setDocErrors((prev) => ({
        ...prev,
        [key]: "",
      }));
      setDocFiles((prev) => ({
        ...prev,
        [key]: null,
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
      setDocFiles((prev) => ({
        ...prev,
        [key]: null,
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
      setDocFiles((prev) => ({
        ...prev,
        [key]: file,
      }));
    }
  };

  const hasDocumentErrors = Object.values(docErrors).some(
    (message) => message && message.length > 0
  );

  // Tab carousel state
  const [, setTabScrollOffset] = useState(0);

  // Handle tab carousel navigation
  const handleTabCarouselScroll = (direction) => {
    const tabContainer = document.getElementById('tab-carousel');
    if (!tabContainer) return;
    
    const scrollAmount = 200; // Adjust based on tab width
    if (direction === 'forward') {
      tabContainer.scrollLeft += scrollAmount;
    } else {
      tabContainer.scrollLeft -= scrollAmount;
    }
  };

  // Check if tabs can scroll
  const checkCanScroll = () => {
    const tabContainer = document.getElementById('tab-carousel');
    if (!tabContainer) return { canScrollForward: false, canScrollBack: false };
    
    return {
      canScrollForward: tabContainer.scrollLeft < tabContainer.scrollWidth - tabContainer.clientWidth,
      canScrollBack: tabContainer.scrollLeft > 0
    };
  };
  // Handle form submission with multi-step navigation
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Define tab order
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    
    // If we're on the last tab, submit the form using the server action
    if (currentIndex === TAB_ORDER.length - 1) {
      startTransition(() => {
        const missingDocs = DOCUMENT_FIELDS.filter(
          (field) => !(docFiles[field] instanceof File),
        );

        if (missingDocs.length > 0) {
          setDocErrors((prev) => {
            const updated = { ...prev };
            missingDocs.forEach((field) => {
              updated[field] = "This document is required.";
            });
            return updated;
          });
          setActiveTab("documents");
          return;
        }

        const formData = new FormData();

        if (selectedVendor?.vendorUserId) {
          formData.set("vendorUserId", selectedVendor.vendorUserId);
        }

        FORM_FIELDS.forEach((field) => {
          formData.set(field, getFieldValue(field) ?? "");
        });

        DOCUMENT_FIELDS.forEach((field) => {
          const file = docFiles[field];
          if (file instanceof File) {
            formData.set(field, file);
          }
        });

        formAction(formData);
      });
    } else {
      // Navigate to next tab
      setActiveTab(TAB_ORDER[currentIndex + 1]);
    }
  };

  // Get button text based on current tab
  const getButtonText = () => {
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    
    if (currentIndex === TAB_ORDER.length - 1) {
      return (isPending || isPendingTransition) ? (
        <span className="inline-flex items-center gap-2">
          <LoaderCircle className="size-3.5 animate-spin" />
          <span>Creating application…</span>
        </span>
      ) : (
        "Create Vendor Application"
      );
    } else {
      return "Next Step";
    }
  };

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
        onSubmit={handleSubmit}
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
                <div className="px-4 py-6 text-[11px] text-red-600">
                  {vendorError}
                </div>
              ) : !filteredVendors.length ? (
                <div className="px-4 py-6 text-[11px] text-[#717182]">
                  No eligible vendors found. All vendors may already have
                  applications.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredVendors.map((vendor) => {
                    const profile = vendor.profiles || {};
                    const parts = [];
                    if (profile.firstname) parts.push(profile.firstname);
                    if (profile.lastname) parts.push(profile.lastname);
                    const contactName = parts.join(" ") || profile.email || "—";
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
              {/* Responsive Tab Navigation */}
              <div className="relative">
                {/* Tab carousel navigation */}
                <div className="flex items-center gap-2">
                  {/* Back button for carousel */}
                  <button
                    type="button"
                    onClick={() => handleTabCarouselScroll('back')}
                    disabled={!checkCanScroll().canScrollBack}
                    className={cx(
                      "shrink-0 p-1.5 rounded-full border transition-colors",
                      !checkCanScroll().canScrollBack
                        ? "border-gray-200 text-gray-300 cursor-not-allowed" 
                        : "border-[#D1D5DB] bg-white text-[#6B7280] hover:border-[#3979D2] hover:text-[#3979D2] cursor-pointer"
                    )}
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>

                  {/* Scrollable tab container */}
                  <div className="flex-1 overflow-hidden">
                    <div 
                      id="tab-carousel"
                      className="overflow-x-auto scrollbar-hide"
                      style={{
                        scrollbarWidth: 'none', /* Firefox */
                        msOverflowStyle: 'none', /* IE and Edge */
                      }}
                      onScroll={() => {
                        // Force re-render to update button states
                        setTabScrollOffset(prev => prev + 1);
                      }}
                    >
                      <style jsx>{`
                        #tab-carousel::-webkit-scrollbar {
                          display: none; /* Chrome, Safari and Opera */
                        }
                      `}</style>
                      <div className="inline-flex rounded-full bg-[#F3F4F6] p-1 text-[11px] whitespace-nowrap">
                        {TABS.map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={cx(
                              "px-3 py-1.5 rounded-full cursor-pointer transition-colors whitespace-nowrap",
                              activeTab === tab.id
                                ? "bg-white text-[#0A0A0A] shadow-sm"
                                : "text-[#6A7282] hover:text-[#0A0A0A]"
                            )}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Forward button for carousel */}
                  <button
                    type="button"
                    onClick={() => handleTabCarouselScroll('forward')}
                    disabled={!checkCanScroll().canScrollForward}
                    className={cx(
                      "shrink-0 p-1.5 rounded-full border transition-colors",
                      !checkCanScroll().canScrollForward
                        ? "border-gray-200 text-gray-300 cursor-not-allowed" 
                        : "border-[#D1D5DB] bg-white text-[#6B7280] hover:border-[#3979D2] hover:text-[#3979D2] cursor-pointer"
                    )}
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>

                {/* Progress indicator */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-[#9CA3AF]">
                  <span>Step {TABS.findIndex(tab => tab.id === activeTab) + 1} of {TABS.length}</span>
                  <span>{TABS.find(tab => tab.id === activeTab)?.label}</span>
                </div>
              </div>

              {activeTab === "business" && (
                <BusinessTab
                  state={state}
                  hasError={hasError}
                  errorFor={errorFor}
                  isPending={isPending}
                  selectedVendor={selectedVendor}
                  getFieldValue={getFieldValue}
                  onInputChange={handleInputChange}
                />
              )}

              {activeTab === "business-address" && (
                <BusinessAddressTab 
                  state={state}
                  hasError={hasError}
                  errorFor={errorFor}
                  isPending={isPending}
                  selectedVendor={selectedVendor}
                  getFieldValue={getFieldValue}
                  onInputChange={handleInputChange}
                />
              )}

              {activeTab === "owner" && (
                <OwnerDetailsTab 
                  state={state}
                  hasError={hasError}
                  errorFor={errorFor}
                  isPending={isPending}
                  selectedVendor={selectedVendor}
                  getFieldValue={getFieldValue}
                  onInputChange={handleInputChange}
                />
              )}

              {activeTab === "owner-references" && (
                <OwnerReferencesTab 
                  state={state}
                  hasError={hasError}
                  errorFor={errorFor}
                  isPending={isPending}
                  selectedVendor={selectedVendor}
                  getFieldValue={getFieldValue}
                  onInputChange={handleInputChange}
                />
              )}

              {activeTab === "documents" && (
                <DocumentsTab
                  state={state}
                  hasError={hasError}
                  errorFor={errorFor}
                  isPending={isPending}
                  selectedVendor={selectedVendor}
                  getFieldValue={getFieldValue}
                  onInputChange={handleInputChange}
                  handleDocumentFileChange={handleDocumentFileChange}
                  docErrors={docErrors}
                  selectedFiles={docFiles}
                />
              )}

              {activeTab === "documents-notes" && (
                <DocumentsNotesTab 
                  state={state}
                  hasError={hasError}
                  errorFor={errorFor}
                  isPending={isPending}
                  selectedVendor={selectedVendor}
                  getFieldValue={getFieldValue}
                  onInputChange={handleInputChange}
                />
              )}

              {activeTab === "financial" && (
                <FinancialTabs
                  state={state}
                  hasError={hasError}
                  errorFor={errorFor}
                  isPending={isPending}
                  selectedVendor={selectedVendor}
                  getFieldValue={getFieldValue}
                  onInputChange={handleInputChange}
                />
              )}

              {activeTab === "financial-notes" && (
                <FinancialNotesTab
                  state={state}
                  hasError={hasError}
                  errorFor={errorFor}
                  isPending={isPending}
                  selectedVendor={selectedVendor}
                  getFieldValue={getFieldValue}
                  onInputChange={handleInputChange}
                />
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
              disabled={isPending || isPendingTransition || !hasSelectedVendor || hasDocumentErrors}
              className={cx(
                "rounded-full px-5 py-2 text-xs font-medium cursor-pointer border",
                "border-primary text-white bg-primary hover:bg-white hover:text-primary",
                (!hasSelectedVendor || isPending || isPendingTransition || hasDocumentErrors) &&
                  "opacity-60 cursor-not-allowed hover:bg-primary hover:text-white"
              )}
            >
              {getButtonText()}
            </button>
          </div>
        </div>
      </form>
    </DialogContent>
  );
}
