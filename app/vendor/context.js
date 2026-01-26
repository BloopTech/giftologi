"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient as createSupabaseClient } from "../utils/supabase/client";
import { fetchVendorCategories } from "../utils/vendorCategories";
import {
  fetchVendorApplicationDraft,
  ensureVendorAccount,
  saveVendorApplicationDraft,
  submitVendorApplication,
  uploadVendorApplicationDocument,
} from "./action";
import {
  DOCUMENT_TYPE_VALUES,
  MAX_VENDOR_DOC_FILE_SIZE_BYTES,
} from "../dashboard/v/profile/documentTypes";

const VendorApplicationContext = createContext();

const isFileLike = (value) => {
  if (!value) return false;
  const tag = Object.prototype.toString.call(value);
  if (tag === "[object File]" || tag === "[object Blob]") return true;
  return (
    typeof value === "object" &&
    typeof value.name === "string" &&
    typeof value.size === "number" &&
    typeof value.type === "string" &&
    (typeof value.arrayBuffer === "function" || typeof value.stream === "function")
  );
};

const sanitizeDraftData = (data) => {
  if (!data || typeof data !== "object") return {};
  const sanitized = {};
  Object.entries(data).forEach(([key, value]) => {
    if (key === "password") return;
    if (isFileLike(value)) return;
    if (Array.isArray(value)) {
      sanitized[key] = value.filter((item) => !isFileLike(item));
      return;
    }
    sanitized[key] = value;
  });
  return sanitized;
};

export const VendorApplicationProvider = ({ children }) => {
  const [formData, setFormData] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [status, setStatus] = useState(null);
  const [applicationId, setApplicationId] = useState(null);
  const [submittedAt, setSubmittedAt] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDocumentType, setUploadingDocumentType] = useState(null);

  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [documentErrors, setDocumentErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);

  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const refreshAuthUser = useCallback(async () => {
    setAuthLoading(true);
    const supabase = createSupabaseClient();
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError) {
        setAuthUser(null);
        setError(userError.message || "You must be signed in.");
      } else {
        setAuthUser(data?.user || null);
      }
    } catch (err) {
      console.error("Vendor auth load error", err);
      setAuthUser(null);
      setError(err?.message || "Unable to load your session.");
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const refreshDraft = useCallback(async () => {
    if (!authUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchVendorApplicationDraft();
      if (!response?.success) {
        setError(response?.message || "Unable to load your draft.");
        return;
      }

      if (!response?.data) {
        setFormData({});
        setCurrentStep(0);
        setDocuments([]);
        setStatus(null);
        setApplicationId(null);
        setSubmittedAt(null);
        return;
      }

      setFormData(response.data.draftData || {});
      setCurrentStep(response.data.currentStep ?? 0);
      setDocuments(response.data.documents || []);
      setStatus(response.data.status || null);
      setApplicationId(response.data.id || null);
      setSubmittedAt(response.data.submittedAt || null);
    } catch (err) {
      console.error("Vendor draft load error", err);
      setError(err?.message || "Unable to load your draft.");
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    refreshAuthUser();
  }, [refreshAuthUser]);

  const refreshCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);

    try {
      const data = await fetchVendorCategories();
      setCategories(data || []);
    } catch (err) {
      console.error("Vendor categories load error", err);
      setCategories([]);
      setCategoriesError(err?.message || "Unable to load categories.");
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  useEffect(() => {
    if (authLoading) return;
    refreshDraft();
  }, [authLoading, refreshDraft]);

  const ensureAccount = useCallback(
    async (source) => {
      const payloadSource = source || formData || {};
      const email = payloadSource?.email?.trim();
      const password = payloadSource?.password || "";

      if (!email || !password) {
        const message =
          "Enter your email and password to create an account and save your application.";
        setNotice({ type: "error", message });
        return { success: false, message };
      }

      const accountResponse = await ensureVendorAccount({
        email,
        password,
        firstName: payloadSource?.firstName || "",
        lastName: payloadSource?.lastName || "",
      });

      if (!accountResponse?.success) {
        const message =
          accountResponse?.message || "Unable to create or sign in.";
        setNotice({ type: "error", message });
        return accountResponse;
      }

      if (!accountResponse?.data?.loggedIn) {
        const message =
          accountResponse?.message ||
          "Account created. You can login to continue.";
        setNotice({ type: "error", message });
        return { success: false, message, data: accountResponse?.data };
      }

      await refreshAuthUser();
      setFormData((prev) => ({ ...prev, password: "" }));
      return accountResponse;
    },
    [formData, refreshAuthUser],
  );

  const saveDraft = useCallback(
    async ({ draftData, currentStep: nextStep } = {}) => {
      if (saving) {
        return { success: false, message: "Draft save already in progress." };
      }

      setSaving(true);
      setNotice(null);

      if (!authUser) {
        const accountResponse = await ensureAccount(draftData || formData);
        if (!accountResponse?.success) {
          setSaving(false);
          return accountResponse;
        }
      }

      const payload = {
        draftData: sanitizeDraftData(draftData || formData),
        currentStep: typeof nextStep === "number" ? nextStep : currentStep,
      };

      const response = await saveVendorApplicationDraft(payload);

      if (!response?.success) {
        setNotice({
          type: "error",
          message: response?.message || "Unable to save your draft.",
        });
        setSaving(false);
        return response;
      }

      if (typeof payload.currentStep === "number") {
        setCurrentStep(payload.currentStep);
      }

      if (response?.data?.applicationId) {
        setApplicationId(response.data.applicationId);
      }

      setStatus("draft");
      setNotice({
        type: "success",
        message: response?.message || "Draft saved.",
      });
      setSaving(false);
      return response;
    },
    [saving, authUser, formData, currentStep, ensureAccount],
  );

  const submitApplication = useCallback(async () => {
    if (submitting) {
      return { success: false, message: "Submission already in progress." };
    }

    setSubmitting(true);
    setNotice(null);

    if (!authUser) {
      const accountResponse = await ensureAccount(formData);
      if (!accountResponse?.success) {
        setSubmitting(false);
        return accountResponse;
      }
    }

    const payload = {
      draftData: sanitizeDraftData(formData),
      currentStep,
      documents,
    };

    const response = await submitVendorApplication(payload);

    if (!response?.success) {
      setNotice({
        type: "error",
        message: response?.message || "Unable to submit your application.",
      });
      setSubmitting(false);
      return response;
    }

    if (response?.data?.applicationId) {
      setApplicationId(response.data.applicationId);
    }

    setStatus("pending");
    setSubmittedAt(new Date().toISOString());
    setNotice({
      type: "success",
      message: response?.message || "Application submitted.",
    });
    setSubmitting(false);
    return response;
  }, [submitting, authUser, formData, currentStep, documents, ensureAccount]);

  const uploadDocument = useCallback(async ({ documentType, file }) => {
    if (!documentType || !DOCUMENT_TYPE_VALUES.includes(documentType)) {
      const message = "Select a valid document type.";
      setDocumentErrors((prev) => ({ ...prev, [documentType]: message }));
      setNotice({ type: "error", message });
      return { success: false, message };
    }

    if (!file || !isFileLike(file)) {
      const message = "Select a valid file to upload.";
      setDocumentErrors((prev) => ({ ...prev, [documentType]: message }));
      setNotice({ type: "error", message });
      return { success: false, message };
    }

    if (
      typeof file.size === "number" &&
      file.size > MAX_VENDOR_DOC_FILE_SIZE_BYTES
    ) {
      const message = "File exceeds the 2MB size limit.";
      setDocumentErrors((prev) => ({ ...prev, [documentType]: message }));
      setNotice({ type: "error", message });
      return { success: false, message };
    }

    setUploadingDocumentType(documentType);
    setNotice(null);
    setDocumentErrors((prev) => ({ ...prev, [documentType]: null }));

    const formPayload = new FormData();
    formPayload.append("document_type", documentType);
    formPayload.append("document_file", file);

    const response = await uploadVendorApplicationDocument(null, formPayload);

    if (!response?.success) {
      const message = response?.message || "Failed to upload document.";
      setDocumentErrors((prev) => ({ ...prev, [documentType]: message }));
      setNotice({ type: "error", message });
      setUploadingDocumentType(null);
      return response;
    }

    setDocuments(response?.data?.documents || []);
    setNotice({
      type: "success",
      message: response?.message || "Document uploaded.",
    });
    setUploadingDocumentType(null);
    return response;
  }, []);

  const resetApplication = useCallback(() => {
    setFormData({});
    setCurrentStep(0);
    setDocuments([]);
    setStatus(null);
    setApplicationId(null);
    setSubmittedAt(null);
    setNotice(null);
    setError(null);
    setDocumentErrors({});
  }, []);

  const isReadOnly = useMemo(
    () => ["pending", "approved"].includes((status || "").toLowerCase()),
    [status],
  );

  const value = useMemo(
    () => ({
      authUser,
      authLoading,
      formData,
      setFormData,
      currentStep,
      setCurrentStep,
      documents,
      status,
      applicationId,
      submittedAt,
      loading,
      saving,
      submitting,
      uploadingDocumentType,
      notice,
      error,
      documentErrors,
      categories,
      categoriesLoading,
      categoriesError,
      isReadOnly,
      refreshAuthUser,
      refreshCategories,
      refreshDraft,
      saveDraft,
      submitApplication,
      uploadDocument,
      resetApplication,
    }),
    [
      authUser,
      authLoading,
      formData,
      currentStep,
      documents,
      status,
      applicationId,
      submittedAt,
      loading,
      saving,
      submitting,
      uploadingDocumentType,
      notice,
      error,
      documentErrors,
      categories,
      categoriesLoading,
      categoriesError,
      isReadOnly,
      refreshAuthUser,
      refreshCategories,
      refreshDraft,
      saveDraft,
      submitApplication,
      uploadDocument,
      resetApplication,
    ],
  );

  return (
    <VendorApplicationContext.Provider value={value}>
      {children}
    </VendorApplicationContext.Provider>
  );
};

export const useVendorApplicationContext = () =>
  useContext(VendorApplicationContext);
