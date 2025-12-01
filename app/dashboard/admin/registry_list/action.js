"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";
import { logAdminActivityWithClient } from "../activity_log/logger";

const defaultUpdateRegistryEventValues = {
  registryId: [],
  eventId: [],
  eventType: [],
  eventDate: [],
};

const updateRegistryEventSchema = z.object({
  registryId: z.string().uuid({ message: "Invalid registry" }),
  eventId: z.string().uuid({ message: "Invalid event" }),
  eventType: z
    .string()
    .trim()
    .min(1, { message: "Event type is required" }),
  eventDate: z
    .string()
    .trim()
    .min(1, { message: "Event date is required" }),
});

export async function updateRegistryEvent(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to update events.",
      errors: { ...defaultUpdateRegistryEventValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!currentProfile || currentProfile.role !== "super_admin") {
    return {
      message: "You are not authorized to update events.",
      errors: { ...defaultUpdateRegistryEventValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    registryId: formData.get("registryId"),
    eventId: formData.get("eventId"),
    eventType: formData.get("eventType"),
    eventDate: formData.get("eventDate"),
  };

  const parsed = updateRegistryEventSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { registryId, eventId, eventType, eventDate } = parsed.data;

  const { data: event, error } = await supabase
    .from("events")
    .update({
      type: eventType,
      date: new Date(eventDate).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .select("id, type, date")
    .single();

  if (error) {
    return {
      message: error.message,
      errors: { ...defaultUpdateRegistryEventValues },
      values: raw,
      data: {},
    };
  }

  revalidatePath("/dashboard/admin/registry_list");

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "deleted_registry",
    entity: "registry",
    targetId: registryId,
    details: `Deleted registry ${registryId}`,
  });

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "updated_registry_event",
    entity: "registry",
    targetId: registryId,
    details: `Updated registry ${registryId} event to ${eventType} on ${event.date}`,
  });

  return {
    message: "Event updated successfully.",
    errors: {},
    values: {},
    data: { registryId, event },
  };
}

const defaultFlagRegistryValues = {
  registryId: [],
  reason: [],
};

const flagRegistrySchema = z.object({
  registryId: z.string().uuid({ message: "Invalid registry" }),
  reason: z.string().trim().optional().or(z.literal("")),
});

export async function flagRegistry(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to flag registries.",
      errors: { ...defaultFlagRegistryValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!currentProfile || currentProfile.role !== "super_admin") {
    return {
      message: "You are not authorized to flag registries.",
      errors: { ...defaultFlagRegistryValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    registryId: formData.get("registryId"),
    reason: formData.get("reason") || "",
  };

  const parsed = flagRegistrySchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { registryId, reason } = parsed.data;

  const { data: existingTickets } = await supabase
    .from("support_tickets")
    .select("id")
    .eq("registry_id", registryId)
    .eq("status", "escalated")
    .limit(1);

  if (Array.isArray(existingTickets) && existingTickets.length) {
    return {
      message: "Registry is already flagged.",
      errors: {},
      values: {},
      data: { registryId },
    };
  }

  const { error } = await supabase.from("support_tickets").insert([
    {
      registry_id: registryId,
      subject: "Flagged registry",
      description: reason || "Flagged by admin",
      status: "escalated",
      created_by: currentProfile?.id || user.id,
    },
  ]);

  if (error) {
    return {
      message: error.message,
      errors: { ...defaultFlagRegistryValues },
      values: raw,
      data: {},
    };
  }

  revalidatePath("/dashboard/admin/registry_list");

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "flagged_registry",
    entity: "registry",
    targetId: registryId,
    details: `Flagged registry ${registryId}${reason ? `: ${reason}` : ""}`,
  });

  return {
    message: "Registry flagged successfully.",
    errors: {},
    values: {},
    data: { registryId },
  };
}

const defaultDeleteRegistryValues = {
  registryId: [],
  confirmText: [],
};

const deleteRegistrySchema = z.object({
  registryId: z.string().uuid({ message: "Invalid registry" }),
  confirmText: z
    .string()
    .trim()
    .min(1, { message: "Type DELETE REGISTRY to confirm" }),
});

export async function deleteRegistry(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to delete registries.",
      errors: { ...defaultDeleteRegistryValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!currentProfile || currentProfile.role !== "super_admin") {
    return {
      message: "You are not authorized to delete registries.",
      errors: { ...defaultDeleteRegistryValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    registryId: formData.get("registryId"),
    confirmText: formData.get("confirmText") || "",
  };

  const parsed = deleteRegistrySchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { registryId, confirmText } = parsed.data;

  if (confirmText.trim().toUpperCase() !== "DELETE REGISTRY") {
    return {
      message: "Confirmation text does not match.",
      errors: {
        ...defaultDeleteRegistryValues,
        confirmText: ["Type DELETE REGISTRY to confirm."],
      },
      values: raw,
      data: {},
    };
  }

  const { error } = await supabase.from("registries").delete().eq("id", registryId);

  if (error) {
    return {
      message: error.message,
      errors: { ...defaultDeleteRegistryValues },
      values: raw,
      data: {},
    };
  }

  revalidatePath("/dashboard/admin/registry_list");

  return {
    message: "Registry deleted successfully.",
    errors: {},
    values: {},
    data: { registryId },
  };
}
