/**
 * Lightweight server-side HTML sanitizer for admin-authored content.
 * Strips dangerous elements/attributes while preserving safe formatting.
 * Defense-in-depth: admins are trusted, but this prevents stored XSS
 * if an admin account is compromised or content is injected.
 */

const DANGEROUS_TAGS =
  /<\s*\/?\s*(script|iframe|object|embed|applet|form|input|textarea|button|select|meta|link|base|style)\b[^>]*>/gi;

const EVENT_HANDLERS = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

const JAVASCRIPT_URLS =
  /\b(href|src|action|formaction|data|poster|background)\s*=\s*(?:"[^"]*javascript\s*:[^"]*"|'[^']*javascript\s*:[^']*')/gi;

const DATA_URLS_DANGEROUS =
  /\b(href|src|action|formaction)\s*=\s*(?:"[^"]*data\s*:[^"]*text\/html[^"]*"|'[^']*data\s*:[^']*text\/html[^']*')/gi;

export function sanitizeHtml(html) {
  if (!html || typeof html !== "string") return "";

  let cleaned = html;

  // Strip dangerous tags entirely
  cleaned = cleaned.replace(DANGEROUS_TAGS, "");

  // Strip event handler attributes (onclick, onerror, onload, etc.)
  cleaned = cleaned.replace(EVENT_HANDLERS, "");

  // Strip javascript: protocol in URLs
  cleaned = cleaned.replace(JAVASCRIPT_URLS, "");

  // Strip dangerous data: URIs (text/html can execute scripts)
  cleaned = cleaned.replace(DATA_URLS_DANGEROUS, "");

  return cleaned;
}
