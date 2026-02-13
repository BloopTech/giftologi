"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Download, Smartphone } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already installed (standalone mode)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone
    ) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed previously (respect for 7 days)
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    setIsIOS(isiOS);

    // Listen for the browser's install prompt (Chrome/Edge/Samsung)
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show our custom prompt after a short delay (don't interrupt page load)
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // On iOS, show our custom guide after delay if not installed
    if (isiOS) {
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    // Listen for successful install
    const installedHandler = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
    } catch (err) {
      console.error("[InstallPrompt] prompt error:", err);
    } finally {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  }, [deferredPrompt, isIOS]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
  }, []);

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-9999 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-2xl bg-gray-900 text-white shadow-2xl border border-gray-700 p-4">
        {showIOSGuide ? (
          // iOS share-sheet guide
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">Install Giftologi</h3>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-full hover:bg-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
              <li>
                Tap the <strong>Share</strong> button{" "}
                <span className="inline-block align-middle">
                  <svg
                    className="inline h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                  </svg>
                </span>{" "}
                in your browser
              </li>
              <li>
                Scroll down and tap{" "}
                <strong>&quot;Add to Home Screen&quot;</strong>
              </li>
              <li>
                Tap <strong>&quot;Add&quot;</strong> to confirm
              </li>
            </ol>
          </div>
        ) : (
          // Standard install prompt
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-xl bg-white/10 p-2.5">
              <Smartphone className="h-6 w-6 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">Install Giftologi</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Add to your home screen for a faster experience
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-full hover:bg-gray-700 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" />
                Install
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
