"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Cookie, Shield, ChevronDown, ChevronUp, X } from "lucide-react";
import { createClient as createSupabaseClient } from "../utils/supabase/client";
import Link from "next/link";
import { useStaticPageLinks } from "../utils/content/useStaticPageLinks";

const CONSENT_STORAGE_KEY = "giftologi_cookie_consent";
const CONSENT_VERSION = "1.0";

const CONSENT_TYPES = {
  cookies_essential: {
    label: "Essential Cookies",
    description: "Required for the site to function. Cannot be disabled.",
    required: true,
  },
  cookies_analytics: {
    label: "Analytics Cookies",
    description:
      "Help us understand how visitors interact with the site to improve our services.",
    required: false,
  },
  cookies_marketing: {
    label: "Marketing Cookies",
    description:
      "Used to deliver relevant ads and track campaign effectiveness.",
    required: false,
  },
};

function getStoredConsent() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setStoredConsent(preferences) {
  if (typeof window === "undefined") return;
  const payload = {
    version: CONSENT_VERSION,
    preferences,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload));
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [preferences, setPreferences] = useState({
    cookies_essential: true,
    cookies_analytics: false,
    cookies_marketing: false,
  });
  const [syncing, setSyncing] = useState(false);
  const { getStaticPageHref } = useStaticPageLinks();

  const privacyHref = getStaticPageHref({
    slugHints: ["privacy", "privacy-policy", "privacy-statement"],
    keywords: ["privacy", "privacy policy", "privacy statement"],
    fallbackHref: "/privacy-policy",
  });

  const termsHref = getStaticPageHref({
    slugHints: ["terms", "terms-of-service", "terms-and-conditions"],
    keywords: ["terms", "terms of service", "terms and conditions"],
    fallbackHref: "/terms",
  });

  const supabase = useMemo(() => createSupabaseClient(), []);

  // Check if consent already given
  useEffect(() => {
    const stored = getStoredConsent();
    if (stored?.preferences) {
      setPreferences(stored.preferences);
      setVisible(false);
    } else {
      // Small delay so banner doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Sync consent to DB for logged-in users
  const syncToDatabase = useCallback(
    async (prefs) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const entries = Object.entries(prefs).map(([type, accepted]) => ({
          user_id: user.id,
          consent_type: type,
          accepted,
          accepted_at: accepted ? new Date().toISOString() : null,
          revoked_at: !accepted ? new Date().toISOString() : null,
          user_agent:
            typeof navigator !== "undefined" ? navigator.userAgent : null,
        }));

        for (const entry of entries) {
          await supabase.from("user_consents").upsert(entry, {
            onConflict: "user_id,consent_type",
          });
        }
      } catch {
        // Silent fail — localStorage is the primary store
      }
    },
    [supabase]
  );

  const handleAcceptAll = useCallback(async () => {
    const prefs = {
      cookies_essential: true,
      cookies_analytics: true,
      cookies_marketing: true,
    };
    setPreferences(prefs);
    setStoredConsent(prefs);
    setVisible(false);
    setSyncing(true);
    await syncToDatabase(prefs);
    setSyncing(false);
  }, [syncToDatabase]);

  const handleAcceptEssential = useCallback(async () => {
    const prefs = {
      cookies_essential: true,
      cookies_analytics: false,
      cookies_marketing: false,
    };
    setPreferences(prefs);
    setStoredConsent(prefs);
    setVisible(false);
    setSyncing(true);
    await syncToDatabase(prefs);
    setSyncing(false);
  }, [syncToDatabase]);

  const handleSavePreferences = useCallback(async () => {
    const prefs = { ...preferences, cookies_essential: true };
    setPreferences(prefs);
    setStoredConsent(prefs);
    setVisible(false);
    setSyncing(true);
    await syncToDatabase(prefs);
    setSyncing(false);
  }, [preferences, syncToDatabase]);

  const togglePreference = useCallback((type) => {
    if (CONSENT_TYPES[type]?.required) return;
    setPreferences((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6 animate-in slide-in-from-bottom duration-500">
      <div className="mx-auto max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#A5914B]/10 shrink-0">
              <Cookie className="size-5 text-[#A5914B]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                We value your privacy
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                We use cookies to enhance your browsing experience, serve
                personalized content, and analyze our traffic. You can choose
                which cookies to allow.
              </p>
            </div>
          </div>

          {/* Expandable preferences */}
          {expanded && (
            <div className="mt-4 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
              {Object.entries(CONSENT_TYPES).map(([key, config]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white">
                      {config.label}
                      {config.required && (
                        <span className="ml-1.5 text-[10px] text-gray-400 font-normal">
                          (Required)
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {config.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={preferences[key]}
                    disabled={config.required}
                    onClick={() => togglePreference(key)}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#A5914B]/30 ${
                      preferences[key]
                        ? "bg-[#A5914B]"
                        : "bg-gray-300 dark:bg-gray-600"
                    } ${config.required ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out mt-0.5 ${
                        preferences[key] ? "translate-x-4 ml-0.5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleAcceptAll}
              className="flex-1 px-4 py-2 bg-[#A5914B] text-white text-xs font-medium rounded-xl hover:bg-[#8B7A3F] transition-colors cursor-pointer"
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={
                expanded ? handleSavePreferences : handleAcceptEssential
              }
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              {expanded ? "Save Preferences" : "Essential Only"}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-center gap-1 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition-colors cursor-pointer"
            >
              {expanded ? (
                <>
                  <ChevronUp className="size-3" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="size-3" />
                  Customize
                </>
              )}
            </button>
          </div>

          {/* Privacy policy link */}
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-400">
            <Shield className="size-3" />
            <span>
              Read our{" "}
              <Link
                href={privacyHref}
                className="underline hover:text-[#A5914B] transition-colors"
              >
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link
                href={termsHref}
                className="underline hover:text-[#A5914B] transition-colors"
              >
                Terms of Service
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
