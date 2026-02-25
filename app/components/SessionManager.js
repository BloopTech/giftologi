"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/app/utils/supabase/client";

// ─── Tab presence tracking keys ──────────────────────────────────────────────
const PREFIX = "giftologi_";
const FORCE_LOGOUT_KEY = `${PREFIX}force_logout_on_reopen`;
const TAB_ID_KEY = `${PREFIX}tab_id`;
const OPEN_TABS_MAP_KEY = `${PREFIX}open_tab_ids`;
const RELOAD_MARKER_KEY = `${PREFIX}reload_marker`;
const HEARTBEAT_INTERVAL_MS = 2000;
const STALE_TTL_MS = 7000;

/**
 * SessionManager — auto sign-out when all tabs are closed.
 *
 * Tracks open tabs via localStorage heartbeat. When the last tab closes
 * (pagehide), a force-logout marker is set. On next page load/focus the
 * marker triggers `supabase.auth.signOut()` and redirects to /login.
 *
 * Renders nothing — drop into any authenticated layout.
 */
export default function SessionManager() {
  const supabaseRef = useRef(null);

  // Lazy-init Supabase client
  const getSupabase = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }, []);

  // ─── Tab ID helpers ──────────────────────────────────────────────────────
  const getOrCreateTabId = useCallback(() => {
    try {
      if (typeof window === "undefined") return null;
      let id = sessionStorage.getItem(TAB_ID_KEY);
      if (!id) {
        try {
          id =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        } catch {
          id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        }
        sessionStorage.setItem(TAB_ID_KEY, id);
      }
      return id;
    } catch {
      return null;
    }
  }, []);

  // ─── Open-tabs map helpers (localStorage JSON object) ────────────────────
  const readOpenTabsMap = useCallback(() => {
    try {
      const raw = localStorage.getItem(OPEN_TABS_MAP_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }, []);

  const writeOpenTabsMap = useCallback((map) => {
    try {
      localStorage.setItem(OPEN_TABS_MAP_KEY, JSON.stringify(map || {}));
    } catch {}
  }, []);

  const pruneStale = useCallback((map) => {
    const now = Date.now();
    const result = {};
    for (const k in map || {}) {
      const ts = map[k];
      if (typeof ts === "number" && now - ts <= STALE_TTL_MS) {
        result[k] = ts;
      }
    }
    return result;
  }, []);

  const cleanupOpenTabsMap = useCallback(() => {
    const current = readOpenTabsMap();
    const pruned = pruneStale(current);
    if (Object.keys(pruned).length !== Object.keys(current).length) {
      writeOpenTabsMap(pruned);
    }
    return pruned;
  }, [readOpenTabsMap, pruneStale, writeOpenTabsMap]);

  // ─── Mark this tab present / absent ──────────────────────────────────────
  const markTabPresent = useCallback(() => {
    try {
      const id = getOrCreateTabId();
      if (!id) return;
      const map = cleanupOpenTabsMap();
      map[id] = Date.now();
      writeOpenTabsMap(map);
    } catch {}
  }, [getOrCreateTabId, cleanupOpenTabsMap, writeOpenTabsMap]);

  const markTabAbsent = useCallback(() => {
    try {
      const id = sessionStorage.getItem(TAB_ID_KEY);
      let map = cleanupOpenTabsMap();
      if (id && map[id]) {
        delete map[id];
        writeOpenTabsMap(map);
      }
      // Re-read after cleanup to check if truly empty
      map = cleanupOpenTabsMap();
      const isEmpty = !map || Object.keys(map).length === 0;
      if (isEmpty) {
        try {
          localStorage.setItem(FORCE_LOGOUT_KEY, "1");
        } catch {}
      }
    } catch {}
  }, [cleanupOpenTabsMap, writeOpenTabsMap]);

  // ─── Logout helper ───────────────────────────────────────────────────────
  const performLogout = useCallback(async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("[SessionManager] signOut error:", e);
    } finally {
      // Always redirect regardless of signOut result
      window.location.href = "/login";
    }
  }, [getSupabase]);

  // ─── Reload detection (distinguish reload from tab close) ────────────────
  const isReloadNavigation = useCallback(() => {
    try {
      const nav =
        typeof performance !== "undefined" && performance.getEntriesByType
          ? performance.getEntriesByType("navigation")
          : null;
      const type = nav && nav[0] && nav[0].type;
      if (type) return type === "reload";
      // Fallback: sessionStorage marker set on pagehide survives reload
      const marker =
        typeof sessionStorage !== "undefined"
          ? sessionStorage.getItem(RELOAD_MARKER_KEY)
          : null;
      if (marker === "1") {
        try {
          sessionStorage.removeItem(RELOAD_MARKER_KEY);
        } catch {}
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // ─── Check for force-logout flag on reopen ───────────────────────────────
  const checkForceLogoutOnReopen = useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      const flag = localStorage.getItem(FORCE_LOGOUT_KEY);
      if (!flag) return;
      try {
        localStorage.removeItem(FORCE_LOGOUT_KEY);
      } catch {}
      // Don't force-logout on reload — only on genuine new tab/reopen
      if (isReloadNavigation()) return;
      performLogout();
    } catch {}
  }, [performLogout, isReloadNavigation]);

  // ─── Effect 1: Register tab + pagehide listener ──────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    markTabPresent();

    const onPageHide = () => {
      // Set reload marker so we can distinguish reload from tab close
      try {
        sessionStorage.setItem(RELOAD_MARKER_KEY, "1");
      } catch {}
      markTabAbsent();
    };

    window.addEventListener("pagehide", onPageHide);
    return () => {
      try {
        window.removeEventListener("pagehide", onPageHide);
      } catch {}
    };
  }, [markTabPresent, markTabAbsent]);

  // ─── Effect 2: Heartbeat to keep tab marked active ───────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = sessionStorage.getItem(TAB_ID_KEY) || getOrCreateTabId();
    if (!id) return;

    const beat = () => {
      try {
        const map = readOpenTabsMap();
        map[id] = Date.now();
        writeOpenTabsMap(map);
      } catch {}
    };

    beat();
    const timer = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => {
      try {
        clearInterval(timer);
      } catch {}
    };
  }, [getOrCreateTabId, readOpenTabsMap, writeOpenTabsMap]);

  // ─── Effect 3: Check force-logout on mount + focus/visibility ────────────
  useEffect(() => {
    checkForceLogoutOnReopen();

    const onPageShow = () => checkForceLogoutOnReopen();
    const onFocus = () => checkForceLogoutOnReopen();
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkForceLogoutOnReopen();
    };

    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      try {
        window.removeEventListener("pageshow", onPageShow);
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onVisibility);
      } catch {}
    };
  }, [checkForceLogoutOnReopen]);

  return null;
}

/**
 * Call this from explicit logout handlers to clear the force-logout flag
 * so the user isn't double-logged-out on their next visit.
 */
export function clearTabPresence() {
  try {
    localStorage.removeItem(FORCE_LOGOUT_KEY);
    localStorage.removeItem(OPEN_TABS_MAP_KEY);
  } catch {}
}
