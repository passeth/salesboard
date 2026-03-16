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

import type { InventoryLotRow, OrderItemRow, OrderRow, OrganizationRow, ProductRow } from "./database";

export type OrderItemStatus =
  | "pending"
  | "under_review"
  | "confirmed"
  | "partial"
  | "rejected"
  | "cancelled";

export type OrgType = "internal" | "vendor" | "buyer_country" | "buyer_company" | "buyer_ship_to";

export type ViewMode = "grid" | "list";

export type {
  ProductRow,
  OrganizationRow,
  OrderRow,
  OrderItemRow,
  InventoryLotRow,
  MesLotReceiptRow,
  OrderEventRow,
  InvoiceRow,
  ShipmentRow,
  OrderPackingDraftRow,
  DocumentRow,
  ProductMarketContentRow,
} from "./database";

export type CatalogProduct = Pick<
  ProductRow,
  "id" | "name" | "sku" | "brand" | "category" | "volume_value" | "volume_unit" | "image_url" | "barcode" | "units_per_case" | "cbm" | "status"
>;

export type OrderWithOrg = OrderRow & {
  organization: Pick<OrganizationRow, "name" | "code">;
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
