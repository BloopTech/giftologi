/**
 * Centralized security event logger.
 * Outputs structured JSON to console for Vercel Log Drains / monitoring.
 *
 * Usage:
 *   import { logSecurityEvent } from "@/app/utils/securityLogger";
 *   logSecurityEvent("RATE_LIMITED", { ip, route: "/api/contact" });
 */

const SECURITY_LOG_PREFIX = "[SECURITY]";

export function logSecurityEvent(eventType, details = {}) {
  const payload = {
    type: eventType,
    timestamp: new Date().toISOString(),
    ...details,
  };

  console.warn(`${SECURITY_LOG_PREFIX} ${eventType}`, JSON.stringify(payload));
}

export const SecurityEvents = {
  AUTH_FAILED: "AUTH_FAILED",
  RATE_LIMITED: "RATE_LIMITED",
  INVALID_CRON_SECRET: "INVALID_CRON_SECRET",
  WEBHOOK_RECEIVED: "WEBHOOK_RECEIVED",
  OPEN_REDIRECT_BLOCKED: "OPEN_REDIRECT_BLOCKED",
  ADMIN_ACTION: "ADMIN_ACTION",
  SUSPICIOUS_INPUT: "SUSPICIOUS_INPUT",
};
