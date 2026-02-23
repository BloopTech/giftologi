import { NextResponse } from "next/server";
import { createAdminClient } from "../../../utils/supabase/server";

const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const MAX_MESSAGE_LENGTH = 5000;

const normalizeEmail = (value) => {
  const email = String(value || "")
    .trim()
    .toLowerCase();
  if (!email) return null;
  return email;
};

const getByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  return path
    .split(".")
    .reduce(
      (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
      obj,
    );
};

const pickFirstString = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const parseJsonObject = (value) => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

const normalizeRecipient = (value) => {
  if (!value) return null;

  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => normalizeRecipient(entry))
      .filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }

  if (typeof value === "object") {
    return pickFirstString(
      value.email,
      value.address,
      value.Email,
      value.Address,
    );
  }

  const text = String(value).trim();
  return text || null;
};

const extractEmailAddress = (value) => {
  if (!value) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractEmailAddress(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === "object") {
    return normalizeEmail(
      value.email || value.address || value.Email || value.Address,
    );
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const angleMatch = raw.match(/<([^>]+)>/);
  if (angleMatch?.[1]) return normalizeEmail(angleMatch[1]);

  const plainMatch = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return plainMatch?.[0] ? normalizeEmail(plainMatch[0]) : null;
};

const extractTicketId = (value) => {
  const text = String(value || "");
  const match = text.match(UUID_PATTERN);
  return match?.[0] || null;
};

const extractHeaderValue = (headers, headerName) => {
  if (!headers || !headerName) return null;
  const target = String(headerName).toLowerCase();

  if (typeof headers === "string") {
    const regex = new RegExp(`^${target}:\\s*(.+)$`, "gim");
    const match = regex.exec(headers);
    return match?.[1]?.trim() || null;
  }

  if (Array.isArray(headers)) {
    for (const header of headers) {
      if (!header || typeof header !== "object") continue;
      const name = String(header.Name || header.name || "").toLowerCase();
      if (name === target) {
        return pickFirstString(header.Value, header.value);
      }
    }
    return null;
  }

  if (typeof headers === "object") {
    for (const [key, value] of Object.entries(headers)) {
      if (String(key).toLowerCase() === target) {
        return pickFirstString(value);
      }
    }
  }

  return null;
};

const stripQuotedText = (message) => {
  const text = String(message || "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!text) return "";

  const markers = [
    /^\s*On .+ wrote:\s*$/im,
    /^\s*From:\s.+$/im,
    /^\s*---+\s*Original Message\s*---+\s*$/im,
  ];

  let cutoff = text.length;
  for (const marker of markers) {
    const found = marker.exec(text);
    if (found && typeof found.index === "number") {
      cutoff = Math.min(cutoff, found.index);
    }
  }

  return text.slice(0, cutoff).trim();
};

const stripHtml = (html) =>
  String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();

const toObjectFromFormData = (formData) => {
  const payload = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      payload[key] = value;
    }
  }
  return payload;
};

const parsePayload = async (request) => {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return toObjectFromFormData(formData);
  }

  const rawBody = await request.text();
  if (!rawBody) return {};

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(rawBody);
    return Object.fromEntries(params.entries());
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return { raw: rawBody };
  }
};

const unwrapProviderPayload = (payload) => {
  if (!payload || typeof payload !== "object") return {};

  if (
    payload.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data)
  ) {
    return { ...payload, __source: payload, ...payload.data };
  }

  const parsedNestedPayload = parseJsonObject(payload.payload);
  if (parsedNestedPayload && typeof parsedNestedPayload === "object") {
    return { ...payload, __source: payload, ...parsedNestedPayload };
  }

  return payload;
};

const resolveSenderEmail = (payload) =>
  extractEmailAddress(
    pickFirstString(
      getByPath(payload, "from"),
      getByPath(payload, "sender"),
      getByPath(payload, "from_email"),
      getByPath(payload, "From"),
      getByPath(payload, "FromFull.Email"),
      getByPath(payload, "envelope.from"),
    ) ||
      getByPath(payload, "from") ||
      getByPath(payload, "FromFull"),
  );

const resolveSubject = (payload) =>
  pickFirstString(
    getByPath(payload, "subject"),
    getByPath(payload, "Subject"),
    getByPath(payload, "headers.subject"),
  );

const resolveMessage = (payload) => {
  const textBody = pickFirstString(
    getByPath(payload, "text"),
    getByPath(payload, "body-plain"),
    getByPath(payload, "stripped-text"),
    getByPath(payload, "strippedText"),
    getByPath(payload, "TextBody"),
    getByPath(payload, "message"),
  );

  if (textBody) return textBody;

  const htmlBody = pickFirstString(
    getByPath(payload, "html"),
    getByPath(payload, "HtmlBody"),
    getByPath(payload, "body-html"),
  );

  return htmlBody ? stripHtml(htmlBody) : null;
};

const resolveRecipient = (payload) =>
  normalizeRecipient(
    getByPath(payload, "to") ||
      getByPath(payload, "recipient") ||
      getByPath(payload, "To") ||
      getByPath(payload, "headers.to"),
  );

const normalizeMessageBody = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const stripped = stripQuotedText(raw);
  return stripped || raw;
};

const normalizeGenericPayload = (payload) => ({
  provider: "generic",
  senderEmail: resolveSenderEmail(payload),
  subject: resolveSubject(payload),
  recipient: resolveRecipient(payload),
  message: resolveMessage(payload),
  ticketIdHint: pickFirstString(
    getByPath(payload, "ticket_id"),
    getByPath(payload, "ticketId"),
    getByPath(payload, "headers.x-ticket-id"),
  ),
});

const normalizePostmarkPayload = (payload) => {
  const isPostmark =
    getByPath(payload, "RecordType") === "Inbound" ||
    Boolean(
      getByPath(payload, "MessageID") ||
      getByPath(payload, "FromFull") ||
      getByPath(payload, "TextBody"),
    );

  if (!isPostmark) return null;

  const headers = getByPath(payload, "Headers");

  return {
    provider: "postmark",
    senderEmail: extractEmailAddress(
      getByPath(payload, "FromFull") ||
        getByPath(payload, "FromEmail") ||
        getByPath(payload, "From"),
    ),
    subject: pickFirstString(getByPath(payload, "Subject")),
    recipient: normalizeRecipient(
      getByPath(payload, "OriginalRecipient") ||
        getByPath(payload, "To") ||
        getByPath(payload, "ToFull"),
    ),
    message: pickFirstString(
      getByPath(payload, "StrippedTextReply"),
      getByPath(payload, "TextBody"),
      stripHtml(getByPath(payload, "StrippedHtmlReply")),
      stripHtml(getByPath(payload, "HtmlBody")),
    ),
    ticketIdHint: pickFirstString(
      getByPath(payload, "MailboxHash"),
      extractHeaderValue(headers, "x-ticket-id"),
      extractHeaderValue(headers, "x-support-ticket-id"),
      getByPath(payload, "Metadata.ticket_id"),
    ),
  };
};

const normalizeSendGridPayload = (payload) => {
  const isSendGrid =
    getByPath(payload, "spam_score") !== undefined ||
    Boolean(getByPath(payload, "attachment-info")) ||
    Boolean(getByPath(payload, "charsets")) ||
    Boolean(getByPath(payload, "envelope"));

  if (!isSendGrid) return null;

  const envelope =
    parseJsonObject(getByPath(payload, "envelope")) ||
    getByPath(payload, "envelope");
  const rawHeaders = getByPath(payload, "headers");

  return {
    provider: "sendgrid",
    senderEmail: extractEmailAddress(
      getByPath(payload, "from") || getByPath(envelope, "from"),
    ),
    subject: pickFirstString(getByPath(payload, "subject")),
    recipient: normalizeRecipient(
      getByPath(payload, "to") || getByPath(envelope, "to"),
    ),
    message: pickFirstString(
      getByPath(payload, "stripped-text"),
      getByPath(payload, "text"),
      stripHtml(getByPath(payload, "stripped-html")),
      stripHtml(getByPath(payload, "html")),
    ),
    ticketIdHint: pickFirstString(
      extractHeaderValue(rawHeaders, "x-ticket-id"),
      extractHeaderValue(rawHeaders, "x-support-ticket-id"),
    ),
  };
};

const normalizeResendPayload = (payload) => {
  const source =
    getByPath(payload, "data") && typeof getByPath(payload, "data") === "object"
      ? getByPath(payload, "data")
      : payload;

  const isResend =
    String(getByPath(payload, "provider") || "")
      .toLowerCase()
      .includes("resend") ||
    String(getByPath(payload, "source") || "")
      .toLowerCase()
      .includes("resend") ||
    String(getByPath(payload, "type") || "")
      .toLowerCase()
      .includes("resend") ||
    Boolean(getByPath(payload, "data.from") || getByPath(payload, "data.to"));

  if (!isResend) return null;

  return {
    provider: "resend",
    senderEmail: extractEmailAddress(
      getByPath(source, "from") ||
        getByPath(source, "from_email") ||
        getByPath(source, "sender"),
    ),
    subject: pickFirstString(getByPath(source, "subject")),
    recipient: normalizeRecipient(
      getByPath(source, "to") || getByPath(source, "recipient"),
    ),
    message: pickFirstString(
      getByPath(source, "text"),
      getByPath(source, "textBody"),
      stripHtml(getByPath(source, "html")),
      stripHtml(getByPath(source, "htmlBody")),
    ),
    ticketIdHint: pickFirstString(
      getByPath(source, "ticket_id"),
      getByPath(source, "ticketId"),
      extractHeaderValue(getByPath(source, "headers"), "x-ticket-id"),
      extractHeaderValue(getByPath(source, "headers"), "x-support-ticket-id"),
    ),
  };
};

const normalizeInboundPayload = (rawPayload) => {
  const payload = unwrapProviderPayload(rawPayload);

  const providerPayload =
    normalizePostmarkPayload(payload) ||
    normalizeSendGridPayload(payload) ||
    normalizeResendPayload(payload) ||
    normalizeGenericPayload(payload);

  return {
    ...providerPayload,
    senderEmail: normalizeEmail(providerPayload.senderEmail),
    message: normalizeMessageBody(providerPayload.message),
    subject: pickFirstString(providerPayload.subject),
    recipient: normalizeRecipient(providerPayload.recipient),
  };
};

export async function POST(request) {
  try {
    const inboundSecret = process.env.INBOUND_EMAIL_SECRET;
    if (!inboundSecret) {
      console.error(
        "[api/support/email-reply] INBOUND_EMAIL_SECRET is missing.",
      );
      return NextResponse.json(
        { error: "Inbound email handler not configured." },
        { status: 503 },
      );
    }

    const bearer = request.headers.get("authorization") || "";
    const tokenFromBearer = bearer.toLowerCase().startsWith("bearer ")
      ? bearer.slice(7).trim()
      : null;
    const providedSecret =
      request.headers.get("x-inbound-email-secret") || tokenFromBearer;

    if (!providedSecret || providedSecret !== inboundSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawPayload = await parsePayload(request);
    const normalizedInbound = normalizeInboundPayload(rawPayload);
    const senderEmail = normalizedInbound.senderEmail;
    const subject = normalizedInbound.subject;
    const recipient = normalizedInbound.recipient;
    const message = normalizedInbound.message;

    const ticketId =
      extractTicketId(normalizedInbound.ticketIdHint) ||
      extractTicketId(subject) ||
      extractTicketId(recipient);

    if (!senderEmail || !ticketId || !message) {
      return NextResponse.json(
        { error: "Missing sender, ticket reference, or message body." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const { data: ticket, error: ticketError } = await admin
      .from("support_tickets")
      .select(
        "id, created_by, guest_email, status, creator:profiles!support_tickets_created_by_fkey(email)",
      )
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const normalizedGuestEmail = normalizeEmail(ticket.guest_email);
    const normalizedCreatorEmail = normalizeEmail(ticket.creator?.email);
    const isGuestSender =
      normalizedGuestEmail && normalizedGuestEmail === senderEmail;
    const isCreatorSender =
      normalizedCreatorEmail && normalizedCreatorEmail === senderEmail;

    if (!isGuestSender && !isCreatorSender) {
      return NextResponse.json(
        { error: "Sender is not allowed" },
        { status: 403 },
      );
    }

    const { data: insertedMessage, error: insertError } = await admin
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticket.id,
        sender_id: isCreatorSender ? ticket.created_by : null,
        sender_role: "user",
        message: message.slice(0, MAX_MESSAGE_LENGTH),
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const updatePayload = { updated_at: new Date().toISOString() };
    if (ticket.status === "resolved" || ticket.status === "closed") {
      updatePayload.status = "open";
    }

    await admin
      .from("support_tickets")
      .update(updatePayload)
      .eq("id", ticket.id);

    return NextResponse.json(
      {
        success: true,
        ticketId: ticket.id,
        messageId: insertedMessage.id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[api/support/email-reply] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
