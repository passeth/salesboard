"use server";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";

export async function toggleProductStatus(productId: string, newStatus: "active" | "inactive") {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.Admin) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ status: newStatus })
    .eq("id", productId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/catalog");
  revalidatePath("/admin/products");
  return { success: true };
}
