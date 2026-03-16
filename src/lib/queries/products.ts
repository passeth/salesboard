import type { BuyerProduct, ProductRow } from "@/types";
import { SupabaseClient } from "@supabase/supabase-js";

type ProductFilters = {
  brand?: string;
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function getActiveProducts(supabase: SupabaseClient, filters?: ProductFilters) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const from = Math.max((page - 1) * pageSize, 0);
  const to = from + pageSize - 1;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters?.brand) {
    query = query.eq("brand", filters.brand);
  }

  if (filters?.category) {
    query = query.eq("category", filters.category);
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

export async function getProductById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();

  return {
    data: (data ?? null) as ProductRow | null,
    error,
  };
}

export async function getProductBrands(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("products")
    .select("brand")
    .eq("status", "active")
    .not("brand", "is", null);

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

export async function getProductCategories(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("products")
    .select("category")
    .eq("status", "active")
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

type BuyerProductFilters = {
  brand?: string;
  category?: string;
  search?: string;
};

export async function getBuyerProducts(
  supabase: SupabaseClient,
  orgId: string,
  filters?: BuyerProductFilters,
): Promise<{ data: BuyerProduct[]; error: unknown }> {
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      `
      id,
      created_at,
      order_items (
        product_id,
        requested_qty
      )
    `,
    )
    .eq("ordering_org_id", orgId)
    .not("status", "in", '("draft","cancelled")');

  if (ordersError) return { data: [], error: ordersError };

  const productAgg = new Map<
    string,
    { order_count: number; total_requested_qty: number; last_order_qty: number; last_order_date: string | null }
  >();

  type OrderItemTuple = { product_id: string; requested_qty: number };

  for (const order of orders ?? []) {
    const items = (order.order_items ?? []) as OrderItemTuple[];
    for (const item of items) {
      const existing = productAgg.get(item.product_id);
      if (existing) {
        existing.order_count += 1;
        existing.total_requested_qty += item.requested_qty;
        if (!existing.last_order_date || order.created_at > existing.last_order_date) {
          existing.last_order_date = order.created_at;
          existing.last_order_qty = item.requested_qty;
        }
      } else {
        productAgg.set(item.product_id, {
          order_count: 1,
          total_requested_qty: item.requested_qty,
          last_order_qty: item.requested_qty,
          last_order_date: order.created_at,
        });
      }
    }
  }

  if (productAgg.size === 0) return { data: [], error: null };

  const productIds = Array.from(productAgg.keys());

  let query = supabase
    .from("products")
    .select("id, name, sku, brand, category, volume_value, volume_unit, image_url, barcode, units_per_case, cbm")
    .in("id", productIds)
    .eq("status", "active");

  if (filters?.brand) {
    query = query.eq("brand", filters.brand);
  }
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  if (filters?.search) {
    const search = filters.search.trim();
    if (search.length > 0) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }
  }

  const { data: products, error: productsError } = await query.order("name", { ascending: true });

  if (productsError) return { data: [], error: productsError };

  const result: BuyerProduct[] = (products ?? []).map((p) => {
    const agg = productAgg.get(p.id)!;
    return { ...p, ...agg };
  });

  result.sort((a, b) => b.total_requested_qty - a.total_requested_qty);

  return { data: result, error: null };
}
