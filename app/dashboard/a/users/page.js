"use server";
import React from "react";
import { createClient } from "../../../utils/supabase/server";
import UsersContent from "./content";

export default async function AdminUsersPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();

  // Parse filters
  const rawRole = (params?.role || "all").toString().toLowerCase();
  const allowedRoles = [
    "all",
    "host",
    "vendor",
    "super_admin",
    "finance_admin",
    "operations_manager_admin",
    "customer_support_admin",
    "guest",
  ];
  const role = allowedRoles.includes(rawRole) ? rawRole : "all";
  const q = (params?.q || "").toString();
  const limitParam = parseInt(params?.limit, 10);
  const allowedLimits = [10, 20, 40];
  const pageSize = allowedLimits.includes(limitParam) ? limitParam : 10;
  const page = Math.max(1, parseInt(params?.page, 10) || 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const rawSort = (params?.sort || "created_at").toString();
  const rawDir = (params?.dir || "desc").toString().toLowerCase();
  const allowedSorts = ["created_at", "name", "role"];
  const allowedDirs = ["asc", "desc"];
  const sort = allowedSorts.includes(rawSort) ? rawSort : "created_at";
  const dir = allowedDirs.includes(rawDir) ? rawDir : "desc";

  // Build query
  let selectFields =
    "id, firstname, lastname, email, role, color, created_at, status, image";
  let query = supabase
    .from("profiles")
    .select(selectFields, { count: "exact" });

  if (role !== "all") {
    query = query.eq("role", role);
  }
  if (q) {
    const pattern = `%${q}%`;
    query = query.or(
      `firstname.ilike.${pattern},lastname.ilike.${pattern},email.ilike.${pattern}`
    );
  }
  // Apply sorting
  if (sort === "created_at") {
    query = query.order("created_at", { ascending: dir === "asc" });
  } else if (sort === "role") {
    query = query.order("role", { ascending: dir === "asc" });
  } else if (sort === "name") {
    // Sort by firstname then lastname
    query = query
      .order("firstname", { ascending: dir === "asc" })
      .order("lastname", { ascending: dir === "asc" });
  }
  query = query.range(from, to);

  let users = [];
  let total = 0;
  try {
    const { data, error, count } = await query;
    if (!error) {
      users = data || [];
      total = typeof count === "number" ? count : 0;
    }
  } catch (_) {
    // Fallback if status column doesn't exist
    let fallback = supabase
      .from("profiles")
      .select(
        "id, firstname, lastname, email, role, color, created_at, image",
        { count: "exact" }
      );
    if (role !== "all") fallback = fallback.eq("role", role);
    if (q) {
      const pattern = `%${q}%`;
      fallback = fallback.or(
        `firstname.ilike.${pattern},lastname.ilike.${pattern},email.ilike.${pattern}`
      );
    }
    if (sort === "created_at") {
      fallback = fallback.order("created_at", { ascending: dir === "asc" });
    } else if (sort === "role") {
      fallback = fallback.order("role", { ascending: dir === "asc" });
    } else if (sort === "name") {
      fallback = fallback
        .order("firstname", { ascending: dir === "asc" })
        .order("lastname", { ascending: dir === "asc" });
    }
    fallback = fallback.range(from, to);
    const { data, error, count } = await fallback;
    if (!error) {
      users = (data || []).map((u) => ({ ...u, status: "active" }));
      total = typeof count === "number" ? count : 0;
    }
  }

  const items = users.map((u) => ({
    id: u.id,
    firstname: u.firstname,
    lastname: u.lastname,
    email: u.email,
    role: u.role,
    color: u.color,
    created_at: u.created_at,
    status: u.status ?? "active",
    image: u.image,
  }));

  return (
    <div className="dark:text-white bg-[#FFFFFF] dark:bg-gray-950 lg:pl-10 pl-5 pr-5 lg:pr-0">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[#2D3436] dark:text-white">
            Users
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-gray-300">
            Manage and moderate users.
          </p>
        </div>
        <UsersContent
          key={`${role}-${q}-${page}-${pageSize}-${sort}-${dir}`}
          items={items}
          roleFilter={role}
          q={q}
          page={page}
          pageSize={pageSize}
          total={total}
          sort={sort}
          dir={dir}
        />
      </div>
    </div>
  );
}
