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

  revalidatePath("/dashboard/admin/registry_list");
  revalidatePath("/dashboard/admin");

  return {
    message: "Event updated successfully.",
    errors: {},
    values: {},
    data: { registryId, event },
  };
}

const defaultFeaturedRegistryValues = {
  registryId: [],
  featured: [],
};

const setFeaturedRegistrySchema = z.object({
  registryId: z.string().uuid({ message: "Invalid registry" }),
  featured: z
    .string()
    .trim()
    .transform((value) => value === "1" || value.toLowerCase() === "true"),
});

const defaultFeaturedRegistryOrderValues = {
  registryId: [],
  sortOrder: [],
};

const setFeaturedRegistryOrderSchema = z.object({
  registryId: z.string().uuid({ message: "Invalid registry" }),
  sortOrder: z
    .string()
    .trim()
    .transform((value) => {
      if (value === "") return null;
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : NaN;
    })
    .refine((value) => value === null || (Number.isInteger(value) && value >= 0), {
      message: "Sort order must be a non-negative whole number",
    }),
});

export async function setFeaturedRegistry(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to update featured registries.",
      errors: { ...defaultFeaturedRegistryValues },
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
      message: "You are not authorized to feature registries.",
      errors: { ...defaultFeaturedRegistryValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    registryId: formData.get("registryId"),
    featured: formData.get("featured"),
  };

  const parsed = setFeaturedRegistrySchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { registryId, featured } = parsed.data;

  const { data: registry, error: registryError } = await supabase
    .from("registries")
    .select("id, title, event_id")
    .eq("id", registryId)
    .maybeSingle();

  if (registryError || !registry) {
    return {
      message: registryError?.message || "Registry not found.",
      errors: { ...defaultFeaturedRegistryValues },
      values: raw,
      data: {},
    };
  }

  if (featured) {
    const eventId = registry?.event_id;
    const { data: event, error: eventError } = eventId
      ? await supabase
          .from("events")
          .select("id, privacy")
          .eq("id", eventId)
          .maybeSingle()
      : { data: null, error: null };

    if (eventError) {
      return {
        message: eventError.message || "Unable to verify registry privacy.",
        errors: { ...defaultFeaturedRegistryValues },
        values: raw,
        data: {},
      };
    }

    if (!event || event.privacy !== "public") {
      return {
        message: "Only public registries can be featured.",
        errors: { ...defaultFeaturedRegistryValues },
        values: raw,
        data: {},
      };
    }
  }

  if (featured) {
    const { error: upsertError } = await supabase
      .from("featured_registries")
      .upsert(
        {
          registry_id: registryId,
          active: true,
          created_by: currentProfile?.id || user.id,
          sort_order: 0,
        },
        { onConflict: "registry_id" }
      );

    if (upsertError) {
      return {
        message: upsertError.message || "Failed to feature registry.",
        errors: { ...defaultFeaturedRegistryValues },
        values: raw,
        data: {},
      };
    }
  } else {
    const { error: updateError } = await supabase
      .from("featured_registries")
      .update({ active: false })
      .eq("registry_id", registryId);

    if (updateError) {
      return {
        message: updateError.message || "Failed to unfeature registry.",
        errors: { ...defaultFeaturedRegistryValues },
        values: raw,
        data: {},
      };
    }
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: featured ? "featured_registry" : "unfeatured_registry",
    entity: "registry",
    targetId: registryId,
    details: `${featured ? "Featured" : "Unfeatured"} registry ${registryId}`,
  });

  revalidatePath("/dashboard/admin/registry_list");
  revalidatePath("/dashboard/admin");
  //revalidatePath("/registry");

  return {
    message: featured ? "Registry featured" : "Registry unfeatured",
    errors: {},
    values: {},
    data: { registryId, featured },
  };
}

export async function setFeaturedRegistrySortOrder(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to update featured registry ordering.",
      errors: { ...defaultFeaturedRegistryOrderValues },
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
      message: "You are not authorized to update featured registry ordering.",
      errors: { ...defaultFeaturedRegistryOrderValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    registryId: formData.get("registryId"),
    sortOrder: formData.get("sortOrder"),
  };

  const parsed = setFeaturedRegistryOrderSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { registryId, sortOrder } = parsed.data;

  const { data: existing, error: existingError } = await supabase
    .from("featured_registries")
    .select("registry_id, active")
    .eq("registry_id", registryId)
    .maybeSingle();

  if (existingError || !existing) {
    return {
      message: existingError?.message || "Registry is not featured.",
      errors: { ...defaultFeaturedRegistryOrderValues },
      values: raw,
      data: {},
    };
  }

  if (!existing.active) {
    return {
      message: "Registry is not currently featured.",
      errors: { ...defaultFeaturedRegistryOrderValues },
      values: raw,
      data: {},
    };
  }

  const { error: updateError } = await supabase
    .from("featured_registries")
    .update({ sort_order: sortOrder })
    .eq("registry_id", registryId);

  if (updateError) {
    return {
      message: updateError.message || "Failed to update ordering.",
      errors: { ...defaultFeaturedRegistryOrderValues },
      values: raw,
      data: {},
    };
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "updated_featured_registry_sort_order",
    entity: "registry",
    targetId: registryId,
    details: `Updated featured registry ${registryId} sort_order to ${sortOrder}`,
  });

  revalidatePath("/dashboard/admin/registry_list");
  //revalidatePath("/registry");

  return {
    message: "Featured order updated",
    errors: {},
    values: {},
    data: { registryId, sortOrder },
  };
}

const defaultFlagRegistryValues = {
  registryId: [],
  reason: [],
};

const flagRegistrySchema = z.object({
  registryId: z.uuid({ message: "Invalid registry" }),
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

  revalidatePath("/dashboard/admin/registry_list");
  revalidatePath("/dashboard/admin");

  return {
    message: "Registry flagged successfully.",
    errors: {},
    values: {},
    data: { registryId },
  };
}

const defaultUnflagRegistryValues = {
  registryId: [],
};

const unflagRegistrySchema = z.object({
  registryId: z.uuid({ message: "Invalid registry" }),
});

export async function unflagRegistry(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to unflag registries.",
      errors: { ...defaultUnflagRegistryValues },
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
      message: "You are not authorized to unflag registries.",
      errors: { ...defaultUnflagRegistryValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    registryId: formData.get("registryId"),
  };

  const parsed = unflagRegistrySchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { registryId } = parsed.data;

  const { data: updatedTickets, error } = await supabase
    .from("support_tickets")
    .update({ status: "resolved" })
    .eq("registry_id", registryId)
    .eq("status", "escalated")
    .select("id");

  if (error) {
    return {
      message: error.message,
      errors: { ...defaultUnflagRegistryValues },
      values: raw,
      data: {},
    };
  }

  if (!updatedTickets || updatedTickets.length === 0) {
    return {
      message: "Registry is not flagged.",
      errors: {},
      values: {},
      data: { registryId },
    };
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "unflagged_registry",
    entity: "registry",
    targetId: registryId,
    details: `Unflagged registry ${registryId}`,
  });

  revalidatePath("/dashboard/admin/registry_list");
  revalidatePath("/dashboard/admin");

  return {
    message: "Registry unflagged successfully.",
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
  revalidatePath("/dashboard/admin");

  return {
    message: "Registry deleted successfully.",
    errors: {},
    values: {},
    data: { registryId },
  };
}
