import nodemailer from "nodemailer";

let _transport = null;
const RESEND_API_URL = "https://api.resend.com/emails";

const getSiteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : "http://localhost:3000");

/**
 * Returns a singleton nodemailer transport.
 * Returns null if SMTP is not configured.
 */
export function getEmailTransport() {
  if (_transport) return _transport;

  const host = process.env.SMTP_HOST;
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  _transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return _transport;
}

/**
 * Returns the configured "from" address for outgoing emails.
 */
export function getFromAddress() {
  return (
    process.env.SMTP_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    process.env.SMTP_USER ||
    null
  );
}

const hasResendConfig = () =>
  Boolean(
    process.env.RESEND_API_KEY &&
    (process.env.RESEND_FROM_EMAIL || getFromAddress()),
  );

async function sendEmailWithResend({ to, subject, html, from, replyTo }) {
  if (!hasResendConfig()) {
    return { success: false, error: "Resend not configured" };
  }

  const fromAddress = from || process.env.RESEND_FROM_EMAIL || getFromAddress();
  if (!fromAddress) {
    return { success: false, error: "Missing sender address" };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        success: false,
        error: `Resend request failed (${response.status}): ${body}`,
      };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err?.message || "Resend send failed" };
  }
}

async function sendEmailWithSmtp({ to, subject, html, from, replyTo }) {
  const transport = getEmailTransport();
  const fromAddress = from || getFromAddress();

  if (!transport || !fromAddress) {
    console.warn("[emailService] Email not sent: SMTP not configured.");
    return { success: false, error: "SMTP not configured" };
  }

  try {
    await transport.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    return { success: true, error: null };
  } catch (err) {
    console.error(
      "[emailService] Failed to send email via SMTP:",
      err?.message,
    );
    return { success: false, error: err?.message || "SMTP send failed" };
  }
}

/**
 * Send a single email.
 *
 * @param {object} options
 * @param {string} options.to        – Recipient email
 * @param {string} options.subject   – Email subject
 * @param {string} options.html      – Rendered HTML body
 * @param {string} [options.from]    – Override "from" address
 * @param {string} [options.replyTo] – Reply-to address
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendEmail({ to, subject, html, from, replyTo }) {
  if (!to || !subject || !html) {
    return { success: false, error: "Missing required email fields" };
  }

  const resendResult = await sendEmailWithResend({
    to,
    subject,
    html,
    from,
    replyTo,
  });

  if (resendResult.success) {
    return resendResult;
  }

  if (hasResendConfig()) {
    console.warn(
      `[emailService] Resend delivery failed, falling back to SMTP: ${resendResult.error}`,
    );
  }

  return sendEmailWithSmtp({ to, subject, html, from, replyTo });
}

/**
 * Interpolate template variables into a template body string.
 * Replaces {{variable_name}} with the corresponding value.
 *
 * @param {string} template – HTML template with {{var}} placeholders
 * @param {object} variables – Key/value pairs for interpolation
 * @returns {string}
 */
export function interpolateTemplate(template, variables = {}) {
  if (!template) return "";
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in variables) return String(variables[key] ?? "");
    return match;
  });
}

function resolveTemplateReplyTo({ templateSlug, variables }) {
  if (variables?.reply_to) return String(variables.reply_to);

  const defaultReplyTo = process.env.EMAIL_REPLY_TO || null;
  const supportReplyTemplate = process.env.SUPPORT_REPLY_TO_TEMPLATE || null;

  if (
    templateSlug?.startsWith("support_ticket_") &&
    supportReplyTemplate &&
    variables?.ticket_id
  ) {
    return interpolateTemplate(supportReplyTemplate, variables);
  }

  return defaultReplyTo;
}

/**
 * Resolve an email template from the content_email_templates table,
 * interpolate variables, and send.
 *
 * @param {object} options
 * @param {object} options.client       – Supabase client
 * @param {string} options.templateSlug – Template name/slug to look up
 * @param {string} options.to           – Recipient email
 * @param {object} [options.variables]  – Template variable interpolation
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendTemplatedEmail({
  client,
  templateSlug,
  to,
  variables = {},
}) {
  if (!client || !templateSlug || !to) {
    return { success: false, error: "Missing required fields" };
  }

  const { data: template, error: fetchError } = await client
    .from("content_email_templates")
    .select("subject, body, sender_name, status")
    .eq("name", templateSlug)
    .eq("status", "active")
    .maybeSingle();

  if (fetchError || !template) {
    console.warn(
      `[emailService] Template "${templateSlug}" not found or inactive.`,
    );
    return {
      success: false,
      error: fetchError?.message || `Template "${templateSlug}" not found`,
    };
  }

  const siteUrl = getSiteUrl();
  const allVariables = { ...variables, site_url: siteUrl };
  const subject = interpolateTemplate(template.subject, allVariables);
  const html = interpolateTemplate(template.body, allVariables);
  const senderAddress = getFromAddress();
  const from =
    template.sender_name && senderAddress
      ? `${template.sender_name} <${senderAddress}>`
      : undefined;
  const replyTo = resolveTemplateReplyTo({
    templateSlug,
    variables: allVariables,
  });

  return sendEmail({ to, subject, html, from, replyTo });
}
