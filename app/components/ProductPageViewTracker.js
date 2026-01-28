"use client";

import { useEffect } from "react";

function getOrCreateProductSessionId() {
  if (typeof window === "undefined") return null;

  const KEY = "product_page_view_session_id";
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

function isLocalhost() {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export default function ProductPageViewTracker({ productId }) {
  useEffect(() => {
    if (!productId) return;
    if (typeof window === "undefined") return;
    if (isLocalhost()) return;

    const sessionId = getOrCreateProductSessionId();

    // Fire-and-forget tracking request; errors are swallowed
    fetch("/api/product/track-view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: productId,
        session_id: sessionId,
      }),
    }).catch(() => {});
  }, [productId]);

  return null;
}
