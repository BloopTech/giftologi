"use server";
import { createClient } from "../../utils/supabase/server";

export async function noopRegistryAction(prevState, formData) {
  await createClient();
  return { ...prevState, success: false, error: "Not implemented" };
}
