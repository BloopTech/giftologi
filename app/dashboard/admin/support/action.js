"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "../../../utils/supabase/server";
import { logAdminActivityWithClient } from "../activity_log/logger";
import { issueSupportTicketAccessToken } from "../../../utils/supportAccessToken";

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

// ── Update Ticket Status ─────────────────────────────────────────

const updateStatusSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
});

export async function updateTicketStatus(prevState, formData) {
  const { user, profile } = await getAdminUser();
  if (!profile) {
    return { message: "Unauthorized.", errors: {} };
  }

  const raw = {
    ticketId: formData.get("ticketId"),
    status: formData.get("status"),
  };

  const parsed = updateStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { ticketId, status } = parsed.data;
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const updatePayload = {
    status,
    updated_at: nowIso,
  };

  if (status === "resolved") updatePayload.resolved_at = nowIso;
  if (status === "closed") updatePayload.closed_at = nowIso;

  const { error } = await admin
    .from("support_tickets")
    .update(updatePayload)
    .eq("id", ticketId);

  if (error) {
    return { message: error.message, errors: {} };
  }

  await logAdminActivityWithClient(admin, {
    adminId: profile.id,
    adminRole: profile.role,
    adminEmail: user.email || null,
    adminName: null,
    action: "updated_support_ticket_status",
    entityType: "support_ticket",
    entityId: ticketId,
    details: { new_status: status },
  });

  revalidatePath("/dashboard/admin/support");
  return { message: "", errors: {}, success: true, data: { ticketId, status } };
}

// ── Assign Ticket ────────────────────────────────────────────────

const assignSchema = z.object({
  ticketId: z.string().uuid(),
  assignedAdminId: z.string().uuid().optional().or(z.literal("")),
});

export async function assignTicket(prevState, formData) {
  const { user, profile } = await getAdminUser();
  if (!profile) {
    return { message: "Unauthorized.", errors: {} };
  }

  const raw = {
    ticketId: formData.get("ticketId"),
    assignedAdminId: formData.get("assignedAdminId") || "",
  };

  const parsed = assignSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { ticketId, assignedAdminId } = parsed.data;
  const admin = createAdminClient();

  const { error } = await admin
    .from("support_tickets")
    .update({
      assigned_admin_id: assignedAdminId || null,
      status: assignedAdminId ? "in_progress" : "open",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) {
    return { message: error.message, errors: {} };
  }

  await logAdminActivityWithClient(admin, {
    adminId: profile.id,
    adminRole: profile.role,
    adminEmail: user.email || null,
    adminName: null,
    action: assignedAdminId
      ? "assigned_support_ticket"
      : "unassigned_support_ticket",
    entityType: "support_ticket",
    entityId: ticketId,
    details: { assigned_to: assignedAdminId || null },
  });

  revalidatePath("/dashboard/admin/support");
  return { message: "", errors: {}, success: true };
}

// ── Update Priority ──────────────────────────────────────────────

const prioritySchema = z.object({
  ticketId: z.string().uuid(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
});

export async function updateTicketPriority(prevState, formData) {
  const { user, profile } = await getAdminUser();
  if (!profile) {
    return { message: "Unauthorized.", errors: {} };
  }

  const raw = {
    ticketId: formData.get("ticketId"),
    priority: formData.get("priority"),
  };

  const parsed = prioritySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { ticketId, priority } = parsed.data;
  const admin = createAdminClient();

  const { error } = await admin
    .from("support_tickets")
    .update({ priority, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) {
    return { message: error.message, errors: {} };
  }

  await logAdminActivityWithClient(admin, {
    adminId: profile.id,
    adminRole: profile.role,
    adminEmail: user.email || null,
    adminName: null,
    action: "updated_support_ticket_priority",
    entityType: "support_ticket",
    entityId: ticketId,
    details: { new_priority: priority },
  });

  revalidatePath("/dashboard/admin/support");
  return { message: "", errors: {}, success: true };
}

// ── Admin Reply ──────────────────────────────────────────────────

const replySchema = z.object({
  ticketId: z.string().uuid(),
  message: z.string().trim().min(1, "Message is required").max(5000),
});

export async function adminReply(prevState, formData) {
  const { user, profile } = await getAdminUser();
  if (!profile) {
    return { message: "Unauthorized.", errors: {} };
  }

  const raw = {
    ticketId: formData.get("ticketId"),
    message: formData.get("message"),
  };

  const parsed = replySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { ticketId, message } = parsed.data;
  const admin = createAdminClient();

  const { data: ticket } = await admin
    .from("support_tickets")
    .select(
      "id, subject, guest_email, guest_name, created_by, creator:profiles!support_tickets_created_by_fkey(email, firstname, lastname)"
    )
    .eq("id", ticketId)
    .maybeSingle();

  const { data: newMsg, error: insertError } = await admin
    .from("support_ticket_messages")
    .insert({
      ticket_id: ticketId,
      sender_id: user.id,
      sender_role: "admin",
      message,
    })
    .select("id, sender_id, sender_role, message, created_at")
    .single();

  if (insertError) {
    return { message: insertError.message, errors: {} };
  }

  // Update ticket timestamp
  await admin
    .from("support_tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  const recipientEmail =
    ticket?.guest_email || ticket?.creator?.email || null;

  if (recipientEmail) {
    const templateSlug = ticket?.guest_email
      ? "support_ticket_admin_reply_guest"
      : "support_ticket_admin_reply_user";
    const adminName =
      [profile?.firstname, profile?.lastname].filter(Boolean).join(" ") ||
      profile?.email ||
      "Support Team";
    const recipientName = ticket?.guest_email
      ? ticket?.guest_name || "Customer"
      : [ticket?.creator?.firstname, ticket?.creator?.lastname]
            .filter(Boolean)
            .join(" ") || "Customer";
    let ticketUrl = `/support/${ticketId}`;
    let accessToken = null;

    try {
      accessToken = await issueSupportTicketAccessToken({
        ticketId,
        email: recipientEmail,
      });

      if (accessToken) {
        ticketUrl = `${ticketUrl}?access_token=${encodeURIComponent(accessToken)}`;
      }
    } catch (tokenError) {
      console.error("[admin/support] Failed to create support access token:", tokenError);
    }

    try {
      await admin.from("notification_email_queue").insert({
        recipient_id: ticket?.created_by || null,
        recipient_email: recipientEmail,
        template_slug: templateSlug,
        variables: {
          guest_name: recipientName,
          user_name: recipientName,
          admin_name: adminName,
          ticket_id: ticketId,
          ticket_subject: ticket?.subject || "Support ticket",
          ticket_url: ticketUrl,
          support_access_token: accessToken,
          message_excerpt: message.slice(0, 500),
        },
        status: "pending",
      });
    } catch (queueError) {
      console.error("[admin/support] Failed to queue reply email:", queueError);
    }
  }

  revalidatePath("/dashboard/admin/support");
  return { message: "", errors: {}, success: true, data: newMsg };
}
