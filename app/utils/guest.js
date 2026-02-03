const GUEST_BROWSER_ID_KEY = "giftologi_guest_browser_id";
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID;

export const getOrCreateGuestBrowserId = () => {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.localStorage.getItem(GUEST_BROWSER_ID_KEY);
    if (existing) return existing;
  } catch {
    // ignore storage failures
  }

  let nextId;
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    nextId = crypto.randomUUID();
  } else {
    nextId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  try {
    window.localStorage.setItem(GUEST_BROWSER_ID_KEY, nextId);
  } catch {
    // ignore storage failures
  }

  return nextId;
};

const getGoogleAnalyticsClientId = () => {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!window.gtag || !GA_MEASUREMENT_ID) return Promise.resolve(null);

  return new Promise((resolve) => {
    let resolved = false;
    try {
      window.gtag("get", GA_MEASUREMENT_ID, "client_id", (clientId) => {
        if (!resolved) {
          resolved = true;
          resolve(clientId || null);
        }
      });
    } catch {
      resolved = true;
      resolve(null);
    }

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 1000);
  });
};

export const getGuestIdentifier = async () => {
  const gaClientId = await getGoogleAnalyticsClientId();
  if (gaClientId) {
    return `ga_${gaClientId}`;
  }
  return getOrCreateGuestBrowserId();
};

export const getGuestBrowserId = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(GUEST_BROWSER_ID_KEY);
  } catch {
    return null;
  }
};
