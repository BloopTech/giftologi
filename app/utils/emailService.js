import nodemailer from "nodemailer";

let _transport = null;

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
  return process.env.SMTP_FROM || process.env.SMTP_USER || null;
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
  const transport = getEmailTransport();
  const fromAddress = from || getFromAddress();

  if (!transport || !fromAddress) {
    console.warn("[emailService] Email not sent: SMTP not configured.");
    return { success: false, error: "SMTP not configured" };
  }

  if (!to || !subject || !html) {
    return { success: false, error: "Missing required email fields" };
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
    console.error("[emailService] Failed to send email:", err?.message);
    return { success: false, error: err?.message || "Send failed" };
  }
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
      `[emailService] Template "${templateSlug}" not found or inactive.`
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
  const from = template.sender_name
    ? `${template.sender_name} <${getFromAddress()}>`
    : undefined;

  return sendEmail({ to, subject, html, from });
}
