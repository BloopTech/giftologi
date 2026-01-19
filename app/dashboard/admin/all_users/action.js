"use server";

import { z } from "zod";
import { createClient, createAdminClient } from "../../../utils/supabase/server";
import { logAdminActivityWithClient } from "../activity_log/logger";
import { revalidatePath } from "next/cache";

const deleteUserSchema = z.object({
  staffId: z.uuid(),
  confirmText: z.string().min(1, "Confirmation text is required."),
});

const defaultDeleteUserValues = {
  staffId: [],
  confirmText: [],
};

export async function deleteUser(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to delete users.",
      errors: {
        ...defaultDeleteUserValues,
      },
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
      message: "You are not authorized to delete users.",
      errors: {
        ...defaultDeleteUserValues,
      },
      values: {},
      data: {},
    };
  }

  const raw = {
    staffId: formData.get("staffId"),
    confirmText: formData.get("confirmText"),
  };

  const validated = deleteUserSchema.safeParse(raw);

  if (!validated.success) {
    return {
      message: validated.error.issues?.[0]?.message || "Validation failed",
      errors: validated.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { staffId, confirmText } = validated.data;

  if (confirmText.trim().toUpperCase() !== "DELETE USER") {
    return {
      message: "Confirmation text does not match.",
      errors: {
        ...defaultDeleteUserValues,
        confirmText: ["Type DELETE USER to confirm."],
      },
      values: raw,
      data: {},
    };
  }

  const adminClient = createAdminClient();

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", staffId)
    .maybeSingle();

  if (existingProfileError) {
    return {
      message: existingProfileError.message,
      errors: {
        ...defaultDeleteUserValues,
      },
      values: raw,
      data: {},
    };
  }

  const { error: inviteDeleteError } = await adminClient
    .from("signup_profiles")
    .delete()
    .eq("user_id", staffId);

  if (inviteDeleteError) {
    return {
      message: inviteDeleteError.message,
      errors: {
        ...defaultDeleteUserValues,
      },
      values: raw,
      data: {},
    };
  }

  if (existingProfile) {
    const updates = {
      status: "Deleted",
      role: null,
      firstname: null,
      lastname: null,
      phone: null,
      address: null,
      image: null,
      updated_at: new Date().toISOString(),
    };

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", staffId);

    if (profileUpdateError) {
      return {
        message: profileUpdateError.message,
        errors: {
          ...defaultDeleteUserValues,
        },
        values: raw,
        data: {},
      };
    }
  }

  const { error: authDeleteError } =
    await adminClient.auth.admin.deleteUser(staffId);

  if (authDeleteError && authDeleteError.message !== "User not found") {
    return {
      message: "Failed to delete user auth account.",
      errors: {
        ...defaultDeleteUserValues,
      },
      values: raw,
      data: {},
    };
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile.id,
    adminRole: currentProfile.role,
    adminEmail: null,
    adminName: null,
    action: "deleted_user",
    entity: "user",
    targetId: staffId,
    details: `Deleted user ${staffId}`,
  });

  revalidatePath("/dashboard/admin/all_users");
  revalidatePath("/dashboard/admin");

  return {
    message: "User has been deleted.",
    errors: {},
    values: {},
    data: {
      staffId,
    },
  };
}
