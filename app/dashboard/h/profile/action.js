"use server";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import crypto from "crypto";
import { createClient } from "../../../utils/supabase/server";
import { revalidatePath } from "next/cache";
import z from "zod";

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  region: "auto",
});

const randomImageName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

const sanitizeFilename = (name) =>
  String(name || "image")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);

const MAX_PROFILE_PHOTO_SIZE_MB = 5;
const MAX_PROFILE_PHOTO_SIZE_BYTES = MAX_PROFILE_PHOTO_SIZE_MB * 1024 * 1024;

const profileSchema = z.object({
  firstname: z
    .string()
    .trim()
    .min(1, { message: "First name is required" })
    .max(100, { message: "First name is too long" }),
  lastname: z
    .string()
    .trim()
    .min(1, { message: "Last name is required" })
    .max(100, { message: "Last name is too long" }),
  phone: z
    .string()
    .trim()
    .max(30, { message: "Phone number is too long" })
    .optional()
    .or(z.literal("")),
  bio: z
    .string()
    .trim()
    .max(500, { message: "Bio must be under 500 characters" })
    .optional()
    .or(z.literal("")),
  address_street: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal("")),
  address_city: z
    .string()
    .trim()
    .max(100)
    .optional()
    .or(z.literal("")),
  address_state: z
    .string()
    .trim()
    .max(100)
    .optional()
    .or(z.literal("")),
  digital_address: z
    .string()
    .trim()
    .max(50)
    .optional()
    .or(z.literal("")),
});

const notificationSchema = z.object({
  registry_updates: z.boolean(),
  purchase_alerts: z.boolean(),
  delivery_updates: z.boolean(),
  event_reminders: z.boolean(),
  thank_you_reminders: z.boolean(),
  weekly_summary: z.boolean(),
  marketing_emails: z.boolean(),
  push_notifications: z.boolean(),
});

const isFileLike = (value) => {
  if (!value) return false;
  const tag = Object.prototype.toString.call(value);
  if (tag === "[object File]" || tag === "[object Blob]") return true;
  return (
    typeof value === "object" &&
    typeof value.name === "string" &&
    typeof value.size === "number" &&
    typeof value.type === "string" &&
    typeof value.arrayBuffer === "function"
  );
};

const isValidImageFile = (file) => {
  if (!isFileLike(file)) return false;
  const fileType = typeof file.type === "string" ? file.type : "";
  if (!fileType.startsWith("image/")) return false;
  if (typeof file.size === "number" && file.size <= 0) return false;
  if (typeof file.size === "number" && file.size > MAX_PROFILE_PHOTO_SIZE_BYTES)
    return false;
  return true;
};

export async function updateHostProfile(prevState, queryData) {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return {
      success: false,
      message: "You must be signed in.",
      errors: {},
    };
  }

  const userId = userData.user.id;
  const now = new Date().toISOString();

  const raw = {
    firstname: queryData.get("firstname"),
    lastname: queryData.get("lastname"),
    phone: queryData.get("phone"),
    bio: queryData.get("bio"),
    address_street: queryData.get("address_street"),
    address_city: queryData.get("address_city"),
    address_state: queryData.get("address_state"),
    digital_address: queryData.get("digital_address"),
  };

  const validation = profileSchema.safeParse(raw);
  if (!validation.success) {
    const fieldErrors = {};
    for (const issue of validation.error.issues) {
      const key = issue.path[0];
      if (key) fieldErrors[key] = issue.message;
    }
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: fieldErrors,
      values: raw,
    };
  }

  const profilePayload = {
    firstname: validation.data.firstname,
    lastname: validation.data.lastname,
    phone: validation.data.phone || null,
    bio: validation.data.bio || null,
    address_street: validation.data.address_street || null,
    address_city: validation.data.address_city || null,
    address_state: validation.data.address_state || null,
    digital_address: validation.data.digital_address || null,
    updated_at: now,
  };

  const { error: updateError } = await supabase
    .from("profiles")
    .update(profilePayload)
    .eq("id", userId);

  if (updateError) {
    return {
      success: false,
      message: updateError.message || "Failed to update profile.",
      errors: {},
      values: raw,
    };
  }

  const notificationRaw = {
    registry_updates: queryData.get("registry_updates") === "true",
    purchase_alerts: queryData.get("purchase_alerts") === "true",
    delivery_updates: queryData.get("delivery_updates") === "true",
    event_reminders: queryData.get("event_reminders") === "true",
    thank_you_reminders: queryData.get("thank_you_reminders") === "true",
    weekly_summary: queryData.get("weekly_summary") === "true",
    marketing_emails: queryData.get("marketing_emails") === "true",
    push_notifications: queryData.get("push_notifications") === "true",
  };

  const notificationValidation = notificationSchema.safeParse(notificationRaw);
  if (notificationValidation.success) {
    const notificationPayload = {
      ...notificationValidation.data,
      user_id: userId,
      updated_at: now,
    };

    const { error: notificationError } = await supabase
      .from("host_notification_preferences")
      .upsert(notificationPayload, { onConflict: "user_id" })
      .select("id")
      .single();

    if (notificationError) {
      console.error("Notification preferences save error:", notificationError);
    }
  }

  revalidatePath("/dashboard/h/profile");

  return {
    success: true,
    message: "Profile updated successfully.",
    errors: {},
    values: raw,
  };
}

export async function saveHostProfilePhoto(prevState, queryData) {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return {
      success: false,
      message: "You must be signed in.",
      errors: { photo: "Authentication required" },
      data: {},
    };
  }

  const userId = userData.user.id;
  const photo = queryData.get("photo");

  if (!isValidImageFile(photo)) {
    return {
      success: false,
      message: `Please select a valid image file (max ${MAX_PROFILE_PHOTO_SIZE_MB}MB).`,
      errors: { photo: "Invalid image file" },
      data: {},
    };
  }

  const buffer = await photo.arrayBuffer();
  const compressedBuffer = await sharp(Buffer.from(buffer))
    .resize(400, 400, { fit: "cover", withoutEnlargement: true })
    .toFormat("webp")
    .webp({ quality: 80, lossless: false, effort: 4 })
    .toBuffer();

  const imagecode = randomImageName();
  const originalname = sanitizeFilename(photo.name || "profile");
  const fileName = `profiles/${imagecode}.${originalname}.webp`;

  const s3params = {
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: fileName,
    Body: compressedBuffer,
    ContentType: "image/webp",
  };

  await s3Client.send(new PutObjectCommand(s3params));

  const url = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ image: url, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (updateError) {
    return {
      success: false,
      message: "Failed to save profile photo.",
      errors: { photo: updateError.message },
      data: {},
    };
  }

  revalidatePath("/dashboard/h/profile");

  return {
    success: true,
    message: "Profile photo saved.",
    errors: {},
    data: { image: url },
  };
}