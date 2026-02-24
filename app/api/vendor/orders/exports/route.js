import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/app/utils/supabase/server";
import { normalizeVendorOrderExportFilters } from "@/app/utils/vendorOrderExport";

const DEDUPE_WINDOW_MINUTES = 15;

async function getVendorExportContext() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.id) {
    return { error: profileError?.message || "Unauthorized", status: 401 };
  }

  if (profile.role !== "vendor") {
    return { error: "Forbidden", status: 403 };
  }

  const adminClient = createAdminClient();
  const { data: vendor, error: vendorError } = await adminClient
    .from("vendors")
    .select("id, profiles_id")
    .eq("profiles_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (vendorError || !vendor?.id) {
    return {
      error: vendorError?.message || "Vendor profile not found.",
      status: 404,
    };
  }

  const recipientEmail = profile.email || user.email || null;
  if (!recipientEmail) {
    return {
      error: "Your account does not have an email address on file.",
      status: 400,
    };
  }

  return {
    error: null,
    status: 200,
    user,
    profile,
    vendor,
    adminClient,
    recipientEmail,
  };
}

function normalizeJobFilters(raw) {
  if (!raw) return normalizeVendorOrderExportFilters({});

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return normalizeVendorOrderExportFilters(parsed);
    } catch {
      return normalizeVendorOrderExportFilters({});
    }
  }

  if (typeof raw === "object") {
    return normalizeVendorOrderExportFilters(raw);
  }

  return normalizeVendorOrderExportFilters({});
}

export async function POST(request) {
  try {
    const auth = await getVendorExportContext();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const payload = await request.json().catch(() => ({}));
    const filters = normalizeVendorOrderExportFilters(payload || {});

    const dedupeSince = new Date(
      Date.now() - DEDUPE_WINDOW_MINUTES * 60 * 1000,
    ).toISOString();

    const { data: candidateJobs, error: dedupeError } = await auth.adminClient
      .from("vendor_order_export_jobs")
      .select("id, status, filters, queued_at")
      .eq("requested_by", auth.profile.id)
      .eq("vendor_id", auth.vendor.id)
      .in("status", ["pending", "processing"])
      .gte("queued_at", dedupeSince)
      .order("queued_at", { ascending: false })
      .limit(10);

    if (dedupeError) {
      throw new Error(dedupeError.message || "Failed to check existing exports");
    }

    const targetFingerprint = JSON.stringify(filters);
    const dedupedJob = (candidateJobs || []).find((job) => {
      const fingerprint = JSON.stringify(normalizeJobFilters(job?.filters));
      return fingerprint === targetFingerprint;
    });

    if (dedupedJob?.id) {
      return NextResponse.json(
        {
          queued: true,
          deduped: true,
          job: dedupedJob,
          message:
            "An orders export with the same filters is already queued. You will receive it by email shortly.",
        },
        { status: 202 },
      );
    }

    const nowIso = new Date().toISOString();
    const { data: job, error: insertError } = await auth.adminClient
      .from("vendor_order_export_jobs")
      .insert({
        requested_by: auth.profile.id,
        vendor_id: auth.vendor.id,
        recipient_email: auth.recipientEmail,
        filters,
        status: "pending",
        attempts: 0,
        queued_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("id, status, filters, queued_at")
      .single();

    if (insertError) {
      throw new Error(insertError.message || "Failed to queue export");
    }

    return NextResponse.json(
      {
        queued: true,
        deduped: false,
        job,
        message:
          "Export queued successfully. We will email you a CSV download link shortly.",
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("[api/vendor/orders/exports:POST]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to queue export" },
      { status: 500 },
    );
  }
}
