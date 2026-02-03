"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "../utils/supabase/client";

const formatRelativeTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60000) return "Just now";
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const VARIANT_STYLES = {
  header: {
    wrapper: "relative",
    button:
      "relative flex h-9 w-9 items-center justify-center rounded-full border border-[#DCDCDE] bg-white text-[#A2845E] hover:bg-[#F9FAFB] transition-colors",
    panel:
      "absolute right-0 mt-3 w-80 rounded-xl border border-[#E5E7EB] bg-white shadow-lg z-20",
    label: null,
  },
  sidebar: {
    wrapper: "relative w-full",
    button:
      "relative flex w-full items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#686868] hover:bg-[#F9FAFB] transition-colors",
    panel:
      "absolute left-full ml-4 top-0 w-80 rounded-xl border border-[#E5E7EB] bg-white shadow-lg z-20",
    label: "Notifications",
  },
};

export default function NotificationBell({
  userId,
  variant = "header",
  className = "",
}) {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.header;
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("notifications")
      .select(
        "id, message, type, link, data, read, read_at, created_at, user_id",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (fetchError) {
      setError(fetchError.message || "Failed to load notifications.");
      setLoading(false);
      return;
    }

    setNotifications(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [supabase, userId]);

  const markAsRead = useCallback(
    async (notification) => {
      if (!notification || notification.read) return;
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read: true, read_at: now })
        .eq("id", notification.id);

      if (!updateError) {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id
              ? { ...item, read: true, read_at: now }
              : item,
          ),
        );
      }
    },
    [supabase],
  );

  const markAllAsRead = useCallback(async () => {
    if (!notifications.length) return;
    const unreadIds = notifications
      .filter((notification) => !notification.read)
      .map((notification) => notification.id);
    if (!unreadIds.length) return;

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read: true, read_at: now })
      .in("id", unreadIds);

    if (!updateError) {
      setNotifications((prev) =>
        prev.map((notification) =>
          unreadIds.includes(notification.id)
            ? { ...notification, read: true, read_at: now }
            : notification,
        ),
      );
    }
  }, [notifications, supabase]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    loadNotifications();
  }, [loadNotifications, userId]);

  useEffect(() => {
    if (!userId) return undefined;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => {
            const next = [payload.new, ...prev];
            return next.slice(0, 20);
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((item) =>
              item.id === payload.new.id ? payload.new : item,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (event) => {
      if (
        panelRef.current?.contains(event.target) ||
        buttonRef.current?.contains(event.target)
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!userId) return null;

  return (
    <div className={`${styles.wrapper} ${className}`.trim()}>
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${styles.button} cursor-pointer`}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {styles.label ? <span>{styles.label}</span> : null}
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div ref={panelRef} className={styles.panel}>
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#111827]">
                Notifications
              </p>
              <p className="text-xs text-[#6B7280]">
                {unreadCount > 0
                  ? `${unreadCount} unread message${unreadCount > 1 ? "s" : ""}`
                  : "All caught up"}
              </p>
            </div>
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8]"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto px-4 py-3">
            {loading ? (
              <p className="text-xs text-[#6B7280]">Loading...</p>
            ) : error ? (
              <p className="text-xs text-[#B91C1C]">{error}</p>
            ) : notifications.length === 0 ? (
              <p className="text-xs text-[#6B7280]">No notifications yet.</p>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const content = (
                    <div
                      className={`rounded-lg border px-3 py-2 transition-colors ${
                        notification.read
                          ? "border-[#E5E7EB] bg-white"
                          : "border-[#FCD34D] bg-[#FFFBEB]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-[#111827]">
                          {notification.message}
                        </p>
                        {!notification.read ? (
                          <span className="mt-1 h-2 w-2 rounded-full bg-[#F97316]" />
                        ) : null}
                      </div>
                      <p className="text-[11px] text-[#6B7280]">
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>
                  );

                  if (notification.link) {
                    return (
                      <Link
                        key={notification.id}
                        href={notification.link}
                        onClick={() => markAsRead(notification)}
                        className="block"
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => markAsRead(notification)}
                      className="block w-full text-left"
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
