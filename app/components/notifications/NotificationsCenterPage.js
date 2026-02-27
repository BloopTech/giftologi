"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Bell, CheckCheck } from "lucide-react";
import { createClient } from "@/app/utils/supabase/client";

const PAGE_SIZE = 20;

const formatRelativeTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60000) return "Just now";
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const ROLE_THEME = {
  admin: {
    accent: "#A2845E",
    title: "Notifications",
  },
  host: {
    accent: "#85753C",
    title: "Notifications",
  },
  vendor: {
    accent: "#2D6A4F",
    title: "Notifications",
  },
};

export default function NotificationsCenterPage({
  role = "admin",
  title,
  allowArchive = false,
}) {
  const supabase = useMemo(() => createClient(), []);
  const theme = ROLE_THEME[role] || ROLE_THEME.admin;

  const [userId, setUserId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [notifications, setNotifications] = useState([]);
  const [counts, setCounts] = useState({ all: 0, unread: 0, archived: 0 });

  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);

  const loadingRef = useRef(false);
  const offsetRef = useRef(0);
  const sentinelRef = useRef(null);

  const isArchivedView = activeFilter === "archived";

  const fetchCounts = useCallback(
    async (targetUserId) => {
      if (!targetUserId) return;

      const [allResult, unreadResult, archivedResult] = await Promise.all([
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", targetUserId)
          .is("archived_at", null),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", targetUserId)
          .eq("read", false)
          .is("archived_at", null),
        allowArchive
          ? supabase
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("user_id", targetUserId)
              .not("archived_at", "is", null)
          : Promise.resolve({ count: 0 }),
      ]);

      setCounts({
        all: allResult.count || 0,
        unread: unreadResult.count || 0,
        archived: archivedResult.count || 0,
      });
    },
    [allowArchive, supabase],
  );

  const loadPage = useCallback(
    async ({ reset = false } = {}) => {
      if (!userId || loadingRef.current) return;

      loadingRef.current = true;
      setError(null);

      if (reset) {
        offsetRef.current = 0;
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const from = offsetRef.current;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("notifications")
        .select(
          "id, message, type, link, data, read, read_at, created_at, archived_at",
          { count: "exact" },
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (isArchivedView) {
        query = query.not("archived_at", "is", null);
      } else {
        query = query.is("archived_at", null);
      }

      if (activeFilter === "unread") {
        query = query.eq("read", false);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        setError(fetchError.message || "Failed to load notifications.");
        setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      const nextOffset = from + rows.length;
      offsetRef.current = nextOffset;

      setNotifications((prev) => {
        if (reset) return rows;
        const merged = [...prev, ...rows];
        const seen = new Set();
        return merged.filter((item) => {
          if (!item?.id || seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
      });

      if (typeof count === "number") {
        setHasMore(nextOffset < count);
      } else {
        setHasMore(rows.length === PAGE_SIZE);
      }

      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    },
    [activeFilter, isArchivedView, supabase, userId],
  );

  const refreshFeed = useCallback(async () => {
    if (!userId) return;
    await Promise.all([loadPage({ reset: true }), fetchCounts(userId)]);
  }, [fetchCounts, loadPage, userId]);

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!notificationId || !userId) return;
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read: true, read_at: now })
        .eq("id", notificationId)
        .eq("user_id", userId);

      if (updateError) {
        setError(updateError.message || "Failed to mark as read.");
        return;
      }

      if (activeFilter === "unread") {
        await refreshFeed();
        return;
      }

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? { ...item, read: true, read_at: now }
            : item,
        ),
      );
      fetchCounts(userId);
    },
    [activeFilter, fetchCounts, refreshFeed, supabase, userId],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId || counts.unread === 0 || isArchivedView) return;

    let query = supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("read", false)
      .is("archived_at", null);

    if (activeFilter === "unread") {
      query = query.eq("read", false);
    }

    const { error: updateError } = await query;

    if (updateError) {
      setError(updateError.message || "Failed to mark all as read.");
      return;
    }

    await refreshFeed();
  }, [
    activeFilter,
    counts.unread,
    isArchivedView,
    refreshFeed,
    supabase,
    userId,
  ]);

  const archiveNotification = useCallback(
    async (notificationId) => {
      if (!allowArchive || !notificationId || !userId) return;

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", userId);

      if (updateError) {
        setError(updateError.message || "Failed to archive notification.");
        return;
      }

      await refreshFeed();
    },
    [allowArchive, refreshFeed, supabase, userId],
  );

  const restoreNotification = useCallback(
    async (notificationId) => {
      if (!allowArchive || !notificationId || !userId) return;

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ archived_at: null })
        .eq("id", notificationId)
        .eq("user_id", userId);

      if (updateError) {
        setError(updateError.message || "Failed to restore notification.");
        return;
      }

      await refreshFeed();
    },
    [allowArchive, refreshFeed, supabase, userId],
  );

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const { data: { user } = {} } = await supabase.auth.getUser();

      if (!isMounted) return;
      setUserId(user?.id || null);
      setAuthLoading(false);
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!userId) {
      if (!authLoading) {
        setLoading(false);
      }
      return;
    }

    setNotifications([]);
    setHasMore(false);
    offsetRef.current = 0;
    loadPage({ reset: true });
    fetchCounts(userId);
  }, [activeFilter, authLoading, fetchCounts, loadPage, userId]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          loadPage({ reset: false });
        }
      },
      {
        rootMargin: "200px",
      },
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadPage, loading, loadingMore]);

  const filterButtons = [
    {
      key: "all",
      label: `All (${counts.all})`,
    },
    {
      key: "unread",
      label: `Unread (${counts.unread})`,
    },
    ...(allowArchive
      ? [
          {
            key: "archived",
            label: `Archived (${counts.archived})`,
          },
        ]
      : []),
  ];

  return (
    <section className="mx-auto w-full max-w-5xl px-5 pb-10 pt-4 lg:px-0">
      <div className="mb-5 rounded-2xl border border-[#E5E7EB] bg-white p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#111827]">
              {title || theme.title}
            </h1>
            <p className="mt-1 text-sm text-[#6B7280]">
              Scroll to load older notifications.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={counts.unread === 0 || isArchivedView}
              className="inline-flex items-center gap-1 rounded-full border border-[#D1D5DB] px-3 py-1.5 text-xs font-medium text-[#374151] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
            <Link
              href={
                role === "host"
                  ? "/dashboard/h"
                  : role === "vendor"
                    ? "/dashboard/v"
                    : "/dashboard/admin"
              }
              className="rounded-full border border-[#D1D5DB] px-3 py-1.5 text-xs font-medium text-[#374151]"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {filterButtons.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: isActive ? theme.accent : "#D1D5DB",
                  backgroundColor: isActive ? "#F9FAFB" : "#FFFFFF",
                  color: isActive ? theme.accent : "#374151",
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white">
        {authLoading || loading ? (
          <p className="px-4 py-6 text-sm text-[#6B7280]">
            Loading notifications...
          </p>
        ) : !userId ? (
          <p className="px-4 py-6 text-sm text-[#B91C1C]">
            You must be signed in to view notifications.
          </p>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-[#B91C1C]">{error}</p>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <Bell className="mb-3 h-8 w-8 text-[#9CA3AF]" />
            <p className="text-sm font-medium text-[#111827]">
              No notifications found.
            </p>
            <p className="text-xs text-[#6B7280]">
              Try switching filters or check back later.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3F4F6]">
            {notifications.map((notification) => {
              const cardClassName = notification.read
                ? "border-[#F3F4F6] bg-white hover:bg-[#F9FAFB]"
                : "border-[#FECACA] bg-[#FEF2F2] hover:bg-[#FEE2E2]";

              const content = (
                <>
                  <div className="flex items-start justify-between gap-3 w-full">
                    <p className="text-sm font-medium text-[#111827] w-[65%] line-clamp-2">
                      {notification.message}
                    </p>
                    {!notification.read ? (
                      <div className="flex justify-end w-[25%]">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="cursor-pointeer flex items-center justify-center rounded-full border border-[#FCA5A5] bg-white px-2 py-0.5 text-[11px] font-medium text-[#B91C1C] hover:bg-[#FEE2E2]"
                        >
                          Mark as read
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                    <span>{formatRelativeTime(notification.created_at)}</span>
                    {notification.type ? (
                      <span>• {notification.type}</span>
                    ) : null}
                  </div>
                </>
              );

              return (
                <div key={notification.id} className="px-4 py-3">
                  {notification.link ? (
                    <Link
                      href={notification.link}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id);
                        }
                      }}
                      className={`block rounded-lg border p-3 transition-colors ${cardClassName}`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id);
                        }
                      }}
                      className={`block w-full rounded-lg border p-3 text-left transition-colors ${cardClassName}`}
                    >
                      {content}
                    </button>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    {allowArchive ? (
                      isArchivedView ? (
                        <button
                          type="button"
                          onClick={() => restoreNotification(notification.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-[#D1D5DB] px-2.5 py-1 text-[11px] font-medium text-[#374151]"
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" />
                          Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => archiveNotification(notification.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-[#D1D5DB] px-2.5 py-1 text-[11px] font-medium text-[#374151]"
                        >
                          <Archive className="h-3.5 w-3.5" />
                          Archive
                        </button>
                      )
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore ? (
          <div
            ref={sentinelRef}
            className="px-4 py-4 text-center text-xs text-[#6B7280]"
          >
            {loadingMore ? "Loading more..." : "Scroll for more"}
          </div>
        ) : notifications.length > 0 ? (
          <p className="px-4 py-4 text-center text-xs text-[#6B7280]">
            You have reached the end.
          </p>
        ) : null}
      </div>
    </section>
  );
}
