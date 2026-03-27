import type { ContactRow } from "@/types";
import { SupabaseClient } from "@supabase/supabase-js";

export async function getContactsByOrgId(supabase: SupabaseClient, orgId: string) {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active")
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  return { data: (data ?? []) as ContactRow[], error };
}

export async function getDefaultConsigneeContact(supabase: SupabaseClient, orgId: string) {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("org_id", orgId)
    .eq("contact_type", "consignee")
    .eq("is_default", true)
    .maybeSingle();

  return { data: (data ?? null) as ContactRow | null, error };
}

export async function getShipToWithContacts(
  supabase: SupabaseClient,
  parentOrgId: string,
) {
  const { data: shipTos, error: shipToError } = await supabase
    .from("organizations")
    .select("*")
    .eq("parent_org_id", parentOrgId)
    .eq("org_type", "buyer_ship_to")
    .order("name", { ascending: true });

  if (shipToError || !shipTos?.length) {
    return { data: [], error: shipToError };
  }

  const shipToIds = shipTos.map((s) => s.id);
  const { data: contacts, error: contactError } = await supabase
    .from("contacts")
    .select("*")
    .in("org_id", shipToIds)
    .eq("contact_type", "consignee")
    .eq("is_default", true);

  if (contactError) {
    return { data: [], error: contactError };
  }

  const contactMap = new Map((contacts ?? []).map((c) => [c.org_id, c]));

  const result = shipTos.map((shipTo) => ({
    ...shipTo,
    consignee_contact: (contactMap.get(shipTo.id) as ContactRow) ?? null,
  }));

  return { data: result, error: null };
}

export async function getAllShipToWithContacts(supabase: SupabaseClient) {
  const { data: shipTos, error: shipToError } = await supabase
    .from("organizations")
    .select("*, parent:organizations!parent_org_id(id, name, code, org_type)")
    .eq("org_type", "buyer_ship_to")
    .order("name", { ascending: true });

  if (shipToError || !shipTos?.length) {
    return { data: [], error: shipToError };
  }

  const shipToIds = shipTos.map((s) => s.id);
  const { data: contacts, error: contactError } = await supabase
    .from("contacts")
    .select("*")
    .in("org_id", shipToIds)
    .eq("contact_type", "consignee")
    .eq("is_default", true);

  if (contactError) {
    return { data: [], error: contactError };
  }

  const contactMap = new Map((contacts ?? []).map((c) => [c.org_id, c]));

  const result = shipTos.map((shipTo) => ({
    ...shipTo,
    consignee_contact: (contactMap.get(shipTo.id) as ContactRow) ?? null,
  }));

  return { data: result, error: null };
}

type CreateContactInput = {
  org_id: string;
  contact_type: ContactRow["contact_type"];
  name: string;
  address?: string;
  tel?: string;
  fax?: string;
  email?: string;
  is_default?: boolean;
};

export async function createContact(supabase: SupabaseClient, input: CreateContactInput) {
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      org_id: input.org_id,
      contact_type: input.contact_type,
      name: input.name,
      address: input.address ?? null,
      tel: input.tel ?? null,
      fax: input.fax ?? null,
      email: input.email ?? null,
      is_default: input.is_default ?? false,
      status: "active",
    })
    .select("*")
    .single();

  return { data: (data ?? null) as ContactRow | null, error };
}

type UpdateContactInput = {
  name?: string;
  address?: string;
  tel?: string;
  fax?: string;
  email?: string;
  is_default?: boolean;
  status?: "active" | "inactive";
};

export async function updateContact(
  supabase: SupabaseClient,
  id: string,
  input: UpdateContactInput,
) {
  const { data, error } = await supabase
    .from("contacts")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  return { data: (data ?? null) as ContactRow | null, error };
}

export async function deleteContact(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  return { error };
}

export async function upsertDefaultConsignee(
  supabase: SupabaseClient,
  orgId: string,
  input: { name: string; address?: string; tel?: string; fax?: string; email?: string },
) {
  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("org_id", orgId)
    .eq("contact_type", "consignee")
    .eq("is_default", true)
    .maybeSingle();

  if (existing) {
    return updateContact(supabase, existing.id, input);
  }

  return createContact(supabase, {
    org_id: orgId,
    contact_type: "consignee",
    is_default: true,
    ...input,
  });
}
