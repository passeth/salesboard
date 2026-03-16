begin;

create table if not exists public.order_packing_drafts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  linked_shipment_id uuid null references public.shipments(id) on delete set null,
  draft_status text not null default 'draft' check (draft_status in ('draft', 'promoted')),
  draft_json jsonb not null default '{}'::jsonb,
  created_by_user_id uuid null references public.users(id) on delete set null,
  updated_by_user_id uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (order_id)
);

comment on table public.order_packing_drafts is '주문 확정 직후 작성하는 팔레트 적재 draft. shipment 생성 전 계획용.';
comment on column public.order_packing_drafts.draft_status is 'draft: 주문 단계 계획, promoted: shipment final packing으로 승격됨';
comment on column public.order_packing_drafts.draft_json is 'Packing planner draft document (policy + pallet drafts)';

create index if not exists idx_order_packing_drafts_order_id on public.order_packing_drafts(order_id);
create index if not exists idx_order_packing_drafts_linked_shipment_id on public.order_packing_drafts(linked_shipment_id);

alter table public.order_packing_drafts enable row level security;

drop trigger if exists order_packing_drafts_set_updated_at on public.order_packing_drafts;
create trigger order_packing_drafts_set_updated_at
before update on public.order_packing_drafts
for each row
execute function public.set_updated_at();

drop policy if exists order_packing_drafts_admin_all on public.order_packing_drafts;
create policy order_packing_drafts_admin_all on public.order_packing_drafts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists order_packing_drafts_logistics_all on public.order_packing_drafts;
create policy order_packing_drafts_logistics_all on public.order_packing_drafts
  for all
  to authenticated
  using (public.current_user_role() = 'logistics')
  with check (public.current_user_role() = 'logistics');

commit;
