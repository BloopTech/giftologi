"use server";

import { z } from "zod";
import { sendEmail } from "../utils/emailService";
import { createAdminClient } from "../utils/supabase/server";

const newsletterSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  company: z.string().trim().optional(),
});

export const initialNewsletterState = {
  success: false,
  message: "",
  error: "",
  fieldErrors: {},
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

async function resolveNotificationEmail() {
  const envEmail = String(process.env.NEWSLETTER_NOTIFY_EMAIL || "").trim();
  if (envEmail) return envEmail;

  try {
    const admin = createAdminClient();
    const { data: settings } = await admin
      .from("content_contact_settings")
      .select("support_email")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const supportEmail = String(settings?.support_email || "").trim();
    if (supportEmail) return supportEmail;
  } catch (error) {
    console.error("[landing-newsletter] Failed to resolve support email:", error);
  }

  return "hello@mygiftologi.com";
}

async function persistNewsletterSubscriber({ email }) {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const payload = {
    email,
    source: "landing_page",
    status: "subscribed",
    subscribed_at: now,
    last_subscribed_at: now,
    unsubscribed_at: null,
    updated_at: now,
    metadata: {
      source: "landing_page",
    },
  };

  const { error } = await admin
    .from("newsletter_subscribers")
    .upsert(payload, { onConflict: "email" });

  if (error) {
    throw new Error(error.message || "Failed to save subscriber");
  }

  return now;
}

export async function subscribeToLandingNewsletter(_prevState, formData) {
  const raw = {
    email: String(formData.get("email") || "")
      .trim()
      .toLowerCase(),
    company: String(formData.get("company") || "").trim(),
  };

  const parsed = newsletterSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      ...initialNewsletterState,
      error: parsed.error.issues?.[0]?.message || "Please check your details.",
      fieldErrors,
    };
  }

  if (parsed.data.company) {
    return {
      ...initialNewsletterState,
      success: true,
      message: "Thanks for subscribing.",
    };
  }

  let submittedAt = null;
  try {
    submittedAt = await persistNewsletterSubscriber({ email: parsed.data.email });
  } catch (error) {
    console.error("[landing-newsletter] Failed to persist subscriber:", error);
    return {
      ...initialNewsletterState,
      error: "We could not save your subscription right now. Please try again.",
    };
  }

  const notificationEmail = await resolveNotificationEmail();

  const notifyResult = await sendEmail({
    to: notificationEmail,
    subject: "New landing page subscriber",
    replyTo: parsed.data.email,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin: 0 0 12px;">New newsletter subscriber</h2>
        <p style="margin: 0 0 8px;"><strong>Email:</strong> ${escapeHtml(parsed.data.email)}</p>
        <p style="margin: 0;"><strong>Submitted at:</strong> ${escapeHtml(submittedAt)}</p>
      </div>
    `,
  });

  if (!notifyResult.success) {
    console.warn("[landing-newsletter] Failed to notify inbox:", notifyResult.error);
  }

  const welcomeResult = await sendEmail({
    to: parsed.data.email,
    subject: "You are on the Giftologi list",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin: 0 0 12px;">Welcome to Giftologi</h2>
        <p style="margin: 0 0 12px;">Thanks for joining The Inner Circle.</p>
        <p style="margin: 0 0 12px;">You will be the first to hear about curated vendor drops, gift guides, and thoughtful celebration updates.</p>
        <p style="margin: 0;">— Giftologi</p>
      </div>
    `,
  });

  if (!welcomeResult.success) {
    console.warn(
      "[landing-newsletter] Subscriber confirmation email failed:",
      welcomeResult.error,
    );
  }

  return {
    ...initialNewsletterState,
    success: true,
    message: "You're in. Welcome to The Inner Circle.",
  };
}
