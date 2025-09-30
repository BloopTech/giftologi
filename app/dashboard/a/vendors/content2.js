"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Check, X, Search } from "lucide-react";
import { approveVendor, rejectVendor } from "./action";
import { toast } from "sonner";
import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
} from "../../../components/Drawer";

export default function VendorApprovalsContent({ items = [], status = "pending", page = 1, pageSize = 10, total = 0 }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const initial = { ok: null, message: "" };
  const [approveState, approveAction, approvePending] = useActionState(approveVendor, initial);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectVendor, initial);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const name = `${it?.user?.firstname || ""} ${it?.user?.lastname || ""}`.toLowerCase();
      const email = (it?.user?.email || "").toLowerCase();
      const business = (it?.business_name || "").toLowerCase();
      return name.includes(q) || email.includes(q) || business.includes(q);
    });
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  useEffect(() => {
    if (approveState?.ok != null) {
      if (approveState.ok) toast.success(approveState.message || "Approved");
      else toast.error(approveState.message || "Approval failed");
    }
  }, [approveState]);

  useEffect(() => {
    if (rejectState?.ok != null) {
      if (rejectState.ok) toast.success(rejectState.message || "Rejected");
      else toast.error(rejectState.message || "Rejection failed");
    }
  }, [rejectState]);

  const heading = status === "approved" ? "Approved Vendors" : status === "rejected" ? "Rejected Applications" : "Pending Vendor Applications";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base md:text-lg font-medium text-[#2D3436] dark:text-white">{heading}</h2>
          <p className="text-xs text-[#6B7280] dark:text-gray-300">Approve or reject vendor applications.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, or business"
              className="w-full rounded-lg border border-[#f4f4f4] dark:border-gray-800 bg-white dark:bg-gray-900 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#BBA96C]"
              aria-label="Search applications"
            />
            <Search className="h-4 w-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Vendor status" className="flex items-center gap-2">
        {[
          { key: "pending", label: "Pending" },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
        ].map((t) => {
          const selected = status === t.key;
          return (
            <Link
              key={t.key}
              href={{ pathname: "/dashboard/a/vendors", query: { status: t.key, page: 1, limit: pageSize, q: query } }}
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

      <div className="rounded-xl border border-[#f4f4f4] dark:border-gray-800 bg-[#FFFCEF] dark:bg-gray-900 divide-y divide-[#f4f4f4] dark:divide-gray-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#6B7280] dark:text-gray-300">
            {status === "pending" && "No pending applications. When vendors apply, they will appear here."}
            {status === "approved" && "No approved vendors found."}
            {status === "rejected" && "No rejected applications found."}
          </div>
        ) : (
          filtered.map((it) => (
            <div key={it.application_id} className="p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ backgroundColor: it?.user?.color || "#BBA96C" }} aria-hidden="true">
                  {(it?.user?.firstname?.[0] || "").toUpperCase()}
                  {(it?.user?.lastname?.[0] || "").toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#2D3436] dark:text-white truncate">
                    {it?.user?.firstname} {it?.user?.lastname}
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-gray-300 truncate">{it?.user?.email}</p>
                  {it?.business_name ? (
                    <p className="text-xs text-[#6B7280] dark:text-gray-300 truncate">Business: {it.business_name}</p>
                  ) : null}
                  {it?.created_at ? (
                    <p className="text-[11px] text-[#9CA3AF] dark:text-gray-400">Applied {new Date(it.created_at).toLocaleString()}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Drawer>
                  <DrawerTrigger className="inline-flex items-center gap-1 rounded-md border border-[#f4f4f4] dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs hover:bg-[#FFFCEF]">
                    Details
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Application Details</DrawerTitle>
                    </DrawerHeader>
                    <DrawerBody>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-[#6B7280]">Name:</span> {it?.user?.firstname} {it?.user?.lastname}</p>
                        <p><span className="text-[#6B7280]">Email:</span> {it?.user?.email}</p>
                        {it?.business_name ? (
                          <p><span className="text-[#6B7280]">Business:</span> {it.business_name}</p>
                        ) : null}
                        {it?.created_at ? (
                          <p><span className="text-[#6B7280]">Applied:</span> {new Date(it.created_at).toLocaleString()}</p>
                        ) : null}
                      </div>
                    </DrawerBody>
                    {status === "pending" ? (
                      <DrawerFooter>
                        <form action={approveAction}>
                          <input type="hidden" name="application_id" value={it.application_id} />
                          <input type="hidden" name="user_id" value={it.user_id} />
                          <button type="submit" disabled={approvePending} className="inline-flex items-center gap-1 rounded-md bg-[#BBA96C] text-white px-3 py-1.5 text-xs disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BBA96C]">
                            <Check className="h-4 w-4" /> Approve
                          </button>
                        </form>
                        <form action={rejectAction}>
                          <input type="hidden" name="application_id" value={it.application_id} />
                          <input type="hidden" name="user_id" value={it.user_id} />
                          <button type="submit" disabled={rejectPending} className="inline-flex items-center gap-1 rounded-md bg-white text-[#B91C1C] border border-[#FECACA] hover:bg-[#FFF1F2] px-3 py-1.5 text-xs disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FECACA]">
                            <X className="h-4 w-4" /> Reject
                          </button>
                        </form>
                      </DrawerFooter>
                    ) : null}
                  </DrawerContent>
                </Drawer>

                {status === "pending" ? (
                  <>
                    <form action={approveAction}>
                      <input type="hidden" name="application_id" value={it.application_id} />
                      <input type="hidden" name="user_id" value={it.user_id} />
                      <button type="submit" disabled={approvePending} className="inline-flex items-center gap-1 rounded-md bg-[#BBA96C] text-white px-3 py-1.5 text-xs disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BBA96C]" aria-label={`Approve ${it?.user?.firstname || "user"}`}>
                        <Check className="h-4 w-4" /> Approve
                      </button>
                    </form>
                    <form action={rejectAction}>
                      <input type="hidden" name="application_id" value={it.application_id} />
                      <input type="hidden" name="user_id" value={it.user_id} />
                      <button type="submit" disabled={rejectPending} className="inline-flex items-center gap-1 rounded-md bg-white text-[#B91C1C] border border-[#FECACA] hover:bg-[#FFF1F2] px-3 py-1.5 text-xs disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FECACA]" aria-label={`Reject ${it?.user?.firstname || "user"}`}>
                        <X className="h-4 w-4" /> Reject
                      </button>
                    </form>
                  </>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#6B7280] dark:text-gray-300">Page {page} of {totalPages} • {total} total</p>
        <div className="inline-flex items-center gap-2">
          <label className="text-xs text-[#6B7280] dark:text-gray-300 inline-flex items-center gap-2">
            <span>Rows</span>
            <select
              className="rounded-md border border-[#f4f4f4] dark:border-gray-800 bg-white dark:bg-gray-900 text-xs px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BBA96C]"
              value={pageSize}
              onChange={(e) => {
                const newLimit = parseInt(e.target.value, 10) || 10;
                router.push(`/dashboard/a/vendors?status=${status}&page=1&limit=${newLimit}&q=${encodeURIComponent(query)}`);
              }}
              aria-label="Rows per page"
            >
              {[10, 20, 40].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <Link
            aria-label="Previous page"
            className={"px-3 py-1.5 text-xs rounded-md border border-[#f4f4f4] dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-[#FFFCEF] " + (isFirst ? "opacity-50 pointer-events-none cursor-not-allowed" : "")}
            href={{ pathname: "/dashboard/a/vendors", query: { status, page: Math.max(1, page - 1), limit: pageSize, q: query } }}
          >
            Prev
          </Link>
          <Link
            aria-label="Next page"
            className={"px-3 py-1.5 text-xs rounded-md border border-[#f4f4f4] dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-[#FFFCEF] " + (isLast ? "opacity-50 pointer-events-none cursor-not-allowed" : "")}
            href={{ pathname: "/dashboard/a/vendors", query: { status, page: Math.min(totalPages, page + 1), limit: pageSize, q: query } }}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
