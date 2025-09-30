"use server";
import { z } from "zod";
import { createClient } from "../../../utils/supabase/server";
import { revalidatePath } from "next/cache";

const decisionSchema = z.object({
  application_id: z.string().min(1, { message: "Missing application id" }),
  user_id: z.string().min(1, { message: "Missing user id" }),
});

export async function approveVendor(prevState, formData) {
  const supabase = await createClient();
  const validated = decisionSchema.safeParse({
    application_id: (formData.get("application_id") || "").toString(),
    user_id: (formData.get("user_id") || "").toString(),
  });
  if (!validated.success) {
    return {
      ok: false,
      message: validated.error.issues?.[0]?.message || "Validation failed",
    };
  }
  const { application_id, user_id } = validated.data;

  // Try to update vendor_applications table first (if it exists)
  let appUpdateError = null;
  try {
    const { error } = await supabase
      .from("vendor_applications")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", application_id);
    if (error) appUpdateError = error;
  } catch (e) {
    // Table may not exist; ignore and continue to role update
  }

  // Ensure profile role is vendor
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ role: "vendor", updated_at: new Date().toISOString() })
    .eq("id", user_id);

  if (profileErr) {
    return { ok: false, message: profileErr.message };
  }

  revalidatePath("/dashboard/a/vendors");
  return { ok: true, message: "Vendor approved" };
}

export async function rejectVendor(prevState, formData) {
  const supabase = await createClient();
  const validated = decisionSchema.safeParse({
    application_id: (formData.get("application_id") || "").toString(),
    user_id: (formData.get("user_id") || "").toString(),
  });
  if (!validated.success) {
    return {
      ok: false,
      message: validated.error.issues?.[0]?.message || "Validation failed",
    };
  }
  const { application_id, user_id } = validated.data;

  // Try to update vendor_applications table first (if it exists)
  try {
    await supabase
      .from("vendor_applications")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", application_id);
  } catch (e) {
    // ignore if table doesn't exist
  }

  // Optionally revert role to host if they were vendor (business decision)
  // For safety, do not auto-downgrade role. Just return success on rejection of application.
  revalidatePath("/dashboard/a/vendors");
  return { ok: true, message: "Vendor application rejected" };
}
