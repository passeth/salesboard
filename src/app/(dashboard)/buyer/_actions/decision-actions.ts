"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function submitBuyerDecision(
  orderId: string,
  itemId: string,
  decision: "accept" | "reject",
  note?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const nextItemStatus = decision === "accept" ? "confirmed" : "rejected";

  const { error: itemUpdateError } = await supabase
    .from("order_items")
    .update({
      status: nextItemStatus,
      decision_note: note ?? null,
    })
    .eq("id", itemId)
    .eq("order_id", orderId);

  if (itemUpdateError) {
    throw itemUpdateError;
  }

  const { error: eventError } = await supabase.from("order_events").insert({
    order_id: orderId,
    order_item_id: itemId,
    actor_user_id: user.id,
    actor_role: "buyer",
    event_type: "buyer_decision_received",
    note: note ?? `Buyer ${decision}ed adjustment`,
  });

  if (eventError) {
    throw eventError;
  }

  const { count: remainingCount, error: remainingError } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId)
    .in("status", ["pending", "under_review", "partial"]);

  if (remainingError) {
    throw remainingError;
  }

  if ((remainingCount ?? 0) === 0) {
    const { data: itemStatuses, error: statusesError } = await supabase
      .from("order_items")
      .select("status")
      .eq("order_id", orderId);

    if (statusesError) {
      throw statusesError;
    }

    const hasRejected = (itemStatuses ?? []).some((item) => item.status === "rejected");
    const nextOrderStatus = hasRejected ? "rejected" : "confirmed";

    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({ status: nextOrderStatus })
      .eq("id", orderId);

    if (orderUpdateError) {
      throw orderUpdateError;
    }
  }

  revalidatePath(`/buyer/orders/${orderId}`);
}

export async function cloneOrderToDraft(sourceOrderId: string) {
  redirect(`/buyer/order/new?clone=${sourceOrderId}`);
}
