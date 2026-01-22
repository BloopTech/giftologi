"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";

const vendorSchema = z.object({
  business_name: z.string().min(1, "Business name is required").max(120),
  legal_name: z.string().min(1, "Legal name is required").max(120),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required").max(50),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  tax_id: z.string().min(1, "Tax ID is required").max(50),
  description: z.string().max(2000).optional().or(z.literal("")),
  address_street: z.string().min(1, "Street address is required").max(200),
  address_city: z.string().min(1, "City is required").max(120),
  address_state: z.string().min(1, "State is required").max(120),
  digital_address: z.string().min(1, "Digital address is required").max(40),
  address_country: z.string().min(1, "Country is required").max(120),
});

const paymentSchema = z.object({
  account_name: z.string().optional().or(z.literal("")),
  bank_name: z.string().optional().or(z.literal("")),
  bank_account: z.string().optional().or(z.literal("")),
  routing_number: z.string().optional().or(z.literal("")),
  account_type: z.string().optional().or(z.literal("")),
});

const notificationSchema = z.object({
  new_orders: z.boolean(),
  order_updates: z.boolean(),
  payout_alerts: z.boolean(),
  low_stock_alerts: z.boolean(),
  product_reviews: z.boolean(),
  weekly_reports: z.boolean(),
  monthly_reports: z.boolean(),
  marketing_emails: z.boolean(),
});

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  return value === "true" || value === "on" || value === "1";
};

export async function manageProfile(prevState, queryData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be logged in.",
      errors: {},
      values: {},
    };
  }

  const action = queryData.get("action");

  if (action !== "update_profile") {
    return {
      success: false,
      message: "Invalid action.",
      errors: {},
      values: {},
    };
  }

  const rawVendor = {
    business_name: queryData.get("business_name")?.trim() || "",
    legal_name: queryData.get("legal_name")?.trim() || "",
    email: queryData.get("email")?.trim() || "",
    phone: queryData.get("phone")?.trim() || "",
    website: queryData.get("website")?.trim() || "",
    tax_id: queryData.get("tax_id")?.trim() || "",
    description: queryData.get("description")?.trim() || "",
    address_street: queryData.get("address_street")?.trim() || "",
    address_city: queryData.get("address_city")?.trim() || "",
    address_state: queryData.get("address_state")?.trim() || "",
    digital_address: queryData.get("digital_address")?.trim() || "",
    address_country: queryData.get("address_country")?.trim() || "",
  };

  const rawPayment = {
    account_name: queryData.get("account_name")?.trim() || "",
    bank_name: queryData.get("bank_name")?.trim() || "",
    bank_account: queryData.get("bank_account")?.trim() || "",
    routing_number: queryData.get("routing_number")?.trim() || "",
    account_type: queryData.get("account_type")?.trim() || "",
  };

  const rawNotifications = {
    new_orders: toBoolean(queryData.get("new_orders")),
    order_updates: toBoolean(queryData.get("order_updates")),
    payout_alerts: toBoolean(queryData.get("payout_alerts")),
    low_stock_alerts: toBoolean(queryData.get("low_stock_alerts")),
    product_reviews: toBoolean(queryData.get("product_reviews")),
    weekly_reports: toBoolean(queryData.get("weekly_reports")),
    monthly_reports: toBoolean(queryData.get("monthly_reports")),
    marketing_emails: toBoolean(queryData.get("marketing_emails")),
  };

  const vendorValidation = vendorSchema.safeParse(rawVendor);
  const paymentValidation = paymentSchema.safeParse(rawPayment);
  const notificationValidation = notificationSchema.safeParse(rawNotifications);

  if (!vendorValidation.success || !paymentValidation.success || !notificationValidation.success) {
    const errors = {};

    if (!vendorValidation.success) {
      vendorValidation.error.errors.forEach((err) => {
        const field = err.path[0];
        errors[field] = err.message;
      });
    }

    if (!paymentValidation.success) {
      paymentValidation.error.errors.forEach((err) => {
        const field = err.path[0];
        errors[field] = err.message;
      });
    }

    if (!notificationValidation.success) {
      notificationValidation.error.errors.forEach((err) => {
        const field = err.path[0];
        errors[field] = err.message;
      });
    }

    return {
      success: false,
      message: "Please fix the errors below.",
      errors,
      values: { ...rawVendor, ...rawPayment },
    };
  }

  const vendorId = queryData.get("vendor_id");
  if (!vendorId) {
    return {
      success: false,
      message: "Vendor profile not found.",
      errors: {},
      values: {},
    };
  }

  const { data: existingVendor, error: existingVendorError } = await supabase
    .from("vendors")
    .select("id, verified, legal_name, tax_id")
    .eq("id", vendorId)
    .eq("profiles_id", user.id)
    .maybeSingle();

  if (existingVendorError || !existingVendor) {
    return {
      success: false,
      message: existingVendorError?.message || "Vendor profile not found.",
      errors: {},
      values: rawVendor,
    };
  }

  const vendorPayload = {
    ...vendorValidation.data,
    website: vendorValidation.data.website || null,
    description: vendorValidation.data.description || null,
    updated_at: new Date().toISOString(),
  };

  const isVerifiedVendor = !!existingVendor.verified;
  if (isVerifiedVendor) {
    vendorPayload.legal_name = existingVendor.legal_name || vendorPayload.legal_name;
    vendorPayload.tax_id = existingVendor.tax_id || vendorPayload.tax_id;
  }

  const { error: vendorError } = await supabase
    .from("vendors")
    .update(vendorPayload)
    .eq("id", vendorId)
    .eq("profiles_id", user.id);

  if (vendorError) {
    return {
      success: false,
      message: vendorError.message || "Failed to update vendor profile.",
      errors: {},
      values: rawVendor,
    };
  }

  const paymentInfoId = queryData.get("payment_info_id");
  const paymentPayload = {
    ...paymentValidation.data,
    account_name: paymentValidation.data.account_name || null,
    bank_name: paymentValidation.data.bank_name || null,
    bank_account: paymentValidation.data.bank_account || null,
    routing_number: paymentValidation.data.routing_number || null,
    account_type: paymentValidation.data.account_type || null,
  };

  if (!isVerifiedVendor) {
    if (paymentInfoId) {
      const { error: paymentError } = await supabase
        .from("payment_info")
        .update(paymentPayload)
        .eq("id", paymentInfoId)
        .eq("vendor_id", vendorId);

      if (paymentError) {
        return {
          success: false,
          message: paymentError.message || "Failed to update payment information.",
          errors: {},
          values: rawVendor,
        };
      }
    } else if (Object.values(paymentPayload).some((value) => value)) {
      const { error: paymentError } = await supabase
        .from("payment_info")
        .insert({ ...paymentPayload, vendor_id: vendorId })
        .select("id")
        .single();

      if (paymentError) {
        return {
          success: false,
          message: paymentError.message || "Failed to create payment information.",
          errors: {},
          values: rawVendor,
        };
      }
    }
  }

  const notificationPayload = {
    ...notificationValidation.data,
    vendor_id: vendorId,
    updated_at: new Date().toISOString(),
  };

  const { error: notificationError } = await supabase
    .from("vendor_notification_preferences")
    .upsert(notificationPayload, { onConflict: "vendor_id" })
    .select("id")
    .single();

  if (notificationError) {
    return {
      success: false,
      message: notificationError.message || "Failed to save notification preferences.",
      errors: {},
      values: rawVendor,
    };
  }

  revalidatePath("/dashboard/v/profile");
  revalidatePath("/dashboard/v");

  return {
    success: true,
    message: isVerifiedVendor
      ? "Profile updated. Payment details require support to change."
      : "Profile updated successfully.",
    errors: {},
    values: rawVendor,
  };
}
