const RAW_EXPRESSPAY_ENV = String(process.env.EXPRESSPAY_ENV || "")
  .trim()
  .toLowerCase();

const EXPRESSPAY_ENV = ["live", "production", "prod"].includes(
  RAW_EXPRESSPAY_ENV
)
  ? "production"
  : "sandbox";

const EXPRESSPAY_SUBMIT_URL =
  EXPRESSPAY_ENV === "production"
    ? "https://expresspaygh.com/api/submit.php"
    : "https://sandbox.expresspaygh.com/api/submit.php";

const EXPRESSPAY_QUERY_URL =
  EXPRESSPAY_ENV === "production"
    ? "https://expresspaygh.com/api/query.php"
    : "https://sandbox.expresspaygh.com/api/query.php";

const EXPRESSPAY_MERCHANT_ID = process.env.EXPRESSPAY_MERCHANT_ID;
const EXPRESSPAY_API_KEY = process.env.EXPRESSPAY_API_KEY;

const TERMINAL_ORDER_STATUSES = new Set([
  "paid",
  "declined",
  "failed",
  "cancelled",
]);

function assertCredentials() {
  if (!EXPRESSPAY_MERCHANT_ID || !EXPRESSPAY_API_KEY) {
    throw new Error("Missing ExpressPay credentials in environment variables.");
  }
}

async function postForm(url, params) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, payload, status: response.status };
}

function toMinorUnits(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

export function mapExpressPayResultToOrderStatus(
  resultCode,
  currentStatus = "pending",
  resultText = ""
) {
  const normalizedResult = Number(resultCode);
  const normalizedText = String(resultText || "").toLowerCase();

  if (normalizedResult === 1) return "paid";
  if (normalizedResult === 2) return "declined";
  if (normalizedResult === 3) {
    if (
      normalizedText.includes("declined") ||
      normalizedText.includes("failed") ||
      normalizedText.includes("system error")
    ) {
      return "failed";
    }
    return "pending";
  }
  if (normalizedResult === 4) return "pending";

  return currentStatus;
}

export function normalizeExpressPayMethod(value) {
  if (value === null || typeof value === "undefined") return "";

  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (!normalized) return "";
  if (normalized.includes("card") || normalized.includes("visa") || normalized.includes("master")) {
    return "card";
  }
  if (normalized.includes("bank")) {
    return "bank";
  }
  if (normalized.includes("mtn")) {
    return "mtn_momo";
  }
  if (normalized.includes("telecel") || normalized.includes("vodafone")) {
    return "telecel_cash";
  }
  if (
    normalized.includes("airtel") ||
    normalized.includes("tigo") ||
    normalized.includes("at_momo")
  ) {
    return "at_momo";
  }
  if (normalized.includes("momo") || normalized.includes("mobile_money")) {
    return "momo";
  }

  return normalized;
}

export function resolveExpressPayMethod(queryData = {}) {
  const candidates = [
    queryData?.payment_option_type,
    queryData?.["payment-option-type"],
    queryData?.payment_method,
    queryData?.["payment-method"],
    queryData?.method,
    queryData?.channel,
    queryData?.network,
    queryData?.type,
  ];

  for (const candidate of candidates) {
    const method = normalizeExpressPayMethod(candidate);
    if (method) return method;
  }

  return "";
}

export function mapOrderStatusToPaymentStatus(orderStatus = "pending") {
  const normalized = String(orderStatus || "").toLowerCase();

  if (normalized === "paid" || normalized === "success") return "completed";
  if (normalized === "pending") return "pending";
  if (normalized === "cancelled") return "cancelled";
  return "failed";
}

export function hasExpressPayAmountMismatch({
  expectedAmount,
  expectedCurrency,
  receivedAmount,
  receivedCurrency,
  toleranceMinorUnits = 1,
}) {
  const expectedMinor = toMinorUnits(expectedAmount);
  const receivedMinor = toMinorUnits(receivedAmount);

  if (expectedMinor === null || receivedMinor === null) {
    return true;
  }

  const expectedCurr = String(expectedCurrency || "").trim().toUpperCase();
  const receivedCurr = String(receivedCurrency || "").trim().toUpperCase();

  if (expectedCurr && receivedCurr && expectedCurr !== receivedCurr) {
    return true;
  }

  return Math.abs(expectedMinor - receivedMinor) > toleranceMinorUnits;
}

export function buildExpressPayCheckoutUrl(token) {
  if (!token) return null;
  const encodedToken = encodeURIComponent(String(token));
  return EXPRESSPAY_ENV === "production"
    ? `https://expresspaygh.com/api/checkout.php?token=${encodedToken}`
    : `https://sandbox.expresspaygh.com/api/checkout.php?token=${encodedToken}`;
}

export function resolveExpressPayCheckoutUrl(expressPayResponse = {}) {
  const candidateKeys = [
    "checkout-url",
    "checkout_url",
    "checkout",
    "payment-url",
    "payment_url",
    "url",
  ];

  for (const key of candidateKeys) {
    const value = expressPayResponse?.[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();

    if (!/^https?:\/\//i.test(trimmed)) continue;

    try {
      const parsed = new URL(trimmed);
      if (/expresspaygh\.com$/i.test(parsed.hostname)) {
        return trimmed;
      }
    } catch {
      // Ignore malformed URL candidates and continue to fallback.
    }
  }

  return buildExpressPayCheckoutUrl(expressPayResponse?.token);
}

export async function submitExpressPayInvoice({
  firstName,
  lastName,
  email,
  phone,
  username,
  currency,
  amount,
  orderId,
  orderDescription,
  redirectUrl,
  postUrl,
}) {
  assertCredentials();

  const params = new URLSearchParams({
    "merchant-id": EXPRESSPAY_MERCHANT_ID,
    "api-key": EXPRESSPAY_API_KEY,
    firstname: firstName || "",
    lastname: lastName || "",
    email: email || "",
    phonenumber: phone || "",
    username: username || email || "",
    currency: currency || "GHS",
    amount: String(amount),
    "order-id": orderId,
    "order-desc": orderDescription || "Giftologi Purchase",
    "redirect-url": redirectUrl,
    "post-url": postUrl,
  });

  const { payload } = await postForm(EXPRESSPAY_SUBMIT_URL, params);
  return payload;
}

export async function queryExpressPayTransaction(token) {
  assertCredentials();

  if (!token) {
    throw new Error("ExpressPay token is required for query.");
  }

  const params = new URLSearchParams({
    "merchant-id": EXPRESSPAY_MERCHANT_ID,
    "api-key": EXPRESSPAY_API_KEY,
    token,
  });

  const { payload } = await postForm(EXPRESSPAY_QUERY_URL, params);
  return payload;
}

export function createExpressPaySdkClient() {
  return {
    submit: submitExpressPayInvoice,
    query: queryExpressPayTransaction,
    checkout: buildExpressPayCheckoutUrl,
    resolveCheckoutUrl: resolveExpressPayCheckoutUrl,
    mapResultToOrderStatus: mapExpressPayResultToOrderStatus,
    terminalOrderStatuses: TERMINAL_ORDER_STATUSES,
  };
}

export { TERMINAL_ORDER_STATUSES };
