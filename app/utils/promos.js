const PROMO_SCOPES = {
  PLATFORM: "platform",
  VENDOR: "vendor",
};

const normalizePromoCode = (code) =>
  typeof code === "string" ? code.trim() : "";

const roundCurrency = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
};

const parseDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isPromoActive = (promo, now) => {
  if (!promo?.active) return false;
  const startAt = parseDate(promo.start_at);
  const endAt = parseDate(promo.end_at);
  if (startAt && now < startAt) return false;
  if (endAt && now > endAt) return false;
  return true;
};

const buildTargetLookup = (targets) => {
  const targetProductIds = new Set();
  const targetCategoryIds = new Set();

  (targets || []).forEach((target) => {
    if (target?.product_id) targetProductIds.add(target.product_id);
    if (target?.category_id) targetCategoryIds.add(target.category_id);
  });

  return { targetProductIds, targetCategoryIds };
};

const computePromoDiscount = ({ promo, targets = [], items = [] }) => {
  const percentOff = Number(promo?.percent_off || 0);
  const safePercent = Number.isFinite(percentOff)
    ? Math.min(Math.max(percentOff, 0), 100)
    : 0;

  if (!safePercent || !items.length) {
    return {
      items: items.map((item) => ({
        ...item,
        eligible: false,
        productDiscount: 0,
        giftWrapDiscount: 0,
        discountedSubtotal: roundCurrency(item.subtotal),
        discountedGiftWrapFee: roundCurrency(item.giftWrapFee),
      })),
      percentOff: safePercent,
      eligibleSubtotal: 0,
      productDiscountTotal: 0,
      giftWrapDiscountTotal: 0,
      totalDiscount: 0,
    };
  }

  const { targetProductIds, targetCategoryIds } = buildTargetLookup(targets);
  const hasTargets = targetProductIds.size > 0 || targetCategoryIds.size > 0;

  let eligibleSubtotal = 0;
  let productDiscountTotal = 0;
  let giftWrapDiscountTotal = 0;

  const discountedItems = items.map((item) => {
    const subtotal = roundCurrency(item.subtotal);
    const giftWrapFee = roundCurrency(item.giftWrapFee);
    const categoryIds = Array.isArray(item.categoryIds) ? item.categoryIds : [];

    const isEligible = hasTargets
      ? targetProductIds.has(item.productId) ||
        categoryIds.some((id) => targetCategoryIds.has(id))
      : true;

    if (!isEligible) {
      return {
        ...item,
        eligible: false,
        productDiscount: 0,
        giftWrapDiscount: 0,
        discountedSubtotal: subtotal,
        discountedGiftWrapFee: giftWrapFee,
      };
    }

    eligibleSubtotal += subtotal + giftWrapFee;
    const productDiscount = roundCurrency((subtotal * safePercent) / 100);
    const giftWrapDiscount = roundCurrency((giftWrapFee * safePercent) / 100);
    productDiscountTotal += productDiscount;
    giftWrapDiscountTotal += giftWrapDiscount;

    return {
      ...item,
      eligible: true,
      productDiscount,
      giftWrapDiscount,
      discountedSubtotal: roundCurrency(subtotal - productDiscount),
      discountedGiftWrapFee: roundCurrency(giftWrapFee - giftWrapDiscount),
    };
  });

  return {
    items: discountedItems,
    percentOff: safePercent,
    eligibleSubtotal: roundCurrency(eligibleSubtotal),
    productDiscountTotal: roundCurrency(productDiscountTotal),
    giftWrapDiscountTotal: roundCurrency(giftWrapDiscountTotal),
    totalDiscount: roundCurrency(productDiscountTotal + giftWrapDiscountTotal),
  };
};

const fetchPromoCode = async ({ adminClient, code, vendorId }) => {
  if (!adminClient || !code) return null;

  const selectFields =
    "id, code, description, percent_off, scope, vendor_id, active, start_at, end_at, min_spend, usage_limit, usage_count, per_user_limit";

  const normalizedCode = normalizePromoCode(code);
  if (!normalizedCode) return null;

  let promo = null;
  if (vendorId) {
    const { data } = await adminClient
      .from("promo_codes")
      .select(selectFields)
      .eq("scope", PROMO_SCOPES.VENDOR)
      .eq("vendor_id", vendorId)
      .ilike("code", normalizedCode)
      .maybeSingle();
    promo = data || null;
  }

  if (!promo) {
    const { data } = await adminClient
      .from("promo_codes")
      .select(selectFields)
      .eq("scope", PROMO_SCOPES.PLATFORM)
      .ilike("code", normalizedCode)
      .maybeSingle();
    promo = data || null;
  }

  return promo;
};

const fetchPromoTargets = async (adminClient, promoId) => {
  if (!promoId) return [];
  const { data } = await adminClient
    .from("promo_code_targets")
    .select("product_id, category_id")
    .eq("promo_id", promoId);
  return Array.isArray(data) ? data : [];
};

const fetchRedemptionCount = async ({
  adminClient,
  promoId,
  userId,
  guestBrowserId,
}) => {
  if (!promoId || (!userId && !guestBrowserId)) return 0;

  let query = adminClient
    .from("promo_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("promo_id", promoId);

  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("guest_browser_id", guestBrowserId);
  }

  const { count } = await query;
  return Number(count || 0);
};

const sumDiscounted = (items, field) =>
  roundCurrency(
    (items || []).reduce((sum, item) => sum + Number(item?.[field] || 0), 0)
  );

const evaluatePromoCode = async ({
  adminClient,
  code,
  vendorId,
  userId,
  guestBrowserId,
  items = [],
}) => {
  const normalized = normalizePromoCode(code);
  if (!normalized) {
    return { valid: false, error: "Enter a promo code.", promo: null };
  }

  const promo = await fetchPromoCode({ adminClient, code: normalized, vendorId });
  if (!promo) {
    return { valid: false, error: "Promo code not found.", promo: null };
  }

  const now = new Date();
  if (!isPromoActive(promo, now)) {
    return { valid: false, error: "Promo code is not active.", promo };
  }

  const targets = await fetchPromoTargets(adminClient, promo.id);
  const discount = computePromoDiscount({ promo, targets, items });

  if (!discount.totalDiscount) {
    return { valid: false, error: "Promo code does not apply to your items.", promo };
  }

  const minSpend = Number(promo.min_spend || 0);
  if (minSpend > 0 && discount.eligibleSubtotal < minSpend) {
    return { valid: false, error: "Order does not meet minimum spend.", promo };
  }

  if (
    typeof promo.usage_limit === "number" &&
    promo.usage_limit > 0 &&
    (promo.usage_count || 0) >= promo.usage_limit
  ) {
    return { valid: false, error: "Promo code usage limit reached.", promo };
  }

  if (promo.per_user_limit && (userId || guestBrowserId)) {
    const redemptionCount = await fetchRedemptionCount({
      adminClient,
      promoId: promo.id,
      userId,
      guestBrowserId,
    });
    if (redemptionCount >= promo.per_user_limit) {
      return { valid: false, error: "Promo code limit reached for this user.", promo };
    }
  }

  return {
    valid: true,
    promo,
    targets,
    discount,
    discountedSubtotal: sumDiscounted(discount.items, "discountedSubtotal"),
    discountedGiftWrapFee: sumDiscounted(
      discount.items,
      "discountedGiftWrapFee"
    ),
  };
};

export {
  PROMO_SCOPES,
  normalizePromoCode,
  roundCurrency,
  computePromoDiscount,
  evaluatePromoCode,
};
