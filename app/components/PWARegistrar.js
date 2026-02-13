"use client";

import { useEffect } from "react";

export default function PWARegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        // If a new SW is waiting, tell it to activate immediately
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        // Listen for future updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New version available — activate it
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      } catch (error) {
        console.error("[PWA] Service worker registration failed:", error);
      }
    };

    register();
  }, []);

  return null;
}
