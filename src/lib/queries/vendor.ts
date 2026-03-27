import { SupabaseClient } from "@supabase/supabase-js";

export type VendorOrganization = {
  id: string;
  name: string;
  code: string | null;
};

export async function getVendorOrganizations(
  supabase: SupabaseClient,
): Promise<VendorOrganization[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, code")
    .eq("org_type", "vendor")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export type VendorDashboardStats = {
  assignedBuyers: number;
  activeOrders: number;
  monthlyCommission: number;
  currencyCode: string;
};

export type VendorRecentOrder = {
  id: string;
  order_no: string;
  status: string;
  currency_code: string;
  vendor_commission_amount: number | null;
  created_at: string;
  organization: { name: string; code: string | null } | null;
};

export async function getVendorDashboardStats(
  supabase: SupabaseClient,
  vendorOrgId: string,
): Promise<VendorDashboardStats> {
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const activeStatuses = [
    "submitted",
    "vendor_review",
    "sales_review",
    "needs_buyer_decision",
    "confirmed",
  ];

  const [buyersResult, ordersResult, commissionsResult] = await Promise.all([
    supabase
      .from("account_assignments")
      .select("id", { count: "exact", head: true })
      .eq("vendor_org_id", vendorOrgId)
      .eq("status", "active"),

    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("vendor_org_id", vendorOrgId)
      .in("status", activeStatuses),

    supabase
      .from("commissions")
      .select("commission_amount")
      .eq("vendor_org_id", vendorOrgId)
      .gte("created_at", firstDayOfMonth.toISOString()),
  ]);

  if (buyersResult.error) throw buyersResult.error;
  if (ordersResult.error) throw ordersResult.error;
  if (commissionsResult.error) throw commissionsResult.error;

  const monthlyCommission = (commissionsResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.commission_amount ?? 0),
    0,
  );

  return {
    assignedBuyers: buyersResult.count ?? 0,
    activeOrders: ordersResult.count ?? 0,
    monthlyCommission,
    currencyCode: "USD",
  };
}

export type VendorOrderFilters = {
  statuses?: string[];
  buyerOrg?: string;
  fromDate?: string;
  toDate?: string;
  sort?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type VendorOrderWithCounts = {
  id: string;
  order_no: string;
  ordering_org_id: string;
  vendor_org_id: string | null;
  status: string;
  currency_code: string;
  vendor_commission_amount: number | null;
  requested_delivery_date: string | null;
  submitted_at: string | null;
  created_at: string;
  organization: { name: string; code: string | null } | null;
  order_items?: Array<{ count: number | null }>;
};

export async function getVendorOrders(
  supabase: SupabaseClient,
  vendorOrgId: string,
  filters?: VendorOrderFilters,
) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const from = Math.max((page - 1) * pageSize, 0);
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select(
      "id, order_no, ordering_org_id, vendor_org_id, status, currency_code, vendor_commission_amount, requested_delivery_date, submitted_at, created_at, organization:ordering_org_id(name, code), order_items(count)",
      { count: "exact" },
    )
    .eq("vendor_org_id", vendorOrgId)
    .order(filters?.sort ?? "created_at", { ascending: filters?.sortDir === "asc" });

  if (filters?.statuses?.length) query = query.in("status", filters.statuses);
  if (filters?.buyerOrg) query = query.eq("ordering_org_id", filters.buyerOrg);
  if (filters?.fromDate) query = query.gte("created_at", filters.fromDate);
  if (filters?.toDate) query = query.lte("created_at", filters.toDate);

  const { data, count, error } = await query.range(from, to);
  if (error) throw error;

  const mapped = (data ?? []).map((row) => ({
    ...row,
    organization: Array.isArray(row.organization)
      ? row.organization[0] ?? null
      : row.organization,
  }));

  return { data: mapped as VendorOrderWithCounts[], count: count ?? 0 };
}

export async function getVendorBuyerOrganizations(
  supabase: SupabaseClient,
  vendorOrgId: string,
) {
  const { data, error } = await supabase
    .from("orders")
    .select("ordering_org_id, organization:ordering_org_id(name, code)")
    .eq("vendor_org_id", vendorOrgId)
    .not("ordering_org_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const map = new Map<string, { id: string; name: string; code: string | null }>();
  for (const row of data ?? []) {
    const orgId = row.ordering_org_id;
    const org = Array.isArray(row.organization) ? row.organization[0] : row.organization;
    if (!orgId || !org || map.has(orgId)) continue;
    map.set(orgId, { id: orgId, name: org.name, code: org.code });
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export type VendorAccountSummary = {
  buyer_org_id: string;
  org_name: string;
  org_code: string | null;
  country_code: string | null;
  currency_code: string | null;
  commission_type: "rate" | "fixed";
  commission_value: number;
  order_count: number;
  last_order_date: string | null;
};

export async function getVendorAccounts(
  supabase: SupabaseClient,
  vendorOrgId: string,
): Promise<VendorAccountSummary[]> {
  const { data: assignments, error: assignError } = await supabase
    .from("account_assignments")
    .select("buyer_org_id, commission_type, commission_value, organization:buyer_org_id(name, code, country_code, currency_code)")
    .eq("vendor_org_id", vendorOrgId)
    .eq("status", "active");

  if (assignError) throw assignError;

  const buyerOrgIds = (assignments ?? []).map((a) => a.buyer_org_id);

  if (buyerOrgIds.length === 0) return [];

  const { data: orderStats, error: orderError } = await supabase
    .from("orders")
    .select("ordering_org_id, created_at")
    .eq("vendor_org_id", vendorOrgId)
    .in("ordering_org_id", buyerOrgIds);

  if (orderError) throw orderError;

  const orderMap = new Map<string, { count: number; lastDate: string | null }>();
  for (const o of orderStats ?? []) {
    const existing = orderMap.get(o.ordering_org_id);
    if (!existing) {
      orderMap.set(o.ordering_org_id, { count: 1, lastDate: o.created_at });
    } else {
      existing.count++;
      if (!existing.lastDate || o.created_at > existing.lastDate) {
        existing.lastDate = o.created_at;
      }
    }
  }

  return (assignments ?? []).map((a) => {
    const org = Array.isArray(a.organization) ? a.organization[0] : a.organization;
    const stats = orderMap.get(a.buyer_org_id);
    return {
      buyer_org_id: a.buyer_org_id,
      org_name: org?.name ?? "—",
      org_code: org?.code ?? null,
      country_code: org?.country_code ?? null,
      currency_code: org?.currency_code ?? null,
      commission_type: a.commission_type as "rate" | "fixed",
      commission_value: Number(a.commission_value),
      order_count: stats?.count ?? 0,
      last_order_date: stats?.lastDate ?? null,
    };
  });
}

export type VendorCommissionFilters = {
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
};

export type VendorCommissionWithOrder = {
  id: string;
  order_id: string;
  commission_type: string;
  commission_value: number;
  commission_amount: number;
  status: string;
  payable_date: string | null;
  paid_at: string | null;
  created_at: string;
  order: { order_no: string; ordering_org_id: string } | null;
  buyer_name: string;
};

export type VendorCommissionSummaryStats = {
  totalEarned: number;
  pending: number;
  paid: number;
};

export async function getVendorCommissions(
  supabase: SupabaseClient,
  vendorOrgId: string,
  filters?: VendorCommissionFilters,
) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const from = Math.max((page - 1) * pageSize, 0);
  const to = from + pageSize - 1;

  let query = supabase
    .from("commissions")
    .select(
      "id, order_id, commission_type, commission_value, commission_amount, status, payable_date, paid_at, created_at, order:order_id(order_no, ordering_org_id)",
      { count: "exact" },
    )
    .eq("vendor_org_id", vendorOrgId)
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.fromDate) query = query.gte("created_at", filters.fromDate);
  if (filters?.toDate) query = query.lte("created_at", filters.toDate);

  const { data, count, error } = await query.range(from, to);
  if (error) throw error;

  const rows = data ?? [];
  const orderingOrgIds = [
    ...new Set(
      rows
        .map((r) => {
          const order = Array.isArray(r.order) ? r.order[0] : r.order;
          return order?.ordering_org_id;
        })
        .filter(Boolean) as string[],
    ),
  ];

  const orgNameMap = new Map<string, string>();
  if (orderingOrgIds.length > 0) {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", orderingOrgIds);
    for (const org of orgs ?? []) {
      orgNameMap.set(org.id, org.name);
    }
  }

  const mapped = rows.map((row) => {
    const order = Array.isArray(row.order) ? row.order[0] : row.order;
    return {
      id: row.id,
      order_id: row.order_id,
      commission_type: row.commission_type,
      commission_value: Number(row.commission_value),
      commission_amount: Number(row.commission_amount),
      status: row.status,
      payable_date: row.payable_date,
      paid_at: row.paid_at,
      created_at: row.created_at,
      order: order ? { order_no: order.order_no, ordering_org_id: order.ordering_org_id } : null,
      buyer_name: order ? (orgNameMap.get(order.ordering_org_id) ?? "—") : "—",
    };
  });

  return { data: mapped as VendorCommissionWithOrder[], count: count ?? 0 };
}

export async function getVendorCommissionSummary(
  supabase: SupabaseClient,
  vendorOrgId: string,
): Promise<VendorCommissionSummaryStats> {
  const { data, error } = await supabase
    .from("commissions")
    .select("commission_amount, status")
    .eq("vendor_org_id", vendorOrgId);

  if (error) throw error;

  let totalEarned = 0;
  let pending = 0;
  let paid = 0;

  for (const row of data ?? []) {
    const amount = Number(row.commission_amount ?? 0);
    totalEarned += amount;
    if (row.status === "paid") paid += amount;
    else pending += amount;
  }

  return { totalEarned, pending, paid };
}

export type VendorProductItem = {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  units_per_case: number | null;
  volume_value: number | null;
  volume_unit: string | null;
  barcode: string | null;
  cbm: number | null;
  status: string;
  is_managed: boolean;
  supply_type: "trading" | "pb" | null;
  buyer_count: number;
  buyer_names: string[];
};

export type VendorCommissionInfo = {
  buyer_org_id: string;
  buyer_name: string;
  commission_type: "rate" | "fixed";
  commission_value: number;
};

export async function getVendorProducts(
  supabase: SupabaseClient,
  vendorOrgId: string,
): Promise<{ products: VendorProductItem[]; commissions: VendorCommissionInfo[] }> {
  // 1. Get vendor's assigned buyers with commission info
  const { data: assignments, error: assignError } = await supabase
    .from("account_assignments")
    .select("buyer_org_id, commission_type, commission_value, organization:buyer_org_id(name)")
    .eq("vendor_org_id", vendorOrgId)
    .eq("status", "active");

  if (assignError) throw assignError;

  const buyerOrgIds = (assignments ?? []).map((a) => a.buyer_org_id);

  const commissions: VendorCommissionInfo[] = (assignments ?? []).map((a) => {
    const org = Array.isArray(a.organization) ? a.organization[0] : a.organization;
    return {
      buyer_org_id: a.buyer_org_id,
      buyer_name: org?.name ?? "—",
      commission_type: a.commission_type as "rate" | "fixed",
      commission_value: Number(a.commission_value),
    };
  });

  // 2. Get buyer_supplied_products for those buyers
  let suppliedMap = new Map<string, { supply_type: string; buyers: Set<string> }>();
  if (buyerOrgIds.length > 0) {
    const { data: supplied, error: supError } = await supabase
      .from("buyer_supplied_products")
      .select("product_id, buyer_org_id, supply_type")
      .in("buyer_org_id", buyerOrgIds);

    if (supError) throw supError;

    for (const row of supplied ?? []) {
      const existing = suppliedMap.get(row.product_id);
      if (existing) {
        existing.buyers.add(row.buyer_org_id);
      } else {
        suppliedMap.set(row.product_id, {
          supply_type: row.supply_type,
          buyers: new Set([row.buyer_org_id]),
        });
      }
    }
  }

  // 3. Get all active products
  const { data: allProducts, error: prodError } = await supabase
    .from("products")
    .select("id, name, sku, brand, category, image_url, units_per_case, volume_value, volume_unit, barcode, cbm, status")
    .eq("status", "active")
    .order("name");

  if (prodError) throw prodError;

  // Build buyer name lookup
  const buyerNameMap = new Map<string, string>();
  for (const c of commissions) {
    buyerNameMap.set(c.buyer_org_id, c.buyer_name);
  }

  // 4. Map products with managed status
  const products: VendorProductItem[] = (allProducts ?? []).map((p) => {
    const supplied = suppliedMap.get(p.id);
    const isManaged = !!supplied;
    const buyerNames = isManaged
      ? Array.from(supplied!.buyers).map((id) => buyerNameMap.get(id) ?? "—")
      : [];

    return {
      ...p,
      is_managed: isManaged,
      supply_type: isManaged ? (supplied!.supply_type as "trading" | "pb") : null,
      buyer_count: isManaged ? supplied!.buyers.size : 0,
      buyer_names: buyerNames,
    };
  });

  return { products, commissions };
}

export async function getVendorRecentOrders(
  supabase: SupabaseClient,
  vendorOrgId: string,
  limit = 5,
): Promise<VendorRecentOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_no, status, currency_code, vendor_commission_amount, created_at, organization:ordering_org_id(name, code)",
    )
    .eq("vendor_org_id", vendorOrgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    organization: Array.isArray(row.organization)
      ? row.organization[0] ?? null
      : row.organization,
  })) as VendorRecentOrder[];
}
