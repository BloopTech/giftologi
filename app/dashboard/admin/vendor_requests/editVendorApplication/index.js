"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useTransition,
  useActionState,
} from "react";
import { toast } from "sonner";
import { LoaderCircle, ChevronLeft, ChevronRight } from "lucide-react";

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/app/components/Dialog";
import { cx } from "@/app/components/utils";

import BusinessTab from "../createVendorApplication/businessTab";
import BusinessAddressTab from "../createVendorApplication/businessAddressTab";
import OwnerDetailsTab from "../createVendorApplication/ownerDetailsTab";
import OwnerReferencesTab from "../createVendorApplication/referencesTab";
import DocumentsTab from "../createVendorApplication/documentsTab";
import DocumentsNotesTab from "../createVendorApplication/notesTab";
import FinancialTabs from "../createVendorApplication/financialTab";
import FinancialNotesTab from "../createVendorApplication/financialNotesTab";

import { updateVendorApplication } from "../action";

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

const MAX_VENDOR_DOC_FILE_SIZE_BYTES = 2 * 1024 * 1024;

const initialState = {
  message: "",
  errors: {},
  values: {},
  data: {},
};

const buildInitialValues = (request) => {
  const raw = request?.__raw || {};
  const refs = Array.isArray(raw.business_references)
    ? raw.business_references
    : [];
  const ref1 = refs[0] || {};
  const ref2 = refs[1] || {};

  return {
    businessName: raw.business_name || "",
    category: raw.category || "",
    businessType: raw.business_type || "",
    businessRegistrationNumber: raw.business_registration_number || "",
    taxId: raw.tax_id || "",
    yearsInBusiness:
      typeof raw.years_in_business === "number"
        ? String(raw.years_in_business)
        : raw.years_in_business || "",
    website: raw.website || "",
    businessDescription: raw.business_description || "",
    streetAddress: raw.street_address || "",
    city: raw.city || "",
    region: raw.region || "",
    digitalAddress: raw.digital_address || "",
    ownerFullName: raw.owner_full_name || "",
    ownerEmail: raw.owner_email || "",
    ownerPhone: raw.owner_phone || "",
    ref1Name: ref1.name || "",
    ref1Company: ref1.company || "",
    ref1Phone: ref1.phone || "",
    ref1Email: ref1.email || "",
    ref2Name: ref2.name || "",
    ref2Company: ref2.company || "",
    ref2Phone: ref2.phone || "",
    ref2Email: ref2.email || "",
    verificationNotes: raw.verification_notes || "",
    bankAccountName: raw.bank_account_name || "",
    bankName: raw.bank_name || "",
    bankAccountNumber: raw.bank_account_number || "",
    bankBranchCode: raw.bank_branch_code || "",
    bankBranch: raw.bank_branch || "",
    financialVerificationNotes: raw.financial_verification_notes || "",
  };
};

export default function EditVendorApplicationDialog({
  open,
  onOpenChange,
  request,
  onUpdated,
}) {
  const [state, formAction, isPending] = useActionState(
    updateVendorApplication,
    initialState,
  );
  const [isPendingTransition, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("business");
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
  const [, setTabScrollOffset] = useState(0);

  const initialValues = useMemo(
    () => buildInitialValues(request),
    [request],
  );

  const existingDocuments = useMemo(() => {
    const raw = request?.__raw || {};
    return Array.isArray(raw.documents) ? raw.documents : [];
  }, [request]);

  useEffect(() => {
    if (!open) return;
    setActiveTab("business");
    setFormValues(initialValues);
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
  }, [open, initialValues]);

  useEffect(() => {
    if (!state) return;
    if (state.message && state.data && Object.keys(state.data).length) {
      toast.success(state.message);
      onUpdated?.();
      onOpenChange?.(false);
    } else if (state.message && state.errors && Object.keys(state.errors).length) {
      toast.error(state.message);
    }
  }, [state, onUpdated, onOpenChange]);

  const errorFor = (key) => state?.errors?.[key] ?? [];
  const hasError = (key) => (errorFor(key)?.length ?? 0) > 0;

  const getFieldValue = (fieldName) => {
    if (state?.values?.[fieldName] !== undefined && state?.values?.[fieldName] !== null) {
      return state.values[fieldName];
    }
    if (formValues[fieldName] !== undefined && formValues[fieldName] !== null) {
      return formValues[fieldName];
    }
    return "";
  };

  const handleInputChange = (fieldName, value) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

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

  const isApproved =
    (request?.status || request?.__raw?.status || "").toLowerCase() ===
    "approved";

  const handleTabCarouselScroll = (direction) => {
    const tabContainer = document.getElementById("edit-tab-carousel");
    if (!tabContainer) return;

    const scrollAmount = 200;
    if (direction === "forward") {
      tabContainer.scrollLeft += scrollAmount;
    } else {
      tabContainer.scrollLeft -= scrollAmount;
    }
  };

  const checkCanScroll = () => {
    const tabContainer = document.getElementById("edit-tab-carousel");
    if (!tabContainer) return { canScrollForward: false, canScrollBack: false };

    return {
      canScrollForward:
        tabContainer.scrollLeft <
        tabContainer.scrollWidth - tabContainer.clientWidth,
      canScrollBack: tabContainer.scrollLeft > 0,
    };
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!request?.id) return;

    startTransition(() => {
      const formData = new FormData();
      formData.set("applicationId", request.id);

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
  };

  const actionDisabled = isPending || isPendingTransition || isApproved;

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <DialogTitle className="text-sm font-semibold text-[#0A0A0A]">
              Edit Vendor Application
            </DialogTitle>
            <DialogDescription className="mt-1 text-[11px] text-[#717182]">
              Update vendor KYC details before approval.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="mt-3 space-y-4 text-xs">
        {isApproved && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-700">
            Approved applications cannot be edited.
          </div>
        )}

        <div className="relative">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTabCarouselScroll("back")}
              disabled={!checkCanScroll().canScrollBack}
              className={cx(
                "shrink-0 p-1.5 rounded-full border transition-colors",
                !checkCanScroll().canScrollBack
                  ? "border-gray-200 text-gray-300 cursor-not-allowed"
                  : "border-[#D1D5DB] bg-white text-[#6B7280] hover:border-[#3979D2] hover:text-[#3979D2] cursor-pointer",
              )}
            >
              <ChevronLeft className="size-3.5" />
            </button>

            <div className="flex-1 overflow-hidden">
              <div
                id="edit-tab-carousel"
                className="overflow-x-auto scrollbar-hide"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
                onScroll={() => {
                  setTabScrollOffset((prev) => prev + 1);
                }}
              >
                <style jsx>{`
                  #edit-tab-carousel::-webkit-scrollbar {
                    display: none;
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
                          : "text-[#6A7282] hover:text-[#0A0A0A]",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleTabCarouselScroll("forward")}
              disabled={!checkCanScroll().canScrollForward}
              className={cx(
                "shrink-0 p-1.5 rounded-full border transition-colors",
                !checkCanScroll().canScrollForward
                  ? "border-gray-200 text-gray-300 cursor-not-allowed"
                  : "border-[#D1D5DB] bg-white text-[#6B7280] hover:border-[#3979D2] hover:text-[#3979D2] cursor-pointer",
              )}
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>

        {activeTab === "business" && (
          <BusinessTab
            state={state}
            hasError={hasError}
            errorFor={errorFor}
            isPending={isPending || isPendingTransition}
            selectedVendor={null}
            getFieldValue={getFieldValue}
            onInputChange={handleInputChange}
            disableIdentityFields={false}
          />
        )}

        {activeTab === "business-address" && (
          <BusinessAddressTab
            state={state}
            hasError={hasError}
            errorFor={errorFor}
            isPending={isPending || isPendingTransition}
            selectedVendor={null}
            getFieldValue={getFieldValue}
            onInputChange={handleInputChange}
          />
        )}

        {activeTab === "owner" && (
          <OwnerDetailsTab
            state={state}
            hasError={hasError}
            errorFor={errorFor}
            isPending={isPending || isPendingTransition}
            getFieldValue={getFieldValue}
            onInputChange={handleInputChange}
            disableIdentityFields={false}
          />
        )}

        {activeTab === "owner-references" && (
          <OwnerReferencesTab
            state={state}
            isPending={isPending || isPendingTransition}
            getFieldValue={getFieldValue}
            onInputChange={handleInputChange}
            hasError={hasError}
          />
        )}

        <div className={activeTab === "documents" ? "" : "hidden"}>
          <DocumentsTab
            isPending={isPending || isPendingTransition}
            handleDocumentFileChange={handleDocumentFileChange}
            docErrors={docErrors}
            selectedFiles={docFiles}
            existingDocuments={existingDocuments}
            hasError={hasError}
          />
        </div>

        {activeTab === "documents-notes" && (
          <DocumentsNotesTab
            state={state}
            isPending={isPending || isPendingTransition}
            getFieldValue={getFieldValue}
            onInputChange={handleInputChange}
          />
        )}

        {activeTab === "financial" && (
          <FinancialTabs
            state={state}
            isPending={isPending || isPendingTransition}
            selectedVendor={{ businessName: getFieldValue("businessName") }}
            getFieldValue={getFieldValue}
            onInputChange={handleInputChange}
            hasError={hasError}
          />
        )}

        {activeTab === "financial-notes" && (
          <FinancialNotesTab
            state={state}
            isPending={isPending || isPendingTransition}
            getFieldValue={getFieldValue}
            onInputChange={handleInputChange}
            hasError={hasError}
          />
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <DialogClose asChild>
            <button
              type="button"
              className="rounded-full border border-gray-300 bg-white px-5 py-2 text-xs text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
              disabled={isPending || isPendingTransition}
            >
              Cancel
            </button>
          </DialogClose>
          <button
            type="submit"
            disabled={actionDisabled}
            className={cx(
              "rounded-full px-5 py-2 text-xs font-medium cursor-pointer border",
              "border-primary text-white bg-primary hover:bg-white hover:text-primary",
              actionDisabled &&
                "opacity-60 cursor-not-allowed hover:bg-primary hover:text-white",
            )}
          >
            {(isPending || isPendingTransition) ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="size-3.5 animate-spin" />
                <span>Saving changes…</span>
              </span>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>
    </DialogContent>
  );
}
