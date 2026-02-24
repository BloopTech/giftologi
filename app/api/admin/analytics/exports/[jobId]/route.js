import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/app/utils/supabase/server";
import {
  ADMIN_ANALYTICS_ROLES,
  buildAnalyticsExportFileName,
} from "@/app/utils/analytics/adminReporting";

export async function GET(_request, { params }) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.role || !ADMIN_ANALYTICS_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const jobId = params?.jobId;
    if (!jobId) {
      return NextResponse.json({ error: "Missing export id" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: job, error: jobError } = await adminClient
      .from("analytics_export_jobs")
      .select(
        "id, requested_by, status, tab_id, date_range, csv_content, completed_at"
      )
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) {
      throw new Error(jobError.message || "Failed to load export job");
    }

    if (!job?.id) {
      return NextResponse.json({ error: "Export job not found" }, { status: 404 });
    }

    const isSuperAdmin = profile.role === "super_admin";
    if (!isSuperAdmin && job.requested_by !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!job.csv_content) {
      return NextResponse.json(
        { error: "Export is not ready yet" },
        { status: 409 }
      );
    }

    const fileName = buildAnalyticsExportFileName({
      tabId: job.tab_id,
      dateRange: job.date_range,
    });

    return new NextResponse(job.csv_content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[api/admin/analytics/exports/[jobId]]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to download export" },
      { status: 500 }
    );
  }
}
