import {
  InventoryLotRow,
  OrderRow,
  OrganizationRow,
  ProductRow,
  ShipmentRow,
} from "@/types";
import { SupabaseClient } from "@supabase/supabase-js";

export type ShipmentFilters = {
  status?: string;
  fromDate?: string;
  toDate?: string;
  sort?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type ShipmentWithOrder = ShipmentRow & {
  order: Pick<OrderRow, "id" | "order_no"> & {
    organization: Pick<OrganizationRow, "name" | "code">;
  };
};

export type ShipmentPalletItem = {
  id: string;
  shipment_pallet_id: string;
  order_item_id: string;
  product_id: string;
  inventory_lot_id: string | null;
  packed_case_qty: number;
  packed_unit_qty: number;
  unit_cbm_snapshot: number | null;
  expiry_date_snapshot: string | null;
  is_partial_case: boolean;
  partial_reason: string | null;
  manual_override: boolean;
  override_reason: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  product: Pick<ProductRow, "name" | "sku"> | null;
  inventory_lot: Pick<InventoryLotRow, "lot_no"> | null;
};

export type ShipmentPallet = {
  id: string;
  shipment_id: string;
  pallet_no: string;
  pallet_width_mm: number | null;
  pallet_depth_mm: number | null;
  pallet_height_mm: number | null;
  pallet_cbm: number | null;
  box_cbm_total: number | null;
  gross_weight: number | null;
  net_weight: number | null;
  shipping_mark: string | null;
  earliest_expiry_date: string | null;
  latest_expiry_date: string | null;
  simulation_json: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: ShipmentPalletItem[];
};

type LogisticsStats = {
  awaitingShipment: number;
  activeShipments: number;
  deliveredThisMonth: number;
};

export async function getShipments(supabase: SupabaseClient, filters?: ShipmentFilters) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const from = Math.max((page - 1) * pageSize, 0);
  const to = from + pageSize - 1;

  let query = supabase
    .from("shipments")
    .select("*, order:order_id(id, order_no, organization:ordering_org_id(name, code))", {
      count: "exact",
    })
    .order(filters?.sort ?? "created_at", { ascending: filters?.sortDir === "asc" });

  if (filters?.status) {
    query = query.eq("shipping_status", filters.status);
  }

  if (filters?.fromDate) {
    query = query.gte("created_at", filters.fromDate);
  }

  if (filters?.toDate) {
    query = query.lte("created_at", filters.toDate);
  }

  const { data, count, error } = await query.range(from, to);

  return {
    data: (data ?? []) as ShipmentWithOrder[],
    count: count ?? 0,
    error,
  };
}

export async function getShipmentById(supabase: SupabaseClient, shipmentId: string) {
  const { data, error } = await supabase
    .from("shipments")
    .select("*, order:order_id(id, order_no, organization:ordering_org_id(name, code))")
    .eq("id", shipmentId)
    .maybeSingle();

  return {
    data: (data ?? null) as ShipmentWithOrder | null,
    error,
  };
}

type ShipmentPalletRow = Omit<ShipmentPallet, "items">;

export async function getShipmentPallets(supabase: SupabaseClient, shipmentId: string) {
  const { data: palletsData, error: palletsError } = await supabase
    .from("shipment_pallets")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("pallet_no", { ascending: true });

  if (palletsError) {
    return {
      data: [] as ShipmentPallet[],
      error: palletsError,
    };
  }

  const pallets = (palletsData ?? []) as Array<Record<string, unknown>>;

  if (pallets.length === 0) {
    return {
      data: [] as ShipmentPallet[],
      error: null,
    };
  }

  const palletIds = pallets
    .map((pallet) => (typeof pallet.id === "string" ? pallet.id : null))
    .filter((id): id is string => id !== null);

  const { data: itemsData, error: itemsError } = await supabase
    .from("shipment_pallet_items")
    .select("*, product:product_id(name, sku), inventory_lot:inventory_lot_id(lot_no)")
    .in("shipment_pallet_id", palletIds)
    .order("created_at", { ascending: true });

  if (itemsError) {
    return {
      data: [] as ShipmentPallet[],
      error: itemsError,
    };
  }

  const items = (itemsData ?? []) as Array<Record<string, unknown>>;
  const itemsByPalletId = new Map<string, ShipmentPalletItem[]>();

  items.forEach((item) => {
    const palletId = typeof item.shipment_pallet_id === "string" ? item.shipment_pallet_id : null;

    if (!palletId) {
      return;
    }

    const current = itemsByPalletId.get(palletId) ?? [];
    current.push({
      id: typeof item.id === "string" ? item.id : "",
      shipment_pallet_id: palletId,
      order_item_id: typeof item.order_item_id === "string" ? item.order_item_id : "",
      product_id: typeof item.product_id === "string" ? item.product_id : "",
      inventory_lot_id: typeof item.inventory_lot_id === "string" ? item.inventory_lot_id : null,
      packed_case_qty: Number(item.packed_case_qty ?? 0),
      packed_unit_qty: Number(item.packed_unit_qty ?? 0),
      unit_cbm_snapshot:
        typeof item.unit_cbm_snapshot === "number" ? item.unit_cbm_snapshot : null,
      expiry_date_snapshot:
        typeof item.expiry_date_snapshot === "string" ? item.expiry_date_snapshot : null,
      is_partial_case: Boolean(item.is_partial_case ?? false),
      partial_reason: typeof item.partial_reason === "string" ? item.partial_reason : null,
      manual_override: Boolean(item.manual_override ?? false),
      override_reason: typeof item.override_reason === "string" ? item.override_reason : null,
      metadata_json:
        item.metadata_json && typeof item.metadata_json === "object"
          ? (item.metadata_json as Record<string, unknown>)
          : {},
      created_at: typeof item.created_at === "string" ? item.created_at : "",
      updated_at: typeof item.updated_at === "string" ? item.updated_at : "",
      product:
        item.product && !Array.isArray(item.product)
          ? {
              name: String((item.product as Record<string, unknown>).name ?? ""),
              sku: String((item.product as Record<string, unknown>).sku ?? ""),
            }
          : null,
      inventory_lot:
        item.inventory_lot && !Array.isArray(item.inventory_lot)
          ? {
              lot_no: String((item.inventory_lot as Record<string, unknown>).lot_no ?? ""),
            }
          : null,
    });
    itemsByPalletId.set(palletId, current);
  });

  const data = pallets.map((pallet) => {
    const palletId = typeof pallet.id === "string" ? pallet.id : "";

    const basePallet: ShipmentPalletRow = {
      id: palletId,
      shipment_id: typeof pallet.shipment_id === "string" ? pallet.shipment_id : shipmentId,
      pallet_no: typeof pallet.pallet_no === "string" ? pallet.pallet_no : "-",
      pallet_width_mm:
        typeof pallet.pallet_width_mm === "number"
          ? pallet.pallet_width_mm
          : typeof pallet.pallet_width === "number"
            ? pallet.pallet_width
            : null,
      pallet_depth_mm:
        typeof pallet.pallet_depth_mm === "number"
          ? pallet.pallet_depth_mm
          : typeof pallet.pallet_depth === "number"
            ? pallet.pallet_depth
            : null,
      pallet_height_mm:
        typeof pallet.pallet_height_mm === "number" ? pallet.pallet_height_mm : null,
      pallet_cbm:
        typeof pallet.pallet_cbm === "number"
          ? pallet.pallet_cbm
          : typeof pallet.cbm === "number"
            ? pallet.cbm
            : null,
      box_cbm_total: typeof pallet.box_cbm_total === "number" ? pallet.box_cbm_total : null,
      gross_weight:
        typeof pallet.gross_weight === "number" ? pallet.gross_weight : null,
      net_weight:
        typeof pallet.net_weight === "number" ? pallet.net_weight : null,
      shipping_mark: typeof pallet.shipping_mark === "string" ? pallet.shipping_mark : null,
      earliest_expiry_date:
        typeof pallet.earliest_expiry_date === "string" ? pallet.earliest_expiry_date : null,
      latest_expiry_date:
        typeof pallet.latest_expiry_date === "string" ? pallet.latest_expiry_date : null,
      simulation_json:
        pallet.simulation_json && typeof pallet.simulation_json === "object"
          ? (pallet.simulation_json as Record<string, unknown>)
          : {},
      notes: typeof pallet.notes === "string" ? pallet.notes : null,
      created_at: typeof pallet.created_at === "string" ? pallet.created_at : "",
      updated_at: typeof pallet.updated_at === "string" ? pallet.updated_at : "",
    };

    return {
      ...basePallet,
      items: itemsByPalletId.get(palletId) ?? [],
    };
  });

  return {
    data,
    error: null,
  };
}

export async function getLogisticsStats(supabase: SupabaseClient): Promise<LogisticsStats> {
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const [confirmedOrdersResult, activeShipmentsResult, deliveredThisMonthResult] = await Promise.all([
    supabase.from("orders").select("id").eq("status", "confirmed"),
    supabase
      .from("shipments")
      .select("id", { count: "exact", head: true })
      .in("shipping_status", ["preparing", "packed", "shipped", "in_transit"]),
    supabase
      .from("shipments")
      .select("id", { count: "exact", head: true })
      .eq("shipping_status", "delivered")
      .gte("updated_at", firstDayOfMonth.toISOString()),
  ]);

  if (confirmedOrdersResult.error) {
    throw confirmedOrdersResult.error;
  }

  if (activeShipmentsResult.error) {
    throw activeShipmentsResult.error;
  }

  if (deliveredThisMonthResult.error) {
    throw deliveredThisMonthResult.error;
  }

  const confirmedOrderIds = (confirmedOrdersResult.data ?? []).map((order) => order.id);

  let awaitingShipment = confirmedOrderIds.length;

  if (confirmedOrderIds.length > 0) {
    const { data: shipmentOrderRows, error: shipmentOrderError } = await supabase
      .from("shipments")
      .select("order_id")
      .in("order_id", confirmedOrderIds);

    if (shipmentOrderError) {
      throw shipmentOrderError;
    }

    const shippedOrderIds = new Set((shipmentOrderRows ?? []).map((row) => row.order_id));
    awaitingShipment = confirmedOrderIds.filter((orderId) => !shippedOrderIds.has(orderId)).length;
  }

  return {
    awaitingShipment,
    activeShipments: activeShipmentsResult.count ?? 0,
    deliveredThisMonth: deliveredThisMonthResult.count ?? 0,
  };
}
