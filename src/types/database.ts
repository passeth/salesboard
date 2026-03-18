export type OrganizationRow = {
  id: string;
  parent_org_id: string | null;
  org_type: "internal" | "vendor" | "buyer_country" | "buyer_company" | "buyer_ship_to";
  code: string | null;
  name: string;
  country_code: string | null;
  currency_code: string | null;
  status: "active" | "inactive";
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  category: string | null;
  volume_value: number | null;
  volume_unit: string | null;
  barcode: string | null;
  qr_code: string | null;
  net_weight: number | null;
  gross_weight: number | null;
  units_per_case: number | null;
  case_length: number | null;
  case_width: number | null;
  case_height: number | null;
  cbm: number | null;
  hs_code: string | null;
  image_url: string | null;
  status: "active" | "inactive";
  extra_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type UserRow = {
  id: string;
  org_id: string;
  role: "buyer" | "vendor" | "sales" | "logistics" | "admin";
  name: string;
  email: string;
  phone: string | null;
  locale: string;
  status: "active" | "inactive";
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderRow = {
  id: string;
  order_no: string;
  ordering_org_id: string;
  ship_to_org_id: string | null;
  requested_by_user_id: string | null;
  vendor_org_id: string | null;
  sales_owner_user_id: string;
  logistics_owner_user_id: string | null;
  status:
    | "draft"
    | "submitted"
    | "vendor_review"
    | "sales_review"
    | "needs_buyer_decision"
    | "confirmed"
    | "rejected"
    | "partially_shipped"
    | "shipped"
    | "completed"
    | "cancelled";
  currency_code: string;
  requested_delivery_date: string | null;
  confirmed_delivery_date: string | null;
  status_reason: string | null;
  vendor_commission_type: "rate" | "fixed" | null;
  vendor_commission_value: number | null;
  vendor_commission_amount: number | null;
  submitted_at: string | null;
  confirmed_at: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  line_no: number;
  product_id: string;
  requested_qty: number;
  vendor_confirmed_qty: number | null;
  sales_confirmed_qty: number | null;
  final_qty: number | null;
  unit_price: number | null;
  requested_ship_date: string | null;
  confirmed_ship_date: string | null;
  allocation_type: "stock" | "production" | "mixed" | null;
  min_remaining_shelf_life_days: number | null;
  status: "pending" | "under_review" | "confirmed" | "partial" | "rejected" | "cancelled";
  decision_note: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  units_per_case: number | null;
  readonly requested_unit_qty: number;
  readonly vendor_confirmed_unit_qty: number | null;
  readonly sales_confirmed_unit_qty: number | null;
  readonly final_unit_qty: number | null;
};

export type OrderEventRow = {
  id: string;
  order_id: string;
  order_item_id: string | null;
  actor_user_id: string | null;
  actor_role: string | null;
  event_type:
    | "submitted"
    | "vendor_approved"
    | "vendor_adjusted"
    | "sales_approved"
    | "sales_adjusted"
    | "buyer_decision_requested"
    | "buyer_decision_received"
    | "inventory_shortage"
    | "expiry_warning"
    | "production_reallocated"
    | "invoice_issued"
    | "shipment_confirmed";
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  payload_json: Record<string, unknown>;
  created_at: string;
};

export type InvoiceRow = {
  id: string;
  invoice_no: string;
  order_id: string;
  issued_by_user_id: string;
  issued_at: string;
  due_date: string | null;
  currency_code: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_terms: string | null;
  payment_status: "pending" | "partial" | "paid" | "overdue" | "cancelled";
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ShipmentRow = {
  id: string;
  shipment_no: string;
  order_id: string;
  ship_from_code: string | null;
  destination_org_id: string;
  forwarder_name: string | null;
  tracking_no: string | null;
  shipping_method: string | null;
  etd: string | null;
  eta: string | null;
  shipping_status: "preparing" | "packed" | "shipped" | "in_transit" | "delivered";
  origin_country_code: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type OrderPackingDraftRow = {
  id: string;
  order_id: string;
  linked_shipment_id: string | null;
  draft_status: "draft" | "promoted";
  draft_json: Record<string, unknown>;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentRow = {
  id: string;
  owner_type: "product" | "product_market_content" | "order" | "invoice" | "shipment" | "shipment_pallet";
  owner_id: string;
  document_type: "invoice" | "packing_list" | "coo" | "shipping_mark" | "tracking_doc" | "product_sheet" | "other";
  file_name: string;
  file_url: string;
  version_no: number;
  issued_at: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  is_buyer_visible: boolean;
};

export type ProductMarketContentRow = {
  id: string;
  product_id: string;
  country_code: string;
  language_code: string;
  local_product_name: string | null;
  ingredient_label: string | null;
  usage_instructions: string | null;
  precautions: string | null;
  content_status: "draft" | "active" | "archived";
  label_image_url: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MesLotReceiptRow = {
  id: string;
  sku: string;
  lot_no: string;
  receipt_date: string;
  quantity: number;
  manufacturing_date: string;
  product_id: string | null;
  created_at: string;
};

export type AccountAssignmentRow = {
  id: string;
  buyer_org_id: string;
  vendor_org_id: string | null;
  sales_user_id: string;
  logistics_user_id: string | null;
  commission_type: "rate" | "fixed";
  commission_value: number;
  effective_from: string;
  effective_to: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type ProductBasePriceRow = {
  id: string;
  product_id: string;
  base_price: number;
  currency_code: string;
  effective_from: string;
  effective_to: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type BuyerProductPriceRow = {
  id: string;
  buyer_org_id: string;
  product_id: string;
  settlement_price: number;
  final_price: number;
  currency_code: string;
  effective_from: string;
  effective_to: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryLotRow = {
  id: string;
  source_system: "mes" | "erp" | "manual";
  source_record_id: string | null;
  warehouse_code: string;
  product_id: string;
  lot_no: string;
  production_date: string | null;
  expiry_date: string | null;
  on_hand_qty: number;
  reserved_qty: number;
  available_qty: number;
  confidence_status: "high" | "medium" | "low";
  snapshot_at: string;
  last_synced_at: string;
  metadata_json: Record<string, unknown>;
};
