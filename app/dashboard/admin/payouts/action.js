"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";
import { logAdminActivityWithClient } from "../activity_log/logger";
import { dispatchNotification } from "../../../utils/notificationService";

const defaultUpdatePayoutValues = {
  vendorId: [],
};

const updatePayoutSchema = z.object({
  vendorId: z.string().uuid({ message: "Invalid vendor" }),
});

const defaultRejectPayoutValues = {
  vendorId: [],
  reason: [],
};

const rejectPayoutSchema = z.object({
  vendorId: z.string().uuid({ message: "Invalid vendor" }),
  reason: z
    .string()
    .trim()
    .min(5, { message: "Please provide a detailed reason for rejection." }),
});

export async function updateVendorPayoutApproval(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to approve payouts.",
      errors: { ...defaultUpdatePayoutValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const role = currentProfile?.role || null;
  const isFinance = role === "finance_admin";
  const isSuper = role === "super_admin";

  if (!isFinance && !isSuper) {
    return {
      message: "You are not authorized to approve payouts.",
      errors: { ...defaultUpdatePayoutValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    vendorId: formData.get("vendorId"),
  };

  const parsed = updatePayoutSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { vendorId } = parsed.data;

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(
      "id, fulfillment_status, finance_payout_approved, super_admin_payout_approved, price, quantity"
    )
    .eq("vendor_id", vendorId);

  if (itemsError) {
    return {
      message: itemsError.message,
      errors: { ...defaultUpdatePayoutValues },
      values: raw,
      data: {},
    };
  }

  const deliveredItems = Array.isArray(items)
    ? items.filter((item) => {
        const status = item?.fulfillment_status
          ? String(item.fulfillment_status).toLowerCase()
          : "";
        return status === "delivered";
      })
    : [];

  if (!deliveredItems.length) {
    return {
      message: "No delivered items found for this vendor.",
      errors: {},
      values: {},
      data: { vendorId },
    };
  }

  const eligibleIds = deliveredItems
    .filter((item) => {
      if (isFinance && item.finance_payout_approved) return false;
      if (isSuper && item.super_admin_payout_approved) return false;
      return true;
    })
    .map((item) => item.id);

  if (!eligibleIds.length) {
    return {
      message: "Payout for this vendor is already approved for your role.",
      errors: {},
      values: {},
      data: { vendorId },
    };
  }

  const updates = {};
  if (isFinance) {
    updates.finance_payout_approved = true;
  }
  if (isSuper) {
    updates.super_admin_payout_approved = true;
  }

  const { error: updateError } = await supabase
    .from("order_items")
    .update(updates)
    .in("id", eligibleIds);

  if (updateError) {
    return {
      message: updateError.message,
      errors: { ...defaultUpdatePayoutValues },
      values: raw,
      data: {},
    };
  }

  // After updating approvals, create payout records for fully approved items
  // that have not yet been linked to a vendor_payouts row.
  const { data: fullyApprovedItems, error: fullyApprovedError } =
    await supabase
      .from("order_items")
      .select(
        "id, order_id, product_id, created_at, price, quantity, vendor_payout_id, finance_payout_approved, super_admin_payout_approved, fulfillment_status"
      )
      .eq("vendor_id", vendorId)
      .eq("fulfillment_status", "delivered")
      .eq("finance_payout_approved", true)
      .eq("super_admin_payout_approved", true)
      .is("vendor_payout_id", null);

  if (!fullyApprovedError && Array.isArray(fullyApprovedItems) && fullyApprovedItems.length) {
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id, commission_rate, profiles_id, business_name")
      .eq("id", vendorId)
      .single();

    if (!vendorError && vendor) {
      let commissionRate = 0;
      if (
        typeof vendor.commission_rate !== "undefined" &&
        vendor.commission_rate !== null
      ) {
        const rateNum = Number(vendor.commission_rate);
        if (Number.isFinite(rateNum) && rateNum >= 0) {
          commissionRate = rateNum;
        }
      }
      if (commissionRate > 1) {
        commissionRate = commissionRate / 100;
      }

      // Fetch service charges for all products in approved items
      // Commission is calculated on product price ONLY, excluding service_charge
      const productIds = [...new Set(fullyApprovedItems.map((i) => i.product_id).filter(Boolean))];
      const serviceChargeMap = new Map();
      if (productIds.length) {
        const { data: products } = await supabase
          .from("products")
          .select("id, service_charge")
          .in("id", productIds);
        (products || []).forEach((p) => {
          serviceChargeMap.set(p.id, Number(p.service_charge || 0));
        });
      }

      let totalGross = 0;
      let totalCommission = 0;
      let totalNet = 0;
      const orderIdsSet = new Set();
      let fromDate = null;
      let toDate = null;

      for (const item of fullyApprovedItems) {
        const quantity = Number(item.quantity || 1);
        const price = Number(item.price || 0);
        const lineAmount = Number.isFinite(quantity * price)
          ? quantity * price
          : 0;

        // Subtract service_charge from unit price before applying commission
        const serviceCharge = serviceChargeMap.get(item.product_id) || 0;
        const commissionableAmount = Math.max(0, (price - serviceCharge) * quantity);
        const feeAmount = commissionableAmount * commissionRate;
        const vendorShare = lineAmount - feeAmount;

        totalGross += lineAmount;
        totalCommission += feeAmount;
        totalNet += vendorShare;

        if (item.order_id) {
          orderIdsSet.add(item.order_id);
        }

        if (item.created_at) {
          const createdDate = new Date(item.created_at);
          if (!Number.isNaN(createdDate.getTime())) {
            if (!fromDate || createdDate < fromDate) {
              fromDate = createdDate;
            }
            if (!toDate || createdDate > toDate) {
              toDate = createdDate;
            }
          }
        }
      }

      const orderIds = Array.from(orderIdsSet);

      const { data: insertedPayout, error: payoutError } = await supabase
        .from("vendor_payouts")
        .insert([
          {
            vendor_id: vendorId,
            status: "pending",
            order_ids: orderIds,
            total_gross_amount: totalGross,
            total_commission_amount: totalCommission,
            total_net_amount: totalNet,
            total_orders: orderIds.length,
            total_items: fullyApprovedItems.length,
            from_date: fromDate ? fromDate.toISOString() : null,
            to_date: toDate ? toDate.toISOString() : null,
          },
        ])
        .select("id")
        .single();

      if (!payoutError && insertedPayout?.id) {
        const payoutId = insertedPayout.id;
        const linkIds = fullyApprovedItems.map((item) => item.id);
        if (linkIds.length) {
          await supabase
            .from("order_items")
            .update({ vendor_payout_id: payoutId })
            .in("id", linkIds);
        }

        if (vendor?.profiles_id) {
          try {
            await dispatchNotification({
              client: supabase,
              recipientId: vendor.profiles_id,
              recipientRole: "vendor",
              eventType: "payout_status",
              message: "Your payout has been initiated.",
              link: "/dashboard/v/payouts",
              data: {
                payout_id: payoutId,
                vendor_id: vendor.id,
                status: "pending",
              },
              vendorId: vendor.id,
            });
          } catch (error) {
            console.error("Failed to notify vendor payout", error);
          }
        }
      }
    }
  }

  const actionLabel = "approved_payout";
  const detailLabel = isFinance && isSuper
    ? "Payout approvals updated."
    : isFinance
    ? "Finance approval recorded."
    : "Super Admin approval recorded.";

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: actionLabel,
    entity: "payouts",
    targetId: vendorId,
    details: `${detailLabel} (vendor: ${vendorId})`,
  });

  revalidatePath("/dashboard/admin/payouts");
  revalidatePath("/dashboard/admin");

  return {
    message: isFinance && isSuper
      ? "Payout approvals updated."
      : isFinance
      ? "Finance approval recorded."
      : "Super Admin approval recorded.",
    errors: {},
    values: {},
    data: { vendorId },
  };
}

export async function rejectVendorPayout(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to reject payouts.",
      errors: { ...defaultRejectPayoutValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const role = currentProfile?.role || null;
  const isFinance = role === "finance_admin";
  const isSuper = role === "super_admin";

  if (!isFinance && !isSuper) {
    return {
      message: "You are not authorized to reject payouts.",
      errors: { ...defaultRejectPayoutValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    vendorId: formData.get("vendorId"),
    reason: formData.get("reason"),
  };

  const parsed = rejectPayoutSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message:
        parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { vendorId, reason } = parsed.data;

  const { error: insertError } = await supabase
    .from("vendor_payouts")
    .insert([
      {
        vendor_id: vendorId,
        status: "rejected",
        order_ids: [],
        total_gross_amount: 0,
        total_commission_amount: 0,
        total_net_amount: 0,
        total_orders: 0,
        total_items: 0,
        from_date: null,
        to_date: null,
        notes: reason,
      },
    ]);

  if (insertError) {
    return {
      message: insertError.message,
      errors: { ...defaultRejectPayoutValues },
      values: raw,
      data: {},
    };
  }

  try {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id, profiles_id")
      .eq("id", vendorId)
      .maybeSingle();

    if (vendor?.profiles_id) {
      await dispatchNotification({
        client: supabase,
        recipientId: vendor.profiles_id,
        recipientRole: "vendor",
        eventType: "payout_status",
        message: "Your payout request was rejected.",
        link: "/dashboard/v/payouts",
        data: {
          vendor_id: vendor.id,
          status: "rejected",
          reason,
        },
        vendorId: vendor.id,
      });
    }
  } catch (error) {
    console.error("Failed to notify vendor payout rejection", error);
  }

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "rejected_payout",
    entity: "payouts",
    targetId: vendorId,
    details: `Rejected payout for vendor ${vendorId}`,
  });

  revalidatePath("/dashboard/admin/payouts");
  revalidatePath("/dashboard/admin");

  return {
    message: "Payout rejected.",
    errors: {},
    values: {},
    data: { vendorId },
  };
}
