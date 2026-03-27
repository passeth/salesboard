"use server";

import { createClient } from "@/lib/supabase/server";
import { createOrderSchema } from "@/lib/validations/order";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const SYSTEM_ADMIN_ID = "1ffa6f06-6798-442c-aa59-5dfbf0c0f89a";

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

type OrderItemInput = {
  product_id: string;
  requested_qty: number;
  units_per_case: number | null;
  unit_price: number | null;
};

type CreateAndSubmitOrderInput = {
  items: OrderItemInput[];
  requested_delivery_date: string | null;
  ship_to_org_id: string;
  memo: string;
  ordering_org_id: string;
};

type SaveDraftInput = CreateAndSubmitOrderInput & {
  draftId?: string;
};

async function generateOrderNo(supabase: Awaited<ReturnType<typeof createClient>>) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const { count, error } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .ilike("order_no", `ORD-${today}%`);

  if (error) throw error;

  const seq = String((count ?? 0) + 1).padStart(4, "0");
  return `ORD-${today}-${seq}`;
}

async function upsertOrderItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string,
  items: OrderItemInput[],
) {
  // Delete existing items for this order (for draft updates)
  await supabase.from("order_items").delete().eq("order_id", orderId);
  const rows = items.map((item, index) => ({
    order_id: orderId,
    line_no: index + 1,
    product_id: item.product_id,
    requested_qty: item.requested_qty,
    units_per_case: item.units_per_case,
    unit_price: item.unit_price,
    status: "pending" as const,
  }));

  const { error } = await supabase.from("order_items").insert(rows);
  if (error) throw error;
}

export async function createAndSubmitOrder(formData: CreateAndSubmitOrderInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const parsed = createOrderSchema.safeParse({
    items: formData.items,
    requested_delivery_date: formData.requested_delivery_date,
    ship_to_org_id: formData.ship_to_org_id,
    memo: formData.memo,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid order data");
  }

  const [orderNo, currencyCode] = await Promise.all([
    generateOrderNo(supabase),
    getOrgCurrency(supabase, formData.ordering_org_id),
  ]);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_no: orderNo,
      ordering_org_id: formData.ordering_org_id,
      ship_to_org_id: formData.ship_to_org_id,
      requested_by_user_id: user.id,
      sales_owner_user_id: SYSTEM_ADMIN_ID,
      status: "submitted",
      currency_code: currencyCode,
      requested_delivery_date: formData.requested_delivery_date,
      submitted_at: new Date().toISOString(),
      metadata_json: {
        ...(formData.memo ? { memo: formData.memo } : {}),
      },
    })
    .select("id")
    .single();

  if (orderError) throw orderError;

  await upsertOrderItems(supabase, order.id, formData.items);

  const { error: eventError } = await supabase.from("order_events").insert({
    order_id: order.id,
    actor_user_id: user.id,
    actor_role: "buyer",
    event_type: "submitted",
    to_status: "submitted",
    note: "Order submitted by buyer",
  });

  if (eventError) throw eventError;

  revalidatePath("/buyer/orders");
  redirect(`/buyer/orders/${order.id}`);
}

export async function saveDraft(formData: SaveDraftInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  let orderId: string = formData.draftId ?? "";

  if (formData.draftId) {
    orderId = formData.draftId;
    const { data: existing } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (!existing || existing.status !== "draft") {
      throw new Error("Order is not a draft");
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        ship_to_org_id: formData.ship_to_org_id,
        requested_delivery_date: formData.requested_delivery_date,
        metadata_json: {
          ...(formData.memo ? { memo: formData.memo } : {}),
        },
      })
      .eq("id", orderId);

    if (updateError) throw updateError;
  } else {
    const [orderNo, currencyCode] = await Promise.all([
      generateOrderNo(supabase),
      getOrgCurrency(supabase, formData.ordering_org_id),
    ]);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_no: orderNo,
        ordering_org_id: formData.ordering_org_id,
        ship_to_org_id: formData.ship_to_org_id,
        requested_by_user_id: user.id,
        sales_owner_user_id: SYSTEM_ADMIN_ID,
        status: "draft",
        currency_code: currencyCode,
        requested_delivery_date: formData.requested_delivery_date,
        metadata_json: {
          ...(formData.memo ? { memo: formData.memo } : {}),
        },
      })
      .select("id")
      .single();

    if (orderError) throw orderError;
    orderId = order.id;
  }

  await upsertOrderItems(supabase, orderId, formData.items);

  revalidatePath("/buyer/orders");
  revalidatePath(`/buyer/order/new`);
  redirect(`/buyer/order/new?draft=${orderId}`);
}

export async function submitDraft(draftId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", draftId)
    .single();

  if (!order || order.status !== "draft") {
    throw new Error("Order is not a draft");
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", draftId);

  if (updateError) throw updateError;

  const { error: eventError } = await supabase.from("order_events").insert({
    order_id: draftId,
    actor_user_id: user.id,
    actor_role: "buyer",
    event_type: "submitted",
    to_status: "submitted",
    note: "Order submitted by buyer",
  });

  if (eventError) throw eventError;

  revalidatePath("/buyer/orders");
  redirect(`/buyer/orders/${draftId}`);
}

export async function cancelOrder(orderId: string, reason?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (!order || !["draft", "submitted"].includes(order.status)) {
    throw new Error("Order cannot be cancelled");
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: "cancelled", status_reason: reason ?? null })
    .eq("id", orderId);

  if (updateError) throw updateError;

  const { error: eventError } = await supabase.from("order_events").insert({
    order_id: orderId,
    actor_user_id: user.id,
    actor_role: "buyer",
    event_type: "submitted",
    from_status: order.status,
    to_status: "cancelled",
    note: reason ?? "Order cancelled by buyer",
  });

  if (eventError) throw eventError;

  revalidatePath(`/buyer/orders/${orderId}`);
  revalidatePath("/buyer/orders");
}

export async function updateOrderShipTo(orderId: string, shipToOrgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (!order || !["draft", "submitted"].includes(order.status)) {
    throw new Error("Ship-to can only be changed for draft or submitted orders");
  }

  const { error } = await supabase
    .from("orders")
    .update({ ship_to_org_id: shipToOrgId, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) throw new Error(`Failed to update ship-to: ${error.message}`);

  revalidatePath(`/buyer/orders/${orderId}`);
  revalidatePath("/buyer/orders");
}

export type ProductOrderHistoryItem = {
  order_id: string;
  order_no: string;
  status: string;
  ordered_at: string;
  unit_price: number | null;
  requested_qty: number;
  final_qty: number | null;
};

export async function getProductOrderHistory(
  orgId: string,
  productId: string,
): Promise<ProductOrderHistoryItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_no, status, submitted_at, order_items(product_id, unit_price, requested_qty, final_qty)")
    .eq("ordering_org_id", orgId)
    .not("status", "in", '("draft","cancelled")')
    .order("submitted_at", { ascending: false });

  if (error || !data) return [];

  const result: ProductOrderHistoryItem[] = [];
  for (const order of data) {
    type ItemTuple = { product_id: string; unit_price: number | null; requested_qty: number; final_qty: number | null };
    for (const item of (order.order_items ?? []) as ItemTuple[]) {
      if (item.product_id === productId) {
        result.push({
          order_id: order.id,
          order_no: order.order_no,
          status: order.status,
          ordered_at: order.submitted_at ?? "",
          unit_price: item.unit_price,
          requested_qty: item.requested_qty,
          final_qty: item.final_qty,
        });
      }
    }
  }
  return result;
}
