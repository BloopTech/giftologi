"use server";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import crypto from "crypto";
import { createClient } from "@/app/utils/supabase/server";

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  region: "auto", // R2 ignores this but it's required by the S3 client
});

const randomImageName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

const sanitizeFilename = (filename) => {
  return (
    filename
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .replace(/\.[^.]+$/, "") + ".webp"
  );
};

// Extract filename from Cloudflare R2 URL
const extractFilenameFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split("/");
  return parts[parts.length - 1];
};

export async function saveRegistryCoverPhoto(prev, queryData) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .single();

  if (profileError) {
    return {
      errors: { ...profileError, cover_photo: [profileError.message] },
      message: "Failed to save photo",
      data: {},
    };
  }

  const cover_photo = queryData.get("cover_photo");
  const registry_id = queryData.get("registry_id");
  const event_id = queryData.get("event_id");

  const isFileLike = (v) => {
    if (!v) return false;
    const tag = Object.prototype.toString.call(v);
    if (tag === "[object File]" || tag === "[object Blob]") return true;
    return (
      typeof v === "object" &&
      typeof v.name === "string" &&
      typeof v.size === "number" &&
      typeof v.type === "string" &&
      (typeof v.arrayBuffer === "function" || typeof v.stream === "function")
    );
  };

  const isValidSelectedFile = (f) => {
    if (!isFileLike(f)) return false;
    const name = typeof f.name === "string" ? f.name.trim() : "";
    if (
      !name ||
      name.toLowerCase() === "undefined" ||
      name.toLowerCase() === "null"
    )
      return false;
    if (typeof f.size !== "number" || f.size <= 0) return false;
    return true;
  };

  if (!isValidSelectedFile(cover_photo)) {
    return {
      errors: { cover_photo: ["No image file provided"] },
      message: "Failed to save photo",
      data: {},
    };
  }

  const { data: isEventData, error: isEventError } = await supabase
    .from("events")
    .select("*")
    .eq("host_id", profile.id)
    .eq("id", event_id)
    .single();

  if (isEventError) {
    return {
      errors: { ...isEventError, cover_photo: [isEventError.message] },
      message: "Failed to save photo",
      data: {},
    };
  }

  const { data: isRegistryData, error: isRegistryError } = await supabase
    .from("registries")
    .select("*")
    .eq("event_id", isEventData.id)
    .eq("id", registry_id)
    .single();

  if (isRegistryError) {
    return {
      errors: { ...isRegistryError, cover_photo: [isRegistryError.message] },
      message: "Failed to save photo",
      data: {},
    };
  }

  const imagecode = randomImageName();
  const originalname = sanitizeFilename(cover_photo.name || "image");

  const buffer = await cover_photo.arrayBuffer();
  const compressedBuffer = await sharp(Buffer.from(buffer))
    .toFormat("webp")
    .webp({
      quality: 80,
      lossless: false,
      effort: 4,
    })
    .toBuffer();

  const fileName = `${imagecode}.${originalname}`;

  const s3params = {
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: fileName,
    Body: compressedBuffer,
    ContentType: "image/webp",
  };

  const command = new PutObjectCommand(s3params);
  await s3Client.send(command);

  // Construct the public URL for Cloudflare R2
  const url = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`;

  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .update({ cover_photo: url })
    .eq("host_id", profile.id)
    .eq("id", event_id)
    .select()
    .single();

  if (eventError) {
    return {
      errors: { ...eventError, cover_photo: [eventError.message] },
      message: "Failed to save photo",
      data: {},
    };
  }

  const { data: registryData, error: registryError } = await supabase
    .from("registries")
    .update({ cover_photo: url })
    .eq("event_id", eventData.id)
    .eq("id", registry_id)
    .select()
    .single();

  if (registryError) {
    return {
      errors: { ...registryError, cover_photo: [registryError.message] },
      message: "Failed to save photo",
      data: {},
    };
  }

  return {
    message: "Photo saved successfully",
    data: { ...registryData, cover_photo_url: url },
    errors: {},
    status_code: 200,
  };
}

export async function removeRegistryCoverPhoto(prev, queryData) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .single();

  if (profileError) {
    return {
      errors: { ...profileError, cover_photo: [profileError.message] },
      message: "Failed to remove photo",
      data: {},
    };
  }

  const photoUrl = queryData.get("photo_url");
  const registry_id = queryData.get("registry_id");
  const event_id = queryData.get("event_id");

  const { data: isEventData, error: isEventError } = await supabase
    .from("events")
    .select("*")
    .eq("host_id", profile.id)
    .eq("id", event_id)
    .single();

  if (isEventError) {
    return {
      errors: { ...isEventError, cover_photo: [isEventError.message] },
      message: "Failed to remove photo",
      data: {},
    };
  }

  const { data: isRegistryData, error: isRegistryError } = await supabase
    .from("registries")
    .select("*")
    .eq("event_id", isEventData.id)
    .eq("id", registry_id)
    .single();

  if (isRegistryError) {
    return {
      errors: { ...isRegistryError, cover_photo: [isRegistryError.message] },
      message: "Failed to remove photo",
      data: {},
    };
  }

  if (photoUrl && photoUrl.startsWith(process.env.CLOUDFLARE_R2_PUBLIC_URL)) {
    // Extract filename from URL and delete from Cloudflare R2
    const fileName = extractFilenameFromUrl(photoUrl);

    if (fileName) {
      const deleteParams = {
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: fileName,
      };

      const deleteCommand = new DeleteObjectCommand(deleteParams);
      await s3Client.send(deleteCommand);

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .update({ cover_photo: null })
        .eq("host_id", profile.id)
        .eq("id", event_id)
        .select()
        .single();

      if (eventError) {
        return {
          errors: { ...eventError, cover_photo: [eventError.message] },
          message: "Failed to remove photo",
          data: {},
        };
      }

      const { data: registryData, error: registryError } = await supabase
        .from("registries")
        .update({ cover_photo: null })
        .eq("event_id", eventData.id)
        .eq("id", registry_id)
        .select()
        .single();

      if (registryError) {
        return {
          errors: { ...registryError, cover_photo: [registryError.message] },
          message: "Failed to remove photo",
          data: {},
        };
      }
    }
  }

  return {
    message: "Photo removed successfully",
    data: { cover_photo_url: null },
    errors: {},
    status_code: 200,
  };
}

// Keep the original function for backward compatibility
export default async function updateRegistryAction(prev, queryData) {
  return saveRegistryCoverPhoto(prev, queryData);
}
