-- Migration: Buyer-scoped RLS policies
-- Buyers can only access orders/items/events for their organization hierarchy
-- Prerequisite: 000002 (RLS baseline with helper functions)

begin;

-- Helper: get all org IDs in the user's org tree (self + descendants)
create or replace function public.user_org_tree_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  with recursive org_tree as (
    select id from organizations where id = current_user_org_id()
    union all
    select o.id from organizations o join org_tree t on o.parent_org_id = t.id
  )
  select coalesce(array_agg(id), '{}') from org_tree
$$;

-- organizations: buyer can read their own org tree
drop policy if exists organizations_buyer_read on public.organizations;
create policy organizations_buyer_read on public.organizations
  for select
  to authenticated
  using (
    id = any(public.user_org_tree_ids())
  );

-- orders: buyer can select orders for their org tree
drop policy if exists orders_buyer_select on public.orders;
create policy orders_buyer_select on public.orders
  for select
  to authenticated
  using (
    ordering_org_id = any(public.user_org_tree_ids())
  );

-- orders: buyer can insert draft/submitted orders for their org
drop policy if exists orders_buyer_insert on public.orders;
create policy orders_buyer_insert on public.orders
  for insert
  to authenticated
  with check (
    ordering_org_id = public.current_user_org_id()
    and status in ('draft', 'submitted')
  );

-- orders: buyer can update only draft orders (e.g., before submission)
drop policy if exists orders_buyer_update on public.orders;
create policy orders_buyer_update on public.orders
  for update
  to authenticated
  using (
    ordering_org_id = public.current_user_org_id()
    and status = 'draft'
  )
  with check (
    ordering_org_id = public.current_user_org_id()
  );

-- order_items: buyer inherits access from order (select via join check)
drop policy if exists order_items_buyer_select on public.order_items;
create policy order_items_buyer_select on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
      and orders.ordering_org_id = any(public.user_org_tree_ids())
    )
  );

-- order_items: buyer can insert items for their draft orders
drop policy if exists order_items_buyer_insert on public.order_items;
create policy order_items_buyer_insert on public.order_items
  for insert
  to authenticated
  with check (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
      and orders.ordering_org_id = public.current_user_org_id()
      and orders.status in ('draft', 'submitted')
    )
  );

-- order_events: buyer can read events for their orders
drop policy if exists order_events_buyer_select on public.order_events;
create policy order_events_buyer_select on public.order_events
  for select
  to authenticated
  using (
    exists (
      select 1 from orders
      where orders.id = order_events.order_id
      and orders.ordering_org_id = any(public.user_org_tree_ids())
    )
  );

-- order_events: buyer can insert events for their orders (buyer decisions)
drop policy if exists order_events_buyer_insert on public.order_events;
create policy order_events_buyer_insert on public.order_events
  for insert
  to authenticated
  with check (
    exists (
      select 1 from orders
      where orders.id = order_events.order_id
      and orders.ordering_org_id = any(public.user_org_tree_ids())
    )
  );

-- invoices: buyer can read invoices for their orders
drop policy if exists invoices_buyer_select on public.invoices;
create policy invoices_buyer_select on public.invoices
  for select
  to authenticated
  using (
    exists (
      select 1 from orders
      where orders.id = invoices.order_id
      and orders.ordering_org_id = any(public.user_org_tree_ids())
    )
  );

-- shipments: buyer can read shipments for their orders
drop policy if exists shipments_buyer_select on public.shipments;
create policy shipments_buyer_select on public.shipments
  for select
  to authenticated
  using (
    exists (
      select 1 from orders
      where orders.id = shipments.order_id
      and orders.ordering_org_id = any(public.user_org_tree_ids())
    )
  );

-- shipment_pallets: buyer can read pallets for their shipments
drop policy if exists shipment_pallets_buyer_select on public.shipment_pallets;
create policy shipment_pallets_buyer_select on public.shipment_pallets
  for select
  to authenticated
  using (
    exists (
      select 1 from shipments
      join orders on orders.id = shipments.order_id
      where shipments.id = shipment_pallets.shipment_id
      and orders.ordering_org_id = any(public.user_org_tree_ids())
    )
  );

-- documents: buyer can read buyer-visible documents for their orders/products
drop policy if exists documents_buyer_select on public.documents;
create policy documents_buyer_select on public.documents
  for select
  to authenticated
  using (
    is_buyer_visible = true
    and (
      -- product documents are visible to all buyers
      owner_type = 'product'
      or
      -- order/shipment/invoice documents only for their orders
      exists (
        select 1 from orders
        where orders.id = documents.owner_id
        and orders.ordering_org_id = any(public.user_org_tree_ids())
      )
    )
  );

commit;
