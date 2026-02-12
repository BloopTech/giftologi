"use server";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import crypto from "crypto";
import z from "zod";
import nodemailer from "nodemailer";
import { render, pretty } from "@react-email/render";
import RegistryInviteEmail from "@/app/registry/emails/RegistryInviteEmail";
import RegistryThankYouEmail from "@/app/registry/emails/RegistryThankYouEmail";
import {
  createClient,
  createAdminClient,
} from "@/app/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

const emailSchema = z.string().email();

const getSiteUrl = () =>
  process.env.NEXTAUTH_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : "http://localhost:3000");

const createEmailTransport = () => {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
};

const parseInviteEmails = (value) => {
  if (!value) return [];
  const candidates = value
    .split(/[\n,;]+/)
    .map((email) => email.trim())
    .filter(Boolean);
  return Array.from(new Set(candidates));
};

const getHostName = (profile) =>
  [profile?.firstname, profile?.lastname].filter(Boolean).join(" ").trim();

const sendRegistryInviteEmail = async ({
  to,
  registryTitle,
  registryUrl,
  hostName,
  message,
}) => {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transport = createEmailTransport();

  if (!to || !fromAddress || !transport) {
    console.warn("Email not sent: missing SMTP configuration or recipient.");
    return;
  }

  const html = await pretty(
    await render(
      <RegistryInviteEmail
        hostName={hostName}
        registryTitle={registryTitle}
        registryUrl={registryUrl}
        message={message}
      />
    )
  );

  await transport.sendMail({
    from: `Giftologi <${fromAddress}>`,
    to,
    subject: hostName
      ? `${hostName} invited you to a registry`
      : "You're invited to a Giftologi registry",
    html,
  });
};

const sendRegistryThankYouEmail = async ({
  to,
  recipientName,
  hostName,
  registryTitle,
  message,
}) => {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transport = createEmailTransport();

  if (!to || !fromAddress || !transport) {
    console.warn("Email not sent: missing SMTP configuration or recipient.");
    return;
  }

  const html = await pretty(
    await render(
      <RegistryThankYouEmail
        hostName={hostName}
        recipientName={recipientName}
        registryTitle={registryTitle}
        message={message}
      />
    )
  );

  await transport.sendMail({
    from: `Giftologi <${fromAddress}>`,
    to,
    subject: hostName
      ? `A thank-you note from ${hostName}`
      : "A thank-you note from Giftologi",
    html,
  });
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

export async function sendRegistryInvites(prev, queryData) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, firstname, lastname, email")
    .single();

  if (profileError || !profile?.id) {
    return {
      errors: { emails: [profileError?.message || "Unable to load profile"] },
      message: "Failed to send invitations",
      data: {},
    };
  }

  const registry_id = queryData.get("registry_id");
  const event_id = queryData.get("event_id");
  const message = (queryData.get("message") || "").toString().trim();
  const rawEmails = (queryData.get("emails") || "").toString();
  const emailList = parseInviteEmails(rawEmails);

  if (!emailList.length) {
    return {
      errors: { emails: ["Add at least one email address."] },
      message: "Please enter at least one email address",
      data: {},
    };
  }

  const invalidEmails = emailList.filter(
    (email) => !emailSchema.safeParse(email).success
  );

  if (invalidEmails.length) {
    return {
      errors: {
        emails: invalidEmails.map((email) => `${email} is not a valid email.`),
      },
      message: "One or more email addresses are invalid",
      data: {},
    };
  }

  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select("id, privacy")
    .eq("host_id", profile.id)
    .eq("id", event_id)
    .single();

  if (eventError) {
    return {
      errors: { emails: [eventError.message] },
      message: "Failed to send invitations",
      data: {},
    };
  }

  const { data: registryData, error: registryError } = await supabase
    .from("registries")
    .select("id, registry_code, title")
    .eq("event_id", eventData.id)
    .eq("id", registry_id)
    .single();

  if (registryError) {
    return {
      errors: { emails: [registryError.message] },
      message: "Failed to send invitations",
      data: {},
    };
  }

  const isInviteOnly = eventData.privacy === "invite-only";
  const invitedAt = new Date().toISOString();
  const admin = createAdminClient();
  const lowerEmails = emailList.map((e) => e.toLowerCase());

  // Remove existing invites for these emails so re-invites get fresh tokens
  await admin
    .from("registry_invites")
    .delete()
    .eq("registry_id", registryData.id)
    .in("email", lowerEmails);

  const invitePayload = lowerEmails.map((email) => ({
    registry_id: registryData.id,
    email,
    invited_by: profile.id,
    status: "sent",
    invited_at: invitedAt,
    invite_token: crypto.randomUUID(),
  }));

  const { data: insertedInvites, error: inviteError } = await admin
    .from("registry_invites")
    .insert(invitePayload)
    .select("email, invite_token");

  if (inviteError) {
    return {
      errors: { emails: [inviteError.message] },
      message: "Failed to save invitations",
      data: {},
    };
  }

  // Build a map of email → invite_token for token-based URLs
  const tokenMap = new Map(
    (insertedInvites || []).map((inv) => [inv.email.toLowerCase(), inv.invite_token])
  );

  const hostName = getHostName(profile);
  const baseUrl = registryData?.registry_code
    ? `${getSiteUrl()}/registry/${registryData.registry_code}`
    : getSiteUrl();

  await Promise.allSettled(
    emailList.map((email) => {
      // For invite-only registries, append the token so the link grants access
      const token = isInviteOnly ? tokenMap.get(email.toLowerCase()) : null;
      const registryUrl = token ? `${baseUrl}?token=${token}` : baseUrl;

      return sendRegistryInviteEmail({
        to: email,
        registryTitle: registryData?.title,
        registryUrl,
        hostName,
        message,
      });
    })
  );

  if (registryData?.registry_code) {
    revalidatePath(`/dashboard/h/registry/${registryData.registry_code}`);
  }

  return {
    message: "Invitations sent successfully",
    data: { count: emailList.length },
    errors: {},
    status_code: 200,
  };
}

export async function sendRegistryThankYou(prev, queryData) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, firstname, lastname, email")
    .single();

  if (profileError || !profile?.id) {
    return {
      errors: { recipient_email: [profileError?.message || "Unable to load profile"] },
      message: "Failed to send thank-you",
      data: {},
    };
  }

  const registry_id = queryData.get("registry_id");
  const event_id = queryData.get("event_id");
  const order_id = (queryData.get("order_id") || "").toString().trim();
  const message = (queryData.get("message") || "").toString().trim();
  const inputRecipientName =
    (queryData.get("recipient_name") || "").toString().trim() || "";

  if (!order_id) {
    return {
      errors: { order_id: ["Please select a purchase."] },
      message: "Select a purchase to send a thank-you note",
      data: {},
    };
  }

  if (!message) {
    return {
      errors: { message: ["Please write a thank-you message."] },
      message: "Thank-you message is required",
      data: {},
    };
  }

  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("host_id", profile.id)
    .eq("id", event_id)
    .single();

  if (eventError) {
    return {
      errors: { recipient_email: [eventError.message] },
      message: "Failed to send thank-you",
      data: {},
    };
  }

  const { data: registryData, error: registryError } = await supabase
    .from("registries")
    .select("id, registry_code, title")
    .eq("event_id", eventData.id)
    .eq("id", registry_id)
    .single();

  if (registryError) {
    return {
      errors: { recipient_email: [registryError.message] },
      message: "Failed to send thank-you",
      data: {},
    };
  }

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, status, registry_id, buyer_firstname, buyer_lastname, buyer_email, gifter_firstname, gifter_lastname, gifter_email, gifter_anonymous"
    )
    .eq("id", order_id)
    .maybeSingle();

  if (orderError || !orderData) {
    return {
      errors: { order_id: [orderError?.message || "Purchase not found."] },
      message: "Failed to load purchase details",
      data: {},
    };
  }

  if (orderData.registry_id !== registryData.id) {
    return {
      errors: { order_id: ["Purchase does not belong to this registry."] },
      message: "Failed to send thank-you",
      data: {},
    };
  }

  const orderStatus = String(orderData.status || "").toLowerCase();
  if (!["paid", "processing", "completed"].includes(orderStatus)) {
    return {
      errors: { order_id: ["Purchase is not successful yet."] },
      message: "You can only thank successful purchases",
      data: {},
    };
  }

  const gifterName = orderData
    ? [orderData.gifter_firstname, orderData.gifter_lastname]
        .filter(Boolean)
        .join(" ")
        .trim()
    : "";
  const buyerName = orderData
    ? [orderData.buyer_firstname, orderData.buyer_lastname]
        .filter(Boolean)
        .join(" ")
        .trim()
    : "";
  const recipientEmail =
    orderData?.gifter_email ||
    orderData?.buyer_email ||
    "";
  const recipientName = inputRecipientName || gifterName || buyerName || "";

  if (!recipientEmail) {
    return {
      errors: { recipient_email: ["Recipient email is required."] },
      message: "Recipient email is required",
      data: {},
    };
  }

  if (!emailSchema.safeParse(recipientEmail).success) {
    return {
      errors: { recipient_email: ["Recipient email is invalid."] },
      message: "Recipient email is invalid",
      data: {},
    };
  }

  const sentAt = new Date().toISOString();
  const thankYouPayload = {
    registry_id: registryData.id,
    order_id: orderData?.id || null,
    created_by: profile.id,
    recipient_email: recipientEmail,
    recipient_name: recipientName || null,
    message,
    sent_at: sentAt,
    created_at: sentAt,
  };

  const { data: thankYouData, error: thankYouError } = await supabase
    .from("registry_thank_you")
    .insert(thankYouPayload)
    .select()
    .single();

  if (thankYouError) {
    return {
      errors: { recipient_email: [thankYouError.message] },
      message: "Failed to save thank-you note",
      data: {},
    };
  }

  const hostName = getHostName(profile);

  await sendRegistryThankYouEmail({
    to: recipientEmail,
    recipientName,
    hostName,
    registryTitle: registryData?.title,
    message,
  });

  if (registryData?.registry_code) {
    revalidatePath(`/dashboard/h/registry/${registryData.registry_code}`);
  }

  return {
    message: "Thank-you note sent successfully",
    data: thankYouData || {},
    errors: {},
    status_code: 200,
  };
}

const updateRegistryDetailsSchema = z.object({
  registry_id: z.string().uuid({ message: "Invalid registry" }),
  event_id: z.string().uuid({ message: "Invalid event" }),
  location: z.string().trim().min(1, { message: "Location is required" }),
  date: z.string().trim().min(1, { message: "Event date is required" }),
  privacy: z.enum(["public", "private"], { message: "Privacy is required" }),
  street_address: z.string().optional(),
  street_address_2: z.string().optional(),
  city: z.string().optional(),
  state_province: z.string().optional(),
  postal_code: z.string().optional(),
  gps_location: z.string().optional(),
  digital_address: z.string().optional(),
}).superRefine((data, ctx) => {
  const streetAddress = (data.street_address || "").trim();
  const city = (data.city || "").trim();
  const stateProvince = (data.state_province || "").trim();

  if (!streetAddress) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["street_address"],
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
      path: ["state_province"],
      message: "Region/State is required",
    });
  }
});

const deleteRegistrySchema = z.object({
  registry_id: z.string().uuid({ message: "Invalid registry" }),
  event_id: z.string().uuid({ message: "Invalid event" }),
  confirm_text: z
    .string()
    .trim()
    .min(1, { message: "Type DELETE REGISTRY to confirm" }),
  redirect_to: z.string().optional(),
});

export async function updateRegistryDetails(prev, queryData) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .single();

  if (profileError) {
    return {
      errors: { profile: [profileError.message] },
      message: "Failed to update registry",
      data: {},
    };
  }

  const raw = {
    registry_id: queryData.get("registry_id"),
    event_id: queryData.get("event_id"),
    location: (queryData.get("location") || "").toString().trim(),
    date: (queryData.get("date") || "").toString().trim(),
    privacy: (queryData.get("privacy") || "")
      .toString()
      .trim()
      .toLowerCase(),
    street_address: (queryData.get("street_address") || "").toString().trim(),
    street_address_2: (queryData.get("street_address_2") || "")
      .toString()
      .trim(),
    city: (queryData.get("city") || "").toString().trim(),
    state_province: (queryData.get("state_province") || "")
      .toString()
      .trim(),
    postal_code: (queryData.get("postal_code") || "").toString().trim(),
    gps_location: (queryData.get("gps_location") || "").toString().trim(),
    digital_address: (queryData.get("digital_address") || "")
      .toString()
      .trim(),
  };

  const parsed = updateRegistryDetailsSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const {
    registry_id,
    event_id,
    location,
    date,
    privacy,
    street_address,
    street_address_2,
    city,
    state_province,
    postal_code,
    gps_location,
    digital_address,
  } = parsed.data;

  const { data: isEventData, error: isEventError } = await supabase
    .from("events")
    .select("id, host_id")
    .eq("host_id", profile.id)
    .eq("id", event_id)
    .single();

  if (isEventError) {
    return {
      errors: { event_id: [isEventError.message] },
      message: "Failed to update registry",
      data: {},
    };
  }

  const { data: isRegistryData, error: isRegistryError } = await supabase
    .from("registries")
    .select("id, registry_code")
    .eq("event_id", isEventData.id)
    .eq("id", registry_id)
    .single();

  if (isRegistryError) {
    return {
      errors: { registry_id: [isRegistryError.message] },
      message: "Failed to update registry",
      data: {},
    };
  }

  const { error: eventError } = await supabase
    .from("events")
    .update({
      location,
      date,
      privacy,
      updated_at: new Date(),
    })
    .eq("id", isEventData.id);

  if (eventError) {
    return {
      errors: { event: [eventError.message] },
      message: "Failed to update registry",
      data: {},
    };
  }

  const addressValues = [
    street_address,
    street_address_2,
    city,
    state_province,
    postal_code,
    gps_location,
    digital_address,
  ].map((value) => (typeof value === "string" ? value.trim() : ""));

  const hasAddress = addressValues.some((value) => value);

  const { data: existingAddress, error: addressError } = await supabase
    .from("delivery_addresses")
    .select("id")
    .eq("registry_id", isRegistryData.id)
    .maybeSingle();

  if (addressError) {
    return {
      errors: { delivery_address: [addressError.message] },
      message: "Failed to update registry",
      data: {},
    };
  }

  if (existingAddress?.id && !hasAddress) {
    const { error: deleteAddressError } = await supabase
      .from("delivery_addresses")
      .delete()
      .eq("id", existingAddress.id);

    if (deleteAddressError) {
      return {
        errors: { delivery_address: [deleteAddressError.message] },
        message: "Failed to update registry",
        data: {},
      };
    }
  }

  if (hasAddress) {
    const addressPayload = {
      registry_id: isRegistryData.id,
      event_id: isEventData.id,
      street_address: street_address || null,
      street_address_2: street_address_2 || null,
      city: city || null,
      state_province: state_province || null,
      postal_code: postal_code || null,
      gps_location: gps_location || null,
      digital_address: digital_address || null,
      updated_at: new Date(),
    };

    const { error: addressUpsertError } = existingAddress?.id
      ? await supabase
          .from("delivery_addresses")
          .update(addressPayload)
          .eq("id", existingAddress.id)
      : await supabase
          .from("delivery_addresses")
          .insert([{ ...addressPayload, created_at: new Date() }]);

    if (addressUpsertError) {
      return {
        errors: { delivery_address: [addressUpsertError.message] },
        message: "Failed to update registry",
        data: {},
      };
    }
  }

  revalidatePath(`/dashboard/h/registry/${isRegistryData.registry_code}`);
  revalidatePath("/dashboard/h/registry");

  return {
    message: "Registry updated successfully",
    data: { registry_id: isRegistryData.id },
    errors: {},
    status_code: 200,
  };
}

export async function deleteRegistry(prev, queryData) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .single();

  if (profileError) {
    return {
      errors: { profile: [profileError.message] },
      message: "Failed to delete registry",
      data: {},
    };
  }

  const raw = {
    registry_id: queryData.get("registry_id"),
    event_id: queryData.get("event_id"),
    confirm_text: (queryData.get("confirm_text") || "").toString(),
    redirect_to: (queryData.get("redirect_to") || "").toString(),
  };

  const parsed = deleteRegistrySchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { registry_id, event_id, confirm_text, redirect_to } = parsed.data;
  const redirectPath =
    typeof redirect_to === "string" && redirect_to.trim().length
      ? redirect_to.trim()
      : null;

  if (confirm_text.trim().toUpperCase() !== "DELETE REGISTRY") {
    return {
      message: "Confirmation text does not match.",
      errors: {
        confirm_text: ["Type DELETE REGISTRY to confirm."],
      },
      values: raw,
      data: {},
    };
  }

  const { data: isEventData, error: isEventError } = await supabase
    .from("events")
    .select("id, host_id")
    .eq("host_id", profile.id)
    .eq("id", event_id)
    .single();

  if (isEventError) {
    return {
      errors: { event_id: [isEventError.message] },
      message: "Failed to delete registry",
      data: {},
    };
  }

  const { data: isRegistryData, error: isRegistryError } = await supabase
    .from("registries")
    .select("id, registry_code")
    .eq("event_id", isEventData.id)
    .eq("id", registry_id)
    .single();

  if (isRegistryError) {
    return {
      errors: { registry_id: [isRegistryError.message] },
      message: "Failed to delete registry",
      data: {},
    };
  }

  const { data: purchasedItems, error: purchasedError } = await supabase
    .from("registry_items")
    .select("id")
    .eq("registry_id", isRegistryData.id)
    .gt("purchased_qty", 0)
    .limit(1);

  if (purchasedError) {
    return {
      errors: { registry_id: [purchasedError.message] },
      message: "Failed to delete registry",
      data: {},
    };
  }

  if (purchasedItems?.length) {
    return {
      errors: { registry_id: ["Registry has purchased items."] },
      message: "Registry has purchased items and cannot be deleted.",
      data: {},
    };
  }

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id")
    .eq("registry_id", isRegistryData.id);

  if (ordersError) {
    return {
      errors: { registry_id: [ordersError.message] },
      message: "Failed to delete registry",
      data: {},
    };
  }

  const orderIds = (orders || []).map((order) => order.id).filter(Boolean);

  if (orderIds.length) {
    const { error: orderItemsError } = await supabase
      .from("order_items")
      .delete()
      .in("order_id", orderIds);

    if (orderItemsError) {
      return {
        errors: { registry_id: [orderItemsError.message] },
        message: "Failed to delete registry",
        data: {},
      };
    }
  }

  const { error: ordersDeleteError } = await supabase
    .from("orders")
    .delete()
    .eq("registry_id", isRegistryData.id);

  if (ordersDeleteError) {
    return {
      errors: { registry_id: [ordersDeleteError.message] },
      message: "Failed to delete registry",
      data: {},
    };
  }

  const { error: registryItemsDeleteError } = await supabase
    .from("registry_items")
    .delete()
    .eq("registry_id", isRegistryData.id);

  if (registryItemsDeleteError) {
    return {
      errors: { registry_id: [registryItemsDeleteError.message] },
      message: "Failed to delete registry",
      data: {},
    };
  }

  const { error: registryDeleteError } = await supabase
    .from("registries")
    .delete()
    .eq("id", isRegistryData.id);

  if (registryDeleteError) {
    return {
      errors: { registry_id: [registryDeleteError.message] },
      message: "Failed to delete registry",
      data: {},
    };
  }

  const { error: eventDeleteError } = await supabase
    .from("events")
    .delete()
    .eq("id", isEventData.id);

  if (eventDeleteError) {
    return {
      errors: { event_id: [eventDeleteError.message] },
      message: "Failed to delete registry",
      data: {},
    };
  }

  revalidatePath("/dashboard/h/registry");

  if (redirectPath) {
    redirect(redirectPath);
  }

  return {
    message: "Registry deleted successfully",
    data: { registry_id: isRegistryData.id },
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

const updateRegistryItemSchema = z.object({
  registry_item_id: z.string().uuid({ message: "Invalid registry item" }),
  registry_id: z.string().uuid({ message: "Invalid registry" }),
  event_id: z.string().uuid({ message: "Invalid event" }),
  priority: z.enum(["must-have", "nice-to-have"]).optional(),
  notes: z.string().max(500).optional(),
  color: z.string().max(100).optional(),
  size: z.string().max(100).optional(),
  quantity_needed: z.coerce.number().int().min(1).max(99).optional(),
});

export async function updateRegistryItem(prev, queryData) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .single();

  if (profileError || !profile?.id) {
    return {
      errors: { item: [profileError?.message || "Unable to load profile"] },
      message: "Failed to update item",
      data: {},
    };
  }

  const raw = {
    registry_item_id: queryData.get("registry_item_id"),
    registry_id: queryData.get("registry_id"),
    event_id: queryData.get("event_id"),
    priority: queryData.get("priority") || undefined,
    notes: (queryData.get("notes") || "").toString().trim() || undefined,
    color: (queryData.get("color") || "").toString().trim() || undefined,
    size: (queryData.get("size") || "").toString().trim() || undefined,
    quantity_needed: queryData.get("quantity_needed") || undefined,
  };

  const parsed = updateRegistryItemSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { registry_item_id, registry_id, event_id, ...fields } = parsed.data;

  // Verify ownership
  const { error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("host_id", profile.id)
    .eq("id", event_id)
    .single();

  if (eventError) {
    return {
      errors: { item: ["Event not found or permission denied."] },
      message: "Failed to update item",
      data: {},
    };
  }

  const updatePayload = { updated_at: new Date().toISOString() };
  if (fields.priority !== undefined) updatePayload.priority = fields.priority;
  if (fields.notes !== undefined) updatePayload.notes = fields.notes || null;
  if (fields.color !== undefined) updatePayload.color = fields.color || null;
  if (fields.size !== undefined) updatePayload.size = fields.size || null;
  if (fields.quantity_needed !== undefined)
    updatePayload.quantity_needed = fields.quantity_needed;

  const { data: updated, error: updateError } = await supabase
    .from("registry_items")
    .update(updatePayload)
    .eq("id", registry_item_id)
    .eq("registry_id", registry_id)
    .select()
    .single();

  if (updateError) {
    return {
      errors: { item: [updateError.message] },
      message: "Failed to update item",
      data: {},
    };
  }

  return {
    message: "Item updated successfully",
    data: updated,
    errors: {},
    status_code: 200,
  };
}

const priceRangeSchema = z.object({
  registry_id: z.string().uuid(),
  event_id: z.string().uuid(),
  price_range_min: z.coerce.number().min(0).nullable().optional(),
  price_range_max: z.coerce.number().min(0).nullable().optional(),
});

export async function updateRegistryPriceRange(prev, queryData) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .single();

  if (profileError || !profile?.id) {
    return {
      errors: { price_range: [profileError?.message || "Unable to load profile"] },
      message: "Failed to update price range",
      data: {},
    };
  }

  const rawMin = queryData.get("price_range_min");
  const rawMax = queryData.get("price_range_max");

  const raw = {
    registry_id: queryData.get("registry_id"),
    event_id: queryData.get("event_id"),
    price_range_min: rawMin === "" || rawMin === null ? null : Number(rawMin),
    price_range_max: rawMax === "" || rawMax === null ? null : Number(rawMax),
  };

  const parsed = priceRangeSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { registry_id, event_id, price_range_min, price_range_max } = parsed.data;

  if (
    price_range_min != null &&
    price_range_max != null &&
    price_range_min > price_range_max
  ) {
    return {
      message: "Minimum price cannot exceed maximum price.",
      errors: { price_range: ["Min must be ≤ Max"] },
      values: raw,
      data: {},
    };
  }

  const { error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("host_id", profile.id)
    .eq("id", event_id)
    .single();

  if (eventError) {
    return {
      errors: { price_range: ["Permission denied."] },
      message: "Failed to update price range",
      data: {},
    };
  }

  const { error: updateError } = await supabase
    .from("registries")
    .update({
      price_range_min: price_range_min ?? null,
      price_range_max: price_range_max ?? null,
    })
    .eq("id", registry_id);

  if (updateError) {
    return {
      errors: { price_range: [updateError.message] },
      message: "Failed to update price range",
      data: {},
    };
  }

  return {
    message: "Price range updated successfully",
    data: {},
    errors: {},
    status_code: 200,
  };
}

// Keep the original function for backward compatibility
export default async function updateRegistryAction(prev, queryData) {
  return saveRegistryCoverPhoto(prev, queryData);
}
