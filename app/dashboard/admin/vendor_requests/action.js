"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";
import { logAdminActivityWithClient } from "../activity_log/logger";

const defaultApproveVendorValues = {
  applicationId: [],
};

const approveVendorSchema = z.object({
  applicationId: z.string().uuid({ message: "Invalid vendor request" }),
});

export async function approveVendorRequest(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to approve vendor requests.",
      errors: { ...defaultApproveVendorValues },
      values: {},
      data: {},
    };
  }
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const allowedRoles = ["super_admin", "operations_manager_admin"];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to approve vendor requests.",
      errors: { ...defaultApproveVendorValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    applicationId: formData.get("applicationId"),
  };

  const parsed = approveVendorSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { applicationId } = parsed.data;

  const { data: application, error: applicationError } = await supabase
    .from("vendor_applications")
    .select("id, user_id, business_name, category, status")
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) {
    return {
      message: applicationError?.message || "Vendor request not found.",
      errors: { ...defaultApproveVendorValues },
      values: raw,
      data: {},
    };
  }

  if (application.status && application.status !== "pending") {
    return {
      message: "This vendor request has already been processed.",
      errors: {},
      values: {},
      data: { applicationId },
    };
  }

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .insert([
      {
        profiles_id: application.user_id,
        business_name: application.business_name,
        description: null,
        commission_rate: null,
        verified: true,
        updated_at: new Date().toISOString(),
      },
    ])
    .select("id, business_name")
    .single();

  if (vendorError) {
    return {
      message: vendorError.message,
      errors: { ...defaultApproveVendorValues },
      values: raw,
      data: {},
    };
  }

  const { error: updateError } = await supabase
    .from("vendor_applications")
    .update({
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (updateError) {
    return {
      message: updateError.message,
      errors: { ...defaultApproveVendorValues },
      values: raw,
      data: {},
    };
  }

  revalidatePath("/dashboard/admin/vendor_requests");
  revalidatePath("/dashboard/admin");

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "approved_vendor",
    entity: "vendors",
    targetId: applicationId,
    details: `Approved vendor application ${applicationId} (${application.business_name || ""})`,
  });

  return {
    message: "Vendor request approved.",
    errors: {},
    values: {},
    data: { applicationId, vendor },
  };
}

const defaultRejectVendorValues = {
  applicationId: [],
};

const rejectVendorSchema = z.object({
  applicationId: z.string().uuid({ message: "Invalid vendor request" }),
});

export async function rejectVendorRequest(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to reject vendor requests.",
      errors: { ...defaultRejectVendorValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const allowedRoles = ["super_admin", "operations_manager_admin"];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to reject vendor requests.",
      errors: { ...defaultRejectVendorValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    applicationId: formData.get("applicationId"),
  };

  const parsed = rejectVendorSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { applicationId } = parsed.data;

  const { data: application, error: applicationError } = await supabase
    .from("vendor_applications")
    .select("id, status")
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) {
    return {
      message: applicationError?.message || "Vendor request not found.",
      errors: { ...defaultRejectVendorValues },
      values: raw,
      data: {},
    };
  }

  if (application.status && application.status !== "pending") {
    return {
      message: "This vendor request has already been processed.",
      errors: {},
      values: {},
      data: { applicationId },
    };
  }

  const { error: updateError } = await supabase
    .from("vendor_applications")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (updateError) {
    return {
      message: updateError.message,
      errors: { ...defaultRejectVendorValues },
      values: raw,
      data: {},
    };
  }

  revalidatePath("/dashboard/admin/vendor_requests");
  revalidatePath("/dashboard/admin");

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "rejected_vendor",
    entity: "vendors",
    targetId: applicationId,
    details: `Rejected vendor application ${applicationId}`,
  });

  return {
    message: "Vendor request rejected.",
    errors: {},
    values: {},
    data: { applicationId },
  };
}

const defaultFlagVendorValues = {
  applicationId: [],
  reason: [],
};

const flagVendorSchema = z.object({
  applicationId: z.string().uuid({ message: "Invalid vendor request" }),
  reason: z.string().trim().optional().or(z.literal("")),
});

export async function flagVendorRequest(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to flag vendor requests.",
      errors: { ...defaultFlagVendorValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const allowedRoles = ["super_admin", "operations_manager_admin"];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to flag vendor requests.",
      errors: { ...defaultFlagVendorValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    applicationId: formData.get("applicationId"),
    reason: formData.get("reason") || "",
  };

  const parsed = flagVendorSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { applicationId, reason } = parsed.data;

  const { data: application, error: applicationError } = await supabase
    .from("vendor_applications")
    .select("id, business_name, user_id, status")
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) {
    return {
      message: applicationError?.message || "Vendor request not found.",
      errors: { ...defaultFlagVendorValues },
      values: raw,
      data: {},
    };
  }

  const descriptionParts = [];
  if (reason && reason.trim()) {
    descriptionParts.push(reason.trim());
  }
  descriptionParts.push(`Vendor application ID: ${applicationId}`);
  if (application.business_name) {
    descriptionParts.push(`Business: ${application.business_name}`);
  }

  const description = descriptionParts.join("\n");

  const { error: ticketError } = await supabase.from("support_tickets").insert([
    {
      registry_id: null,
      subject: "Flagged vendor application",
      description: description || "Flagged vendor application",
      status: "escalated",
      created_by: currentProfile?.id || user.id,
    },
  ]);

  if (ticketError) {
    return {
      message: ticketError.message,
      errors: { ...defaultFlagVendorValues },
      values: raw,
      data: {},
    };
  }

  revalidatePath("/dashboard/admin/vendor_requests");
  revalidatePath("/dashboard/admin");

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "flagged_vendor",
    entity: "vendors",
    targetId: applicationId,
    details: `Flagged vendor application ${applicationId}${reason ? `: ${reason}` : ""}`,
  });

  return {
    message: "Vendor request flagged successfully.",
    errors: {},
    values: {},
    data: { applicationId },
  };
}
