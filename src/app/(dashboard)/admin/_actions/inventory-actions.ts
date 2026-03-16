"use server";

import { getCurrentUser } from "@/lib/auth";
import { getProductLotDetails } from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";

export async function fetchProductLots(productId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== UserRole.Admin) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();
  return getProductLotDetails(supabase, productId);
}

export type SyncResult = {
  success: boolean;
  count?: number;
  fetchedCount?: number;
  warehouseCounts?: Record<string, number>;
  syncedAt?: string;
  error?: string;
};

export async function syncEcountInventory(): Promise<SyncResult> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== UserRole.Admin) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.functions.invoke("sync-ecount-inventory");

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/inventory");

  return data as SyncResult;
}
