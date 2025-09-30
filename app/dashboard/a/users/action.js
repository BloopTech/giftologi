"use server";
import { z } from "zod";
import { createClient } from "../../../utils/supabase/server";
import { revalidatePath } from "next/cache";

const updateRoleSchema = z.object({
  user_id: z.string().min(1, { message: "Missing user id" }),
  role: z.enum(["host", "vendor", "admin", "guest"], {
    required_error: "Role is required",
    invalid_type_error: "Invalid role",
  }),
});

export async function updateUserRole(prevState, formData) {
  const supabase = await createClient();
  const parsed = updateRoleSchema.safeParse({
    user_id: (formData.get("user_id") || "").toString(),
    role: (formData.get("role") || "").toString(),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues?.[0]?.message || "Validation failed" };
  }
  const { user_id, role } = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", user_id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard/a/users");
  return { ok: true, message: "Role updated" };
}

const updateStatusSchema = z.object({
  user_id: z.string().min(1, { message: "Missing user id" }),
  status: z.enum(["active", "suspended"], {
    required_error: "Status is required",
    invalid_type_error: "Invalid status",
  }),
});

export async function updateUserStatus(prevState, formData) {
  const supabase = await createClient();
  const parsed = updateStatusSchema.safeParse({
    user_id: (formData.get("user_id") || "").toString(),
    status: (formData.get("status") || "").toString(),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues?.[0]?.message || "Validation failed" };
  }
  const { user_id, status } = parsed.data;

  // Attempt update; if status column does not exist, create a no-op response
  const { error } = await supabase
    .from("profiles")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", user_id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard/a/users");
  return { ok: true, message: `User ${status === "suspended" ? "suspended" : "activated"}` };
}
