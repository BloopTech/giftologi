"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";
import { logAdminActivityWithClient } from "../activity_log/logger";

const defaultApproveProductValues = {
  productId: [],
};

const approveProductSchema = z.object({
  productId: z.string().uuid({ message: "Invalid product" }),
});

export async function approveProduct(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to approve products.",
      errors: { ...defaultApproveProductValues },
      values: {},
      data: {},
    };
  }
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const allowedRoles = ["super_admin", "operations_manager_admin"];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to approve products.",
      errors: { ...defaultApproveProductValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    productId: formData.get("productId"),
  };

  const parsed = approveProductSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { productId } = parsed.data;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, status")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return {
      message: productError?.message || "Product not found.",
      errors: { ...defaultApproveProductValues },
      values: raw,
      data: {},
    };
  }

  if (product.status && product.status !== "pending") {
    return {
      message: "This product has already been processed.",
      errors: {},
      values: {},
      data: { productId },
    };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({
      status: "approved",
      active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateError) {
    return {
      message: updateError.message,
      errors: { ...defaultApproveProductValues },
      values: raw,
      data: {},
    };
  }

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/admin");

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "approved_product",
    entity: "products",
    targetId: productId,
    details: `Approved product ${productId}`,
  });

  return {
    message: "Product approved.",
    errors: {},
    values: {},
    data: { productId },
  };
}

const defaultRejectProductValues = {
  productId: [],
};

const rejectProductSchema = z.object({
  productId: z.string().uuid({ message: "Invalid product" }),
});

export async function rejectProduct(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to reject products.",
      errors: { ...defaultRejectProductValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const allowedRoles = ["super_admin", "operations_manager_admin"];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to reject products.",
      errors: { ...defaultRejectProductValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    productId: formData.get("productId"),
  };

  const parsed = rejectProductSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { productId } = parsed.data;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, status")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return {
      message: productError?.message || "Product not found.",
      errors: { ...defaultRejectProductValues },
      values: raw,
      data: {},
    };
  }

  if (product.status && product.status !== "pending") {
    return {
      message: "This product has already been processed.",
      errors: {},
      values: {},
      data: { productId },
    };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({
      status: "rejected",
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateError) {
    return {
      message: updateError.message,
      errors: { ...defaultRejectProductValues },
      values: raw,
      data: {},
    };
  }

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/admin");

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "rejected_product",
    entity: "products",
    targetId: productId,
    details: `Rejected product ${productId}`,
  });

  return {
    message: "Product rejected.",
    errors: {},
    values: {},
    data: { productId },
  };
}

const defaultFlagProductValues = {
  productId: [],
  reason: [],
};

const flagProductSchema = z.object({
  productId: z.string().uuid({ message: "Invalid product" }),
  reason: z.string().trim().optional().or(z.literal("")),
});

export async function flagProduct(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to flag products.",
      errors: { ...defaultFlagProductValues },
      values: {},
      data: {},
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const allowedRoles = ["super_admin", "operations_manager_admin"];

  if (!currentProfile || !allowedRoles.includes(currentProfile.role)) {
    return {
      message: "You are not authorized to flag products.",
      errors: { ...defaultFlagProductValues },
      values: {},
      data: {},
    };
  }

  const raw = {
    productId: formData.get("productId"),
    reason: formData.get("reason") || "",
  };

  const parsed = flagProductSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { productId, reason } = parsed.data;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, vendor_id, status")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return {
      message: productError?.message || "Product not found.",
      errors: { ...defaultFlagProductValues },
      values: raw,
      data: {},
    };
  }

  const descriptionParts = [];
  if (reason && reason.trim()) {
    descriptionParts.push(reason.trim());
  }
  descriptionParts.push(`Product ID: ${productId}`);
  if (product.name) {
    descriptionParts.push(`Name: ${product.name}`);
  }

  const description = descriptionParts.join("\n");

  const { error: ticketError } = await supabase.from("support_tickets").insert([
    {
      registry_id: null,
      subject: "Flagged product",
      description: description || "Flagged product",
      status: "escalated",
      created_by: currentProfile?.id || user.id,
    },
  ]);

  if (ticketError) {
    return {
      message: ticketError.message,
      errors: { ...defaultFlagProductValues },
      values: raw,
      data: {},
    };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({
      status: "flagged",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateError) {
    return {
      message: updateError.message,
      errors: { ...defaultFlagProductValues },
      values: raw,
      data: {},
    };
  }

  revalidatePath("/dashboard/admin/products");
  revalidatePath("/dashboard/admin");

  await logAdminActivityWithClient(supabase, {
    adminId: currentProfile?.id || user.id,
    adminRole: currentProfile?.role || null,
    adminEmail: user.email || null,
    adminName: null,
    action: "flagged_product",
    entity: "products",
    targetId: productId,
    details: `Flagged product ${productId}${reason ? `: ${reason}` : ""}`,
  });

  return {
    message: "Product flagged successfully.",
    errors: {},
    values: {},
    data: { productId },
  };
}
