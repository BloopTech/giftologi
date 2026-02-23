import { SignJWT, jwtVerify } from "jose";

const TOKEN_ALG = "HS256";
const ISSUER = "giftologi-support";
const AUDIENCE = "support-ticket-access";

const getSecret = () => {
  const secret = process.env.SUPPORT_ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error("SUPPORT_ACCESS_TOKEN_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
};

export async function issueSupportTicketAccessToken({
  ticketId,
  email,
  expiresIn = "14d",
}) {
  if (!ticketId || !email) {
    throw new Error("ticketId and email are required to issue support access token");
  }

  const secret = getSecret();
  const normalizedEmail = String(email).trim().toLowerCase();

  return new SignJWT({
    typ: "support_access",
    ticket_id: String(ticketId),
    email: normalizedEmail,
  })
    .setProtectedHeader({ alg: TOKEN_ALG })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifySupportTicketAccessToken(token) {
  if (!token) {
    return { valid: false, payload: null, error: "Missing token" };
  }

  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: [TOKEN_ALG],
    });

    if (payload?.typ !== "support_access") {
      return { valid: false, payload: null, error: "Invalid token type" };
    }

    return { valid: true, payload, error: null };
  } catch (error) {
    return {
      valid: false,
      payload: null,
      error: error?.message || "Invalid token",
    };
  }
}
