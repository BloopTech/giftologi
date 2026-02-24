import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/app/utils/supabase/server";

const ALLOWED_ADMIN_ROLES = [
  "super_admin",
  "finance_admin",
  "operations_manager_admin",
  "customer_support_admin",
  "marketing_admin",
  "ops_hr_admin",
];

const ALLOWED_STATUSES = new Set(["subscribed", "unsubscribed"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const escapeCsvValue = (value) => {
  const normalized = String(value ?? "");
  if (!/[",\n\r]/.test(normalized)) return normalized;
  return `"${normalized.replace(/"/g, '""')}"`;
};

const normalizePage = (value, fallback = 1) => {
  const number = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(number) || number < 1) return fallback;
  return number;
};

const toStartOfDayIso = (value) => {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

const toEndOfDayIso = (value) => {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
};

const applyFilters = ({ query, statusFilter, sourceFilter, fromIso, toIso, searchTerm }) => {
  let nextQuery = query;

  if (statusFilter && statusFilter !== "all") {
    nextQuery = nextQuery.eq("status", statusFilter);
  }

  if (sourceFilter && sourceFilter !== "all") {
    nextQuery = nextQuery.eq("source", sourceFilter);
  }

  if (fromIso) {
    nextQuery = nextQuery.gte("subscribed_at", fromIso);
  }

  if (toIso) {
    nextQuery = nextQuery.lte("subscribed_at", toIso);
  }

  if (searchTerm) {
    nextQuery = nextQuery.ilike("email", `%${searchTerm}%`);
  }

  return nextQuery;
};

export async function GET(request) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !currentProfile?.role ||
      !ALLOWED_ADMIN_ROLES.includes(currentProfile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = normalizePage(searchParams.get("page"), 1);
    const pageSize = Math.min(normalizePage(searchParams.get("pageSize"), 10), 100);

    const statusFilter = String(searchParams.get("status") || "all").trim().toLowerCase();
    const sourceFilter = String(searchParams.get("source") || "all").trim();
    const searchTerm = String(searchParams.get("q") || "").trim().toLowerCase();
    const format = String(searchParams.get("format") || "").trim().toLowerCase();

    const fromIso = toStartOfDayIso(searchParams.get("from") || "");
    const toIso = toEndOfDayIso(searchParams.get("to") || "");

    if (format === "csv") {
      let exportQuery = adminClient
        .from("newsletter_subscribers")
        .select(
          "email, status, source, subscribed_at, last_subscribed_at, unsubscribed_at, created_at, updated_at",
        )
        .order("subscribed_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10000);

      exportQuery = applyFilters({
        query: exportQuery,
        statusFilter,
        sourceFilter,
        fromIso,
        toIso,
        searchTerm,
      });

      const { data: exportRows, error: exportError } = await exportQuery;

      if (exportError) {
        return NextResponse.json(
          { error: exportError.message || "Failed to export subscribers" },
          { status: 500 },
        );
      }

      const headers = [
        "email",
        "status",
        "source",
        "subscribed_at",
        "last_subscribed_at",
        "unsubscribed_at",
        "created_at",
        "updated_at",
      ];

      const lines = [headers.join(",")];
      for (const row of Array.isArray(exportRows) ? exportRows : []) {
        lines.push(
          [
            row?.email,
            row?.status,
            row?.source,
            row?.subscribed_at,
            row?.last_subscribed_at,
            row?.unsubscribed_at,
            row?.created_at,
            row?.updated_at,
          ]
            .map((value) => escapeCsvValue(value))
            .join(","),
        );
      }

      const csv = lines.join("\n");
      const stamp = new Date().toISOString().slice(0, 10);

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=\"newsletter_subscribers_${stamp}.csv\"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const offset = (page - 1) * pageSize;
    const to = offset + pageSize - 1;

    let countQuery = adminClient
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true });

    countQuery = applyFilters({
      query: countQuery,
      statusFilter,
      sourceFilter,
      fromIso,
      toIso,
      searchTerm,
    });

    const { count, error: countError } = await countQuery;

    if (countError) {
      return NextResponse.json(
        { error: countError.message || "Failed to count subscribers" },
        { status: 500 },
      );
    }

    let rowsQuery = adminClient
      .from("newsletter_subscribers")
      .select(
        "id, email, source, status, subscribed_at, last_subscribed_at, unsubscribed_at, metadata, created_at, updated_at",
      )
      .order("subscribed_at", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, to);

    rowsQuery = applyFilters({
      query: rowsQuery,
      statusFilter,
      sourceFilter,
      fromIso,
      toIso,
      searchTerm,
    });

    const { data: rows, error: rowsError } = await rowsQuery;

    if (rowsError) {
      return NextResponse.json(
        { error: rowsError.message || "Failed to load subscribers" },
        { status: 500 },
      );
    }

    const { data: sourceRows } = await adminClient
      .from("newsletter_subscribers")
      .select("source")
      .not("source", "is", null)
      .limit(5000);

    const sources = Array.from(
      new Set(
        (Array.isArray(sourceRows) ? sourceRows : [])
          .map((row) => String(row?.source || "").trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      rows: Array.isArray(rows) ? rows : [],
      total: Number.isFinite(count) ? count : 0,
      page,
      pageSize,
      sources,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to load subscribers" },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !currentProfile?.role ||
      !ALLOWED_ADMIN_ROLES.includes(currentProfile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const status = String(body?.status || "")
      .trim()
      .toLowerCase();

    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: "Invalid subscriber ID" }, { status: 400 });
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid subscriber status" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updatePayload = {
      status,
      updated_at: now,
    };

    if (status === "unsubscribed") {
      updatePayload.unsubscribed_at = now;
    } else {
      updatePayload.unsubscribed_at = null;
      updatePayload.last_subscribed_at = now;
    }

    const { data, error } = await adminClient
      .from("newsletter_subscribers")
      .update(updatePayload)
      .eq("id", id)
      .select(
        "id, email, source, status, subscribed_at, last_subscribed_at, unsubscribed_at, created_at, updated_at",
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update subscriber" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }

    return NextResponse.json({ row: data });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to update subscriber" },
      { status: 500 },
    );
  }
}
