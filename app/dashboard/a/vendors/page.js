"use server";
import React from "react";
import { createClient } from "../../../utils/supabase/server";
import VendorApprovalsContent from "./content2";

export default async function AdminVendorsPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .single();

  // Parse filters
  const rawStatus = (params?.status || "pending").toString().toLowerCase();
  const allowed = ["pending", "approved", "rejected"];
  const status = allowed.includes(rawStatus) ? rawStatus : "pending";
  const limitParam = parseInt(params?.limit, 10);
  const allowedLimits = [10, 20, 40];
  const pageSize = allowedLimits.includes(limitParam) ? limitParam : 10;
  const page = Math.max(1, parseInt(params?.page, 10) || 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Load vendor applications for current status (if table exists)
  let applications = [];
  let total = 0;
  try {
    const {
      data: apps,
      error: appsErr,
      count,
    } = await supabase
      .from("vendor_applications")
      .select("id, user_id, business_name, status, created_at", {
        count: "exact",
      })
      .eq("status", status)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (!appsErr && Array.isArray(apps)) {
      applications = apps;
      total = typeof count === "number" ? count : 0;
    }
  } catch (_) {
    // table may not exist yet; keep applications as empty
  }

  // Hydrate user info in bulk
  let items = [];
  if (applications.length > 0) {
    const userIds = Array.from(
      new Set(applications.map((a) => a.user_id))
    ).filter(Boolean);
    let usersById = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("profiles")
        .select("id, firstname, lastname, email, color")
        .in("id", userIds);
      (users || []).forEach((u) => {
        usersById[u.id] = u;
      });
    }
    items = applications.map((a) => ({
      application_id: a.id,
      user_id: a.user_id,
      business_name: a.business_name,
      created_at: a.created_at,
      user: usersById[a.user_id] || null,
    }));
  }

  return (
    <div className="dark:text-white bg-[#FFFFFF] dark:bg-gray-950 lg:pl-10 pl-5 pr-5 lg:pr-0">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[#2D3436] dark:text-white">
            Vendors
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-gray-300">
            Approve and manage vendor accounts.
          </p>
        </div>
        <VendorApprovalsContent
          key={`${status}-${page}-${pageSize}`}
          items={items}
          status={status}
          page={page}
          pageSize={pageSize}
          total={total}
        />
      </div>
    </div>
  );
}
