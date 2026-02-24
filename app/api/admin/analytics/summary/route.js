import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/app/utils/supabase/server";
import {
  ADMIN_ANALYTICS_ROLES,
  fetchAdminAnalyticsMetrics,
  normalizeAnalyticsDateRange,
} from "@/app/utils/analytics/adminReporting";

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const dateRange = normalizeAnalyticsDateRange(searchParams.get("range"));

    const adminClient = createAdminClient();
    const metrics = await fetchAdminAnalyticsMetrics({
      adminClient,
      dateRange,
    });

    return NextResponse.json({
      dateRange,
      generatedAt: new Date().toISOString(),
      ...metrics,
    });
  } catch (error) {
    console.error("[api/admin/analytics/summary]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load analytics summary" },
      { status: 500 }
    );
  }
}
