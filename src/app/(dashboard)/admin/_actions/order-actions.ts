"use server";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OrderStatus, UserRole } from "@/types";
import { revalidatePath } from "next/cache";

const VALID_STATUSES = new Set(Object.values(OrderStatus));

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== UserRole.Admin) {
    throw new Error("Unauthorized");
  }

  if (!VALID_STATUSES.has(newStatus as OrderStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("orders")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/buyer/orders");
  revalidatePath("/sales/orders");
}
