import {
  PackingDraftStatus,
  PackingInventoryLot,
  PackingPlannerDraftDocument,
  PackingShipmentContext,
  PackingSourceItem,
} from "@/lib/packing/types";
import { getShipmentById, getShipmentPallets, ShipmentPallet, ShipmentWithOrder } from "@/lib/queries/shipments";
import { OrderPackingDraftRow, OrderWithOrg, OrganizationRow, ProductRow, ShipmentRow } from "@/types";
import { SupabaseClient } from "@supabase/supabase-js";

export type ShipmentPackingShipment = ShipmentWithOrder & {
  destination: Pick<OrganizationRow, "name" | "code" | "country_code"> | null;
  order: ShipmentWithOrder["order"] & {
    ship_to: Pick<OrganizationRow, "name" | "code" | "country_code"> | null;
  };
};

export type ShipmentPackingData = {
  shipment: ShipmentPackingShipment | null;
  shipmentContext: PackingShipmentContext | null;
  orderItems: PackingSourceItem[];
  lots: PackingInventoryLot[];
  pallets: ShipmentPallet[];
  draft: PackingOrderDraft | null;
  error: Error | null;
};

export type PackingOrder = OrderWithOrg & {
  ship_to: Pick<OrganizationRow, "name" | "code" | "country_code"> | null;
  shipment: Pick<ShipmentRow, "id" | "shipment_no" | "shipping_status" | "etd" | "eta"> | null;
};

export type OrderPackingData = {
  order: PackingOrder | null;
  shipment: ShipmentPackingShipment | null;
  shipmentContext: PackingShipmentContext | null;
  orderItems: PackingSourceItem[];
  lots: PackingInventoryLot[];
  pallets: ShipmentPallet[];
  draft: PackingOrderDraft | null;
  error: Error | null;
};

export type PackingOrderDraft = {
  id: string;
  order_id: string;
  linked_shipment_id: string | null;
  draft_status: PackingDraftStatus;
  draft_json: PackingPlannerDraftDocument;
  created_at: string;
  updated_at: string;
};

type RawOrderItemProduct = Pick<
  ProductRow,
  | "id"
  | "sku"
  | "name"
  | "brand"
  | "units_per_case"
  | "case_length"
  | "case_width"
  | "case_height"
  | "gross_weight"
  | "net_weight"
  | "cbm"
>;

type RawOrderItem = {
  id: string;
  line_no: number;
  requested_qty: number;
  final_qty: number | null;
  sales_confirmed_qty: number | null;
  vendor_confirmed_qty: number | null;
  final_unit_qty: number | null;
  sales_confirmed_unit_qty: number | null;
  vendor_confirmed_unit_qty: number | null;
  requested_unit_qty: number;
  unit_price: number | null;
  min_remaining_shelf_life_days: number | null;
  units_per_case: number | null;
  product: RawOrderItemProduct | RawOrderItemProduct[] | null;
};

type RawInventoryLot = {
  id: string;
  product_id: string;
  lot_no: string;
  warehouse_code: string;
  expiry_date: string | null;
  production_date: string | null;
  available_qty: number;
  confidence_status: "high" | "medium" | "low";
};

type RawOrderRecord = OrderWithOrg & {
  ship_to: Pick<OrganizationRow, "name" | "code" | "country_code"> | null;
};

type RawShipmentSummary = Pick<
  ShipmentRow,
  "id" | "shipment_no" | "shipping_status" | "etd" | "eta"
> & {
  order_id: string;
  created_at: string;
};

function isPackingPlannerDraftDocument(value: unknown): value is PackingPlannerDraftDocument {
  if (!value || typeof value !== "object") {
    return false;
  }

  const document = value as Record<string, unknown>;
  return document.version === 1 && Array.isArray(document.pallets) && !!document.policy && typeof document.policy === "object";
}

function mapPackingOrderDraft(row: OrderPackingDraftRow | null): PackingOrderDraft | null {
  if (!row || !isPackingPlannerDraftDocument(row.draft_json)) {
    return null;
  }

  return {
    id: row.id,
    order_id: row.order_id,
    linked_shipment_id: row.linked_shipment_id,
    draft_status: row.draft_status,
    draft_json: row.draft_json,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function isMissingPackingDraftTable(error: { code?: string | null; message?: string | null } | null | undefined) {
  return error?.code === "PGRST205" && error?.message?.includes("order_packing_drafts");
}

async function getOrderPackingDraft(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from("order_packing_drafts")
    .select("id, order_id, linked_shipment_id, draft_status, draft_json, created_at, updated_at")
    .eq("order_id", orderId)
    .maybeSingle();

  return {
    draft: mapPackingOrderDraft((data ?? null) as OrderPackingDraftRow | null),
    error: isMissingPackingDraftTable(error) ? null : error,
  };
}

function toNumber(value: number | null | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function resolvePackableCaseQty(item: RawOrderItem) {
  return (
    item.final_qty ??
    item.sales_confirmed_qty ??
    item.vendor_confirmed_qty ??
    item.requested_qty
  );
}

function resolvePackableUnitQty(item: RawOrderItem, packableCaseQty: number) {
  const product = Array.isArray(item.product) ? item.product[0] ?? null : item.product;

  return (
    item.final_unit_qty ??
    item.sales_confirmed_unit_qty ??
    item.vendor_confirmed_unit_qty ??
    item.requested_unit_qty ??
    packableCaseQty * (item.units_per_case ?? product?.units_per_case ?? 1)
  );
}

async function getPackingOrderItemsAndLots(supabase: SupabaseClient, orderId: string) {
  const { data: rawOrderItems, error: orderItemsError } = await supabase
    .from("order_items")
    .select(
      "id, line_no, requested_qty, final_qty, sales_confirmed_qty, vendor_confirmed_qty, final_unit_qty, sales_confirmed_unit_qty, vendor_confirmed_unit_qty, requested_unit_qty, unit_price, min_remaining_shelf_life_days, units_per_case, product:product_id(id, sku, name, brand, units_per_case, case_length, case_width, case_height, gross_weight, net_weight, cbm)",
    )
    .eq("order_id", orderId)
    .order("line_no", { ascending: true });

  if (orderItemsError) {
    return {
      orderItems: [] as PackingSourceItem[],
      lots: [] as PackingInventoryLot[],
      error: orderItemsError,
    };
  }

  const orderItems = ((rawOrderItems ?? []) as RawOrderItem[]).map((item) => {
    const product = Array.isArray(item.product) ? item.product[0] ?? null : item.product;
    const packableCaseQty = toNumber(resolvePackableCaseQty(item));

    return {
      orderItemId: item.id,
      lineNo: item.line_no,
      requestedCaseQty: toNumber(item.requested_qty),
      packableCaseQty,
      packableUnitQty: toNumber(resolvePackableUnitQty(item, packableCaseQty)),
      unitPrice: item.unit_price,
      minRemainingShelfLifeDays: item.min_remaining_shelf_life_days,
      product: {
        productId: product?.id ?? "",
        sku: product?.sku ?? "",
        name: product?.name ?? `Line ${item.line_no}`,
        brand: product?.brand ?? null,
        unitsPerCase: item.units_per_case ?? product?.units_per_case ?? null,
        caseLengthCm: product?.case_length ?? null,
        caseWidthCm: product?.case_width ?? null,
        caseHeightCm: product?.case_height ?? null,
        caseGrossWeightKg: product?.gross_weight ?? null,
        caseNetWeightKg: product?.net_weight ?? null,
        caseCbmM3: product?.cbm ?? null,
      },
    } satisfies PackingSourceItem;
  });

  const productIds = Array.from(
    new Set(orderItems.map((item) => item.product.productId).filter((productId) => productId.length > 0)),
  );

  const lotsResult =
    productIds.length === 0
      ? { data: [] as RawInventoryLot[], error: null }
      : await supabase
          .from("inventory_lots")
          .select(
            "id, product_id, lot_no, warehouse_code, expiry_date, production_date, available_qty, confidence_status",
          )
          .in("product_id", productIds)
          .gt("available_qty", 0)
          .order("expiry_date", { ascending: true, nullsFirst: false });

  if (lotsResult.error) {
    return {
      orderItems,
      lots: [] as PackingInventoryLot[],
      error: lotsResult.error,
    };
  }

  const lots = ((lotsResult.data ?? []) as RawInventoryLot[]).map((lot) => ({
    id: lot.id,
    productId: lot.product_id,
    lotNo: lot.lot_no,
    warehouseCode: lot.warehouse_code,
    expiryDate: lot.expiry_date,
    productionDate: lot.production_date,
    availableQty: toNumber(lot.available_qty),
    confidenceStatus: lot.confidence_status,
  }));

  return {
    orderItems,
    lots,
    error: null,
  };
}

export async function getShipmentPackingData(
  supabase: SupabaseClient,
  shipmentId: string,
): Promise<ShipmentPackingData> {
  const [shipmentResult, palletsResult] = await Promise.all([
    getShipmentById(supabase, shipmentId),
    getShipmentPallets(supabase, shipmentId),
  ]);

  if (!shipmentResult.data) {
    return {
      shipment: null,
      shipmentContext: null,
      orderItems: [],
      lots: [],
      pallets: [],
      draft: null,
      error: shipmentResult.error instanceof Error ? shipmentResult.error : null,
    };
  }

  const { data: shipmentWithDestination, error: shipmentDetailsError } = await supabase
    .from("shipments")
    .select(
      "*, destination:destination_org_id(name, code, country_code), order:order_id(id, order_no, organization:ordering_org_id(name, code), ship_to:ship_to_org_id(name, code, country_code))",
    )
    .eq("id", shipmentId)
    .maybeSingle();

  if (shipmentDetailsError) {
    return {
      shipment: null,
      shipmentContext: null,
      orderItems: [],
      lots: [],
      pallets: [],
      draft: null,
      error: shipmentDetailsError,
    };
  }

  const shipment = (shipmentWithDestination ?? {
    ...shipmentResult.data,
    destination: null,
    order: {
      ...shipmentResult.data.order,
      ship_to: null,
    },
  }) as ShipmentPackingShipment;
  const shipmentContext: PackingShipmentContext = {
    shipmentId: shipment.id,
    shipmentNo: shipment.shipment_no,
    buyerName: shipment.order?.organization?.name ?? null,
    buyerCode: shipment.order?.organization?.code ?? null,
    destinationName: shipment.destination?.name ?? shipment.order?.ship_to?.name ?? null,
    destinationCode: shipment.destination?.code ?? shipment.order?.ship_to?.code ?? null,
  };

  const draftResult = await getOrderPackingDraft(supabase, shipment.order_id);
  if (draftResult.error) {
    return {
      shipment,
      shipmentContext,
      orderItems: [],
      lots: [],
      pallets: palletsResult.data,
      draft: null,
      error: draftResult.error,
    };
  }

  const packingResources = await getPackingOrderItemsAndLots(supabase, shipment.order_id);

  if (packingResources.error) {
    return {
      shipment,
      shipmentContext,
      orderItems: packingResources.orderItems,
      lots: packingResources.lots,
      pallets: palletsResult.data,
      draft: draftResult.draft,
      error: packingResources.error,
    };
  }

  return {
    shipment,
    shipmentContext,
    orderItems: packingResources.orderItems,
    lots: packingResources.lots,
    pallets: palletsResult.data,
    draft: draftResult.draft,
    error: null,
  };
}

export async function getOrderPackingData(
  supabase: SupabaseClient,
  orderId: string,
): Promise<OrderPackingData> {
  const { data: rawOrder, error: orderError } = await supabase
    .from("orders")
    .select("*, organization:ordering_org_id(name, code), ship_to:ship_to_org_id(name, code, country_code)")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    return {
      order: null,
      shipment: null,
      shipmentContext: null,
      orderItems: [],
      lots: [],
      pallets: [],
      draft: null,
      error: orderError,
    };
  }

  if (!rawOrder) {
    return {
      order: null,
      shipment: null,
      shipmentContext: null,
      orderItems: [],
      lots: [],
      pallets: [],
      draft: null,
      error: null,
    };
  }

  const { data: shipmentRows, error: shipmentError } = await supabase
    .from("shipments")
    .select("id, order_id, shipment_no, shipping_status, etd, eta, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (shipmentError) {
    return {
      order: null,
      shipment: null,
      shipmentContext: null,
      orderItems: [],
      lots: [],
      pallets: [],
      draft: null,
      error: shipmentError,
    };
  }

  const shipmentSummary = ((shipmentRows ?? []) as RawShipmentSummary[])[0] ?? null;
  const draftResult = await getOrderPackingDraft(supabase, orderId);

  if (draftResult.error) {
    return {
      order: null,
      shipment: null,
      shipmentContext: null,
      orderItems: [],
      lots: [],
      pallets: [],
      draft: null,
      error: draftResult.error,
    };
  }

  const order: PackingOrder = {
    ...(rawOrder as RawOrderRecord),
    shipment: shipmentSummary
      ? {
          id: shipmentSummary.id,
          shipment_no: shipmentSummary.shipment_no,
          shipping_status: shipmentSummary.shipping_status,
          etd: shipmentSummary.etd,
          eta: shipmentSummary.eta,
        }
      : null,
  };

  if (shipmentSummary) {
    const shipmentPacking = await getShipmentPackingData(supabase, shipmentSummary.id);
    return {
      order,
      shipment: shipmentPacking.shipment,
      shipmentContext: shipmentPacking.shipmentContext,
      orderItems: shipmentPacking.orderItems,
      lots: shipmentPacking.lots,
      pallets: shipmentPacking.pallets,
      draft: draftResult.draft,
      error: shipmentPacking.error,
    };
  }

  const packingResources = await getPackingOrderItemsAndLots(supabase, orderId);
  const shipmentContext: PackingShipmentContext = {
    shipmentId: "",
    shipmentNo: order.order_no,
    buyerName: order.organization?.name ?? null,
    buyerCode: order.organization?.code ?? null,
    destinationName: order.ship_to?.name ?? null,
    destinationCode: order.ship_to?.code ?? null,
  };

  return {
    order,
    shipment: null,
    shipmentContext,
    orderItems: packingResources.orderItems,
    lots: packingResources.lots,
    pallets: [],
    draft: draftResult.draft,
    error: packingResources.error,
  };
}
