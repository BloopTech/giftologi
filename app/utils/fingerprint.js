"use client";

import FingerprintJS from "@fingerprintjs/fingerprintjs";

let cachedVisitorId = null;
let agentPromise = null;

/**
 * Returns a stable device fingerprint string.
 * Uses FingerprintJS open-source to generate a visitor ID from browser
 * attributes (canvas, WebGL, audio, fonts, screen, timezone, etc.).
 * The result is cached so the fingerprint is only computed once per page load.
 */
export const getDeviceFingerprint = async () => {
  if (typeof window === "undefined") return null;
  if (cachedVisitorId) return cachedVisitorId;

  try {
    if (!agentPromise) {
      agentPromise = FingerprintJS.load();
    }
    const agent = await agentPromise;
    const result = await agent.get();
    cachedVisitorId = result.visitorId || null;
    return cachedVisitorId;
  } catch {
    return null;
  }
};
