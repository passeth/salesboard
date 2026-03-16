import { OrderStatus, OrderWithOrg } from "@/types";
import { InventoryLotRow } from "@/types/database";
import { SupabaseClient } from "@supabase/supabase-js";

export type SalesOrderFilters = {
  status?: string;
  buyerOrg?: string;
  fromDate?: string;
  toDate?: string;
  sort?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type SalesOrderWithCounts = OrderWithOrg & {
  order_items?: Array<{ count: number | null }>;
};

type SalesOrderStats = {
  pendingReview: number;
  awaitingDecision: number;
  confirmedThisMonth: number;
};

type SalesBuyerOrganization = {
  id: string;
  name: string;
  code: string | null;
};

export async function getSalesOrders(
  supabase: SupabaseClient,
  salesUserId: string | null,
  filters?: SalesOrderFilters,
) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const from = Math.max((page - 1) * pageSize, 0);
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select("*, organization:ordering_org_id(name, code), ship_to:ship_to_org_id(name, code), order_items(count)", { count: "exact" })
    .order(filters?.sort ?? "created_at", { ascending: filters?.sortDir === "asc" });

  if (salesUserId) {
    query = query.eq("sales_owner_user_id", salesUserId);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.buyerOrg) {
    query = query.eq("ordering_org_id", filters.buyerOrg);
  }

  if (filters?.fromDate) {
    query = query.gte("created_at", filters.fromDate);
  }

  if (filters?.toDate) {
    query = query.lte("created_at", filters.toDate);
  }

  const { data, count, error } = await query.range(from, to);

  return {
    data: (data ?? []) as SalesOrderWithCounts[],
    count: count ?? 0,
    error,
  };
}

export async function getSalesOrderStats(
  supabase: SupabaseClient,
  salesUserId: string | null,
): Promise<SalesOrderStats> {
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  let pendingQuery = supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", OrderStatus.SalesReview);
  if (salesUserId) pendingQuery = pendingQuery.eq("sales_owner_user_id", salesUserId);

  let awaitingQuery = supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", OrderStatus.NeedsBuyerDecision);
  if (salesUserId) awaitingQuery = awaitingQuery.eq("sales_owner_user_id", salesUserId);

  let confirmedQuery = supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", OrderStatus.Confirmed)
    .gte("confirmed_at", firstDayOfMonth.toISOString());
  if (salesUserId) confirmedQuery = confirmedQuery.eq("sales_owner_user_id", salesUserId);

  const [pendingReviewResult, awaitingDecisionResult, confirmedThisMonthResult] = await Promise.all([
    pendingQuery,
    awaitingQuery,
    confirmedQuery,
  ]);

  if (pendingReviewResult.error) {
    throw pendingReviewResult.error;
  }

  if (awaitingDecisionResult.error) {
    throw awaitingDecisionResult.error;
  }

  if (confirmedThisMonthResult.error) {
    throw confirmedThisMonthResult.error;
  }

  return {
    pendingReview: pendingReviewResult.count ?? 0,
    awaitingDecision: awaitingDecisionResult.count ?? 0,
    confirmedThisMonth: confirmedThisMonthResult.count ?? 0,
  };
}

export async function getInventoryForProducts(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Record<string, InventoryLotRow[]>> {
  if (productIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("inventory_lots")
    .select("*")
    .in("product_id", productIds)
    .gt("available_qty", 0)
    .order("expiry_date", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as InventoryLotRow[]).reduce<Record<string, InventoryLotRow[]>>((acc, lot) => {
    if (!acc[lot.product_id]) {
      acc[lot.product_id] = [];
    }

    acc[lot.product_id].push(lot);
    return acc;
  }, {});
}

export async function getSalesBuyerOrganizations(supabase: SupabaseClient, salesUserId: string | null) {
  let query = supabase
    .from("orders")
    .select("ordering_org_id, organization:ordering_org_id(name, code)")
    .not("ordering_org_id", "is", null)
    .order("created_at", { ascending: false });

  if (salesUserId) {
    query = query.eq("sales_owner_user_id", salesUserId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const map = new Map<string, SalesBuyerOrganization>();

  for (const row of data ?? []) {
    const orgId = row.ordering_org_id;
    const organization = Array.isArray(row.organization) ? row.organization[0] : row.organization;

    if (!orgId || !organization) {
      continue;
    }

    if (!map.has(orgId)) {
      map.set(orgId, {
        id: orgId,
        name: organization.name,
        code: organization.code,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
