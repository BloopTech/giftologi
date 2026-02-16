"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";

export async function refreshVendorPayouts() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be logged in." };
  }

  revalidatePath("/dashboard/v/payouts");
  return { success: true };
}
