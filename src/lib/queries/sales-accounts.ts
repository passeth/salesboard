import type {
  AccountOverview,
  AccountPerformanceStats,
  AccountPricingRow,
  SalesAccountSummary,
} from "@/types";
import type { AccountAssignmentRow, BuyerProductPriceRow } from "@/types/database";
import { SupabaseClient } from "@supabase/supabase-js";

export type AccountListFilters = {
  search?: string;
  country?: string;
  hasVendor?: "yes" | "no";
  sort?: string;
  sortDir?: "asc" | "desc";
};

export async function getSalesAccounts(
  supabase: SupabaseClient,
  filters?: AccountListFilters,
): Promise<{ data: SalesAccountSummary[]; error: unknown }> {
  const { data: orgs, error: orgsError } = await supabase
    .from("organizations")
    .select("id, name, code, country_code, currency_code, status, parent_org_id")
    .eq("org_type", "buyer_company")
    .order("name", { ascending: true });

  if (orgsError) return { data: [], error: orgsError };

  const orgList = orgs ?? [];
  const orgIds = orgList.map((o) => o.id);

  if (orgIds.length === 0) return { data: [], error: null };

  const [assignmentsResult, ordersResult, pricesResult] = await Promise.all([
    supabase
      .from("account_assignments")
      .select("buyer_org_id, vendor_org_id, sales_user_id")
      .in("buyer_org_id", orgIds)
      .eq("status", "active"),
    supabase
      .from("orders")
      .select("ordering_org_id, id, created_at, status")
      .in("ordering_org_id", orgIds)
      .neq("status", "cancelled"),
    supabase
      .from("buyer_product_prices")
      .select("buyer_org_id")
      .in("buyer_org_id", orgIds)
      .is("effective_to", null),
  ]);

  const assignmentMap = new Map<string, { vendor_org_id: string | null; sales_user_id: string }>();
  for (const a of assignmentsResult.data ?? []) {
    assignmentMap.set(a.buyer_org_id, a);
  }

  const vendorOrgIds = new Set<string>();
  const salesUserIds = new Set<string>();
  for (const a of assignmentsResult.data ?? []) {
    if (a.vendor_org_id) vendorOrgIds.add(a.vendor_org_id);
    if (a.sales_user_id) salesUserIds.add(a.sales_user_id);
  }

  const [vendorResult, salesUserResult] = await Promise.all([
    vendorOrgIds.size > 0
      ? supabase.from("organizations").select("id, name").in("id", Array.from(vendorOrgIds))
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    salesUserIds.size > 0
      ? supabase.from("users").select("id, name").in("id", Array.from(salesUserIds))
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const vendorNameMap = new Map<string, string>();
  for (const v of vendorResult.data ?? []) vendorNameMap.set(v.id, v.name);

  const salesUserNameMap = new Map<string, string>();
  for (const u of salesUserResult.data ?? []) salesUserNameMap.set(u.id, u.name);

  const SUBMITTED_STATUSES = new Set(["submitted"]);
  const REVIEW_STATUSES = new Set(["vendor_review", "sales_review", "needs_buyer_decision"]);
  const CONFIRMED_STATUSES = new Set(["confirmed", "invoiced", "partially_shipped", "shipped"]);
  const COMPLETED_STATUSES = new Set(["completed"]);

  type OrderTuple = { ordering_org_id: string; id: string; created_at: string; status: string };
  const ordersByOrg = new Map<string, OrderTuple[]>();
  for (const o of (ordersResult.data ?? []) as OrderTuple[]) {
    const arr = ordersByOrg.get(o.ordering_org_id) ?? [];
    arr.push(o);
    ordersByOrg.set(o.ordering_org_id, arr);
  }

  const priceCountMap = new Map<string, number>();
  for (const p of pricesResult.data ?? []) {
    priceCountMap.set(p.buyer_org_id, (priceCountMap.get(p.buyer_org_id) ?? 0) + 1);
  }

  const countryNames = new Intl.DisplayNames(["ko"], { type: "region" });

  let results: SalesAccountSummary[] = orgList.map((org) => {
    const assignment = assignmentMap.get(org.id);
    const orders = ordersByOrg.get(org.id) ?? [];
    const lastOrder = orders.length > 0
      ? orders.reduce((a, b) => (a.created_at > b.created_at ? a : b))
      : null;

    return {
      org_id: org.id,
      org_name: org.name,
      org_code: org.code,
      country_code: org.country_code,
      currency_code: org.currency_code,
      status: org.status as "active" | "inactive",
      country_name: org.country_code ? (countryNames.of(org.country_code) ?? org.country_code) : null,
      vendor_name: assignment?.vendor_org_id ? (vendorNameMap.get(assignment.vendor_org_id) ?? null) : null,
      vendor_org_id: assignment?.vendor_org_id ?? null,
      sales_user_name: assignment?.sales_user_id ? (salesUserNameMap.get(assignment.sales_user_id) ?? null) : null,
      order_count: orders.filter((o) => o.status !== "draft").length,
      submitted_count: orders.filter((o) => SUBMITTED_STATUSES.has(o.status)).length,
      review_count: orders.filter((o) => REVIEW_STATUSES.has(o.status)).length,
      confirmed_count: orders.filter((o) => CONFIRMED_STATUSES.has(o.status)).length,
      completed_count: orders.filter((o) => COMPLETED_STATUSES.has(o.status)).length,
      total_revenue: 0,
      last_order_date: lastOrder?.created_at ?? null,
      priced_product_count: priceCountMap.get(org.id) ?? 0,
    };
  });

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    results = results.filter(
      (r) =>
        r.org_name.toLowerCase().includes(s) ||
        (r.org_code && r.org_code.toLowerCase().includes(s)),
    );
  }

  if (filters?.country) {
    results = results.filter((r) => r.country_code === filters.country);
  }

  if (filters?.hasVendor === "yes") {
    results = results.filter((r) => r.vendor_org_id !== null);
  } else if (filters?.hasVendor === "no") {
    results = results.filter((r) => r.vendor_org_id === null);
  }

  return { data: results, error: null };
}

export async function getAccountOverview(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ data: AccountOverview | null; error: unknown }> {
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .eq("org_type", "buyer_company")
    .maybeSingle();

  if (orgError || !org) return { data: null, error: orgError };

  const [countryResult, shipToResult, assignmentResult] = await Promise.all([
    org.parent_org_id
      ? supabase
          .from("organizations")
          .select("id, name, country_code")
          .eq("id", org.parent_org_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("organizations")
      .select("id, name, code, status")
      .eq("parent_org_id", orgId)
      .eq("org_type", "buyer_ship_to")
      .order("name"),
    supabase
      .from("account_assignments")
      .select("*")
      .eq("buyer_org_id", orgId)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  const assignment = (assignmentResult.data as AccountAssignmentRow | null) ?? null;

  const [vendorResult, salesUserResult, logisticsUserResult] = await Promise.all([
    assignment?.vendor_org_id
      ? supabase
          .from("organizations")
          .select("id, name, code")
          .eq("id", assignment.vendor_org_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    assignment?.sales_user_id
      ? supabase
          .from("users")
          .select("id, name, email")
          .eq("id", assignment.sales_user_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    assignment?.logistics_user_id
      ? supabase
          .from("users")
          .select("id, name, email")
          .eq("id", assignment.logistics_user_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    data: {
      org,
      country: countryResult.data,
      ship_to_orgs: (shipToResult.data ?? []) as AccountOverview["ship_to_orgs"],
      assignment,
      vendor: vendorResult.data,
      sales_user: salesUserResult.data,
      logistics_user: logisticsUserResult.data,
    },
    error: null,
  };
}

export async function getAccountPricing(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ data: AccountPricingRow[]; error: unknown }> {
  const [productsResult, pricesResult, basePricesResult, orderedProductsResult, suppliedResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, sku, name, brand, image_url, status")
      .order("name"),
    supabase
      .from("buyer_product_prices")
      .select("*")
      .eq("buyer_org_id", orgId)
      .is("effective_to", null),
    supabase
      .from("product_base_prices")
      .select("product_id, base_price, currency_code")
      .is("effective_to", null),
    supabase
      .from("orders")
      .select("order_items(product_id)")
      .eq("ordering_org_id", orgId)
      .not("status", "in", '("draft","cancelled")'),
    supabase
      .from("buyer_supplied_products")
      .select("product_id, supply_type")
      .eq("buyer_org_id", orgId),
  ]);

  if (productsResult.error) return { data: [], error: productsResult.error };

  const priceMap = new Map<string, BuyerProductPriceRow>();
  for (const p of (pricesResult.data ?? []) as BuyerProductPriceRow[]) {
    priceMap.set(p.product_id, p);
  }

  const basePriceMap = new Map<string, { base_price: number; currency_code: string }>();
  for (const bp of basePricesResult.data ?? []) {
    basePriceMap.set(bp.product_id, bp);
  }

  const orderedProductIds = new Set<string>();
  for (const order of orderedProductsResult.data ?? []) {
    for (const item of (order.order_items ?? []) as { product_id: string }[]) {
      orderedProductIds.add(item.product_id);
    }
  }

  const suppliedMap = new Map<string, string>();
  for (const sp of (suppliedResult.data ?? []) as { product_id: string; supply_type: string }[]) {
    suppliedMap.set(sp.product_id, sp.supply_type);
  }

  type ProductTuple = { id: string; sku: string; name: string; brand: string | null; image_url: string | null; status: string };

  const rows: AccountPricingRow[] = (productsResult.data as ProductTuple[]).map((p) => {
    const price = priceMap.get(p.id);
    const basePrice = basePriceMap.get(p.id);
    const settlement = price?.settlement_price ?? null;
    const final_ = price?.final_price ?? null;

    return {
      product_id: p.id,
      sku: p.sku,
      product_name: p.name,
      brand: p.brand,
      image_url: p.image_url,
      base_price: basePrice?.base_price ?? null,
      base_currency: basePrice?.currency_code ?? null,
      settlement_price: settlement,
      final_price: final_,
      price_currency: price?.currency_code ?? null,
      price_id: price?.id ?? null,
      commission_amount: settlement !== null && final_ !== null ? final_ - settlement : 0,
      has_orders: orderedProductIds.has(p.id),
      supply_type: (suppliedMap.get(p.id) as "trading" | "pb" | "hidden") ?? null,
      product_status: p.status as "active" | "inactive",
    };
  });

  return { data: rows, error: null };
}

export async function getAccountPerformance(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ data: AccountPerformanceStats | null; error: unknown }> {
  const { data: org } = await supabase
    .from("organizations")
    .select("currency_code")
    .eq("id", orgId)
    .maybeSingle();

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, created_at, currency_code, order_items(product_id, final_qty, requested_qty, unit_price, product:product_id(name, sku))")
    .eq("ordering_org_id", orgId)
    .not("status", "in", '("draft","cancelled")')
    .order("created_at", { ascending: false });

  if (ordersError) return { data: null, error: ordersError };

  type OrderItemTuple = {
    product_id: string;
    final_qty: number | null;
    requested_qty: number;
    unit_price: number | null;
    product: { name: string; sku: string } | { name: string; sku: string }[];
  };

  let totalRevenue = 0;
  let totalItems = 0;
  const monthlyMap = new Map<string, { revenue: number; order_count: number }>();
  const productMap = new Map<string, { sku: string; product_name: string; total_qty: number; total_revenue: number }>();

  for (const order of orders ?? []) {
    const month = order.created_at.slice(0, 7);
    const monthData = monthlyMap.get(month) ?? { revenue: 0, order_count: 0 };
    monthData.order_count += 1;

    for (const item of (order.order_items ?? []) as OrderItemTuple[]) {
      const qty = item.final_qty ?? item.requested_qty;
      const revenue = qty * (item.unit_price ?? 0);
      totalRevenue += revenue;
      totalItems += qty;
      monthData.revenue += revenue;

      const product = Array.isArray(item.product) ? item.product[0] : item.product;
      const existing = productMap.get(item.product_id);
      if (existing) {
        existing.total_qty += qty;
        existing.total_revenue += revenue;
      } else {
        productMap.set(item.product_id, {
          sku: product?.sku ?? "",
          product_name: product?.name ?? "",
          total_qty: qty,
          total_revenue: revenue,
        });
      }
    }

    monthlyMap.set(month, monthData);
  }

  const totalOrders = (orders ?? []).length;

  const monthlyRevenue = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12)
    .reverse();

  const topProducts = Array.from(productMap.entries())
    .map(([product_id, data]) => ({ product_id, ...data }))
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 10);

  return {
    data: {
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      avg_order_value: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      total_items_ordered: totalItems,
      currency_code: org?.currency_code ?? null,
      monthly_revenue: monthlyRevenue,
      top_products: topProducts,
    },
    error: null,
  };
}

export async function getAccountCountries(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data } = await supabase
    .from("organizations")
    .select("country_code")
    .eq("org_type", "buyer_company")
    .not("country_code", "is", null);

  const codes = new Set<string>();
  for (const row of data ?? []) {
    if (row.country_code) codes.add(row.country_code);
  }
  return Array.from(codes).sort();
}

export async function getInternalUsers(
  supabase: SupabaseClient,
): Promise<{ id: string; name: string; email: string; role: string }[]> {
  const { data } = await supabase
    .from("users")
    .select("id, name, email, role")
    .in("role", ["sales", "logistics", "admin"])
    .eq("status", "active")
    .order("name");

  return (data ?? []) as { id: string; name: string; email: string; role: string }[];
}

export async function getVendorOrganizations(
  supabase: SupabaseClient,
): Promise<{ id: string; name: string; code: string | null }[]> {
  const { data } = await supabase
    .from("organizations")
    .select("id, name, code")
    .eq("org_type", "vendor")
    .eq("status", "active")
    .order("name");

  return (data ?? []) as { id: string; name: string; code: string | null }[];
}

export async function getBuyerOrgList(
  supabase: SupabaseClient,
): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("org_type", "buyer_company")
    .eq("status", "active")
    .order("name");

  return (data ?? []) as { id: string; name: string }[];
}
