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

  const makeIneligible = (itemsList) => ({
    items: itemsList.map((item) => ({
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
  });

  if (!safePercent || !items.length) {
    return makeIneligible(items);
  }

  const { targetProductIds, targetCategoryIds } = buildTargetLookup(targets);
  const hasProductOrCategoryTargets = targetProductIds.size > 0 || targetCategoryIds.size > 0;

  const targetShippable = promo?.target_shippable || "any";
  const targetProductType = promo?.target_product_type || "any";
  const promoVendorId = promo?.vendor_id || null;
  const isVendorPromo = promo?.scope === PROMO_SCOPES.VENDOR && !!promoVendorId;

  let eligibleSubtotal = 0;
  let productDiscountTotal = 0;
  let giftWrapDiscountTotal = 0;

  const discountedItems = items.map((item) => {
    const subtotal = roundCurrency(item.subtotal);
    const giftWrapFee = roundCurrency(item.giftWrapFee);
    const categoryIds = Array.isArray(item.categoryIds) ? item.categoryIds : [];

    // --- Vendor scope check ---
    if (isVendorPromo && item.vendorId && item.vendorId !== promoVendorId) {
      return {
        ...item, eligible: false, productDiscount: 0, giftWrapDiscount: 0,
        discountedSubtotal: subtotal, discountedGiftWrapFee: giftWrapFee,
      };
    }

    // --- Shippability filter ---
    if (targetShippable === "shippable" && item.isShippable === false) {
      return {
        ...item, eligible: false, productDiscount: 0, giftWrapDiscount: 0,
        discountedSubtotal: subtotal, discountedGiftWrapFee: giftWrapFee,
      };
    }
    if (targetShippable === "non_shippable" && item.isShippable !== false) {
      return {
        ...item, eligible: false, productDiscount: 0, giftWrapDiscount: 0,
        discountedSubtotal: subtotal, discountedGiftWrapFee: giftWrapFee,
      };
    }

    // --- Product type filter ---
    if (targetProductType !== "any" && item.productType && item.productType !== targetProductType) {
      return {
        ...item, eligible: false, productDiscount: 0, giftWrapDiscount: 0,
        discountedSubtotal: subtotal, discountedGiftWrapFee: giftWrapFee,
      };
    }

    // --- Product / Category target check ---
    if (hasProductOrCategoryTargets) {
      const matchesProduct = targetProductIds.has(item.productId);
      const matchesCategory = categoryIds.some((id) => targetCategoryIds.has(id));
      if (!matchesProduct && !matchesCategory) {
        return {
          ...item, eligible: false, productDiscount: 0, giftWrapDiscount: 0,
          discountedSubtotal: subtotal, discountedGiftWrapFee: giftWrapFee,
        };
      }
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
    "id, code, description, percent_off, scope, vendor_id, active, start_at, end_at, min_spend, usage_limit, usage_count, per_user_limit, target_shippable, target_product_type";

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
  deviceFingerprint,
}) => {
  if (!promoId || (!userId && !guestBrowserId && !deviceFingerprint)) return 0;

  // Check by user_id
  let userCount = 0;
  if (userId) {
    const { count } = await adminClient
      .from("promo_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("promo_id", promoId)
      .eq("user_id", userId);
    userCount = Number(count || 0);
  }

  // Check by guest_browser_id (separate query to catch guests who later signed up)
  let guestCount = 0;
  if (guestBrowserId) {
    const { count } = await adminClient
      .from("promo_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("promo_id", promoId)
      .eq("guest_browser_id", guestBrowserId);
    guestCount = Number(count || 0);
  }

  // Check by device fingerprint (catches incognito / cleared storage)
  let fpCount = 0;
  if (deviceFingerprint) {
    const { count } = await adminClient
      .from("promo_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("promo_id", promoId)
      .eq("device_fingerprint", deviceFingerprint);
    fpCount = Number(count || 0);
  }

  return Math.max(userCount, guestCount, fpCount);
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
  deviceFingerprint,
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

  const perUserLimit = Number(promo.per_user_limit || 0);
  if (perUserLimit > 0) {
    if (!userId && !guestBrowserId && !deviceFingerprint) {
      return { valid: false, error: "Cannot verify promo usage — please sign in or try again.", promo };
    }
    const redemptionCount = await fetchRedemptionCount({
      adminClient,
      promoId: promo.id,
      userId,
      guestBrowserId,
      deviceFingerprint,
    });
    if (redemptionCount >= perUserLimit) {
      return {
        valid: false,
        error: perUserLimit === 1
          ? "You have already used this promo code."
          : `Promo code limit reached (${perUserLimit} uses per user).`,
        promo,
      };
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
