"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "../../../utils/supabase/server";
import { logAdminActivityWithClient } from "../activity_log/logger";
import { dispatchToAdmins } from "../../../utils/notificationService";

const ADMIN_ROLES = [
  "super_admin",
  "operations_manager_admin",
  "customer_support_admin",
];

async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, firstname, lastname, email")
    .eq("id", user.id)
    .single();

  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    return { user, profile: null, supabase };
  }

  return { user, profile, supabase };
}

// ── Create Dispute ──────────────────────────────────────────────

const createDisputeSchema = z.object({
  orderId: z.string().uuid({ message: "Invalid order" }),
  orderItemId: z.string().uuid().optional().or(z.literal("")),
  returnRequestId: z.string().uuid().optional().or(z.literal("")),
  disputeType: z.enum(["return", "exchange", "refund", "damaged", "missing", "wrong_item", "other"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestName: z.string().max(200).optional().or(z.literal("")),
});

export async function createDispute(prevState, formData) {
  const { user, profile, supabase } = await getAdminUser();

  if (!profile) {
    return { message: "Unauthorized.", errors: {}, values: {}, data: {} };
  }

  const raw = {
    orderId: formData.get("orderId"),
    orderItemId: formData.get("orderItemId") || "",
    returnRequestId: formData.get("returnRequestId") || "",
    disputeType: formData.get("disputeType"),
    priority: formData.get("priority"),
    subject: formData.get("subject"),
    description: formData.get("description") || "",
    guestEmail: formData.get("guestEmail") || "",
    guestName: formData.get("guestName") || "",
  };

  const parsed = createDisputeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const d = parsed.data;
  const adminClient = createAdminClient();

  const { data: dispute, error: insertError } = await supabase
    .from("disputes")
    .insert({
      order_id: d.orderId,
      order_item_id: d.orderItemId || null,
      return_request_id: d.returnRequestId || null,
      dispute_type: d.disputeType,
      priority: d.priority,
      subject: d.subject,
      description: d.description || null,
      guest_email: d.guestEmail || null,
      guest_name: d.guestName || null,
      assigned_to: user.id,
      status: "open",
    })
    .select("id")
    .single();

  if (insertError || !dispute) {
    return {
      message: insertError?.message || "Failed to create dispute.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  // If created from a return request, update its status to indicate it's being handled
  if (d.returnRequestId) {
    await adminClient
      .from("return_requests")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", d.returnRequestId);
  }

  try {
    await dispatchToAdmins({
      client: adminClient,
      eventType: "dispute_or_refund",
      message: `New dispute opened: ${d.subject}`,
      link: "/dashboard/admin/disputes",
      data: { dispute_id: dispute.id, order_id: d.orderId },
    });
  } catch {}

  await logAdminActivityWithClient(supabase, {
    adminId: profile.id,
    adminRole: profile.role,
    adminEmail: profile.email || user.email,
    adminName: [profile.firstname, profile.lastname].filter(Boolean).join(" ") || null,
    action: "created_dispute",
    entity: "disputes",
    targetId: dispute.id,
    details: `Created dispute "${d.subject}" for order ${d.orderId}`,
  });

  revalidatePath("/dashboard/admin/disputes");

  return {
    message: "Dispute created.",
    errors: {},
    values: {},
    data: { disputeId: dispute.id },
    status_code: 200,
  };
}

// ── Update Dispute Status ───────────────────────────────────────

const updateDisputeStatusSchema = z.object({
  disputeId: z.string().uuid({ message: "Invalid dispute" }),
  status: z.enum(["open", "investigating", "resolved", "closed"]),
  resolution: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function updateDisputeStatus(prevState, formData) {
  const { user, profile, supabase } = await getAdminUser();

  if (!profile) {
    return { message: "Unauthorized.", errors: {}, values: {}, data: {} };
  }

  const raw = {
    disputeId: formData.get("disputeId"),
    status: formData.get("status"),
    resolution: formData.get("resolution") || "",
  };

  const parsed = updateDisputeStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { disputeId, status, resolution } = parsed.data;

  const updatePayload = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "resolved") {
    updatePayload.resolution = resolution || null;
    updatePayload.resolved_at = new Date().toISOString();
  }
  if (status === "closed") {
    updatePayload.closed_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from("disputes")
    .update(updatePayload)
    .eq("id", disputeId);

  if (updateError) {
    return {
      message: updateError.message || "Failed to update dispute.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  await logAdminActivityWithClient(supabase, {
    adminId: profile.id,
    adminRole: profile.role,
    adminEmail: profile.email || user.email,
    adminName: [profile.firstname, profile.lastname].filter(Boolean).join(" ") || null,
    action: "updated_dispute_status",
    entity: "disputes",
    targetId: disputeId,
    details: `Changed dispute status to "${status}"${resolution ? ` with resolution: ${resolution}` : ""}`,
  });

  revalidatePath("/dashboard/admin/disputes");

  return {
    message: `Dispute marked as ${status}.`,
    errors: {},
    values: {},
    data: { disputeId, status },
    status_code: 200,
  };
}

// ── Add Dispute Note ────────────────────────────────────────────

const addNoteSchema = z.object({
  disputeId: z.string().uuid({ message: "Invalid dispute" }),
  content: z.string().trim().min(1, "Note content is required").max(2000),
});

export async function addDisputeNote(prevState, formData) {
  const { user, profile, supabase } = await getAdminUser();

  if (!profile) {
    return { message: "Unauthorized.", errors: {}, values: {}, data: {} };
  }

  const raw = {
    disputeId: formData.get("disputeId"),
    content: formData.get("content"),
  };

  const parsed = addNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { disputeId, content } = parsed.data;
  const authorName = [profile.firstname, profile.lastname].filter(Boolean).join(" ") || profile.email || "Admin";

  const { data: note, error: noteError } = await supabase
    .from("dispute_notes")
    .insert({
      dispute_id: disputeId,
      author_id: user.id,
      author_name: authorName,
      content,
    })
    .select("id, created_at")
    .single();

  if (noteError || !note) {
    return {
      message: noteError?.message || "Failed to add note.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  revalidatePath("/dashboard/admin/disputes");

  return {
    message: "Note added.",
    errors: {},
    values: {},
    data: { noteId: note.id },
    status_code: 200,
  };
}
