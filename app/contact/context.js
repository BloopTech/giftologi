"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ContactContext = createContext(null);

export function ContactProvider({ children }) {
  const value = useContactValue();
  return <ContactContext.Provider value={value}>{children}</ContactContext.Provider>;
}

export function useContactContext() {
  return useContext(ContactContext);
}

function useContactValue() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/contact", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load contact details");
        }

        if (!ignore) {
          setSettings(payload?.settings || null);
        }
      } catch (err) {
        if (!ignore) {
          setError(err?.message || "Failed to load contact details");
          setSettings(null);
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
  }, [refreshKey]);

  const submitContactForm = useCallback(async ({ name, email, subject, message }) => {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, subject, message }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        error: payload?.error || "Failed to send your message.",
      };
    }

    return {
      ok: true,
      submission: payload?.submission || null,
    };
  }, []);

  return useMemo(
    () => ({
      settings,
      loading,
      error,
      refresh,
      submitContactForm,
    }),
    [settings, loading, error, refresh, submitContactForm],
  );
}
