import type { BuyerCatalogProduct, BuyerDraftOrder, BuyerProduct, ProductRow } from "@/types";
import { SupabaseClient } from "@supabase/supabase-js";

export const SUPPORTED_LOCALES = ["en", "zh", "ru", "vi", "ja", "my"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  zh: "中文",
  ru: "Русский",
  vi: "Tiếng Việt",
  ja: "日本語",
  my: "မြန်မာ",
};

/** "No translation available" message per locale */
export const NO_TRANSLATION_MSG: Record<SupportedLocale, string> = {
  en: "", // English uses original product name
  zh: "暂无翻译",
  ru: "Перевод недоступен",
  vi: "Chưa có bản dịch",
  ja: "翻訳がありません",
  my: "ဘာသာပြန်မရှိပါ",
};

/**
 * Fetch translated product names for a given locale.
 * Returns a Map<product_id, translated_name>.
 * For 'en', returns empty map (English is the base language in products.name).
 */
export async function getProductTranslations(
  supabase: SupabaseClient,
  locale: SupportedLocale,
): Promise<Map<string, string>> {
  if (locale === "en") return new Map();

  const { data, error } = await supabase
    .from("product_translations")
    .select("product_id, name")
    .eq("locale", locale);

  if (error || !data) return new Map();

  return new Map(data.map((row) => [row.product_id, row.name]));
}

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

type CatalogFilters = {
  search?: string;
  brand?: string;
  category?: string;
};

export async function getProductCatalogForBuyer(
  supabase: SupabaseClient,
  orgId: string,
  filters?: CatalogFilters,
): Promise<{ data: BuyerCatalogProduct[]; error: unknown }> {
  let productsQuery = supabase
    .from("products")
    .select("id, name, sku, brand, category, volume_value, volume_unit, image_url, barcode, units_per_case, cbm, gross_weight")
    .eq("status", "active");

  if (filters?.brand) productsQuery = productsQuery.eq("brand", filters.brand);
  if (filters?.category) productsQuery = productsQuery.eq("category", filters.category);
  if (filters?.search) {
    const s = filters.search.trim();
    if (s.length > 0) {
      productsQuery = productsQuery.or(`name.ilike.%${s}%,sku.ilike.%${s}%,barcode.ilike.%${s}%`);
    }
  }

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsCutoff = threeMonthsAgo.toISOString();

  const [productsResult, historyResult, shippedResult, draftResult, buyerPricesResult, supplyResult, otherPbResult] = await Promise.all([
    productsQuery.order("name", { ascending: true }),

    supabase
      .from("orders")
      .select(`id, created_at, order_items(product_id, unit_price, requested_qty)`)
      .eq("ordering_org_id", orgId)
      .not("status", "in", '("draft","cancelled")'),

    supabase
      .from("orders")
      .select(`id, order_items(product_id, final_qty, requested_qty)`)
      .eq("ordering_org_id", orgId)
      .in("status", ["shipped", "partially_shipped", "completed"])
      .gte("submitted_at", threeMonthsCutoff),

    supabase
      .from("orders")
      .select(`id, order_items(product_id, requested_qty)`)
      .eq("ordering_org_id", orgId)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(1),

    supabase
      .from("buyer_product_prices")
      .select("product_id, final_price")
      .eq("buyer_org_id", orgId)
      .is("effective_to", null),

    supabase
      .from("buyer_supplied_products")
      .select("product_id, supply_type")
      .eq("buyer_org_id", orgId),

    supabase
      .from("buyer_supplied_products")
      .select("product_id")
      .neq("buyer_org_id", orgId)
      .eq("is_pb_protected", true),
  ]);

  if (productsResult.error) return { data: [], error: productsResult.error };

  type ItemTuple = { product_id: string; unit_price: number | null; requested_qty: number };
  type ShippedTuple = { product_id: string; final_qty: number | null; requested_qty: number };
  type CartTuple = { product_id: string; requested_qty: number };
  type BuyerPriceTuple = { product_id: string; final_price: number };

  const buyerPriceMap = new Map<string, number>();
  for (const bp of (buyerPricesResult.data ?? []) as BuyerPriceTuple[]) {
    buyerPriceMap.set(bp.product_id, bp.final_price);
  }

  const orderPriceMap = new Map<string, number>();
  const tradedProducts = new Set<string>();

  const sortedOrders = [...(historyResult.data ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  for (const order of sortedOrders) {
    for (const item of (order.order_items ?? []) as ItemTuple[]) {
      tradedProducts.add(item.product_id);
      if (!orderPriceMap.has(item.product_id) && item.unit_price != null) {
        orderPriceMap.set(item.product_id, item.unit_price);
      }
    }
  }

  const shipped3mMap = new Map<string, number>();
  for (const order of shippedResult.data ?? []) {
    for (const item of (order.order_items ?? []) as ShippedTuple[]) {
      const qty = item.final_qty ?? item.requested_qty;
      shipped3mMap.set(item.product_id, (shipped3mMap.get(item.product_id) ?? 0) + qty);
    }
  }

  const cartMap = new Map<string, number>();
  const draftOrders = draftResult.data ?? [];
  // DEBUG: temporary logging to diagnose cart_qty not showing
  console.log("[getProductCatalogForBuyer] draftResult.error:", draftResult.error);
  console.log("[getProductCatalogForBuyer] draftOrders.length:", draftOrders.length);
  if (draftOrders.length > 0) {
    console.log("[getProductCatalogForBuyer] order_items count:", (draftOrders[0].order_items ?? []).length);
    for (const item of (draftOrders[0].order_items ?? []) as CartTuple[]) {
      cartMap.set(item.product_id, (cartMap.get(item.product_id) ?? 0) + item.requested_qty);
    }
  }
  console.log("[getProductCatalogForBuyer] cartMap.size:", cartMap.size);

  type SupplyTuple = { product_id: string; supply_type: "trading" | "pb" | "hidden" };
  const supplyTypeMap = new Map<string, "trading" | "pb" | "hidden">();
  for (const s of (supplyResult.data ?? []) as SupplyTuple[]) {
    supplyTypeMap.set(s.product_id, s.supply_type);
  }

  const otherPbIds = new Set<string>();
  for (const row of (otherPbResult.data ?? []) as { product_id: string }[]) {
    const myType = supplyTypeMap.get(row.product_id);
    if (myType !== "trading" && myType !== "pb") {
      otherPbIds.add(row.product_id);
    }
  }

  const products = productsResult.data ?? [];
  const supplied = products.filter((p) => !otherPbIds.has(p.id));
  const result: BuyerCatalogProduct[] = supplied.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    brand: p.brand,
    category: p.category,
    volume_value: p.volume_value,
    volume_unit: p.volume_unit,
    image_url: p.image_url,
    barcode: p.barcode,
    units_per_case: p.units_per_case,
    cbm: p.cbm,
    gross_weight: p.gross_weight,
    last_unit_price: buyerPriceMap.get(p.id) ?? orderPriceMap.get(p.id) ?? null,
    shipped_qty_3m: shipped3mMap.get(p.id) ?? 0,
    cart_qty: cartMap.get(p.id) ?? 0,
    has_trade_history: tradedProducts.has(p.id),
    supply_type: supplyTypeMap.get(p.id) ?? null,
  }));

  return { data: result, error: null };
}

export async function getBuyerDraftOrder(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ data: BuyerDraftOrder | null; error: unknown }> {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_no, ship_to_org_id, requested_delivery_date, metadata_json, created_at")
    .eq("ordering_org_id", orgId)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return { data: null, error };
  if (!orders || orders.length === 0) return { data: null, error: null };

  const order = orders[0];

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("id, product_id, requested_qty, units_per_case, unit_price, product:product_id(name, sku, image_url, gross_weight, cbm)")
    .eq("order_id", order.id)
    .order("line_no", { ascending: true });

  if (itemsError) return { data: null, error: itemsError };

  type ProductJoin = { name: string; sku: string; image_url: string | null; gross_weight: number | null; cbm: number | null };

  type DraftItemRaw = {
    id: string;
    product_id: string;
    requested_qty: number;
    units_per_case: number | null;
    unit_price: number | null;
    product: ProductJoin | ProductJoin[];
  };

  const meta = (order.metadata_json ?? {}) as Record<string, string>;
  const rawItems = (items ?? []) as unknown as DraftItemRaw[];

  return {
    data: {
      id: order.id,
      order_no: order.order_no,
      ship_to_org_id: order.ship_to_org_id,
      requested_delivery_date: order.requested_delivery_date,
      memo: meta.memo ?? "",
      items: rawItems.map((item) => {
        const p = Array.isArray(item.product) ? item.product[0] : item.product;
        return {
          id: item.id,
          product_id: item.product_id,
          product_name: p?.name ?? "",
          product_sku: p?.sku ?? "",
          image_url: p?.image_url ?? null,
          requested_qty: item.requested_qty,
          units_per_case: item.units_per_case,
          unit_price: item.unit_price,
          gross_weight: p?.gross_weight ?? null,
          cbm: p?.cbm ?? null,
        };
      }),
      created_at: order.created_at,
    },
    error: null,
  };
}
