/** Buyer-friendly status tab groups */
export const BUYER_STATUS_TABS = [
  { key: "all", label: "All", statuses: [] as string[] },
  { key: "draft", label: "Draft", statuses: ["draft"] },
  { key: "submitted", label: "Submitted", statuses: ["submitted"] },
  {
    key: "review",
    label: "Review",
    statuses: ["vendor_review", "sales_review", "needs_buyer_decision"],
  },
  { key: "confirmed", label: "Confirmed", statuses: ["confirmed"] },
  {
    key: "shipping",
    label: "Shipping",
    statuses: ["invoiced", "partially_shipped", "shipped"],
  },
  { key: "completed", label: "Completed", statuses: ["completed"] },
] as const;

export type BuyerStatusTabKey = (typeof BUYER_STATUS_TABS)[number]["key"];
