"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "../../../utils/supabase/server";
import { logAdminActivityWithClient } from "../activity_log/logger";
import { dispatchNotification, dispatchToAdmins } from "../../../utils/notificationService";

// ─── Helpers ────────────────────────────────────────────────────────────────
async function requirePayoutAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in.", supabase: null, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("id, role").eq("id", user.id).single();
  const role = profile?.role || null;
  const allowed = ["super_admin", "finance_admin", "operations_manager_admin"];
  if (!profile || !allowed.includes(role)) return { error: "You are not authorized for payout actions.", supabase, user, profile: null };
  return { error: null, supabase, user, profile };
}

// ─── Generate Payout (calls calculate_weekly_payout RPC) ────────────────────
const generatePayoutSchema = z.object({
  vendorId: z.string().uuid({ message: "Invalid vendor" }),
  weekStarts: z.string().min(1, { message: "Select at least one week" }),
});

export async function generatePayout(prevState, formData) {
  const { error: authError, supabase, user, profile } = await requirePayoutAdmin();
  if (authError) return { message: authError, errors: {}, data: {} };

  const raw = {
    vendorId: formData.get("vendorId"),
    weekStarts: formData.get("weekStarts") || "",
  };

  const parsed = generatePayoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { message: parsed.error.issues?.[0]?.message || "Validation failed", errors: parsed.error.flatten().fieldErrors, data: {} };
  }

  const { vendorId, weekStarts } = parsed.data;
  const weekStartsArray = weekStarts.split(",").map((s) => s.trim()).filter(Boolean);
  if (!weekStartsArray.length) {
    return { message: "Select at least one week.", errors: {}, data: {} };
  }

  const adminClient = createAdminClient();
  const { data: result, error: rpcError } = await adminClient.rpc("calculate_weekly_payout", {
    p_vendor_id: vendorId,
    p_week_starts: weekStartsArray,
  });

  if (rpcError) {
    return { message: rpcError.message || "Failed to calculate payout.", errors: {}, data: {} };
  }

  await logAdminActivityWithClient(supabase, {
    adminId: profile.id,
    adminRole: profile.role,
    adminEmail: user.email || null,
    adminName: null,
    action: "generated_payout",
    entity: "payout_periods",
    targetId: vendorId,
    details: `Generated payout for vendor ${vendorId}, weeks: ${weekStarts}`,
  });

  revalidatePath("/dashboard/admin/payouts");

  return {
    message: "Payout calculated successfully.",
    errors: {},
    data: { vendorId, periods: Array.isArray(result) ? result : [result] },
  };
}

// ─── Approve Payout ─────────────────────────────────────────────────────────
const approvePayoutSchema = z.object({
  payoutPeriodId: z.string().uuid({ message: "Invalid payout period" }),
  notes: z.string().optional(),
});

export async function approvePayout(prevState, formData) {
  const { error: authError, supabase, user, profile } = await requirePayoutAdmin();
  if (authError) return { message: authError, errors: {}, data: {} };

  const raw = {
    payoutPeriodId: formData.get("payoutPeriodId"),
    notes: formData.get("notes") || "",
  };

  const parsed = approvePayoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { message: parsed.error.issues?.[0]?.message || "Validation failed", errors: parsed.error.flatten().fieldErrors, data: {} };
  }

  const { payoutPeriodId, notes } = parsed.data;

  const { data: period, error: fetchError } = await supabase
    .from("payout_periods")
    .select("id, vendor_id, status, total_vendor_net")
    .eq("id", payoutPeriodId)
    .single();

  if (fetchError || !period) {
    return { message: "Payout period not found.", errors: {}, data: {} };
  }

  if (period.status !== "draft") {
    return { message: `Cannot approve a payout with status "${period.status}".`, errors: {}, data: {} };
  }

  const { error: updateError } = await supabase
    .from("payout_periods")
    .update({
      status: "approved",
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payoutPeriodId);

  if (updateError) {
    return { message: updateError.message || "Failed to approve payout.", errors: {}, data: {} };
  }

  // Notify other admins
  try {
    const adminClient = createAdminClient();
    await dispatchToAdmins({
      client: adminClient,
      eventType: "payout_status",
      message: `Payout of GHS ${Number(period.total_vendor_net || 0).toFixed(2)} approved for vendor ${period.vendor_id}.`,
      link: "/dashboard/admin/payouts",
      data: { payout_period_id: payoutPeriodId, status: "approved" },
    });
  } catch (err) {
    console.error("Failed to notify admins of payout approval", err);
  }

  await logAdminActivityWithClient(supabase, {
    adminId: profile.id,
    adminRole: profile.role,
    adminEmail: user.email || null,
    adminName: null,
    action: "approved_payout",
    entity: "payout_periods",
    targetId: payoutPeriodId,
    details: `Approved payout ${payoutPeriodId} (GHS ${period.total_vendor_net}) for vendor ${period.vendor_id}`,
  });

  revalidatePath("/dashboard/admin/payouts");

  return { message: "Payout approved.", errors: {}, data: { payoutPeriodId } };
}

// ─── Mark Payout as Paid ────────────────────────────────────────────────────
const markPaidSchema = z.object({
  payoutPeriodId: z.string().uuid({ message: "Invalid payout period" }),
  paymentReference: z.string().trim().min(1, { message: "Payment reference is required" }),
  paymentMethod: z.string().trim().min(1, { message: "Payment method is required" }),
});

export async function markPayoutPaid(prevState, formData) {
  const { error: authError, supabase, user, profile } = await requirePayoutAdmin();
  if (authError) return { message: authError, errors: {}, data: {} };

  const raw = {
    payoutPeriodId: formData.get("payoutPeriodId"),
    paymentReference: formData.get("paymentReference") || "",
    paymentMethod: formData.get("paymentMethod") || "",
  };

  const parsed = markPaidSchema.safeParse(raw);
  if (!parsed.success) {
    return { message: parsed.error.issues?.[0]?.message || "Validation failed", errors: parsed.error.flatten().fieldErrors, data: {} };
  }

  const { payoutPeriodId, paymentReference, paymentMethod } = parsed.data;

  const { data: period, error: fetchError } = await supabase
    .from("payout_periods")
    .select("id, vendor_id, status, total_vendor_net")
    .eq("id", payoutPeriodId)
    .single();

  if (fetchError || !period) {
    return { message: "Payout period not found.", errors: {}, data: {} };
  }

  if (period.status !== "approved") {
    return { message: `Cannot mark as paid — payout status is "${period.status}".`, errors: {}, data: {} };
  }

  const { error: updateError } = await supabase
    .from("payout_periods")
    .update({
      status: "completed",
      payment_reference: paymentReference,
      payment_method: paymentMethod,
      paid_by: profile.id,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", payoutPeriodId);

  if (updateError) {
    return { message: updateError.message || "Failed to update payout.", errors: {}, data: {} };
  }

  // Notify vendor
  try {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id, profiles_id, business_name")
      .eq("id", period.vendor_id)
      .maybeSingle();

    if (vendor?.profiles_id) {
      await dispatchNotification({
        client: supabase,
        recipientId: vendor.profiles_id,
        recipientRole: "vendor",
        eventType: "payout_status",
        message: `Your payout of GHS ${Number(period.total_vendor_net || 0).toFixed(2)} has been completed.`,
        link: "/dashboard/v/payouts",
        data: {
          payout_period_id: payoutPeriodId,
          vendor_id: vendor.id,
          status: "completed",
          amount: period.total_vendor_net,
        },
        vendorId: vendor.id,
      });
    }
  } catch (err) {
    console.error("Failed to notify vendor payout completion", err);
  }

  await logAdminActivityWithClient(supabase, {
    adminId: profile.id,
    adminRole: profile.role,
    adminEmail: user.email || null,
    adminName: null,
    action: "marked_payout_paid",
    entity: "payout_periods",
    targetId: payoutPeriodId,
    details: `Marked payout ${payoutPeriodId} as paid (ref: ${paymentReference}) for vendor ${period.vendor_id}`,
  });

  revalidatePath("/dashboard/admin/payouts");

  return { message: "Payout marked as paid.", errors: {}, data: { payoutPeriodId } };
}

// ─── Delete Draft Payout ────────────────────────────────────────────────────
export async function deleteDraftPayout(prevState, formData) {
  const { error: authError, supabase, user, profile } = await requirePayoutAdmin();
  if (authError) return { message: authError, errors: {}, data: {} };

  const payoutPeriodId = formData.get("payoutPeriodId");
  if (!payoutPeriodId || !z.string().uuid().safeParse(payoutPeriodId).success) {
    return { message: "Invalid payout period.", errors: {}, data: {} };
  }

  const { data: period } = await supabase
    .from("payout_periods")
    .select("id, vendor_id, status")
    .eq("id", payoutPeriodId)
    .single();

  if (!period) return { message: "Payout period not found.", errors: {}, data: {} };
  if (period.status !== "draft") return { message: "Only draft payouts can be deleted.", errors: {}, data: {} };

  // Unlink order_items
  await supabase
    .from("order_items")
    .update({ payout_period_id: null })
    .eq("payout_period_id", payoutPeriodId);

  // Delete cascade will remove line_items
  const { error: deleteError } = await supabase
    .from("payout_periods")
    .delete()
    .eq("id", payoutPeriodId);

  if (deleteError) return { message: deleteError.message || "Failed to delete.", errors: {}, data: {} };

  await logAdminActivityWithClient(supabase, {
    adminId: profile.id,
    adminRole: profile.role,
    adminEmail: user.email || null,
    adminName: null,
    action: "deleted_draft_payout",
    entity: "payout_periods",
    targetId: payoutPeriodId,
    details: `Deleted draft payout ${payoutPeriodId} for vendor ${period.vendor_id}`,
  });

  revalidatePath("/dashboard/admin/payouts");

  return { message: "Draft payout deleted.", errors: {}, data: { payoutPeriodId } };
}

// ─── Hold / Unhold Order Item ───────────────────────────────────────────────
const holdItemSchema = z.object({
  orderItemId: z.string().uuid({ message: "Invalid order item" }),
  hold: z.enum(["true", "false"]),
  reason: z.string().optional(),
});

export async function holdOrderItem(prevState, formData) {
  const { error: authError, supabase, user, profile } = await requirePayoutAdmin();
  if (authError) return { message: authError, errors: {}, data: {} };

  const raw = {
    orderItemId: formData.get("orderItemId"),
    hold: formData.get("hold") || "true",
    reason: formData.get("reason") || "",
  };

  const parsed = holdItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { message: parsed.error.issues?.[0]?.message || "Validation failed", errors: {}, data: {} };
  }

  const isHold = parsed.data.hold === "true";

  const { error: updateError } = await supabase
    .from("order_items")
    .update({
      payout_hold: isHold,
      payout_hold_reason: isHold ? (parsed.data.reason || "Held by admin") : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.orderItemId);

  if (updateError) return { message: updateError.message, errors: {}, data: {} };

  await logAdminActivityWithClient(supabase, {
    adminId: profile.id,
    adminRole: profile.role,
    adminEmail: user.email || null,
    adminName: null,
    action: isHold ? "held_order_item" : "unheld_order_item",
    entity: "order_items",
    targetId: parsed.data.orderItemId,
    details: isHold ? `Held item ${parsed.data.orderItemId}: ${parsed.data.reason}` : `Unheld item ${parsed.data.orderItemId}`,
  });

  revalidatePath("/dashboard/admin/payouts");

  return { message: isHold ? "Item held from payout." : "Item released for payout.", errors: {}, data: {} };
}

// ─── Request Vendor Payment Info ────────────────────────────────────────────
export async function requestVendorPaymentInfo(prevState, formData) {
  const { error: authError, supabase, user, profile } = await requirePayoutAdmin();
  if (authError) return { message: authError, errors: {}, data: {} };

  const vendorId = formData.get("vendorId");
  if (!vendorId || !z.string().uuid().safeParse(vendorId).success) {
    return { message: "Invalid vendor.", errors: {}, data: {} };
  }

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, profiles_id, business_name")
    .eq("id", vendorId)
    .maybeSingle();

  if (!vendor?.profiles_id) return { message: "Vendor not found.", errors: {}, data: {} };

  try {
    await dispatchNotification({
      client: supabase,
      recipientId: vendor.profiles_id,
      recipientRole: "vendor",
      eventType: "payout_status",
      message: "Please update your payment information to receive your pending payout.",
      link: "/dashboard/v/profile",
      data: { vendor_id: vendor.id, action: "update_payment_info" },
      vendorId: vendor.id,
    });
  } catch (err) {
    console.error("Failed to notify vendor", err);
    return { message: "Failed to send notification.", errors: {}, data: {} };
  }

  await logAdminActivityWithClient(supabase, {
    adminId: profile.id,
    adminRole: profile.role,
    adminEmail: user.email || null,
    adminName: null,
    action: "requested_vendor_payment_info",
    entity: "vendors",
    targetId: vendorId,
    details: `Requested payment info from vendor ${vendor.business_name || vendorId}`,
  });

  return { message: "Notification sent to vendor.", errors: {}, data: { vendorId } };
}

// ─── Generate Bulk Payouts ──────────────────────────────────────────────────
const bulkPayoutSchema = z.object({
  weekStart: z.string().min(1, { message: "Week start date is required" }),
  vendorIds: z.string().optional(),
});

export async function generateBulkPayouts(prevState, formData) {
  const { error: authError, supabase, user, profile } = await requirePayoutAdmin();
  if (authError) return { message: authError, errors: {}, data: {} };

  const raw = {
    weekStart: formData.get("weekStart") || "",
    vendorIds: formData.get("vendorIds") || "",
  };

  const parsed = bulkPayoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { message: parsed.error.issues?.[0]?.message || "Validation failed", errors: parsed.error.flatten().fieldErrors, data: {} };
  }

  const { weekStart, vendorIds } = parsed.data;
  const vendorIdsArray = vendorIds ? vendorIds.split(",").map((s) => s.trim()).filter(Boolean) : null;

  const adminClient = createAdminClient();
  const { data: result, error: rpcError } = await adminClient.rpc("process_bulk_payouts", {
    p_week_start: weekStart,
    p_vendor_ids: vendorIdsArray?.length ? vendorIdsArray : null,
  });

  if (rpcError) {
    return { message: rpcError.message || "Failed to process bulk payouts.", errors: {}, data: {} };
  }

  const processedCount = Array.isArray(result) ? result.filter((r) => r.status === "processed").length : 0;

  // Notify admins of bulk payout completion
  try {
    await dispatchToAdmins({
      client: adminClient,
      eventType: "payout_status",
      message: `Bulk payouts generated for week of ${weekStart}: ${processedCount} vendor(s) processed.`,
      link: "/dashboard/admin/payouts",
      data: { week_start: weekStart, processed_count: processedCount },
    });
  } catch (err) {
    console.error("Failed to notify admins of bulk payout", err);
  }

  await logAdminActivityWithClient(supabase, {
    adminId: profile.id,
    adminRole: profile.role,
    adminEmail: user.email || null,
    adminName: null,
    action: "generated_bulk_payout",
    entity: "payout_periods",
    targetId: null,
    details: `Bulk payout for week ${weekStart}. ${processedCount} vendors processed.`,
  });

  revalidatePath("/dashboard/admin/payouts");

  return {
    message: "Bulk payouts processed.",
    errors: {},
    data: { results: Array.isArray(result) ? result : [] },
  };
}
