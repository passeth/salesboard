"use server";

import {
  summarizePallet,
  serializeSimulationDocument,
} from "@/lib/packing/simulator";
import { PackingPalletDraft, PackingPlannerDraftDocument, PackingSimulationPolicy } from "@/lib/packing/types";
import { getShipmentPackingData } from "@/lib/queries/shipment-packing";
import { createClient } from "@/lib/supabase/server";
import { ShipmentRow, UserRole } from "@/types";
import { revalidatePath } from "next/cache";

const SHIPMENT_TRANSITIONS: Record<ShipmentRow["shipping_status"], ShipmentRow["shipping_status"][]> = {
  preparing: ["packed"],
  packed: ["shipped"],
  shipped: ["in_transit"],
  in_transit: ["delivered"],
  delivered: [],
};

async function validateLogisticsUser() {
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

  if (!userRecord || (userRecord.role !== UserRole.Logistics && userRecord.role !== UserRole.Admin)) {
    throw new Error("Unauthorized");
  }

  return { supabase, userId: user.id, role: userRecord.role };
}

function sanitizeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function sanitizePolicy(policy: PackingSimulationPolicy): PackingSimulationPolicy {
  return {
    cellSizeMm: Math.max(Math.round(policy.cellSizeMm), 50),
    defaultPalletWidthMm: Math.max(Math.round(policy.defaultPalletWidthMm), 500),
    defaultPalletDepthMm: Math.max(Math.round(policy.defaultPalletDepthMm), 500),
    maxPalletGrossWeightKg: Math.max(sanitizeNumber(policy.maxPalletGrossWeightKg), 1),
    heavyBoxWeightThresholdKg: Math.max(sanitizeNumber(policy.heavyBoxWeightThresholdKg), 0),
    maxHeavyBoxesPerPallet: Math.max(Math.round(policy.maxHeavyBoxesPerPallet), 0),
    recommendedMaxHeightMm: Math.max(Math.round(policy.recommendedMaxHeightMm), 300),
  };
}

function sanitizePalletDrafts(pallets: PackingPalletDraft[]) {
  return pallets.map((pallet, index) => ({
    ...pallet,
    palletNo: pallet.palletNo.trim() || `PLT-${String(index + 1).padStart(2, "0")}`,
    widthMm: Math.max(Math.round(pallet.widthMm), 500),
    depthMm: Math.max(Math.round(pallet.depthMm), 500),
    heightMm: pallet.heightMm === null ? null : Math.max(Math.round(pallet.heightMm), 0),
    notes: pallet.notes.trim(),
    placements: pallet.placements.map((placement) => ({
      ...placement,
      layer: Math.max(Math.round(placement.layer), 0),
      x: Math.max(Math.round(placement.x), 0),
      y: Math.max(Math.round(placement.y), 0),
      widthCells: Math.max(Math.round(placement.widthCells), 1),
      depthCells: Math.max(Math.round(placement.depthCells), 1),
      widthMm: Math.max(Math.round(placement.widthMm), 1),
      depthMm: Math.max(Math.round(placement.depthMm), 1),
      heightMm: Math.max(Math.round(placement.heightMm), 1),
      grossWeightKg: sanitizeNumber(placement.grossWeightKg),
      netWeightKg: sanitizeNumber(placement.netWeightKg),
      caseCbmM3: sanitizeNumber(placement.caseCbmM3),
    })),
    partials: pallet.partials.map((partial) => ({
      ...partial,
      units: Math.max(Math.round(partial.units), 0),
      unitGrossWeightKg: sanitizeNumber(partial.unitGrossWeightKg),
      unitNetWeightKg: sanitizeNumber(partial.unitNetWeightKg),
      unitCbmM3: sanitizeNumber(partial.unitCbmM3),
      reason: partial.reason.trim(),
    })),
  }));
}

function serializePlannerDraftDocument(
  policy: PackingSimulationPolicy,
  pallets: PackingPalletDraft[],
  linkedShipmentId: string | null,
): PackingPlannerDraftDocument {
  return {
    version: 1,
    policy,
    pallets,
    savedAt: new Date().toISOString(),
    linkedShipmentId,
  };
}

function isMissingPackingDraftTable(error: { code?: string | null; message?: string | null } | null | undefined) {
  return error?.code === "PGRST205" && error?.message?.includes("order_packing_drafts");
}

export async function updateShipmentStatus(shipmentId: string, newStatus: ShipmentRow["shipping_status"]) {
  const { supabase, userId, role } = await validateLogisticsUser();

  const { data: shipment, error: shipmentError } = await supabase
    .from("shipments")
    .select("id, order_id, shipment_no, shipping_status")
    .eq("id", shipmentId)
    .maybeSingle();

  if (shipmentError) {
    throw shipmentError;
  }

  if (!shipment) {
    throw new Error("Shipment not found");
  }

  const allowedNextStatuses = SHIPMENT_TRANSITIONS[shipment.shipping_status as ShipmentRow["shipping_status"]] ?? [];

  if (!allowedNextStatuses.includes(newStatus)) {
    throw new Error("Invalid shipment status transition");
  }

  const updates: Partial<ShipmentRow> = {
    shipping_status: newStatus,
  };

  const { error: updateError } = await supabase.from("shipments").update(updates).eq("id", shipmentId);

  if (updateError) {
    throw updateError;
  }

  const { error: eventError } = await supabase.from("order_events").insert({
    order_id: shipment.order_id,
    actor_user_id: userId,
    actor_role: role,
    event_type: "shipment_confirmed",
    from_status: shipment.shipping_status,
    to_status: newStatus,
    note: `Shipment ${shipment.shipment_no} moved to ${newStatus}`,
  });

  if (eventError) {
    throw eventError;
  }

  revalidatePath("/logistics");
  revalidatePath("/logistics/shipments");
  revalidatePath(`/logistics/shipments/${shipmentId}`);
}

export async function saveShipmentPackingPlan(input: {
  shipmentId: string;
  policy: PackingSimulationPolicy;
  pallets: PackingPalletDraft[];
}) {
  const { supabase, userId } = await validateLogisticsUser();
  const shipmentId = input.shipmentId;

  if (!shipmentId) {
    throw new Error("Shipment id is required");
  }

  const packingData = await getShipmentPackingData(supabase, shipmentId);
  if (packingData.error) {
    throw packingData.error;
  }

  if (!packingData.shipment || !packingData.shipmentContext) {
    throw new Error("Shipment not found");
  }

  const policy = sanitizePolicy(input.policy);
  const pallets = sanitizePalletDrafts(input.pallets);
  const summaries = pallets.map((pallet) =>
    summarizePallet(pallet, packingData.shipmentContext!, packingData.lots, policy, packingData.orderItems),
  );
  const summaryByLocalId = new Map(pallets.map((pallet, index) => [pallet.localId, summaries[index]]));

  const existingPallets = packingData.pallets;
  const keepIds = new Set(pallets.map((pallet) => pallet.persistedId).filter((value): value is string => Boolean(value)));
  const removableIds = existingPallets
    .map((pallet) => pallet.id)
    .filter((palletId) => !keepIds.has(palletId));

  if (removableIds.length > 0) {
    const { error: documentsError } = await supabase
      .from("documents")
      .delete()
      .eq("owner_type", "shipment_pallet")
      .in("owner_id", removableIds);

    if (documentsError) {
      throw documentsError;
    }

    const { error } = await supabase.from("shipment_pallets").delete().in("id", removableIds);
    if (error) {
      throw error;
    }
  }

  const updateRows = pallets
    .filter((pallet) => Boolean(pallet.persistedId))
    .map((pallet) => ({
      id: pallet.persistedId!,
      shipment_id: shipmentId,
      pallet_no: pallet.palletNo,
      pallet_width_mm: pallet.widthMm,
      pallet_depth_mm: pallet.depthMm,
      pallet_height_mm: summaryByLocalId.get(pallet.localId)?.heightMm ?? pallet.heightMm,
      box_cbm_total: summaryByLocalId.get(pallet.localId)?.boxCbmM3 ?? 0,
      gross_weight: summaryByLocalId.get(pallet.localId)?.grossWeightKg ?? 0,
      net_weight: summaryByLocalId.get(pallet.localId)?.netWeightKg ?? 0,
      shipping_mark: summaryByLocalId.get(pallet.localId)?.shippingMark ?? null,
      earliest_expiry_date: summaryByLocalId.get(pallet.localId)?.earliestExpiryDate ?? null,
      latest_expiry_date: summaryByLocalId.get(pallet.localId)?.latestExpiryDate ?? null,
      simulation_json: serializeSimulationDocument(pallet, policy),
      notes: pallet.notes || null,
    }));

  if (updateRows.length > 0) {
    const { error } = await supabase.from("shipment_pallets").upsert(updateRows, { onConflict: "id" });
    if (error) {
      throw error;
    }
  }

  const insertRows = pallets
    .filter((pallet) => !pallet.persistedId)
    .map((pallet) => ({
      shipment_id: shipmentId,
      pallet_no: pallet.palletNo,
      pallet_width_mm: pallet.widthMm,
      pallet_depth_mm: pallet.depthMm,
      pallet_height_mm: summaryByLocalId.get(pallet.localId)?.heightMm ?? pallet.heightMm,
      box_cbm_total: summaryByLocalId.get(pallet.localId)?.boxCbmM3 ?? 0,
      gross_weight: summaryByLocalId.get(pallet.localId)?.grossWeightKg ?? 0,
      net_weight: summaryByLocalId.get(pallet.localId)?.netWeightKg ?? 0,
      shipping_mark: summaryByLocalId.get(pallet.localId)?.shippingMark ?? null,
      earliest_expiry_date: summaryByLocalId.get(pallet.localId)?.earliestExpiryDate ?? null,
      latest_expiry_date: summaryByLocalId.get(pallet.localId)?.latestExpiryDate ?? null,
      simulation_json: serializeSimulationDocument(pallet, policy),
      notes: pallet.notes || null,
    }));

  const insertedRows =
    insertRows.length > 0
      ? await supabase.from("shipment_pallets").insert(insertRows).select("id, pallet_no")
      : { data: [] as Array<{ id: string; pallet_no: string }>, error: null };

  if (insertedRows.error) {
    throw insertedRows.error;
  }

  const palletIdByLocalId = new Map<string, string>();
  const insertedIdByPalletNo = new Map((insertedRows.data ?? []).map((row) => [row.pallet_no, row.id]));

  pallets.forEach((pallet) => {
    const palletId = pallet.persistedId ?? insertedIdByPalletNo.get(pallet.palletNo);
    if (palletId) {
      palletIdByLocalId.set(pallet.localId, palletId);
    }
  });

  const allPersistedPalletIds = Array.from(palletIdByLocalId.values());

  if (allPersistedPalletIds.length > 0) {
    const { error } = await supabase
      .from("shipment_pallet_items")
      .delete()
      .in("shipment_pallet_id", allPersistedPalletIds);

    if (error) {
      throw error;
    }
  }

  const itemRows = pallets.flatMap((pallet, index) => {
    const palletId = palletIdByLocalId.get(pallet.localId);
    const summary = summaries[index];
    if (!palletId) {
      return [];
    }

    return summary.groupedAllocations.flatMap((group) =>
      group.allocations
        .filter((allocation) => allocation.packedUnitQty > 0 || allocation.packedCaseQty > 0)
        .map((allocation) => ({
          shipment_pallet_id: palletId,
          order_item_id: group.orderItemId,
          product_id: group.productId,
          inventory_lot_id: allocation.lotId,
          packed_case_qty: allocation.packedCaseQty,
          packed_unit_qty: allocation.packedUnitQty,
          expiry_date_snapshot: allocation.expiryDate,
          is_partial_case: allocation.isPartialCase,
          partial_reason: allocation.partialReason,
          manual_override: allocation.manualOverride,
          override_reason: allocation.overrideReason,
        })),
    );
  });

  if (itemRows.length > 0) {
    const { error } = await supabase.from("shipment_pallet_items").insert(itemRows);
    if (error) {
      throw error;
    }
  }

  const orderId = packingData.shipment.order.id;
  const { error: promoteDraftError } = await supabase
    .from("order_packing_drafts")
    .update({
      linked_shipment_id: shipmentId,
      draft_status: "promoted",
      draft_json: serializePlannerDraftDocument(policy, pallets, shipmentId),
      updated_by_user_id: userId,
    })
    .eq("order_id", orderId);

  if (promoteDraftError && !isMissingPackingDraftTable(promoteDraftError)) {
    throw promoteDraftError;
  }

  revalidatePath("/logistics");
  revalidatePath("/logistics/packing");
  revalidatePath(`/logistics/packing/${orderId}`);
  revalidatePath("/logistics/shipments");
  revalidatePath(`/logistics/shipments/${shipmentId}`);
  revalidatePath(`/logistics/shipments/${shipmentId}/packing`);
}

export async function saveOrderPackingDraft(input: {
  orderId: string;
  policy: PackingSimulationPolicy;
  pallets: PackingPalletDraft[];
}) {
  const { supabase, userId } = await validateLogisticsUser();

  if (!input.orderId) {
    throw new Error("Order id is required");
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", input.orderId)
    .maybeSingle();

  if (orderError) {
    throw orderError;
  }

  if (!order) {
    throw new Error("Order not found");
  }

  if (!["confirmed", "partially_shipped", "shipped", "completed"].includes(order.status)) {
    throw new Error("Packing draft can only be saved for confirmed or shipped orders.");
  }

  const policy = sanitizePolicy(input.policy);
  const pallets = sanitizePalletDrafts(input.pallets);
  const draftJson = serializePlannerDraftDocument(policy, pallets, null);

  const { data: existingDraft, error: existingDraftError } = await supabase
    .from("order_packing_drafts")
    .select("id")
    .eq("order_id", input.orderId)
    .maybeSingle();

  if (existingDraftError && isMissingPackingDraftTable(existingDraftError)) {
    throw new Error("Draft storage is not active yet. Apply the latest Supabase migration and refresh the schema cache.");
  }

  if (existingDraftError) {
    throw existingDraftError;
  }

  if (existingDraft) {
    const { error: updateError } = await supabase
      .from("order_packing_drafts")
      .update({
        draft_status: "draft",
        linked_shipment_id: null,
        draft_json: draftJson,
        updated_by_user_id: userId,
      })
      .eq("id", existingDraft.id);

    if (updateError && isMissingPackingDraftTable(updateError)) {
      throw new Error("Draft storage is not active yet. Apply the latest Supabase migration and refresh the schema cache.");
    }

    if (updateError) {
      throw updateError;
    }
  } else {
    const { error: insertError } = await supabase.from("order_packing_drafts").insert({
      order_id: input.orderId,
      draft_status: "draft",
      linked_shipment_id: null,
      draft_json: draftJson,
      created_by_user_id: userId,
      updated_by_user_id: userId,
    });

    if (insertError && isMissingPackingDraftTable(insertError)) {
      throw new Error("Draft storage is not active yet. Apply the latest Supabase migration and refresh the schema cache.");
    }

    if (insertError) {
      throw insertError;
    }
  }

  revalidatePath("/logistics");
  revalidatePath("/logistics/packing");
  revalidatePath(`/logistics/packing/${input.orderId}`);
}
