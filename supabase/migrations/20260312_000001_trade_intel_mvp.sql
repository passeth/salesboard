begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  parent_org_id uuid references public.organizations(id) on delete restrict,
  org_type text not null check (
    org_type in ('internal', 'vendor', 'buyer_country', 'buyer_company', 'buyer_ship_to')
  ),
  code text,
  name text not null,
  country_code text,
  currency_code text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists organizations_code_key
  on public.organizations (code)
  where code is not null;

create index if not exists organizations_parent_org_id_idx
  on public.organizations (parent_org_id);

create index if not exists organizations_org_type_idx
  on public.organizations (org_type);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete restrict,
  role text not null check (role in ('buyer', 'vendor', 'sales', 'logistics', 'admin')),
  name text not null,
  email text not null,
  phone text,
  locale text not null default 'en',
  status text not null default 'active' check (status in ('active', 'inactive')),
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists users_email_lower_key
  on public.users (lower(email));

create index if not exists users_org_id_idx
  on public.users (org_id);

create index if not exists users_role_idx
  on public.users (role);

create table if not exists public.account_assignments (
  id uuid primary key default gen_random_uuid(),
  buyer_org_id uuid not null references public.organizations(id) on delete restrict,
  vendor_org_id uuid references public.organizations(id) on delete restrict,
  sales_user_id uuid not null references public.users(id) on delete restrict,
  logistics_user_id uuid references public.users(id) on delete restrict,
  commission_type text not null default 'rate' check (commission_type in ('rate', 'fixed')),
  commission_value numeric(12, 4) not null default 0,
  effective_from date not null default current_date,
  effective_to date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists account_assignments_buyer_org_id_idx
  on public.account_assignments (buyer_org_id);

create index if not exists account_assignments_vendor_org_id_idx
  on public.account_assignments (vendor_org_id);

create index if not exists account_assignments_sales_user_id_idx
  on public.account_assignments (sales_user_id);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  name text not null,
  brand text,
  category text,
  volume_value numeric(12, 3),
  volume_unit text,
  barcode text,
  qr_code text,
  net_weight numeric(12, 3),
  gross_weight numeric(12, 3),
  units_per_case integer,
  case_length numeric(12, 3),
  case_width numeric(12, 3),
  case_height numeric(12, 3),
  cbm numeric(12, 6),
  hs_code text,
  image_url text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  extra_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists products_sku_key
  on public.products (sku);

create index if not exists products_status_idx
  on public.products (status);

create table if not exists public.product_market_contents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  country_code text not null,
  language_code text not null,
  local_product_name text,
  ingredient_label text,
  usage_instructions text,
  precautions text,
  content_status text not null default 'draft' check (
    content_status in ('draft', 'active', 'archived')
  ),
  label_image_url text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (product_id, country_code, language_code)
);

create index if not exists product_market_contents_product_id_idx
  on public.product_market_contents (product_id);

create index if not exists product_market_contents_country_language_idx
  on public.product_market_contents (country_code, language_code);

create table if not exists public.inventory_lots (
  id uuid primary key default gen_random_uuid(),
  source_system text not null check (source_system in ('mes', 'erp', 'manual')),
  source_record_id text,
  warehouse_code text not null,
  product_id uuid not null references public.products(id) on delete restrict,
  lot_no text not null,
  production_date date,
  expiry_date date,
  on_hand_qty bigint not null default 0,
  reserved_qty bigint not null default 0,
  available_qty bigint not null default 0,
  confidence_status text not null default 'medium' check (
    confidence_status in ('high', 'medium', 'low')
  ),
  snapshot_at timestamptz not null default timezone('utc', now()),
  last_synced_at timestamptz not null default timezone('utc', now()),
  metadata_json jsonb not null default '{}'::jsonb,
  unique (product_id, warehouse_code, lot_no)
);

create unique index if not exists inventory_lots_source_record_id_key
  on public.inventory_lots (source_system, source_record_id)
  where source_record_id is not null;

create index if not exists inventory_lots_product_id_idx
  on public.inventory_lots (product_id);

create index if not exists inventory_lots_expiry_date_idx
  on public.inventory_lots (expiry_date);

create index if not exists inventory_lots_confidence_status_idx
  on public.inventory_lots (confidence_status);

create table if not exists public.supply_plans (
  id uuid primary key default gen_random_uuid(),
  source_system text not null default 'mes' check (source_system in ('mes', 'erp', 'manual')),
  source_record_id text,
  product_id uuid not null references public.products(id) on delete restrict,
  plan_type text not null check (plan_type in ('production', 'inbound')),
  reference_no text,
  expected_available_date date not null,
  planned_qty bigint not null,
  status text not null default 'planned' check (
    status in ('planned', 'confirmed', 'cancelled', 'completed')
  ),
  metadata_json jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists supply_plans_source_record_id_key
  on public.supply_plans (source_system, source_record_id)
  where source_record_id is not null;

create index if not exists supply_plans_product_id_idx
  on public.supply_plans (product_id);

create index if not exists supply_plans_expected_available_date_idx
  on public.supply_plans (expected_available_date);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null,
  ordering_org_id uuid not null references public.organizations(id) on delete restrict,
  requested_by_user_id uuid references public.users(id) on delete set null,
  vendor_org_id uuid references public.organizations(id) on delete restrict,
  sales_owner_user_id uuid not null references public.users(id) on delete restrict,
  logistics_owner_user_id uuid references public.users(id) on delete restrict,
  status text not null default 'draft' check (
    status in (
      'draft',
      'submitted',
      'vendor_review',
      'sales_review',
      'needs_buyer_decision',
      'confirmed',
      'rejected',
      'partially_shipped',
      'shipped',
      'completed',
      'cancelled'
    )
  ),
  currency_code text not null,
  requested_delivery_date date,
  confirmed_delivery_date date,
  status_reason text,
  vendor_commission_type text check (vendor_commission_type in ('rate', 'fixed')),
  vendor_commission_value numeric(12, 4),
  vendor_commission_amount numeric(14, 2),
  submitted_at timestamptz,
  confirmed_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists orders_order_no_key
  on public.orders (order_no);

create index if not exists orders_ordering_org_id_idx
  on public.orders (ordering_org_id);

create index if not exists orders_vendor_org_id_idx
  on public.orders (vendor_org_id);

create index if not exists orders_sales_owner_user_id_idx
  on public.orders (sales_owner_user_id);

create index if not exists orders_status_idx
  on public.orders (status);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  line_no integer not null,
  product_id uuid not null references public.products(id) on delete restrict,
  requested_qty bigint not null check (requested_qty >= 0),
  vendor_confirmed_qty bigint check (vendor_confirmed_qty >= 0),
  sales_confirmed_qty bigint check (sales_confirmed_qty >= 0),
  final_qty bigint check (final_qty >= 0),
  unit_price numeric(14, 2),
  requested_ship_date date,
  confirmed_ship_date date,
  allocation_type text check (allocation_type in ('stock', 'production', 'mixed')),
  min_remaining_shelf_life_days integer,
  status text not null default 'pending' check (
    status in ('pending', 'under_review', 'confirmed', 'partial', 'rejected', 'cancelled')
  ),
  decision_note text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (order_id, line_no)
);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

create index if not exists order_items_product_id_idx
  on public.order_items (product_id);

create index if not exists order_items_status_idx
  on public.order_items (status);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  actor_role text,
  event_type text not null check (
    event_type in (
      'submitted',
      'vendor_approved',
      'vendor_adjusted',
      'sales_approved',
      'sales_adjusted',
      'buyer_decision_requested',
      'buyer_decision_received',
      'inventory_shortage',
      'expiry_warning',
      'production_reallocated',
      'invoice_issued',
      'shipment_confirmed'
    )
  ),
  from_status text,
  to_status text,
  note text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists order_events_order_id_idx
  on public.order_events (order_id, created_at desc);

create index if not exists order_events_order_item_id_idx
  on public.order_events (order_item_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null,
  order_id uuid not null references public.orders(id) on delete restrict,
  issued_by_user_id uuid not null references public.users(id) on delete restrict,
  issued_at timestamptz not null default timezone('utc', now()),
  due_date date,
  currency_code text not null,
  subtotal_amount numeric(14, 2) not null default 0,
  tax_amount numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null default 0,
  payment_terms text,
  payment_status text not null default 'pending' check (
    payment_status in ('pending', 'partial', 'paid', 'overdue', 'cancelled')
  ),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists invoices_invoice_no_key
  on public.invoices (invoice_no);

create index if not exists invoices_order_id_idx
  on public.invoices (order_id);

create index if not exists invoices_payment_status_idx
  on public.invoices (payment_status);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  invoice_id uuid references public.invoices(id) on delete set null,
  vendor_org_id uuid not null references public.organizations(id) on delete restrict,
  commission_type text not null check (commission_type in ('rate', 'fixed')),
  commission_value numeric(12, 4) not null,
  commission_amount numeric(14, 2) not null,
  status text not null default 'accrued' check (
    status in ('accrued', 'approved', 'paid', 'cancelled')
  ),
  payable_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists commissions_order_id_idx
  on public.commissions (order_id);

create index if not exists commissions_vendor_org_id_idx
  on public.commissions (vendor_org_id);

create index if not exists commissions_status_idx
  on public.commissions (status);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  shipment_no text not null,
  order_id uuid not null references public.orders(id) on delete restrict,
  ship_from_code text,
  destination_org_id uuid not null references public.organizations(id) on delete restrict,
  forwarder_name text,
  tracking_no text,
  shipping_method text,
  etd date,
  eta date,
  shipping_status text not null default 'preparing' check (
    shipping_status in ('preparing', 'packed', 'shipped', 'in_transit', 'delivered')
  ),
  origin_country_code text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists shipments_shipment_no_key
  on public.shipments (shipment_no);

create index if not exists shipments_order_id_idx
  on public.shipments (order_id);

create index if not exists shipments_destination_org_id_idx
  on public.shipments (destination_org_id);

create table if not exists public.shipment_pallets (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  pallet_no text not null,
  shipping_mark text,
  gross_weight numeric(12, 3),
  net_weight numeric(12, 3),
  cbm numeric(12, 6),
  earliest_expiry_date date,
  latest_expiry_date date,
  simulation_json jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (shipment_id, pallet_no)
);

create index if not exists shipment_pallets_shipment_id_idx
  on public.shipment_pallets (shipment_id);

create table if not exists public.shipment_pallet_items (
  id uuid primary key default gen_random_uuid(),
  shipment_pallet_id uuid not null references public.shipment_pallets(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  inventory_lot_id uuid references public.inventory_lots(id) on delete set null,
  packed_case_qty bigint not null default 0,
  packed_unit_qty bigint not null default 0,
  expiry_date_snapshot date,
  manual_override boolean not null default false,
  override_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists shipment_pallet_items_shipment_pallet_id_idx
  on public.shipment_pallet_items (shipment_pallet_id);

create index if not exists shipment_pallet_items_order_item_id_idx
  on public.shipment_pallet_items (order_item_id);

create index if not exists shipment_pallet_items_inventory_lot_id_idx
  on public.shipment_pallet_items (inventory_lot_id);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (
    owner_type in ('product', 'product_market_content', 'order', 'invoice', 'shipment', 'shipment_pallet')
  ),
  owner_id uuid not null,
  document_type text not null check (
    document_type in (
      'invoice',
      'packing_list',
      'coo',
      'shipping_mark',
      'tracking_doc',
      'product_sheet',
      'other'
    )
  ),
  file_name text not null,
  file_url text not null,
  version_no integer not null default 1,
  issued_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists documents_owner_idx
  on public.documents (owner_type, owner_id);

create index if not exists documents_document_type_idx
  on public.documents (document_type);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  buyer_org_id uuid not null references public.organizations(id) on delete restrict,
  requester_user_id uuid not null references public.users(id) on delete restrict,
  assignee_user_id uuid references public.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  subject text not null,
  message text not null,
  status text not null default 'open' check (
    status in ('open', 'in_progress', 'answered', 'closed')
  ),
  priority text not null default 'normal' check (
    priority in ('low', 'normal', 'high', 'urgent')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  answered_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists inquiries_buyer_org_id_idx
  on public.inquiries (buyer_org_id);

create index if not exists inquiries_assignee_user_id_idx
  on public.inquiries (assignee_user_id);

create index if not exists inquiries_status_idx
  on public.inquiries (status);

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists account_assignments_set_updated_at on public.account_assignments;
create trigger account_assignments_set_updated_at
before update on public.account_assignments
for each row
execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

drop trigger if exists product_market_contents_set_updated_at on public.product_market_contents;
create trigger product_market_contents_set_updated_at
before update on public.product_market_contents
for each row
execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

drop trigger if exists order_items_set_updated_at on public.order_items;
create trigger order_items_set_updated_at
before update on public.order_items
for each row
execute function public.set_updated_at();

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
before update on public.invoices
for each row
execute function public.set_updated_at();

drop trigger if exists commissions_set_updated_at on public.commissions;
create trigger commissions_set_updated_at
before update on public.commissions
for each row
execute function public.set_updated_at();

drop trigger if exists shipments_set_updated_at on public.shipments;
create trigger shipments_set_updated_at
before update on public.shipments
for each row
execute function public.set_updated_at();

drop trigger if exists shipment_pallets_set_updated_at on public.shipment_pallets;
create trigger shipment_pallets_set_updated_at
before update on public.shipment_pallets
for each row
execute function public.set_updated_at();

drop trigger if exists shipment_pallet_items_set_updated_at on public.shipment_pallet_items;
create trigger shipment_pallet_items_set_updated_at
before update on public.shipment_pallet_items
for each row
execute function public.set_updated_at();

drop trigger if exists inquiries_set_updated_at on public.inquiries;
create trigger inquiries_set_updated_at
before update on public.inquiries
for each row
execute function public.set_updated_at();

commit;
