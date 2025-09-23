"use server";
import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import z from "zod";

const defaultValues = {
  title: [],
  type: [],
  location: [],
  description: [],
  date: [],
  deadline: [],
  privacy: [],
};

const defaultRegistrySchema = z.object({
  title: z
    .string()
    .min(1, { message: "Title is required" })
    // allow common punctuation like & ' , . -
    .regex(/^[a-zA-Z0-9 &'.,-]+$/, { message: "Title is invalid" }),
  type: z.string().min(1, { message: "Type is required" }),
  location: z.string().min(1, { message: "Location is required" }),
  description: z.string().optional(),
  date: z.string().min(1, { message: "Date is required" }),
  deadline: z.string().min(1, { message: "Deadline is required" }),
  privacy: z.string().min(1, { message: "Privacy is required" }),
});

export async function createRegistryAction(prevState, queryData) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .single();

  const payload = {
    title: (queryData.get("title") || "").toString().trim(),
    type: (queryData.get("type") || "").toString(),
    location: (queryData.get("location") || "").toString().trim(),
    description: (queryData.get("description") || "").toString().trim(),
    date: (queryData.get("date") || "").toString(),
    deadline: (queryData.get("deadline") || "").toString(),
    privacy: (queryData.get("privacy") || "").toString(),
  };

  if (profileError) {
    return {
      message: profileError.message,
      errors: profileError,
      values: payload,
      data: {},
    };
  }

  const validatedFields = defaultRegistrySchema.safeParse(payload);

  if (!validatedFields.success) {
    return {
      message:
        validatedFields?.error?.issues?.[0]?.message || "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors,
      values: payload,
      data: {},
    };
  }

  const { title, type, location, description, date, deadline, privacy } =
    validatedFields.data;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert([
      {
        title,
        type,
        location,
        description,
        date,
        privacy,
        host_id: profile.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

  if (eventError) {
    return {
      message: eventError.message,
      errors: eventError,
      values: payload,
      data: {},
    };
  }

  const { data: registry, error: registryError } = await supabase
    .from("registries")
    .insert([
      {
        title,
        deadline,
        event_id: event.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

  if (registryError) {
    return {
      message: registryError.message,
      errors: registryError,
      values: payload,
      data: {},
    };
  }

  redirect(`/dashboard/h/registry/${registry.registry_code}`);
  return {
    message: "Registry created successfully",
    errors: {},
    values: payload,
    data: { registry },
  };
}
