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
