"use server";
import { randomBytes } from "crypto";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import crypto from "crypto";
import { createClient } from "../../utils/supabase/server";
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
  welcomeNote: z.string().optional(),
  streetAddress: z.string().optional(),
  streetAddress2: z.string().optional(),
  city: z.string().optional(),
  stateProvince: z.string().optional(),
  postalCode: z.string().optional(),
  gpsLocation: z.string().optional(),
  digitalAddress: z.string().optional(),
  date: z.string().min(1, { message: "Date is required" }),
  deadline: z.string().min(1, { message: "Deadline is required" }),
  privacy: z.string().min(1, { message: "Privacy is required" }),
}).superRefine((data, ctx) => {
  const streetAddress = (data.streetAddress || "").trim();
  const city = (data.city || "").trim();
  const stateProvince = (data.stateProvince || "").trim();

  if (!streetAddress) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["streetAddress"],
      message: "Street address is required",
    });
  }

  if (!city) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["city"],
      message: "City is required",
    });
  }

  if (!stateProvince) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["stateProvince"],
      message: "Region/State is required",
    });
  }
});

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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

const sanitizeFilename = (filename) => {
  return (
    filename
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .replace(/\.[^.]+$/, "") + ".webp"
  );
};

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
  if (!name || name.toLowerCase() === "undefined" || name.toLowerCase() === "null")
    return false;
  if (typeof f.size !== "number" || f.size <= 0) return false;
  return true;
};

async function uploadImageToR2(file) {
  const imagecode = randomImageName();
  const originalname = sanitizeFilename(file?.name || "image");
  const buffer = await file.arrayBuffer();
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
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`;
}

function generateCode(length = 10) {
  const bytes = randomBytes(length);
  let code = "";

  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }

  return code;
}

async function insertWithUniqueCode({
  supabase,
  table,
  payload,
  codeKey,
  length = 10,
  maxRetries = 5,
}) {
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const code = generateCode(length);
    const { data, error } = await supabase
      .from(table)
      .insert([{ ...payload, [codeKey]: code }])
      .select("*")
      .single();

    if (!error) {
      return { data: Array.isArray(data) ? data[0] : data, error: null };
    }

    if (error.code !== "23505") {
      return { data: null, error };
    }
  }

  return {
    data: null,
    error: {
      message:
        "We couldn't generate a unique code right now. Please try again.",
    },
  };
}

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
    welcomeNote: (queryData.get("welcomeNote") || "").toString().trim(),
    streetAddress: (queryData.get("streetAddress") || "").toString().trim(),
    streetAddress2: (queryData.get("streetAddress2") || "").toString().trim(),
    city: (queryData.get("city") || "").toString().trim(),
    stateProvince: (queryData.get("stateProvince") || "").toString().trim(),
    postalCode: (queryData.get("postalCode") || "").toString().trim(),
    gpsLocation: (queryData.get("gpsLocation") || "").toString().trim(),
    digitalAddress: (queryData.get("digitalAddress") || "").toString().trim(),
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

  const { title, type, location, description, welcomeNote, streetAddress, streetAddress2, city, stateProvince, postalCode, gpsLocation, digitalAddress, date, deadline, privacy } =
    validatedFields.data;

  const eventPhoto = queryData.get("eventPhoto");
  const coverPhoto = queryData.get("coverPhoto");

  const { data: event, error: eventError } = await insertWithUniqueCode({
    supabase,
    table: "events",
    payload: {
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
    codeKey: "event_code",
    length: 10,
  });

  if (eventError) {
    return {
      message: eventError.message,
      errors: eventError,
      values: payload,
      data: {},
    };
  }

  const { data: registry, error: registryError } = await insertWithUniqueCode({
    supabase,
    table: "registries",
    payload: {
      title,
      welcome_note: welcomeNote || null,
      deadline,
      event_id: event.id,
      registry_owner_id: profile.id,
      created_at: new Date(),
      updated_at: new Date(),
    },
    codeKey: "registry_code",
    length: 10,
  });

  if (registryError) {
    return {
      message: registryError.message,
      errors: registryError,
      values: payload,
      data: {},
    };
  }

  const normalizedAddressValues = [
    streetAddress,
    streetAddress2,
    city,
    stateProvince,
    postalCode,
    gpsLocation,
    digitalAddress,
  ].map((value) => (typeof value === "string" ? value.trim() : ""));
  const hasAddress = normalizedAddressValues.some((value) => value);

  if (hasAddress) {
    const { error: deliveryAddressError } = await supabase
      .from("delivery_addresses")
      .insert([
        {
          registry_id: registry.id,
          event_id: event.id,
          street_address: streetAddress || null,
          street_address_2: streetAddress2 || null,
          city: city || null,
          state_province: stateProvince || null,
          postal_code: postalCode || null,
          gps_location: gpsLocation || null,
          digital_address: digitalAddress || null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ])
      .select("id")
      .single();

    if (deliveryAddressError) {
      return {
        message: deliveryAddressError.message,
        errors: deliveryAddressError,
        values: payload,
        data: {},
      };
    }
  }

  let eventPhotoUrl = null;
  let coverPhotoUrl = null;

  try {
    if (isValidSelectedFile(eventPhoto)) {
      eventPhotoUrl = await uploadImageToR2(eventPhoto);
    }
    if (isValidSelectedFile(coverPhoto)) {
      coverPhotoUrl = await uploadImageToR2(coverPhoto);
    }
  } catch (e) {
    return {
      message: "Failed to upload images",
      errors: { images: [e?.message || "Upload failed"] },
      values: payload,
      data: {},
    };
  }

  if (eventPhotoUrl || coverPhotoUrl) {
    const eventUpdates = {};
    const registryUpdates = {};
    if (eventPhotoUrl) eventUpdates.cover_photo = eventPhotoUrl;
    if (coverPhotoUrl) {
      eventUpdates.cover_photo = coverPhotoUrl;
      registryUpdates.cover_photo = coverPhotoUrl;
    }

    if (Object.keys(eventUpdates).length > 0) {
      const { error: eventUpdateError } = await supabase
        .from("events")
        .update(eventUpdates)
        .eq("id", event.id);

      if (eventUpdateError) {
        return {
          message: eventUpdateError.message,
          errors: eventUpdateError,
          values: payload,
          data: {},
        };
      }
    }

    if (Object.keys(registryUpdates).length > 0) {
      const { error: registryUpdateError } = await supabase
        .from("registries")
        .update(registryUpdates)
        .eq("id", registry.id);

      if (registryUpdateError) {
        return {
          message: registryUpdateError.message,
          errors: registryUpdateError,
          values: payload,
          data: {},
        };
      }
    }
  }

  redirect(`/dashboard/h/registry/${registry.registry_code}`);
  return {
    message: "Registry created successfully",
    errors: {},
    values: payload,
    data: registry,
  };
}
