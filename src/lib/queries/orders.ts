import { OrderEventRow, OrderItemWithProduct, OrderPackingDraftRow, OrderWithOrg, OrganizationRow, ShipmentRow } from "@/types";
import { SupabaseClient } from "@supabase/supabase-js";

type OrderFilters = {
  status?: string;
  statuses?: string[];
  fromDate?: string;
  toDate?: string;
  sort?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type LogisticsPackingListOrder = OrderWithOrg & {
  ship_to: Pick<OrganizationRow, "name" | "code" | "country_code"> | null;
  shipment: Pick<ShipmentRow, "id" | "shipment_no" | "shipping_status" | "etd" | "eta"> | null;
  packing_draft: Pick<OrderPackingDraftRow, "draft_status" | "updated_at" | "linked_shipment_id"> | null;
};

export type LogisticsPackingListFilters = {
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
};

function isMissingPackingDraftTable(error: { code?: string | null; message?: string | null } | null | undefined) {
  return error?.code === "PGRST205" && error?.message?.includes("order_packing_drafts");
}

export async function getBuyerOrders(supabase: SupabaseClient, orgId: string | null, filters?: OrderFilters) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const from = Math.max((page - 1) * pageSize, 0);
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select("*, organization:ordering_org_id(name, code, currency_code, parent_org_id, org_type, parent:parent_org_id(name, code)), ship_to:ship_to_org_id(name, code)", { count: "exact" })
    .order(filters?.sort ?? "created_at", { ascending: filters?.sortDir === "asc" });

  if (orgId) {
    query = query.eq("ordering_org_id", orgId);
  }

  if (filters?.statuses && filters.statuses.length > 0) {
    query = query.in("status", filters.statuses);
  } else if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.fromDate) {
    query = query.gte("created_at", filters.fromDate);
  }

  if (filters?.toDate) {
    query = query.lte("created_at", filters.toDate);
  }

  const { data, count, error } = await query.range(from, to);

  return {
    data: (data ?? []) as OrderWithOrg[],
    count: count ?? 0,
    error,
  };
}

export async function getBuyerOrderCountsByStatus(
  supabase: SupabaseClient,
  orgId: string | null,
  statuses: string[],
) {
  let query = supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .in("status", statuses);

  if (orgId) {
    query = query.eq("ordering_org_id", orgId);
  }

  const { count, error } = await query;
  return { count: count ?? 0, error };
}

export async function getOrderById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, organization:ordering_org_id(name, code, currency_code), ship_to:ship_to_org_id(name, code)")
    .eq("id", id)
    .single();

  return {
    data: (data ?? null) as OrderWithOrg | null,
    error,
  };
}

export async function getOrderItems(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from("order_items")
    .select("*, product:product_id(name, sku, image_url, brand)")
    .eq("order_id", orderId)
    .order("line_no", { ascending: true });

  return {
    data: (data ?? []) as OrderItemWithProduct[],
    error,
  };
}

export async function getOrderEvents(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from("order_events")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  return {
    data: (data ?? []) as OrderEventRow[],
    error,
  };
}

export async function getLogisticsPackingListOrders(
  supabase: SupabaseClient,
  filters?: LogisticsPackingListFilters,
) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const from = Math.max((page - 1) * pageSize, 0);
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select("*, organization:ordering_org_id(name, code), ship_to:ship_to_org_id(name, code, country_code)", {
      count: "exact",
    })
    .in("status", ["confirmed", "partially_shipped", "shipped", "completed"])
    .order("confirmed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters?.fromDate) {
    query = query.gte("created_at", filters.fromDate);
  }

  if (filters?.toDate) {
    query = query.lte("created_at", filters.toDate);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    return {
      data: [] as LogisticsPackingListOrder[],
      count: 0,
      error,
    };
  }

  const orders = (data ?? []) as Array<
    OrderWithOrg & {
      ship_to: Pick<OrganizationRow, "name" | "code" | "country_code"> | null;
    }
  >;

  const orderIds = orders.map((order) => order.id);
  const shipmentsResult =
    orderIds.length === 0
      ? { data: [] as Array<Record<string, unknown>>, error: null }
      : await supabase
          .from("shipments")
          .select("id, order_id, shipment_no, shipping_status, etd, eta, created_at")
          .in("order_id", orderIds)
          .order("created_at", { ascending: false });

  if (shipmentsResult.error) {
    return {
      data: [] as LogisticsPackingListOrder[],
      count: 0,
      error: shipmentsResult.error,
    };
  }

  const draftsResult =
    orderIds.length === 0
      ? { data: [] as Array<Record<string, unknown>>, error: null }
      : await supabase
          .from("order_packing_drafts")
          .select("order_id, draft_status, updated_at, linked_shipment_id")
          .in("order_id", orderIds);

  if (draftsResult.error && !isMissingPackingDraftTable(draftsResult.error)) {
    return {
      data: [] as LogisticsPackingListOrder[],
      count: 0,
      error: draftsResult.error,
    };
  }

  const latestShipmentByOrderId = new Map<string, Pick<ShipmentRow, "id" | "shipment_no" | "shipping_status" | "etd" | "eta">>();

  ((shipmentsResult.data ?? []) as Array<
    Pick<ShipmentRow, "id" | "shipment_no" | "shipping_status" | "etd" | "eta"> & {
      order_id: string;
      created_at: string;
    }
  >).forEach((shipment) => {
    if (!latestShipmentByOrderId.has(shipment.order_id)) {
      latestShipmentByOrderId.set(shipment.order_id, {
        id: shipment.id,
        shipment_no: shipment.shipment_no,
        shipping_status: shipment.shipping_status,
        etd: shipment.etd,
        eta: shipment.eta,
      });
    }
  });

  const draftByOrderId = new Map<
    string,
    Pick<OrderPackingDraftRow, "draft_status" | "updated_at" | "linked_shipment_id">
  >();

  ((draftsResult.data ?? []) as Array<
    Pick<OrderPackingDraftRow, "draft_status" | "updated_at" | "linked_shipment_id"> & { order_id: string }
  >).forEach((draft) => {
    draftByOrderId.set(draft.order_id, {
      draft_status: draft.draft_status,
      updated_at: draft.updated_at,
      linked_shipment_id: draft.linked_shipment_id,
    });
  });

  return {
    data: orders.map((order) => ({
      ...order,
      ship_to: order.ship_to ?? null,
      shipment: latestShipmentByOrderId.get(order.id) ?? null,
      packing_draft: draftByOrderId.get(order.id) ?? null,
    })),
    count: count ?? 0,
    error: null,
  };
}
