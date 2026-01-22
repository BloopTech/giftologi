"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../utils/supabase/server";

export async function manageAnalytics(prevState, queryData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in.",
      errors: {
        //...defaultManageRolesValues,
      },
      values: {},
      data: {},
    };
  }
}
