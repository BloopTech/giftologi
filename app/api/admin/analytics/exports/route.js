import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/app/utils/supabase/server";
import {
  ADMIN_ANALYTICS_ROLES,
  normalizeAnalyticsDateRange,
  normalizeAnalyticsTab,
} from "@/app/utils/analytics/adminReporting";

const DEDUPE_WINDOW_MINUTES = 15;

async function getAuthenticatedAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401, user: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, email")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile?.role || !ADMIN_ANALYTICS_ROLES.includes(profile.role)) {
    return { error: "Forbidden", status: 403, user: null, profile: null };
  }

  return {
    error: null,
    status: 200,
    user,
    profile,
  };
}

export async function POST(request) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const payload = await request.json().catch(() => ({}));
    const tabId = normalizeAnalyticsTab(payload?.tabId || payload?.tab);
    const dateRange = normalizeAnalyticsDateRange(payload?.dateRange || payload?.range);

    const recipientEmail = auth.profile?.email || auth.user?.email || null;
    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Your account does not have an email address on file." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const dedupeSince = new Date(
      Date.now() - DEDUPE_WINDOW_MINUTES * 60 * 1000
    ).toISOString();

    const { data: existingJob } = await adminClient
      .from("analytics_export_jobs")
      .select("id, status, tab_id, date_range, queued_at")
      .eq("requested_by", auth.profile.id)
      .eq("tab_id", tabId)
      .eq("date_range", dateRange)
      .in("status", ["pending", "processing"])
      .gte("queued_at", dedupeSince)
      .order("queued_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingJob?.id) {
      return NextResponse.json(
        {
          queued: true,
          deduped: true,
          job: existingJob,
          message: "An export for this tab and range is already queued.",
        },
        { status: 202 }
      );
    }

    const nowIso = new Date().toISOString();

    const { data: job, error: insertError } = await adminClient
      .from("analytics_export_jobs")
      .insert({
        requested_by: auth.profile.id,
        recipient_email: recipientEmail,
        tab_id: tabId,
        date_range: dateRange,
        status: "pending",
        attempts: 0,
        queued_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("id, status, tab_id, date_range, queued_at")
      .single();

    if (insertError) {
      throw new Error(insertError.message || "Failed to queue export job");
    }

    return NextResponse.json(
      {
        queued: true,
        deduped: false,
        job,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[api/admin/analytics/exports:POST]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to queue export" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const auth = await getAuthenticatedAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const adminClient = createAdminClient();
    const { data: jobs, error } = await adminClient
      .from("analytics_export_jobs")
      .select(
        "id, status, tab_id, date_range, queued_at, started_at, completed_at, last_error"
      )
      .eq("requested_by", auth.profile.id)
      .order("queued_at", { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(error.message || "Failed to load export jobs");
    }

    return NextResponse.json({ jobs: jobs || [] });
  } catch (error) {
    console.error("[api/admin/analytics/exports:GET]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load export jobs" },
      { status: 500 }
    );
  }
}
