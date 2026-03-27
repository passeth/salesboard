/** User roles matching DB schema (users.role) */
export enum UserRole {
  Buyer = "buyer",
  Vendor = "vendor",
  Sales = "sales",
  Logistics = "logistics",
  Admin = "admin",
}

/** Order status matching DB schema (orders.status) */
export enum OrderStatus {
  Draft = "draft",
  Submitted = "submitted",
  VendorReview = "vendor_review",
  SalesReview = "sales_review",
  NeedsBuyerDecision = "needs_buyer_decision",
  Confirmed = "confirmed",
  Rejected = "rejected",
  Invoiced = "invoiced",
  PartiallyShipped = "partially_shipped",
  Shipped = "shipped",
  Completed = "completed",
  Cancelled = "cancelled",
}

/** Order status display metadata */
export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; colorToken: string }
> = {
  [OrderStatus.Draft]: { label: "Draft", colorToken: "status-draft" },
  [OrderStatus.Submitted]: { label: "Submitted", colorToken: "status-submitted" },
  [OrderStatus.VendorReview]: { label: "Vendor Review", colorToken: "status-vendor-review" },
  [OrderStatus.SalesReview]: { label: "Sales Review", colorToken: "status-sales-review" },
  [OrderStatus.NeedsBuyerDecision]: { label: "Buyer Decision", colorToken: "status-needs-decision" },
  [OrderStatus.Confirmed]: { label: "Confirmed", colorToken: "status-confirmed" },
  [OrderStatus.Rejected]: { label: "Rejected", colorToken: "status-rejected" },
  [OrderStatus.Invoiced]: { label: "Invoiced", colorToken: "status-invoiced" },
  [OrderStatus.PartiallyShipped]: { label: "Partially Shipped", colorToken: "status-partially-shipped" },
  [OrderStatus.Shipped]: { label: "Shipped", colorToken: "status-shipped" },
  [OrderStatus.Completed]: { label: "Completed", colorToken: "status-completed" },
  [OrderStatus.Cancelled]: { label: "Cancelled", colorToken: "status-cancelled" },
};

import type {
  AccountAssignmentRow,
  BuyerProductPriceRow,
  ContactRow,
  InventoryLotRow,
  OrderItemRow,
  OrderRow,
  OrganizationRow,
  ProductBasePriceRow,
  ProductRow,
} from "./database";

export type OrderItemStatus =
  | "pending"
  | "under_review"
  | "confirmed"
  | "partial"
  | "rejected"
  | "cancelled";

export type OrgType = "internal" | "vendor" | "buyer_company" | "buyer" | "buyer_ship_to";

export type ViewMode = "grid" | "list";

export type {
  AccountAssignmentRow,
  BuyerProductPriceRow,
  ContactRow,
  ProductBasePriceRow,
  ProductRow,
  OrganizationRow,
  OrderRow,
  OrderItemRow,
  InventoryLotRow,
  BuyerSuppliedProductRow,
  MesLotReceiptRow,
  OrderEventRow,
  InvoiceRow,
  ShipmentRow,
  OrderPackingDraftRow,
  CommissionRow,
  DocumentRow,
  ProductMarketContentRow,
} from "./database";

/** Ship-to location with its default consignee contact */
export type ShipToWithContact = OrganizationRow & {
  consignee_contact: ContactRow | null;
};

export type CatalogProduct = Pick<
  ProductRow,
  "id" | "name" | "sku" | "brand" | "category" | "volume_value" | "volume_unit" | "image_url" | "barcode" | "units_per_case" | "cbm" | "status"
>;

export type OrderWithOrg = OrderRow & {
  organization: Pick<OrganizationRow, "name" | "code" | "currency_code"> & {
    parent_org_id?: string | null;
    org_type?: string;
    parent?: Pick<OrganizationRow, "name" | "code"> | null;
  };
  ship_to?: Pick<OrganizationRow, "name" | "code"> | null;
};

export type OrderItemWithProduct = OrderItemRow & {
  product: Pick<ProductRow, "name" | "sku" | "image_url" | "brand">;
};

export type InventoryLotWithProduct = InventoryLotRow & {
  product: Pick<ProductRow, "name" | "sku" | "units_per_case">;
};

export type LotFifoEntry = {
  lot_no: string;
  mfg_date: string;
  qty: number;
};

export type InventoryProductSummary = {
  product_id: string;
  sku: string;
  name: string;
  image_url: string | null;
  brand: string | null;
  category: string | null;
  current_stock: number;
  total_produced: number;
  lot_count: number;
  oldest_manufacturing_date: string | null;
  newest_manufacturing_date: string | null;
  lots_fifo: LotFifoEntry[];
  planned_qty: number;
  production_plans: ProductionPlanEntry[];
  committed_qty: number;
};

export type ProductionPlanEntry = {
  product_code: string;
  product_name: string;
  target_qty: number;
  completed_qty: number;
  remaining_qty: number;
  target_date: string;
  status: string;
  lot_no: string | null;
};

export type InventoryLotDetail = {
  lot_no: string;
  manufacturing_date: string;
  total_quantity: number;
  receipt_count: number;
  latest_receipt_date: string;
};

/** Product with buyer's order history aggregation */
export type BuyerProduct = Pick<
  ProductRow,
  "id" | "name" | "sku" | "brand" | "category" | "volume_value" | "volume_unit" | "image_url" | "barcode" | "units_per_case" | "cbm"
> & {
  order_count: number;
  total_requested_qty: number;
  last_order_qty: number;
  last_order_date: string | null;
};

/** Full product catalog for buyer — includes pricing, 3-month performance, and cart state */
export type BuyerCatalogProduct = Pick<
  ProductRow,
  | "id"
  | "name"
  | "sku"
  | "brand"
  | "category"
  | "volume_value"
  | "volume_unit"
  | "image_url"
  | "barcode"
  | "units_per_case"
  | "cbm"
  | "gross_weight"
> & {
  /** Last known supply price from most recent completed order (null if never traded) */
  last_unit_price: number | null;
  /** Total boxes shipped/completed in the last 3 months */
  shipped_qty_3m: number;
  /** Total boxes currently in the draft order (cart), 0 if not in cart */
  cart_qty: number;
  /** Whether this product has any prior order history with this buyer */
  has_trade_history: boolean;
  supply_type: "trading" | "pb" | "hidden" | null;
};

/** Buyer's draft order (cart) summary */
export type BuyerDraftOrder = {
  id: string;
  order_no: string;
  ship_to_org_id: string | null;
  requested_delivery_date: string | null;
  memo: string;
  items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    product_sku: string;
    image_url: string | null;
    requested_qty: number;
    units_per_case: number | null;
    unit_price: number | null;
    gross_weight: number | null;
    cbm: number | null;
  }>;
  created_at: string;
};

/** Account list page row — one per buyer_company org */
export type SalesAccountSummary = {
  org_id: string;
  org_name: string;
  org_code: string | null;
  country_code: string | null;
  currency_code: string | null;
  status: "active" | "inactive";
  /** Parent country org name */
  country_name: string | null;
  /** Vendor org name (null = direct) */
  vendor_name: string | null;
  vendor_org_id: string | null;
  /** Assigned sales user name */
  sales_user_name: string | null;
  /** Total order count (excl. draft/cancelled) */
  order_count: number;
  submitted_count: number;
  review_count: number;
  confirmed_count: number;
  completed_count: number;
  /** Total revenue (sum of final_qty * unit_price) */
  total_revenue: number;
  /** Last order date */
  last_order_date: string | null;
  /** Count of products with buyer-specific pricing set */
  priced_product_count: number;
};

/** Per-product pricing row for account detail pricing tab */
export type AccountPricingRow = {
  product_id: string;
  sku: string;
  product_name: string;
  brand: string | null;
  image_url: string | null;
  /** Current base price (KRW, from product_base_prices) */
  base_price: number | null;
  base_currency: string | null;
  /** Buyer-specific settlement price (EVAS receives) */
  settlement_price: number | null;
  /** Buyer-specific final price (buyer pays) */
  final_price: number | null;
  /** Buyer's currency */
  price_currency: string | null;
  /** buyer_product_prices.id (null = no pricing set) */
  price_id: string | null;
  /** Commission amount (final - settlement), 0 for direct */
  commission_amount: number;
  /** Has active orders for this product */
  has_orders: boolean;
  /** Supply type for this buyer: trading, pb, hidden, or null (available) */
  supply_type: "trading" | "pb" | "hidden" | null;
  /** Whether the product itself is active */
  product_status: "active" | "inactive";
};

/** Account performance stats */
export type AccountPerformanceStats = {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  total_items_ordered: number;
  currency_code: string | null;
  /** Monthly revenue for the last 12 months */
  monthly_revenue: Array<{
    month: string; // YYYY-MM
    revenue: number;
    order_count: number;
  }>;
  /** Top products by revenue */
  top_products: Array<{
    product_id: string;
    sku: string;
    product_name: string;
    total_qty: number;
    total_revenue: number;
  }>;
};

/** Account detail — overview tab data */
export type AccountOverview = {
  org: OrganizationRow;
  country: Pick<OrganizationRow, "id" | "name" | "country_code"> | null;
  ship_to_orgs: Array<Pick<OrganizationRow, "id" | "name" | "code" | "status">>;
  assignment: AccountAssignmentRow | null;
  vendor: Pick<OrganizationRow, "id" | "name" | "code"> | null;
  sales_user: { id: string; name: string; email: string } | null;
  logistics_user: { id: string; name: string; email: string } | null;
};
