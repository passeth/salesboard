"use server";

import { getCurrentUser } from "@/lib/auth";
import {
  createShipToOrganization,
  deleteShipToOrganization,
  updateShipToOrganization,
} from "@/lib/queries/organizations";
import { upsertDefaultConsignee } from "@/lib/queries/contacts";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ConsigneeInput = {
  consignee_name?: string;
  address?: string;
  tel?: string;
  fax?: string;
  email?: string;
};

type CreateShipToInput = {
  name: string;
  code?: string;
  country_code?: string;
} & ConsigneeInput;

type UpdateShipToInput = {
  id: string;
  name?: string;
  code?: string;
  country_code?: string;
  status?: "active" | "inactive";
} & ConsigneeInput;

export async function createShipTo(input: CreateShipToInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.orgId) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { consignee_name, address, tel, fax, email, ...orgInput } = input;
  const { data, error } = await createShipToOrganization(supabase, currentUser.orgId, orgInput);

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

  revalidatePath("/buyer/ship-to");
  revalidatePath("/buyer/order/new");
  return data;
}

export async function updateShipTo(input: UpdateShipToInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.orgId) throw new Error("Unauthorized");

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

  revalidatePath("/buyer/ship-to");
  revalidatePath("/buyer/order/new");
  return data;
}

export async function deleteShipTo(id: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.orgId) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await deleteShipToOrganization(supabase, id);

  if (error) throw new Error("Failed to delete ship-to location");

  revalidatePath("/buyer/ship-to");
  revalidatePath("/buyer/order/new");
}
