"use server";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";

const EDITABLE_PRODUCT_FIELDS = new Set([
  "units_per_case",
  "cbm",
  "case_length",
  "case_width",
  "case_height",
  "barcode",
  "status",
  "net_weight",
  "gross_weight",
]);

export async function updateProductField(
  productId: string,
  field: string,
  value: string | number | null,
) {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.Admin) {
    return { error: "Unauthorized" };
  }

  if (!EDITABLE_PRODUCT_FIELDS.has(field)) {
    return { error: "Invalid field" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ [field]: value })
    .eq("id", productId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/catalog");
  return { success: true };
}

export async function bulkUpdateProductCategory(
  productIds: string[],
  category: string,
) {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.Admin) {
    return { error: "Unauthorized" };
  }

  if (productIds.length === 0) {
    return { error: "No products selected" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ category })
    .in("id", productIds);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/catalog");
  return { success: true };
}

export async function bulkUpdateProductBrand(
  productIds: string[],
  brand: string,
) {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.Admin) {
    return { error: "Unauthorized" };
  }

  if (productIds.length === 0) {
    return { error: "No products selected" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ brand })
    .in("id", productIds);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/catalog");
  return { success: true };
}

export async function bulkUpdateProductStatus(
  productIds: string[],
  status: "active" | "inactive",
) {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.Admin) {
    return { error: "Unauthorized" };
  }

  if (productIds.length === 0) {
    return { error: "No products selected" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ status })
    .in("id", productIds);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/catalog");
  return { success: true };
}
