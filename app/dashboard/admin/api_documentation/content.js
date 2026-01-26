"use client";
import React from "react";
import { Search } from "lucide-react";
import { useAPIDocumentationContext } from "./context";

const primaryInterfaces = [
  {
    endpoint: "/api/admin/search",
    method: "GET",
    description:
      "Global admin search across registries and vendor entities. Requires an authenticated admin profile with the correct role and calls the Supabase RPC 'admin_global_search' plus the 'profiles' table for authorization.",
  },
  {
    endpoint: "/api/registry/track-view",
    method: "POST",
    description:
      "Tracks public registry page views by inserting into 'registry_page_views', including optional 'profile_id', session identifier, hashed IP address and user agent.",
  },
  {
    endpoint: "supabase://dashboard-metrics",
    method: "CLIENT QUERY",
    description:
      "The admin dashboard metrics context queries Supabase directly to aggregate data from 'registries', 'vendor_applications', 'orders', 'order_payments', 'order_items', 'vendors', 'events' and 'support_tickets'.",
  },
  {
    endpoint: "supabase://admin_activity_log",
    method: "TABLE",
    description:
      "Admin activity history is stored in the 'admin_activity_log' table and surfaced in the Activity Log page for auditing who did what and when.",
  },
  {
    endpoint: "supabase://registries",
    method: "TABLE",
    description:
      "Registry list, registry details and registry analytics screens primarily read from the 'registries' table joined to 'events' and order-related tables.",
  },
  {
    endpoint: "supabase://vendor_applications",
    method: "TABLE",
    description:
      "Vendor requests and vendor management rely on 'vendor_applications' and 'vendors' to track onboarding status, approvals and rejections.",
  },
];

export default function APIDocumentationContent() {
  const { query, setQuery, focusId } = useAPIDocumentationContext() || {};
  const searchTerm = query || "";

  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const makeRowId = (endpoint) => `api-doc-row-${encodeURIComponent(endpoint)}`;

  const filteredInterfaces = React.useMemo(() => {
    const q = normalize(searchTerm);
    if (!q) return primaryInterfaces;

    return primaryInterfaces.filter((row) => {
      const haystack = normalize(
        `${row.endpoint || ""} ${row.method || ""} ${row.description || ""}`
      );
      return haystack.includes(q);
    });
  }, [searchTerm]);

  React.useEffect(() => {
    if (!focusId) return;
    const id = makeRowId(focusId);
    const el = typeof document !== "undefined" ? document.getElementById(id) : null;
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (_) {
      el.scrollIntoView();
    }
  }, [focusId]);

  return (
    <section aria-label="API documentation" className="flex flex-col space-y-4 w-full mb-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[#0A0A0A] font-medium text-sm font-inter">
            API Documentation
          </h1>
          <span className="text-[#717182] text-xs/4 font-poppins">
            Database schema, endpoints and system behavior.
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-[#D6D6D6] bg-white px-4 py-4 flex flex-col gap-3">
        <div className="flex flex-col space-y-1">
          <h2 className="text-xs font-medium text-[#0A0A0A]">
            Primary Data Interfaces
          </h2>
          <p className="text-[11px] text-[#717182] max-w-2xl">
            REST-style HTTP endpoints and Supabase data sources that power the
            admin dashboard. This reflects what is implemented today and where
            key metrics and audit trails come from.
          </p>
        </div>

        <div className="mt-1 max-w-md">
          <div className="flex items-center gap-2 rounded-full border border-[#D6D6D6] bg-white px-4 py-2.5">
            <Search className="size-4 text-[#717182]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setQuery?.(event.target.value)}
              placeholder="Search endpoints, tables, or keywords..."
              className="w-full bg-transparent outline-none text-xs text-[#0A0A0A] placeholder:text-[#B0B7C3]"
            />
          </div>
        </div>

        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[#6A7282] tracking-wide">
                  Endpoint
                </th>
                <th className="px-4 py-3 text-left font-medium text-[#6A7282] tracking-wide">
                  Method / Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-[#6A7282] tracking-wide">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredInterfaces.map((row) => {
                const isFocused = focusId && row.endpoint === focusId;

                return (
                  <tr
                    key={`${row.endpoint}-${row.method}`}
                    id={makeRowId(row.endpoint)}
                    className={
                      "hover:bg-gray-50/60 " +
                      (isFocused
                        ? "bg-[#F3F6FF] outline outline-[#3979D2]"
                        : "")
                    }
                  >
                    <td className="px-4 py-3 align-top whitespace-nowrap font-mono text-[11px] text-[#0A0A0A]">
                      {row.endpoint}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap text-[11px] text-[#0A0A0A]">
                      {row.method}
                    </td>
                    <td className="px-4 py-3 align-top text-[11px] text-[#4B5563]">
                      {row.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}