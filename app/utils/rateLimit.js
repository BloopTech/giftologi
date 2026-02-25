/**
 * In-memory sliding-window rate limiter for Vercel serverless functions.
 *
 * Each serverless instance keeps its own Map — this prevents automated abuse
 * and bots effectively. For DDoS-level protection, use Vercel WAF / Firewall Rules.
 *
 * Usage:
 *   import { rateLimit } from "@/app/utils/rateLimit";
 *   const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
 *
 *   export async function POST(request) {
 *     const ip = request.headers.get("x-forwarded-for") || "unknown";
 *     const { allowed, remaining } = limiter.check(ip);
 *     if (!allowed) {
 *       return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 *     }
 *     // ... handler
 *   }
 */

const CLEANUP_INTERVAL_MS = 60_000;

export function rateLimit({ windowMs = 60_000, max = 10 } = {}) {
  const hits = new Map();
  let lastCleanup = Date.now();

  function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;
    const cutoff = now - windowMs;
    for (const [key, timestamps] of hits) {
      const valid = timestamps.filter((t) => t > cutoff);
      if (valid.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, valid);
      }
    }
  }

  function check(key) {
    cleanup();
    const now = Date.now();
    const cutoff = now - windowMs;
    const timestamps = (hits.get(key) || []).filter((t) => t > cutoff);
    timestamps.push(now);
    hits.set(key, timestamps);

    const count = timestamps.length;
    const allowed = count <= max;
    const remaining = Math.max(0, max - count);

    return { allowed, remaining, count };
  }

  return { check };
}

export function getClientIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
