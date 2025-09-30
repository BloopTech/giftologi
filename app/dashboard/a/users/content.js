"use client";
import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { toast } from "sonner";
import { updateUserRole, updateUserStatus } from "./action";
import {
  Search,
  Shield,
  UserRound,
  Store,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../components/Avatar";

export default function UsersContent({
  items = [],
  roleFilter = "all",
  q = "",
  page = 1,
  pageSize = 10,
  total = 0,
  sort = "created_at",
  dir = "desc",
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  const [state, formAction, pending] = useActionState(updateUserRole, {
    ok: null,
    message: "",
  });
  const [statusState, statusAction, statusPending] = useActionState(
    updateUserStatus,
    { ok: null, message: "" }
  );

  useEffect(() => {
    if (state?.ok != null) {
      if (state.ok) toast.success(state.message || "Role updated");
      else toast.error(state.message || "Update failed");
    }
  }, [state]);

  useEffect(() => {
    if (statusState?.ok != null) {
      if (statusState.ok)
        toast.success(statusState.message || "Status updated");
      else toast.error(statusState.message || "Status update failed");
    }
  }, [statusState]);

  const filtered = useMemo(() => {
    if (!query) return items;
    const ql = query.toLowerCase();
    return items.filter(
      (u) =>
        `${u.firstname || ""} ${u.lastname || ""}`.toLowerCase().includes(ql) ||
        (u.email || "").toLowerCase().includes(ql)
    );
  }, [items, query]);

  const roleTabs = [
    { key: "all", label: "All" },
    { key: "host", label: "Host" },
    { key: "vendor", label: "Vendor" },
    { key: "admin", label: "Admin" },
    { key: "guest", label: "Guest" },
  ];

  const toggleDir = (key) =>
    sort === key
      ? dir === "asc"
        ? "desc"
        : "asc"
      : key === "created_at"
      ? "desc"
      : "asc";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base md:text-lg font-medium text-[#2D3436] dark:text-white">
            All Users
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-gray-300">
            Search, filter and manage user roles.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-lg border border-[#f4f4f4] dark:border-gray-800 bg-white dark:bg-gray-900 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#BBA96C]"
              aria-label="Search users"
            />
            <Search
              className="h-4 w-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
          </div>
          <Link
            href={{
              pathname: "/dashboard/a/users/export",
              query: { role: roleFilter, q: query, sort, dir },
            }}
            className="inline-flex items-center gap-2 rounded-md border border-[#BBA96C] bg-[#BBA96C] text-white px-3 py-1.5 text-xs hover:bg-white hover:text-[#BBA96C]"
          >
            Export CSV
          </Link>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Role filter"
        className="flex items-center gap-2"
      >
        {roleTabs.map((t) => {
          const selected = roleFilter === t.key;
          return (
            <Link
              key={t.key}
              href={{
                pathname: "/dashboard/a/users",
                query: {
                  role: t.key,
                  page: 1,
                  limit: pageSize,
                  q: query,
                  sort,
                  dir,
                },
              }}
              role="tab"
              aria-selected={selected}
              className={
                selected
                  ? "px-3 py-1.5 text-xs rounded-md bg-[#BBA96C] text-white border border-[#BBA96C]"
                  : "px-3 py-1.5 text-xs rounded-md bg-white dark:bg-gray-900 text-[#2D3436] dark:text-white border border-[#f4f4f4] dark:border-gray-800 hover:bg-[#FFFCEF]"
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border border-[#f4f4f4] dark:border-gray-800 bg-[#FFFCEF] dark:bg-gray-900 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#6B7280] dark:text-gray-300">
              <th className="px-4 py-3 whitespace-nowrap">
                <Link
                  href={{
                    pathname: "/dashboard/a/users",
                    query: {
                      role: roleFilter,
                      q: query,
                      page: 1,
                      limit: pageSize,
                      sort: "name",
                      dir: toggleDir("name"),
                    },
                  }}
                  className="hover:text-[#85753C]"
                >
                  User
                </Link>
              </th>
              <th className="px-4 py-3 whitespace-nowrap">Email</th>
              <th className="px-4 py-3 whitespace-nowrap">
                <Link
                  href={{
                    pathname: "/dashboard/a/users",
                    query: {
                      role: roleFilter,
                      q: query,
                      page: 1,
                      limit: pageSize,
                      sort: "role",
                      dir: toggleDir("role"),
                    },
                  }}
                  className="hover:text-[#85753C]"
                >
                  Role
                </Link>
              </th>
              <th className="px-4 py-3 whitespace-nowrap">
                <Link
                  href={{
                    pathname: "/dashboard/a/users",
                    query: {
                      role: roleFilter,
                      q: query,
                      page: 1,
                      limit: pageSize,
                      sort: "created_at",
                      dir: toggleDir("created_at"),
                    },
                  }}
                  className="hover:text-[#85753C]"
                >
                  Joined
                </Link>
              </th>
              <th className="px-4 py-3 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f4f4f4] dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-[#6B7280] dark:text-gray-300"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="text-[#2D3436] dark:text-white">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="relative">
                        <Avatar className="w-8 h-8 ring-4 ring-white shadow-xl">
                          <AvatarImage
                            src={u?.image}
                            alt={u?.firstname}
                            className="object-cover"
                          />
                          <AvatarFallback
                            style={{ backgroundColor: u?.color }}
                            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xs text-white dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                          >
                            {u?.firstname?.charAt(0)}
                            {u?.lastname?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {u.firstname} {u.lastname}
                        </div>
                        <div className="text-xs text-[#6B7280] dark:text-gray-300 truncate">
                          Joined {new Date(u.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{u.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap capitalize">
                    {u.role}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap capitalize">
                    {u.status}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <form
                      action={formAction}
                      className="inline-flex items-center gap-2"
                    >
                      <input type="hidden" name="user_id" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="rounded-md border border-[#f4f4f4] dark:border-gray-800 bg-white dark:bg-gray-900 text-xs px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BBA96C]"
                      >
                        {roleTabs
                          .filter((t) => t.key !== "all")
                          .map((r) => (
                            <option key={r.key} value={r.key}>
                              {r.label}
                            </option>
                          ))}
                      </select>
                      <button
                        type="submit"
                        disabled={pending}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-[#BBA96C] text-white px-3 py-1.5 text-xs disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BBA96C]"
                      >
                        Update
                      </button>
                    </form>
                    <form
                      action={statusAction}
                      className="inline-flex items-center gap-2 ml-2"
                    >
                      <input type="hidden" name="user_id" value={u.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={
                          u.status === "suspended" ? "active" : "suspended"
                        }
                      />
                      <button
                        type="submit"
                        disabled={statusPending}
                        className={`cursor-pointer ${
                          u.status === "suspended"
                            ? "inline-flex items-center gap-1 rounded-md bg-white text-[#16A34A] border border-[#BBF7D0] hover:bg-[#F0FDF4] px-3 py-1.5 text-xs disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BBF7D0]"
                            : "inline-flex items-center gap-1 rounded-md bg-white text-[#B91C1C] border border-[#FECACA] hover:bg-[#FFF1F2] px-3 py-1.5 text-xs disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FECACA]"
                        }`}
                      >
                        {u.status === "suspended" ? "Activate" : "Suspend"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#6B7280] dark:text-gray-300">
          Page {page} of {totalPages} • {total} total
        </p>
        <div className="inline-flex items-center gap-2">
          <label className="text-xs text-[#6B7280] dark:text-gray-300 inline-flex items-center gap-2">
            <span>Rows</span>
            <select
              className="rounded-md border border-[#f4f4f4] dark:border-gray-800 bg-white dark:bg-gray-900 text-xs px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BBA96C]"
              value={pageSize}
              onChange={(e) => {
                const newLimit = parseInt(e.target.value, 10) || 10;
                router.push(
                  `/dashboard/a/users?role=${roleFilter}&page=1&limit=${newLimit}&q=${encodeURIComponent(
                    query
                  )}&sort=${sort}&dir=${dir}`
                );
              }}
              aria-label="Rows per page"
            >
              {[10, 20, 40].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <Link
            aria-label="Previous page"
            className={
              "px-3 py-1.5 text-xs rounded-md border border-[#f4f4f4] dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-[#FFFCEF] " +
              (isFirst
                ? "opacity-50 pointer-events-none cursor-not-allowed"
                : "")
            }
            href={{
              pathname: "/dashboard/a/users",
              query: {
                role: roleFilter,
                page: Math.max(1, page - 1),
                limit: pageSize,
                q: query,
                sort,
                dir,
              },
            }}
          >
            Prev
          </Link>
          <Link
            aria-label="Next page"
            className={
              "px-3 py-1.5 text-xs rounded-md border border-[#f4f4f4] dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-[#FFFCEF] " +
              (isLast
                ? "opacity-50 pointer-events-none cursor-not-allowed"
                : "")
            }
            href={{
              pathname: "/dashboard/a/users",
              query: {
                role: roleFilter,
                page: Math.min(totalPages, page + 1),
                limit: pageSize,
                q: query,
                sort,
                dir,
              },
            }}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
