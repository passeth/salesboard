"use server";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";

export async function adminAssignVendorToBuyer(
  buyerOrgId: string,
  vendorOrgId: string | null,
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("account_assignments")
    .select("id")
    .eq("buyer_org_id", buyerOrgId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("account_assignments")
      .update({ vendor_org_id: vendorOrgId, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(`Failed to update vendor assignment: ${error.message}`);
  } else {
    const { error } = await supabase
      .from("account_assignments")
      .insert({
        buyer_org_id: buyerOrgId,
        vendor_org_id: vendorOrgId,
        status: "active",
      });
    if (error) throw new Error(`Failed to create vendor assignment: ${error.message}`);
  }

  revalidatePath("/admin/organizations");
}

export async function adminBulkAssignVendor(
  buyerOrgIds: string[],
  vendorOrgId: string | null,
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) throw new Error("Unauthorized");
  if (buyerOrgIds.length === 0) throw new Error("No buyers selected");

  for (const buyerOrgId of buyerOrgIds) {
    await adminAssignVendorToBuyer(buyerOrgId, vendorOrgId);
  }

  revalidatePath("/admin/organizations");
}

export async function adminAssignSalesToBuyer(
  buyerOrgId: string,
  salesUserId: string | null,
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("account_assignments")
    .select("id")
    .eq("buyer_org_id", buyerOrgId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("account_assignments")
      .update({ sales_user_id: salesUserId, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(`Failed to update sales assignment: ${error.message}`);
  } else {
    const { error } = await supabase
      .from("account_assignments")
      .insert({
        buyer_org_id: buyerOrgId,
        sales_user_id: salesUserId,
        status: "active",
      });
    if (error) throw new Error(`Failed to create sales assignment: ${error.message}`);
  }

  revalidatePath("/admin/organizations");
}

export async function adminBulkAssignSales(
  buyerOrgIds: string[],
  salesUserId: string | null,
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) throw new Error("Unauthorized");
  if (buyerOrgIds.length === 0) throw new Error("No buyers selected");

  for (const buyerOrgId of buyerOrgIds) {
    await adminAssignSalesToBuyer(buyerOrgId, salesUserId);
  }

  revalidatePath("/admin/organizations");
}
