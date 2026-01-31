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

export async function updateDeliveryAddress(prev, queryData) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .single();

  if (profileError) {
    return {
      errors: { ...profileError, delivery_address: [profileError.message] },
      message: "Failed to save delivery address",
      data: {},
    };
  }

  const registry_id = queryData.get("registry_id");
  const event_id = queryData.get("event_id");
  const payload = {
    street_address: (queryData.get("street_address") || "").toString().trim(),
    street_address_2: (queryData.get("street_address_2") || "")
      .toString()
      .trim(),
    city: (queryData.get("city") || "").toString().trim(),
    state_province: (queryData.get("state_province") || "").toString().trim(),
    postal_code: (queryData.get("postal_code") || "").toString().trim(),
    gps_location: (queryData.get("gps_location") || "").toString().trim(),
    digital_address: (queryData.get("digital_address") || "")
      .toString()
      .trim(),
  };

  const { data: isEventData, error: isEventError } = await supabase
    .from("events")
    .select("*")
    .eq("host_id", profile.id)
    .eq("id", event_id)
    .single();

  if (isEventError) {
    return {
      errors: { ...isEventError, delivery_address: [isEventError.message] },
      message: "Failed to save delivery address",
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
      errors: { ...isRegistryError, delivery_address: [isRegistryError.message] },
      message: "Failed to save delivery address",
      data: {},
    };
  }

  const { data: existingAddress, error: existingError } = await supabase
    .from("delivery_addresses")
    .select("id")
    .eq("registry_id", isRegistryData.id)
    .maybeSingle();

  if (existingError) {
    return {
      errors: { ...existingError, delivery_address: [existingError.message] },
      message: "Failed to save delivery address",
      data: {},
    };
  }

  const upsertPayload = {
    registry_id: isRegistryData.id,
    event_id: isEventData.id,
    ...payload,
    updated_at: new Date(),
  };

  const { data: deliveryAddress, error: deliveryAddressError } = existingAddress?.id
    ? await supabase
        .from("delivery_addresses")
        .update(upsertPayload)
        .eq("id", existingAddress.id)
        .select()
        .single()
    : await supabase
        .from("delivery_addresses")
        .insert([{ ...upsertPayload, created_at: new Date() }])
        .select()
        .single();

  if (deliveryAddressError) {
    return {
      errors: { ...deliveryAddressError, delivery_address: [deliveryAddressError.message] },
      message: "Failed to save delivery address",
      data: {},
    };
  }

  return {
    message: "Delivery address saved successfully",
    data: deliveryAddress,
    errors: {},
    status_code: 200,
  };
}

export async function updateWelcomeNote(prev, queryData) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .single();

  if (profileError) {
    return {
      errors: { ...profileError, welcome_note: [profileError.message] },
      message: "Failed to save welcome note",
      data: {},
    };
  }

  const registry_id = queryData.get("registry_id");
  const event_id = queryData.get("event_id");
  const welcome_note = (queryData.get("welcome_note") || "").toString().trim();

  const { data: isEventData, error: isEventError } = await supabase
    .from("events")
    .select("*")
    .eq("host_id", profile.id)
    .eq("id", event_id)
    .single();

  if (isEventError) {
    return {
      errors: { ...isEventError, welcome_note: [isEventError.message] },
      message: "Failed to save welcome note",
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
      errors: { ...isRegistryError, welcome_note: [isRegistryError.message] },
      message: "Failed to save welcome note",
      data: {},
    };
  }

  const { data: registryData, error: registryError } = await supabase
    .from("registries")
    .update({ welcome_note: welcome_note || null })
    .eq("event_id", isEventData.id)
    .eq("id", isRegistryData.id)
    .select()
    .single();

  if (registryError) {
    return {
      errors: { ...registryError, welcome_note: [registryError.message] },
      message: "Failed to save welcome note",
      data: {},
    };
  }

  return {
    message: "Welcome note saved successfully",
    data: { ...registryData, welcome_note: registryData?.welcome_note ?? null },
    errors: {},
    status_code: 200,
  };
}

// Keep the original function for backward compatibility
export default async function updateRegistryAction(prev, queryData) {
  return saveRegistryCoverPhoto(prev, queryData);
}
