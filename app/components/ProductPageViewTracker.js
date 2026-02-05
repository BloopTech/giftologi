"use client";

import { useEffect } from "react";
import { getOrCreateProductSessionId } from "../utils/guest";

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
    })
      .then(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("product-viewed", { detail: { productId } })
          );
        }
      })
      .catch(() => {});
  }, [productId]);

  return null;
}
