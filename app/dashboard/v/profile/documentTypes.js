export const DOCUMENT_UPLOAD_OPTIONS = [
  {
    value: "business_registration_certificate",
    label: "Business Registration Certificate",
  },
  {
    value: "tax_clearance_certificate",
    label: "Tax Clearance Certificate",
    optional: true,
  },
  {
    value: "owner_id_document",
    label: "Owner ID Card / Passport",
  },
  {
    value: "bank_statement",
    label: "Bank Statement (Last 3 Months)",
    optional: true,
  },
  {
    value: "proof_of_business_address",
    label: "Proof of Business Address",
  },
];

export const DOCUMENT_TITLE_LOOKUP = DOCUMENT_UPLOAD_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {},
);

export const DOCUMENT_TYPE_VALUES = DOCUMENT_UPLOAD_OPTIONS.map((option) => option.value);

export const DOCUMENT_ACCEPT_TYPES = ".pdf,.jpeg,.jpg,.png,.webp,.doc,.docx";

export const MAX_VENDOR_DOC_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const MAX_VENDOR_DOC_FILE_SIZE_MB = 2;
