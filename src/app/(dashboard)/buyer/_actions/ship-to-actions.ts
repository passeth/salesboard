"use server";

import { getCurrentUser } from "@/lib/auth";
import {
  createShipToOrganization,
  deleteShipToOrganization,
  updateShipToOrganization,
} from "@/lib/queries/organizations";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type CreateShipToInput = {
  name: string;
  code?: string;
  country_code?: string;
};

type UpdateShipToInput = {
  id: string;
  name?: string;
  code?: string;
  country_code?: string;
  status?: "active" | "inactive";
};

export async function createShipTo(input: CreateShipToInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.orgId) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data, error } = await createShipToOrganization(supabase, currentUser.orgId, input);

  if (error) throw new Error("Failed to create ship-to location");

  revalidatePath("/buyer/ship-to");
  revalidatePath("/buyer/order/new");
  return data;
}

export async function updateShipTo(input: UpdateShipToInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.orgId) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { id, ...updateData } = input;
  const { data, error } = await updateShipToOrganization(supabase, id, updateData);

  if (error) throw new Error("Failed to update ship-to location");

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
