begin;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.users u
  where u.id = auth.uid()
  limit 1
$$;

create or replace function public.current_user_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.org_id
  from public.users u
  where u.id = auth.uid()
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.account_assignments enable row level security;
alter table public.products enable row level security;
alter table public.product_market_contents enable row level security;
alter table public.inventory_lots enable row level security;
alter table public.supply_plans enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.invoices enable row level security;
alter table public.commissions enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_pallets enable row level security;
alter table public.shipment_pallet_items enable row level security;
alter table public.documents enable row level security;
alter table public.inquiries enable row level security;

drop policy if exists organizations_admin_all on public.organizations;
create policy organizations_admin_all on public.organizations
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists users_admin_all on public.users;
create policy users_admin_all on public.users
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists users_self_select on public.users;
create policy users_self_select on public.users
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists account_assignments_admin_all on public.account_assignments;
create policy account_assignments_admin_all on public.account_assignments
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists products_authenticated_read on public.products;
create policy products_authenticated_read on public.products
  for select
  to authenticated
  using (status = 'active');

drop policy if exists product_market_contents_admin_all on public.product_market_contents;
create policy product_market_contents_admin_all on public.product_market_contents
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists product_market_contents_authenticated_read on public.product_market_contents;
create policy product_market_contents_authenticated_read on public.product_market_contents
  for select
  to authenticated
  using (content_status = 'active');

drop policy if exists inventory_lots_admin_all on public.inventory_lots;
create policy inventory_lots_admin_all on public.inventory_lots
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists supply_plans_admin_all on public.supply_plans;
create policy supply_plans_admin_all on public.supply_plans
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists order_items_admin_all on public.order_items;
create policy order_items_admin_all on public.order_items
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists order_events_admin_all on public.order_events;
create policy order_events_admin_all on public.order_events
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists invoices_admin_all on public.invoices;
create policy invoices_admin_all on public.invoices
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists commissions_admin_all on public.commissions;
create policy commissions_admin_all on public.commissions
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists shipments_admin_all on public.shipments;
create policy shipments_admin_all on public.shipments
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists shipment_pallets_admin_all on public.shipment_pallets;
create policy shipment_pallets_admin_all on public.shipment_pallets
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists shipment_pallet_items_admin_all on public.shipment_pallet_items;
create policy shipment_pallet_items_admin_all on public.shipment_pallet_items
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists documents_admin_all on public.documents;
create policy documents_admin_all on public.documents
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists inquiries_admin_all on public.inquiries;
create policy inquiries_admin_all on public.inquiries
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

commit;
