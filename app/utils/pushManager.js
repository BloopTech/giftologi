"use client";

/**
 * Client-side Web Push subscription manager.
 *
 * Handles:
 * - Service worker registration
 * - Push permission requests
 * - Subscription creation and server sync
 */

const SW_PATH = "/sw.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if push notifications are supported in this browser.
 */
export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Get current push permission state.
 * @returns {"granted" | "denied" | "default" | "unsupported"}
 */
export function getPushPermission() {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Register the push service worker if not already registered.
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerPushServiceWorker() {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: "/",
    });
    return registration;
  } catch (err) {
    console.error("[pushManager] SW registration failed:", err);
    return null;
  }
}

/**
 * Subscribe the user to Web Push and sync with the server.
 *
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function subscribeToPush() {
  if (!isPushSupported()) {
    return { success: false, error: "Push notifications not supported" };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, error: "Permission denied" };
    }

    const registration = await registerPushServiceWorker();
    if (!registration) {
      return { success: false, error: "Service worker registration failed" };
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      return { success: false, error: "VAPID key not configured" };
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data.error || "Server sync failed" };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("[pushManager] subscribe error:", err);
    return { success: false, error: err?.message || "Subscribe failed" };
  }
}

/**
 * Unsubscribe from Web Push and remove from server.
 *
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function unsubscribeFromPush() {
  if (!isPushSupported()) {
    return { success: false, error: "Push not supported" };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      await subscription.unsubscribe();
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("[pushManager] unsubscribe error:", err);
    return { success: false, error: err?.message || "Unsubscribe failed" };
  }
}

/**
 * Check if the user is currently subscribed to push.
 * @returns {Promise<boolean>}
 */
export async function isSubscribedToPush() {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return Boolean(subscription);
  } catch {
    return false;
  }
}
