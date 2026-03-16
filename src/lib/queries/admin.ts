import { OrderStatus } from "@/types";
import type { InventoryLotDetail, InventoryProductSummary, ProductionPlanEntry } from "@/types";
import { OrderRow, OrganizationRow, ProductRow, UserRow } from "@/types/database";
import { SupabaseClient } from "@supabase/supabase-js";

export type UserWithOrg = UserRow & {
  organization: Pick<OrganizationRow, "name" | "code">;
};

export type AdminStats = {
  totalOrders: number;
  activeUsers: number;
  totalProducts: number;
  totalOrgs: number;
};

export type OrderPipelineStat = {
  status: string;
  count: number;
};

export type AdminUsersFilters = {
  role?: string;
  status?: string;
  sort?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type AdminProductsFilters = {
  brand?: string;
  category?: string;
  status?: string;
  search?: string;
  sort?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type AdminOrdersFilters = {
  status?: string;
  orgId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  sort?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type AdminOrderWithRelations = OrderRow & {
  organization: Pick<OrganizationRow, "name" | "code">;
  sales_owner: Pick<UserRow, "name" | "email"> | null;
};

export type AdminOrderFilterOption = {
  id: string;
  name: string;
  code: string | null;
};

export type AdminOrganizationsFilters = {
  org_type?: string;
  status?: string;
  search?: string;
  sort?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type OrganizationWithParent = Pick<
  OrganizationRow,
  | "id"
  | "name"
  | "code"
  | "org_type"
  | "parent_org_id"
  | "country_code"
  | "currency_code"
  | "status"
  | "created_at"
> & {
  parent: Pick<OrganizationRow, "name"> | null;
};

export async function getAdminStats(supabase: SupabaseClient): Promise<AdminStats> {
  const [ordersResult, usersResult, productsResult, organizationsResult] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("organizations").select("id", { count: "exact", head: true }),
  ]);

  if (ordersResult.error) {
    throw ordersResult.error;
  }

  if (usersResult.error) {
    throw usersResult.error;
  }

  if (productsResult.error) {
    throw productsResult.error;
  }

  if (organizationsResult.error) {
    throw organizationsResult.error;
  }

  return {
    totalOrders: ordersResult.count ?? 0,
    activeUsers: usersResult.count ?? 0,
    totalProducts: productsResult.count ?? 0,
    totalOrgs: organizationsResult.count ?? 0,
  };
}

export async function getOrderPipeline(supabase: SupabaseClient): Promise<OrderPipelineStat[]> {
  const { data, error } = await supabase.from("orders").select("status");

  if (error) {
    throw error;
  }

  const counts = (data ?? []).reduce<Record<string, number>>((acc, row) => {
    const key = row.status;
    if (!key) {
      return acc;
    }

    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return Object.values(OrderStatus).map((status) => ({
    status,
    count: counts[status] ?? 0,
  }));
}

export async function getAdminUsers(supabase: SupabaseClient, filters?: AdminUsersFilters) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const from = Math.max((page - 1) * pageSize, 0);
  const to = from + pageSize - 1;

  let query = supabase
    .from("users")
    .select("*, organization:org_id(name, code)", { count: "exact" })
    .order(filters?.sort ?? "created_at", { ascending: filters?.sortDir === "asc" });

  if (filters?.role) {
    query = query.eq("role", filters.role);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, count, error } = await query.range(from, to);

  return {
    data: (data ?? []) as UserWithOrg[],
    count: count ?? 0,
    error,
  };
}

export async function getAdminProducts(supabase: SupabaseClient, filters?: AdminProductsFilters) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const from = Math.max((page - 1) * pageSize, 0);
  const to = from + pageSize - 1;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .order(filters?.sort ?? "created_at", { ascending: filters?.sortDir === "asc" });

  if (filters?.brand) {
    query = query.eq("brand", filters.brand);
  }

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.search) {
    const search = filters.search.trim();

    if (search.length > 0) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`);
    }
  }

  const { data, count, error } = await query.range(from, to);

  return {
    data: (data ?? []) as ProductRow[],
    count: count ?? 0,
    error,
  };
}

export async function getAdminOrganizations(
  supabase: SupabaseClient,
  filters?: AdminOrganizationsFilters,
) {
  type OrganizationWithParentRaw = Omit<OrganizationWithParent, "parent"> & {
    parent: Pick<OrganizationRow, "name">[] | null;
  };

  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const from = Math.max((page - 1) * pageSize, 0);
  const to = from + pageSize - 1;

  let query = supabase
    .from("organizations")
    .select(
      "id, name, code, org_type, parent_org_id, country_code, currency_code, status, created_at, parent:parent_org_id(name)",
      { count: "exact" },
    )
    .order(filters?.sort ?? "created_at", { ascending: filters?.sortDir === "asc" });

  if (filters?.org_type) {
    query = query.eq("org_type", filters.org_type);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.search) {
    const search = filters.search.trim();

    if (search.length > 0) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }
  }

  const { data, count, error } = await query.range(from, to);

  return {
    data: ((data ?? []) as OrganizationWithParentRaw[]).map((organization) => ({
      ...organization,
      parent: organization.parent?.[0] ?? null,
    })),
    count: count ?? 0,
    error,
  };
}

export async function getProductBrandsForAdmin(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("products").select("brand").not("brand", "is", null);

  if (error || !data) {
    return [];
  }

  const brands = new Set<string>();
  data.forEach((row) => {
    if (typeof row.brand === "string" && row.brand.length > 0) {
      brands.add(row.brand);
    }
  });

  return Array.from(brands).sort((a, b) => a.localeCompare(b));
}

export async function getProductCategoriesForAdmin(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("products")
    .select("category")
    .not("category", "is", null);

  if (error || !data) {
    return [];
  }

  const categories = new Set<string>();
  data.forEach((row) => {
    if (typeof row.category === "string" && row.category.length > 0) {
      categories.add(row.category);
    }
  });

  return Array.from(categories).sort((a, b) => a.localeCompare(b));
}

export async function getAdminOrders(supabase: SupabaseClient, filters?: AdminOrdersFilters) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const from = Math.max((page - 1) * pageSize, 0);
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select("*, organization:ordering_org_id(name, code), sales_owner:sales_owner_user_id(name, email)", {
      count: "exact",
    })
    .order(filters?.sort ?? "created_at", { ascending: filters?.sortDir === "asc" });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.orgId) {
    query = query.eq("ordering_org_id", filters.orgId);
  }

  if (filters?.fromDate) {
    query = query.gte("created_at", filters.fromDate);
  }

  if (filters?.toDate) {
    query = query.lte("created_at", filters.toDate);
  }

  if (filters?.search) {
    const search = filters.search.trim();

    if (search.length > 0) {
      query = query.ilike("order_no", `%${search}%`);
    }
  }

  const { data, count, error } = await query.range(from, to);

  return {
    data: (data ?? []) as AdminOrderWithRelations[],
    count: count ?? 0,
    error,
  };
}

export type AdminInventoryFilters = {
  search?: string;
  sort?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export async function getInventorySummary(
  supabase: SupabaseClient,
  filters?: AdminInventoryFilters,
) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const offset = Math.max((page - 1) * pageSize, 0);

  const { data, error } = await supabase.rpc("get_inventory_summary", {
    p_search: filters?.search || null,
    p_sort: filters?.sort || "sku",
    p_sort_dir: filters?.sortDir || "asc",
    p_offset: offset,
    p_limit: pageSize,
  });

  if (error) throw error;

  const rows = (data ?? []) as (InventoryProductSummary & { total_count: number })[];
  const totalCount = rows.length > 0 ? rows[0].total_count : 0;

  return {
    data: rows.map(({ total_count: _, ...rest }) => rest) as InventoryProductSummary[],
    count: totalCount,
  };
}

export async function getProductLotDetails(
  supabase: SupabaseClient,
  productId: string,
) {
  const { data, error } = await supabase.rpc("get_product_lot_details", {
    p_product_id: productId,
  });

  if (error) throw error;

  return (data ?? []) as InventoryLotDetail[];
}

export type MesProductionPlanRow = {
  product_code: string;
  product_name: string;
  target_qty: number;
  completed_qty: number | null;
  target_date: string;
  status: string;
  lot_no: string | null;
};

export async function getProductionPlans(mesClient: SupabaseClient): Promise<Map<string, ProductionPlanEntry[]>> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await mesClient
    .from("v_production_plans_v2_full")
    .select("product_code, product_name, target_qty, completed_qty, target_date, status, lot_no")
    .in("status", ["planned", "in_progress"])
    .gte("target_date", today);

  if (error) throw error;

  const map = new Map<string, ProductionPlanEntry[]>();

  for (const row of (data ?? []) as MesProductionPlanRow[]) {
    const completed = row.completed_qty ?? 0;
    const remaining = Math.max(row.target_qty - completed, 0);
    if (remaining <= 0) continue;

    const entry: ProductionPlanEntry = {
      product_code: row.product_code,
      product_name: row.product_name,
      target_qty: row.target_qty,
      completed_qty: completed,
      remaining_qty: remaining,
      target_date: row.target_date,
      status: row.status,
      lot_no: row.lot_no,
    };

    const existing = map.get(row.product_code) ?? [];
    existing.push(entry);
    map.set(row.product_code, existing);
  }

  return map;
}

const COMMITTED_ORDER_STATUSES = ["confirmed", "invoiced", "partially_shipped", "shipped"];

export async function getCommittedOrderQuantities(supabase: SupabaseClient): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("order_items")
    .select("product_id, final_qty, orders!inner(status)")
    .in("orders.status", COMMITTED_ORDER_STATUSES);

  if (error) throw error;

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const productId = row.product_id as string;
    const qty = (row.final_qty as number) ?? 0;
    map.set(productId, (map.get(productId) ?? 0) + qty);
  }

  return map;
}

export async function getAdminOrderFilterOptions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("orders")
    .select("ordering_org_id, organization:ordering_org_id(name, code)")
    .not("ordering_org_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const map = new Map<string, AdminOrderFilterOption>();

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
