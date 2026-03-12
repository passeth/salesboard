# Supabase Setup Notes

## Included migrations

- `migrations/20260312_000001_trade_intel_mvp.sql`
  - core operational schema
- `migrations/20260312_000002_trade_intel_rls_baseline.sql`
  - safe-by-default RLS baseline

## Apply order

1. Apply `000001`
2. Apply `000002`
3. Create an internal organization row
4. Create at least one admin auth user
5. Insert the matching row into `public.users` with `role = 'admin'`

## Important notes

- `inventory_lots` and `supply_plans` are MES mirror tables.
- `products` and `product_market_contents` are intentionally simple for MVP.
- `documents` stores file metadata only.
- The current RLS migration is conservative:
  - admin users can manage everything
  - authenticated users can read active products and active product market contents
  - other operational policies should be added in the next migration

## Recommended next migration

Add role-aware policies for:

- buyers
- vendors
- sales
- logistics

Do that only after the exact assignment and portal access rules are fixed.
