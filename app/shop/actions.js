"use server";
import { createClient } from "../utils/supabase/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export async function noopShopAction(prevState, formData) {
  await createClient();
  return { ...prevState, success: false, error: "Not implemented" };
}

const addProductSchema = z.object({
  registryId: z.string().uuid({ message: "Invalid registry" }),
  productId: z.string().uuid({ message: "Invalid product" }),
  quantity: z.coerce.number().int().min(1).max(99),
  priority: z.enum(["must-have", "nice-to-have"]),
  notes: z.string().max(500).optional(),
  color: z.string().max(100).optional(),
  size: z.string().max(100).optional(),
});

export async function addProductToRegistry(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to add items to a registry.",
      errors: {},
      values: {},
      data: {},
    };
  }

  const raw = {
    registryId: formData.get("registryId"),
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    priority: formData.get("priority"),
    notes: formData.get("notes"),
    color: formData.get("color"),
    size: formData.get("size"),
  };

  const parsed = addProductSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { registryId, productId, quantity, priority, notes, color, size } = parsed.data;

  // Verify registry belongs to user
  const { data: registry, error: registryError } = await supabase
    .from("registries")
    .select("id, title")
    .eq("id", registryId)
    .eq("registry_owner_id", user.id)
    .single();

  if (registryError || !registry) {
    return {
      message: "Registry not found or you don't have permission to modify it.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  // Check if product already exists in registry
  const { data: existing, error: existingError } = await supabase
    .from("registry_items")
    .select("id, quantity_needed, purchased_qty")
    .eq("registry_id", registryId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existingError) {
    return {
      message: "Failed to check existing items.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  if (existing) {
    return {
      message: "This product is already in your registry.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  // Verify product exists and is active
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, stock_qty, status, active")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return {
      message: "Product not found.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  if (!product.active || product.status !== "approved") {
    return {
      message: "This product is not available for registries.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  if (product.stock_qty < quantity) {
    return {
      message: `Only ${product.stock_qty} items available in stock.`,
      errors: {},
      values: raw,
      data: {},
    };
  }

  // Add to registry
  const { data: item, error: insertError } = await supabase
    .from("registry_items")
    .insert({
      registry_id: registryId,
      product_id: productId,
      quantity_needed: quantity,
      priority,
      notes: notes || null,
      color: color || null,
      size: size || null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .select()
    .single();

  if (insertError) {
    return {
      message: insertError.message || "Failed to add item to registry.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  revalidatePath("/dashboard/h");
  revalidatePath(`/dashboard/h/registry/${registry.registry_code}`);
  revalidatePath("/shop");

  return {
    message: "Gift added to your registry!",
    errors: {},
    values: {},
    data: { item },
  };
}

const removeProductSchema = z.object({
  registryItemId: z.string().uuid({ message: "Invalid item" }),
});

export async function removeProductFromRegistry(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "You must be logged in to remove items from a registry.",
      errors: {},
      values: {},
      data: {},
    };
  }

  const raw = {
    registryItemId: formData.get("registryItemId"),
  };

  const parsed = removeProductSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      message: parsed.error.issues?.[0]?.message || "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      values: raw,
      data: {},
    };
  }

  const { registryItemId } = parsed.data;

  // Verify item belongs to user's registry
  const { data: item, error: itemError } = await supabase
    .from("registry_items")
    .select(`
      id,
      registry_id,
      registry:registries!inner(
        id,
        registry_code,
        registry_owner_id
      )
    `)
    .eq("id", registryItemId)
    .eq("registry.registry_owner_id", user.id)
    .single();

  if (itemError || !item) {
    return {
      message: "Item not found or you don't have permission to remove it.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  // Check if item has purchases
  const { data: purchases, error: purchasesError } = await supabase
    .from("order_items")
    .select("id")
    .eq("registry_item_id", registryItemId)
    .limit(1);

  if (purchasesError) {
    return {
      message: "Failed to check item purchases.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  if (purchases && purchases.length > 0) {
    return {
      message: "Cannot remove item that has already been purchased.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  // Remove item
  const { error: deleteError } = await supabase
    .from("registry_items")
    .delete()
    .eq("id", registryItemId);

  if (deleteError) {
    return {
      message: deleteError.message || "Failed to remove item from registry.",
      errors: {},
      values: raw,
      data: {},
    };
  }

  revalidatePath("/dashboard/h");
  revalidatePath(`/dashboard/h/registry/${item.registry.registry_code}`);
  revalidatePath("/shop");

  return {
    message: "Item removed from your registry.",
    errors: {},
    values: {},
    data: { registryItemId },
  };
}
