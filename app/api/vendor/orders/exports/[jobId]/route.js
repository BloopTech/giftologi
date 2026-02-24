import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/app/utils/supabase/server";
import { buildVendorOrdersExportFileName } from "@/app/utils/vendorOrderExport";

async function getAuthenticatedVendor() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401, profile: null, vendor: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.id) {
    return { error: "Unauthorized", status: 401, profile: null, vendor: null };
  }

  if (profile.role !== "vendor") {
    return { error: "Forbidden", status: 403, profile: null, vendor: null };
  }

  const adminClient = createAdminClient();
  const { data: vendor, error: vendorError } = await adminClient
    .from("vendors")
    .select("id")
    .eq("profiles_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (vendorError || !vendor?.id) {
    return {
      error: vendorError?.message || "Vendor profile not found.",
      status: 404,
      profile,
      vendor: null,
    };
  }

  return {
    error: null,
    status: 200,
    profile,
    vendor,
    adminClient,
  };
}

function extractStatusFilter(filters) {
  if (!filters || typeof filters !== "object") return "all";
  const status = String(filters?.status || "all").toLowerCase();
  return status || "all";
}

export async function GET(_request, { params }) {
  try {
    const auth = await getAuthenticatedVendor();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const jobId = params?.jobId;
    if (!jobId) {
      return NextResponse.json({ error: "Missing export id" }, { status: 400 });
    }

    const { data: job, error: jobError } = await auth.adminClient
      .from("vendor_order_export_jobs")
      .select(
        "id, requested_by, vendor_id, status, filters, queued_at, csv_content, completed_at"
      )
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) {
      throw new Error(jobError.message || "Failed to load export job");
    }

    if (!job?.id) {
      return NextResponse.json({ error: "Export job not found" }, { status: 404 });
    }

    if (job.requested_by !== auth.profile.id || job.vendor_id !== auth.vendor.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!job.csv_content || job.status !== "completed") {
      return NextResponse.json(
        { error: "Export is not ready yet" },
        { status: 409 },
      );
    }

    const fileName = buildVendorOrdersExportFileName({
      queuedAt: job.queued_at,
      status: extractStatusFilter(job.filters),
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
    console.error("[api/vendor/orders/exports/[jobId]]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to download export" },
      { status: 500 },
    );
  }
}
