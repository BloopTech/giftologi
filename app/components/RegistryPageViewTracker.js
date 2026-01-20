"use client";

import { useEffect } from "react";

function getOrCreateSessionId() {
  if (typeof window === "undefined") return null;

  const KEY = "registry_page_view_session_id";
  let existing = window.localStorage.getItem(KEY);
  if (existing) return existing;

  let next;
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    next = crypto.randomUUID();
  } else {
    next = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    // ignore storage failures
  }

  return next;
}

export default function RegistryPageViewTracker({ registryId }) {
  useEffect(() => {
    if (!registryId) return;
    if (typeof window === "undefined") return;

    const sessionId = getOrCreateSessionId();

    // Fire-and-forget tracking request; errors are swallowed
    fetch("/api/registry/track-view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        registry_id: registryId,
        session_id: sessionId,
      }),
    }).catch(() => {});
  }, [registryId]);

  return null;
}
