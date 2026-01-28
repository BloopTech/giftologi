"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";
import { logAdminActivityWithClient } from "../activity_log/logger";
import nodemailer from "nodemailer";
import { render, pretty } from "@react-email/render";
import CloseRequestApprovedEmail from "./emails/CloseRequestApprovedEmail";
import CloseRequestRejectedEmail from "./emails/CloseRequestRejectedEmail";

const defaultApproveValues = {
  requestId: [],
  confirmText: [],
  adminNotes: [],
};

const approveSchema = z.object({
  requestId: z.string().uuid({ message: "Invalid request" }),
  confirmText: z.string().trim().min(1, { message: "Confirmation text is required" }),
  adminNotes: z.string().optional(),
});

const defaultRejectValues = {
  requestId: [],
  reason: [],
};

const rejectSchema = z.object({
  requestId: z.string().uuid({ message: "Invalid request" }),
  reason: z.string().trim().min(5, { message: "Please provide a reason" }),
});

const allowedRoles = ["super_admin", "operations_manager_admin"];

const getSiteUrl = () =>
  process.env.NEXTAUTH_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : "http://localhost:3000");

const createEmailTransport = () => {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
};

async function sendCloseRequestEmail({
  to,
  subject,
  email,
}) {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transport = createEmailTransport();

  if (!to || !fromAddress || !transport) {
    console.warn("Email not sent: missing SMTP configuration or recipient.");
    return;
  }

  const html = await pretty(await render(email));

  await transport.sendMail({
    from: `Giftologi <${fromAddress}>`,
    to,
    subject,
    html,
  });
}

async function getCurrentAdminProfile(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, firstname, lastname, email")
    .eq("id", userId)
    .single();

  if (error) {
    return null;
  }

  return data || null;
}

export async function approveCloseRequest(prevState, formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to approve close requests.",
      errors: { ...defaultApproveValues },
      values: {},
      data: {},
    };
  }

  const currentProfile = await getCurrentAdminProfile(supabase, user.id);
  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to approve close requests.",
      errors: { ...defaultApproveValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    requestId: formData.get("requestId"),
    confirmText: formData.get("confirmText"),
    adminNotes: formData.get("adminNotes") || "",
  };

  const parsed = approveSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  if (parsed.data.confirmText.toLowerCase() !== "close shop") {
    return {
      message: "Type 'close shop' to confirm this action.",
      errors: { ...defaultApproveValues, confirmText: ["Confirmation text is incorrect"] },
      values: raw,
      data: {},
    };
  }

  const { requestId, adminNotes } = parsed.data;

  const { data: request, error: requestError } = await supabase
    .from("vendor_close_requests")
    .select("id, vendor_id, status, reason")
    .eq("id", requestId)
    .single();

  if (requestError || !request) {
    return {
      message: requestError?.message || "Close request not found.",
      errors: { ...defaultApproveValues },
      values: raw,
      data: {},
    };
  }

  if ((request.status || "").toLowerCase() !== "pending") {
    return {
      message: "This request has already been processed.",
      errors: {},
      values: {},
      data: { requestId },
    };
  }

  const now = new Date().toISOString();

  const { error: updateRequestError } = await supabase
    .from("vendor_close_requests")
    .update({
      status: "approved",
      reviewed_at: now,
      reviewed_by: currentProfile.id,
      admin_notes: adminNotes || null,
      updated_at: now,
    })
    .eq("id", requestId);

  if (updateRequestError) {
    return {
      message: updateRequestError.message || "Failed to approve close request.",
      errors: { ...defaultApproveValues },
      values: raw,
      data: {},
    };
  }

  const { error: vendorUpdateError } = await supabase
    .from("vendors")
    .update({
      shop_status: "closed",
      closed_at: now,
    })
    .eq("id", request.vendor_id);

  if (vendorUpdateError) {
    console.error("Failed to update vendor status:", vendorUpdateError);
  }

  const { error: productUpdateError } = await supabase
    .from("products")
    .update({
      active: false,
      status: "inactive",
      updated_at: now,
    })
    .eq("vendor_id", request.vendor_id);

  if (productUpdateError) {
    console.error("Failed to deactivate products:", productUpdateError);
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile.id,
    adminRole: currentProfile.role,
    adminEmail: currentProfile.email,
    adminName: `${currentProfile.firstname || ""} ${currentProfile.lastname || ""}`.trim() || null,
    action: "approved_vendor_close_request",
    entity: "vendor_close_requests",
    targetId: requestId,
    details: `Approved close request ${requestId}`,
  });

  revalidatePath("/dashboard/admin/close_requests");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/v");

  try {
    const { data: vendorRow } = await supabase
      .from("vendors")
      .select("id, business_name, profiles_id")
      .eq("id", request.vendor_id)
      .single();

    const vendorUserId = vendorRow?.profiles_id;
    const vendorName = vendorRow?.business_name || "Your shop";

    if (vendorUserId) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("id", vendorUserId)
        .single();

      const to = profileRow?.email;
      const siteUrl = getSiteUrl();

      if (to) {
        await sendCloseRequestEmail({
          to,
          subject: "Your shop closure request was approved",
          email: (
            <CloseRequestApprovedEmail
              vendorName={vendorName}
              dashboardUrl={`${siteUrl}/dashboard/v`}
            />
          ),
        });
      }
    }
  } catch (emailError) {
    console.error("Failed to send approval email:", emailError);
  }

  return {
    message: "Close request approved. Shop has been scheduled for closure.",
    errors: {},
    values: {},
    data: { requestId },
  };
}

export async function rejectCloseRequest(prevState, formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to reject close requests.",
      errors: { ...defaultRejectValues },
      values: {},
      data: {},
    };
  }

  const currentProfile = await getCurrentAdminProfile(supabase, user.id);
  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to reject close requests.",
      errors: { ...defaultRejectValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    requestId: formData.get("requestId"),
    reason: formData.get("reason"),
  };

  const parsed = rejectSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { requestId, reason } = parsed.data;

  const { data: request, error: requestError } = await supabase
    .from("vendor_close_requests")
    .select("id, vendor_id, status")
    .eq("id", requestId)
    .single();

  if (requestError || !request) {
    return {
      message: requestError?.message || "Close request not found.",
      errors: { ...defaultRejectValues },
      values: raw,
      data: {},
    };
  }

  if ((request.status || "").toLowerCase() !== "pending") {
    return {
      message: "This request has already been processed.",
      errors: {},
      values: {},
      data: { requestId },
    };
  }

  const now = new Date().toISOString();

  const { error: updateRequestError } = await supabase
    .from("vendor_close_requests")
    .update({
      status: "rejected",
      reviewed_at: now,
      reviewed_by: currentProfile.id,
      admin_notes: reason,
      updated_at: now,
    })
    .eq("id", requestId);

  if (updateRequestError) {
    return {
      message: updateRequestError.message || "Failed to reject close request.",
      errors: { ...defaultRejectValues },
      values: raw,
      data: {},
    };
  }

  const { error: vendorUpdateError } = await supabase
    .from("vendors")
    .update({
      shop_status: "active",
      close_requested_at: null,
    })
    .eq("id", request.vendor_id);

  if (vendorUpdateError) {
    console.error("Failed to reset vendor status:", vendorUpdateError);
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile.id,
    adminRole: currentProfile.role,
    adminEmail: currentProfile.email,
    adminName: `${currentProfile.firstname || ""} ${currentProfile.lastname || ""}`.trim() || null,
    action: "rejected_vendor_close_request",
    entity: "vendor_close_requests",
    targetId: requestId,
    details: `Rejected close request ${requestId}`,
  });

  revalidatePath("/dashboard/admin/close_requests");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/v");

  try {
    const { data: vendorRow } = await supabase
      .from("vendors")
      .select("id, business_name, profiles_id")
      .eq("id", request.vendor_id)
      .single();

    const vendorUserId = vendorRow?.profiles_id;
    const vendorName = vendorRow?.business_name || "Your shop";

    if (vendorUserId) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("id", vendorUserId)
        .single();

      const to = profileRow?.email;
      const siteUrl = getSiteUrl();

      if (to) {
        await sendCloseRequestEmail({
          to,
          subject: "Your shop closure request was rejected",
          email: (
            <CloseRequestRejectedEmail
              vendorName={vendorName}
              reason={reason}
              dashboardUrl={`${siteUrl}/dashboard/v`}
            />
          ),
        });
      }
    }
  } catch (emailError) {
    console.error("Failed to send rejection email:", emailError);
  }

  return {
    message: "Close request rejected and vendor reactivated.",
    errors: {},
    values: {},
    data: { requestId },
  };
}
