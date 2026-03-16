"use server";

import { createClient } from "@/lib/supabase/server";
import { createOrderSchema } from "@/lib/validations/order";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const SYSTEM_ADMIN_ID = "1ffa6f06-6798-442c-aa59-5dfbf0c0f89a";

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

  const orderNo = await generateOrderNo(supabase);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_no: orderNo,
      ordering_org_id: formData.ordering_org_id,
      ship_to_org_id: formData.ship_to_org_id,
      requested_by_user_id: user.id,
      sales_owner_user_id: SYSTEM_ADMIN_ID,
      status: "submitted",
      currency_code: "KRW",
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
    const orderNo = await generateOrderNo(supabase);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_no: orderNo,
        ordering_org_id: formData.ordering_org_id,
        ship_to_org_id: formData.ship_to_org_id,
        requested_by_user_id: user.id,
        sales_owner_user_id: SYSTEM_ADMIN_ID,
        status: "draft",
        currency_code: "KRW",
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
