"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { createClient as createSupabaseClient } from "../../../utils/supabase/client";
import { useQueryState, parseAsString } from "nuqs";

const ContentsPolicyContext = createContext();

const DEFAULT_TAB = "static_pages";

function useContentsPolicyValue() {
  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );
  const [tabParam, setTabParam] = useQueryState(
    "tab",
    parseAsString.withDefault(DEFAULT_TAB)
  );
  const [focusIdParam, setFocusIdParam] = useQueryState(
    "focusId",
    parseAsString.withDefault("")
  );
  const [focusEntityParam, setFocusEntityParam] = useQueryState(
    "focusEntity",
    parseAsString.withDefault("")
  );

  const searchQuery = searchParam || "";
  const activeTab = tabParam || DEFAULT_TAB;
  const focusId = focusIdParam || "";
  const focusEntity = focusEntityParam || "";

  const [staticPages, setStaticPages] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [contactSettings, setContactSettings] = useState(null);
  const [contactSubmissions, setContactSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createSupabaseClient();

        const [
          staticPagesResult,
          emailTemplatesResult,
          faqsResult,
          contactSettingsResult,
          contactSubmissionsResult,
        ] = await Promise.all([
          supabase
            .from("content_static_pages")
            .select("*")
            .order("sort_order", { ascending: true })
            .order("title", { ascending: true }),
          supabase
            .from("content_email_templates")
            .select("*")
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),
          supabase
            .from("content_faqs")
            .select("*")
            .order("sort_order", { ascending: true })
            .order("question", { ascending: true }),
          supabase
            .from("content_contact_settings")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("content_contact_submissions")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

        if (ignore) return;

        const combinedError =
          staticPagesResult.error ||
          emailTemplatesResult.error ||
          faqsResult.error ||
          contactSettingsResult.error ||
          contactSubmissionsResult.error;

        if (combinedError) {
          throw combinedError;
        }

        setStaticPages(
          Array.isArray(staticPagesResult.data) ? staticPagesResult.data : []
        );
        setEmailTemplates(
          Array.isArray(emailTemplatesResult.data)
            ? emailTemplatesResult.data
            : []
        );
        setFaqs(Array.isArray(faqsResult.data) ? faqsResult.data : []);
        setContactSettings(contactSettingsResult.data || null);
        setContactSubmissions(
          Array.isArray(contactSubmissionsResult.data)
            ? contactSubmissionsResult.data
            : []
        );
      } catch (err) {
        if (!ignore) {
          setError(err?.message || "Failed to load content & policy data");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [version]);

  const refresh = useCallback(() => {
    setVersion((prev) => prev + 1);
  }, []);

  const setSearchQuery = useCallback(
    (value) => {
      setSearchParam(value || "");
    },
    [setSearchParam]
  );

  const setFocusId = useCallback(
    (value) => {
      setFocusIdParam(value || "");
    },
    [setFocusIdParam]
  );

  const setFocusEntity = useCallback(
    (value) => {
      setFocusEntityParam(value || "");
    },
    [setFocusEntityParam]
  );

  return useMemo(
    () => ({
      searchQuery,
      setSearchQuery,
      activeTab,
      setActiveTab: setTabParam,
      focusId,
      setFocusId,
      focusEntity,
      setFocusEntity,
      staticPages,
      emailTemplates,
      faqs,
      contactSettings,
      contactSubmissions,
      loading,
      error,
      refresh,
    }),
    [
      searchQuery,
      setSearchQuery,
      activeTab,
      setTabParam,
      focusId,
      setFocusId,
      focusEntity,
      setFocusEntity,
      staticPages,
      emailTemplates,
      faqs,
      contactSettings,
      contactSubmissions,
      loading,
      error,
      refresh,
    ]
  );
}

export const ContentsPolicyProvider = ({ children }) => {
  const value = useContentsPolicyValue();
  return (
    <ContentsPolicyContext.Provider value={value}>
      {children}
    </ContentsPolicyContext.Provider>
  );
};

export const useContentsPolicyContext = () =>
  useContext(ContentsPolicyContext);
