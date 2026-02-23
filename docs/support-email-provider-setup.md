# Support Email Provider Setup (Resend outbound + inbound webhook)

This document explains the production setup for support ticket emails in Giftologi, including:

- **Outbound sending** via Resend (primary)
- **SMTP fallback** if Resend fails
- **Inbound reply handling** (email replies -> support ticket messages)

Related code:

- Outbound + fallback logic: `app/utils/emailService.js`
- Inbound webhook route: `app/api/support/email-reply/route.js`
- Support ticket recovery endpoint: `app/api/support/recovery/route.js`
- Support access token signing: `app/utils/supportAccessToken.js`

---

## 1) Required environment variables

Set these in your deployment environment (and local `.env` for testing):

```env
# Resend outbound (primary)
RESEND_API_KEY=...
RESEND_FROM_EMAIL="Giftologi Support <support@yourdomain.com>"

# SMTP fallback (used only if Resend send fails/unavailable)
SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="Giftologi Support <support@yourdomain.com>"

# Inbound webhook auth
INBOUND_EMAIL_SECRET=super-long-random-secret

# JWT secret for ticket access links sent in emails
SUPPORT_ACCESS_TOKEN_SECRET=another-long-random-secret

# Reply routing template (dynamic)
SUPPORT_REPLY_TO_TEMPLATE="support+{{ticket_id}}@reply.yourdomain.com"

# Optional default reply-to for non-support templates
EMAIL_REPLY_TO="support@yourdomain.com"
```

---

## 2) How `SUPPORT_REPLY_TO_TEMPLATE` works (dynamic value)

You do **not** fetch this from anywhere. You define it once as a template string in env.

Use this format:

```env
SUPPORT_REPLY_TO_TEMPLATE="support+{{ticket_id}}@reply.yourdomain.com"
```

At send time, the app interpolates `{{ticket_id}}` using template variables.

Example runtime output:

- Template value: `support+{{ticket_id}}@reply.yourdomain.com`
- Ticket id: `8a33d15e-2362-49f6-8bb1-9f963a66e6e8`
- Effective Reply-To: `support+8a33d15e-2362-49f6-8bb1-9f963a66e6e8@reply.yourdomain.com`

Why this is useful:

- Each outgoing support email carries a ticket-specific reply address.
- Inbound webhook parser can recover the ticket id from recipient/headers/subject.

---

## 3) Resend outbound setup

1. Verify your sending domain in Resend.
2. Create/confirm sender identity used by `RESEND_FROM_EMAIL`.
3. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in env.
4. Keep SMTP env values present as fallback.

Behavior in code:

1. Try Resend API first.
2. If Resend fails and SMTP is configured, fallback to SMTP.

---

## 4) Inbound reply webhook mapping

Inbound endpoint:

- `POST /api/support/email-reply`

Auth accepted by endpoint:

- `Authorization: Bearer <INBOUND_EMAIL_SECRET>`
- or `x-inbound-email-secret: <INBOUND_EMAIL_SECRET>`

### Provider mapping (supported)

The webhook parser normalizes payloads from:

- **Resend** (provider/data payload variants)
- **Postmark** (Inbound JSON)
- **SendGrid** (Inbound Parse payload)
- Generic fallback payloads

Expected normalized fields:

- Sender email
- Subject
- Recipient
- Message text
- Ticket id hint (from explicit field/header when available)

Ticket ID can be resolved from:

1. explicit ticket hint field/header (`x-ticket-id`, etc)
2. email subject
3. recipient address (e.g. plus-addressed reply-to)

---

## 5) Resend inbound routing recommendations

Use a dedicated reply domain/subdomain, for example:

- `reply.yourdomain.com`

Configure your provider inbound route so that mail to this domain is forwarded to:

- `https://<your-app-domain>/api/support/email-reply`

Include header:

- `x-inbound-email-secret: <INBOUND_EMAIL_SECRET>`

Recommended routing pattern:

- Catch-all for `*@reply.yourdomain.com`

This supports addresses like:

- `support+<ticket_uuid>@reply.yourdomain.com`

---

## 6) End-to-end validation checklist

1. Create a guest ticket.
2. Confirm `support_ticket_created_guest` enters queue and is sent.
3. Inspect email headers: ensure Reply-To contains ticket UUID.
4. Reply to the email from the same guest email address.
5. Confirm new row in `support_ticket_messages`.
6. Confirm resolved/closed tickets are reopened on inbound user reply.
7. Temporarily disable Resend credentials and verify SMTP fallback works.

---

## 7) Troubleshooting

- **Inbound 401 Unauthorized**
  - Check `INBOUND_EMAIL_SECRET` and webhook headers.
- **Inbound 400 Missing sender/ticket/message**
  - Ensure provider payload includes sender and body; ensure reply address or subject includes ticket UUID.
- **Emails not sent**
  - Check `notification_email_queue` status and `last_error`.
  - Verify Resend API key/domain.
  - Verify SMTP fallback settings.
- **Recovery links unavailable**
  - Ensure `SUPPORT_ACCESS_TOKEN_SECRET` is set.
