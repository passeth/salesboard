"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const SYSTEM_ADMIN_ID = "1ffa6f06-6798-442c-aa59-5dfbf0c0f89a";

type CartItem = {
  product_id: string;
  requested_qty: number;
  units_per_case: number | null;
  unit_price: number | null;
};

async function getOrgCurrency(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
): Promise<string> {
  const { data } = await supabase
    .from("organizations")
    .select("currency_code")
    .eq("id", orgId)
    .single();
  return data?.currency_code ?? "USD";
}

async function getOrCreateDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  userId: string,
) {
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("ordering_org_id", orgId)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const [currencyCode, orderNo] = await Promise.all([
    getOrgCurrency(supabase, orgId),
    (async () => {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .ilike("order_no", `ORD-${today}%`);
      const seq = String((count ?? 0) + 1).padStart(4, "0");
      return `ORD-${today}-${seq}`;
    })(),
  ]);

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      order_no: orderNo,
      ordering_org_id: orgId,
      ship_to_org_id: orgId,
      requested_by_user_id: userId,
      sales_owner_user_id: SYSTEM_ADMIN_ID,
      status: "draft",
      currency_code: currencyCode,
      metadata_json: {},
    })
    .select("id")
    .single();

  if (error) throw error;
  return order.id;
}

export async function addToCart(orgId: string, items: CartItem[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const draftId = await getOrCreateDraft(supabase, orgId, user.id);

  const { data: existingItems } = await supabase
    .from("order_items")
    .select("id, product_id, requested_qty, line_no")
    .eq("order_id", draftId);

  const existingMap = new Map(
    (existingItems ?? []).map((item) => [item.product_id, item]),
  );

  let maxLineNo = (existingItems ?? []).reduce(
    (max, item) => Math.max(max, item.line_no),
    0,
  );

  const toUpdate: Array<{ id: string; requested_qty: number }> = [];
  const toInsert: Array<{
    order_id: string;
    line_no: number;
    product_id: string;
    requested_qty: number;
    units_per_case: number | null;
    unit_price: number | null;
    status: "pending";
  }> = [];

  for (const item of items) {
    const existing = existingMap.get(item.product_id);
    if (existing) {
      toUpdate.push({
        id: existing.id,
        requested_qty: existing.requested_qty + item.requested_qty,
      });
    } else {
      maxLineNo += 1;
      toInsert.push({
        order_id: draftId,
        line_no: maxLineNo,
        product_id: item.product_id,
        requested_qty: item.requested_qty,
        units_per_case: item.units_per_case,
        unit_price: item.unit_price,
        status: "pending",
      });
    }
  }

  for (const row of toUpdate) {
    const { error } = await supabase
      .from("order_items")
      .update({ requested_qty: row.requested_qty })
      .eq("id", row.id);
    if (error) throw error;
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("order_items").insert(toInsert);
    if (error) throw error;
  }

  revalidatePath("/buyer/products");
  revalidatePath("/buyer/order/new");

  return { draftId, added: items.length };
}

export async function updateCartItemQty(
  orderId: string,
  productId: string,
  qty: number,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (!order || order.status !== "draft") {
    throw new Error("Order is not a draft");
  }

  if (qty <= 0) {
    const { error } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", orderId)
      .eq("product_id", productId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("order_items")
      .update({ requested_qty: qty })
      .eq("order_id", orderId)
      .eq("product_id", productId);
    if (error) throw error;
  }

  revalidatePath("/buyer/products");
  revalidatePath("/buyer/order/new");
}

export async function removeCartItem(orderId: string, productId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (!order || order.status !== "draft") {
    throw new Error("Order is not a draft");
  }

  const { error } = await supabase
    .from("order_items")
    .delete()
    .eq("order_id", orderId)
    .eq("product_id", productId);

  if (error) throw error;

  revalidatePath("/buyer/products");
  revalidatePath("/buyer/order/new");
}

export async function setCartItemQty(
  orgId: string,
  productId: string,
  qty: number,
  unitsPerCase: number | null,
  unitPrice: number | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const draftId = await getOrCreateDraft(supabase, orgId, user.id);

  const { data: existingItem } = await supabase
    .from("order_items")
    .select("id, line_no")
    .eq("order_id", draftId)
    .eq("product_id", productId)
    .maybeSingle();

  if (qty <= 0) {
    if (existingItem) {
      const { error } = await supabase
        .from("order_items")
        .delete()
        .eq("id", existingItem.id);
      if (error) throw error;
    }
  } else if (existingItem) {
    const { error } = await supabase
      .from("order_items")
      .update({ requested_qty: qty })
      .eq("id", existingItem.id);
    if (error) throw error;
  } else {
    const { data: maxRow } = await supabase
      .from("order_items")
      .select("line_no")
      .eq("order_id", draftId)
      .order("line_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("order_items").insert({
      order_id: draftId,
      line_no: (maxRow?.line_no ?? 0) + 1,
      product_id: productId,
      requested_qty: qty,
      units_per_case: unitsPerCase,
      unit_price: unitPrice,
      status: "pending" as const,
    });
    if (error) throw error;
  }

  revalidatePath("/buyer/products");
  revalidatePath("/buyer/order/new");
}

export async function clearCart(orderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (!order || order.status !== "draft") {
    throw new Error("Order is not a draft");
  }

  await supabase.from("order_items").delete().eq("order_id", orderId);
  await supabase.from("orders").delete().eq("id", orderId);

  revalidatePath("/buyer/products");
  revalidatePath("/buyer/order/new");
}
