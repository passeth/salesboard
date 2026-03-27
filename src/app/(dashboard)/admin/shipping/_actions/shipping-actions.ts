"use server";

import { getCurrentUser } from "@/lib/auth";
import { upsertDefaultConsignee } from "@/lib/queries/contacts";
import {
  createShipToOrganization,
  updateShipToOrganization,
  deleteShipToOrganization,
} from "@/lib/queries/organizations";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";

type AdminCreateShipToInput = {
  parent_org_id: string;
  name: string;
  code?: string;
  country_code?: string;
  consignee_name?: string;
  address?: string;
  tel?: string;
  fax?: string;
  email?: string;
};

type AdminUpdateShipToInput = {
  id: string;
  name?: string;
  code?: string;
  country_code?: string;
  status?: "active" | "inactive";
  consignee_name?: string;
  address?: string;
  tel?: string;
  fax?: string;
  email?: string;
};

export async function adminCreateShipTo(input: AdminCreateShipToInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { parent_org_id, consignee_name, address, tel, fax, email, ...orgInput } = input;
  const { data, error } = await createShipToOrganization(supabase, parent_org_id, orgInput);

  if (error || !data) throw new Error("Failed to create ship-to location");

  if (consignee_name?.trim()) {
    await upsertDefaultConsignee(supabase, data.id, {
      name: consignee_name.trim(),
      address: address?.trim() || undefined,
      tel: tel?.trim() || undefined,
      fax: fax?.trim() || undefined,
      email: email?.trim() || undefined,
    });
  }

  revalidatePath("/admin/shipping");
  return data;
}

export async function adminUpdateShipTo(input: AdminUpdateShipToInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { id, consignee_name, address, tel, fax, email, ...updateData } = input;
  const { data, error } = await updateShipToOrganization(supabase, id, updateData);

  if (error) throw new Error("Failed to update ship-to location");

  if (consignee_name !== undefined) {
    if (consignee_name.trim()) {
      await upsertDefaultConsignee(supabase, id, {
        name: consignee_name.trim(),
        address: address?.trim() || undefined,
        tel: tel?.trim() || undefined,
        fax: fax?.trim() || undefined,
        email: email?.trim() || undefined,
      });
    }
  }

  revalidatePath("/admin/shipping");
  return data;
}

export async function adminDeleteShipTo(id: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await deleteShipToOrganization(supabase, id);

  if (error) throw new Error("Failed to delete ship-to location");

  revalidatePath("/admin/shipping");
}

export async function adminAssignShipToBuyer(shipToIds: string[], buyerOrgId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) throw new Error("Unauthorized");

  if (!shipToIds.length || !buyerOrgId) throw new Error("Invalid input");

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ parent_org_id: buyerOrgId })
    .in("id", shipToIds)
    .eq("org_type", "buyer_ship_to");

  if (error) throw new Error(`Failed to assign ship-to locations: ${error.message}`);

  revalidatePath("/admin/shipping");
}
