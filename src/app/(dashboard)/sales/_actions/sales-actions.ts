"use server";

import { createClient } from "@/lib/supabase/server";
import { OrderItemRow, UserRole } from "@/types";
import { revalidatePath } from "next/cache";

export type SalesConfirmItemInput = {
  id: string;
  sales_confirmed_qty: number;
  allocation_type: "stock" | "production" | "mixed";
  decision_note: string | null;
};

async function validateSalesUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: userRecord, error: userError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (userError) {
    throw userError;
  }

  if (!userRecord || userRecord.role !== UserRole.Sales) {
    throw new Error("Unauthorized");
  }

  return { supabase, userId: user.id };
}

async function ensureOrderOwnership(supabase: Awaited<ReturnType<typeof createClient>>, orderId: string, userId: string) {
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .eq("sales_owner_user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!order) {
    throw new Error("Order not found");
  }

  return order;
}

export async function salesConfirmOrder(orderId: string, items: SalesConfirmItemInput[]) {
  const { supabase, userId } = await validateSalesUser();
  const order = await ensureOrderOwnership(supabase, orderId, userId);

  const itemIds = items.map((item) => item.id);

  const { data: existingItems, error: existingItemsError } = await supabase
    .from("order_items")
    .select("id")
    .eq("order_id", orderId)
    .in("id", itemIds);

  if (existingItemsError) {
    throw existingItemsError;
  }

  if ((existingItems ?? []).length !== items.length) {
    throw new Error("Some order items are invalid");
  }

  for (const item of items) {
    const { error: itemError } = await supabase
      .from("order_items")
      .update({
        sales_confirmed_qty: item.sales_confirmed_qty,
        allocation_type: item.allocation_type,
        decision_note: item.decision_note,
        status: "confirmed",
      })
      .eq("id", item.id)
      .eq("order_id", orderId);

    if (itemError) {
      throw itemError;
    }
  }

  const { error: orderError } = await supabase
    .from("orders")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("sales_owner_user_id", userId);

  if (orderError) {
    throw orderError;
  }

  const { error: eventError } = await supabase.from("order_events").insert({
    order_id: orderId,
    actor_user_id: userId,
    actor_role: "sales",
    event_type: "sales_approved",
    from_status: order.status,
    to_status: "confirmed",
    note: "Order confirmed by sales",
  });

  if (eventError) {
    throw eventError;
  }

  revalidatePath("/sales");
  revalidatePath("/sales/orders");
  revalidatePath(`/sales/orders/${orderId}`);
}

export async function salesRequestBuyerDecision(
  orderId: string,
  items: SalesConfirmItemInput[],
  note: string | null,
) {
  const { supabase, userId } = await validateSalesUser();
  const order = await ensureOrderOwnership(supabase, orderId, userId);

  const itemIds = items.map((item) => item.id);
  const { data: existingItems, error: existingItemsError } = await supabase
    .from("order_items")
    .select("id, requested_qty")
    .eq("order_id", orderId)
    .in("id", itemIds);

  if (existingItemsError) {
    throw existingItemsError;
  }

  if ((existingItems ?? []).length !== items.length) {
    throw new Error("Some order items are invalid");
  }

  const requestedQtyById = new Map<string, number>();
  (existingItems as Pick<OrderItemRow, "id" | "requested_qty">[]).forEach((item) => {
    requestedQtyById.set(item.id, item.requested_qty);
  });

  for (const item of items) {
    const requestedQty = requestedQtyById.get(item.id);

    if (requestedQty === undefined) {
      continue;
    }

    const nextStatus = item.sales_confirmed_qty === requestedQty ? "confirmed" : "partial";

    const { error: itemError } = await supabase
      .from("order_items")
      .update({
        sales_confirmed_qty: item.sales_confirmed_qty,
        allocation_type: item.allocation_type,
        decision_note: item.decision_note,
        status: nextStatus,
      })
      .eq("id", item.id)
      .eq("order_id", orderId);

    if (itemError) {
      throw itemError;
    }
  }

  const { error: orderError } = await supabase
    .from("orders")
    .update({
      status: "needs_buyer_decision",
      status_reason: note,
    })
    .eq("id", orderId)
    .eq("sales_owner_user_id", userId);

  if (orderError) {
    throw orderError;
  }

  const { error: eventError } = await supabase.from("order_events").insert({
    order_id: orderId,
    actor_user_id: userId,
    actor_role: "sales",
    event_type: "buyer_decision_requested",
    from_status: order.status,
    to_status: "needs_buyer_decision",
    note: note ?? "Buyer decision requested by sales",
  });

  if (eventError) {
    throw eventError;
  }

  revalidatePath("/sales");
  revalidatePath("/sales/orders");
  revalidatePath(`/sales/orders/${orderId}`);
}
