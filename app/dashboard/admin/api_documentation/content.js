"use client";
import React from "react";

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
  return (
    <div className="flex flex-col space-y-4 w-full mb-[2rem]">
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
              {primaryInterfaces.map((row) => (
                <tr
                  key={`${row.endpoint}-${row.method}`}
                  className="hover:bg-gray-50/60"
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}