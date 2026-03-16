import { OrganizationRow } from "@/types";
import { SupabaseClient } from "@supabase/supabase-js";

export async function getBuyerOrganizations(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, code, org_type")
    .eq("org_type", "buyer_company")
    .eq("status", "active")
    .order("name", { ascending: true });

  return {
    data: (data ?? []) as Pick<OrganizationRow, "id" | "name" | "code" | "org_type">[],
    error,
  };
}

export async function getShipToOrganizations(supabase: SupabaseClient, parentOrgId: string) {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("parent_org_id", parentOrgId)
    .eq("org_type", "buyer_ship_to")
    .order("name", { ascending: true });

  return {
    data: (data ?? []) as OrganizationRow[],
    error,
  };
}

export async function getUserOrganization(supabase: SupabaseClient, orgId: string) {
  const { data, error } = await supabase.from("organizations").select("*").eq("id", orgId).single();

  return {
    data: (data ?? null) as OrganizationRow | null,
    error,
  };
}

export async function createShipToOrganization(
  supabase: SupabaseClient,
  parentOrgId: string,
  input: { name: string; code?: string; country_code?: string },
) {
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      parent_org_id: parentOrgId,
      org_type: "buyer_ship_to" as const,
      name: input.name,
      code: input.code ?? null,
      country_code: input.country_code ?? null,
      status: "active" as const,
      metadata_json: {},
    })
    .select("*")
    .single();

  return { data: (data ?? null) as OrganizationRow | null, error };
}

export async function updateShipToOrganization(
  supabase: SupabaseClient,
  id: string,
  input: { name?: string; code?: string; country_code?: string; status?: "active" | "inactive" },
) {
  const { data, error } = await supabase
    .from("organizations")
    .update(input)
    .eq("id", id)
    .eq("org_type", "buyer_ship_to")
    .select("*")
    .single();

  return { data: (data ?? null) as OrganizationRow | null, error };
}

export async function deleteShipToOrganization(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", id)
    .eq("org_type", "buyer_ship_to");

  return { error };
}
