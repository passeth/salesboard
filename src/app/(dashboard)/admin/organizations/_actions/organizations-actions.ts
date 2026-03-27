"use server";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OrgType, UserRole } from "@/types";
import { revalidatePath } from "next/cache";

export async function adminBulkUpdateOrgType(ids: string[], orgType: OrgType) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) throw new Error("Unauthorized");
  if (ids.length === 0) throw new Error("No organizations selected");

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ org_type: orgType })
    .in("id", ids);

  if (error) throw new Error("Failed to update organization types");

  revalidatePath("/admin/organizations");
}

export async function adminChangeParent(ids: string[], newParentId: string | null) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) throw new Error("Unauthorized");
  if (ids.length === 0) throw new Error("No organizations selected");

  const supabase = await createClient();
  const orgType: OrgType = newParentId ? "buyer" : "buyer_company";
  const { error } = await supabase
    .from("organizations")
    .update({ parent_org_id: newParentId, org_type: orgType })
    .in("id", ids);

  if (error) throw new Error("Failed to change parent organization");

  revalidatePath("/admin/organizations");
  revalidatePath("/admin/shipping");
}

export type MergeResult = {
  ship_tos_moved: number;
  orders_moved: number;
  contacts_moved: number;
  users_moved: number;
  assignments_moved: number;
  prices_moved: number;
  supplied_moved: number;
  inquiries_moved: number;
  sources_deactivated: number;
};

export async function adminMergeBuyers(targetId: string, sourceIds: string[]): Promise<MergeResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) throw new Error("Unauthorized");
  if (!targetId || sourceIds.length === 0) throw new Error("Invalid input");
  if (sourceIds.includes(targetId)) throw new Error("Target cannot be in source list");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("merge_buyer_companies", {
    p_target_id: targetId,
    p_source_ids: sourceIds,
  });

  if (error) throw new Error(`Failed to merge buyers: ${error.message}`);

  revalidatePath("/admin/organizations");
  revalidatePath("/admin/shipping");

  return data as MergeResult;
}
