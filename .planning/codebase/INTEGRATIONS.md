# External Integrations

**Analysis Date:** 2026-03-25

## APIs & External Services

**KoreanNet (barcode lookup):**
- Purpose: Look up product info by barcode from Korea's national product database
- Endpoint: `https://www.koreannet.or.kr/front/koreannet/gtinSrch.do` (POST, HTML scraping)
- Auth: None (public)
- Implementation: `src/app/api/barcode-lookup/route.ts`
- Returns: Product name, image, category, manufacturer, country of origin

## Data Storage

**Supabase — Intel Project (Primary):**
- Purpose: Main application database, auth, and RLS-based access control
- Client (browser): `src/lib/supabase/client.ts` — `createBrowserClient` from `@supabase/ssr`
- Client (server): `src/lib/supabase/server.ts` — `createServerClient` from `@supabase/ssr` (cached per request)
- Client (middleware): `src/lib/supabase/middleware.ts` — cookie-based session refresh
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Migrations: `supabase/migrations/` (9 migration files, MVP schema through order packing)
- Key tables: `users`, `products`, `orders`, `order_items`, `organizations`, `documents`, `inventory_lots`, `product_base_prices`, `buyer_product_prices`, `account_assignments`, `shipments`, `invoices`, `product_market_contents`, `order_packing_drafts`
- Query layer: `src/lib/queries/` — organized by domain (`admin.ts`, `orders.ts`, `products.ts`, `sales-accounts.ts`, `sales-orders.ts`, `shipments.ts`, `shipment-packing.ts`, `organizations.ts`)
- RLS: Role-based policies (admin full access, buyer read-only on active products, role-specific data isolation)

**Supabase — MES/Commerce Project (Cross-project read):**
- Purpose: Read-only access to RISE MES data (production plans, lab documents)
- Client: `src/lib/supabase/mes-server.ts` — `createClient` from `@supabase/supabase-js` (NOT SSR, server-only)
- Env vars: `MES_SUPABASE_URL`, `MES_SUPABASE_ANON_KEY`
- Tables accessed: `labdoc_products` (PDF URLs for ingredients, formulas, INCI summaries)
- Used in: `src/app/api/admin/sync-docs/route.ts` — syncs document metadata from MES to trade-intel's `documents` table
- CRITICAL: Never mix intel/commerce keys — separate Supabase projects

**Cloudflare R2 (Object Storage):**
- Purpose: Product images and content file storage
- Client: `src/lib/r2/client.ts` — S3-compatible via `@aws-sdk/client-s3`
- Env vars: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- Default bucket: `fraijour`
- Public URL: `https://pub-cdb650c7bfa1416a8f0e200aea466576.r2.dev`
- Operations: `src/lib/r2/actions.ts` — list, upload, copy, delete content files (Server Actions)
- Types: `src/lib/r2/types.ts` — `R2ContentFile`, `ContentFolder`
- Utilities: `src/lib/r2/rename-utils.ts`
- File structure: `products/{sku}/` for product images, `contents/{slug}/` for content files
- Used in API routes:
  - `src/app/api/admin/sync-product-images/route.ts` — scans R2 for product images, updates `products.image_url`
  - `src/app/api/r2-download/route.ts` — proxied download with SSRF protection (validates R2 domain)
- Next.js image optimization configured for R2 domain in `next.config.ts`

## Authentication & Identity

**Auth Provider: Supabase Auth**
- Methods supported:
  1. Email/password sign-in
  2. Google OAuth (social login)
  3. Magic link (email OTP)
- Implementation: `src/app/(auth)/login/page.tsx` (client component)
- OAuth callback: `src/app/auth/callback/route.ts` — exchanges code for session, verifies user exists in `users` table
- Session management: Cookie-based via `@supabase/ssr` middleware (`src/lib/supabase/middleware.ts`)
- User resolution: `src/lib/auth.ts` — `getCurrentUser()` (React `cache`-wrapped)
  - Reads Supabase auth user, then joins with `users` table for role, org, name, phone, locale
  - Returns `null` if no auth user or no matching `users` row

**User Roles (`src/types/index.ts`):**
- `admin` — Internal EVAS management (full access)
- `buyer` — Overseas buyers (read + order)
- `vendor` — Vendor partners
- `sales` — Sales team
- `logistics` — Logistics/shipping team

**Access Control:**
- RLS policies on Supabase (database level)
- Server-side role checks via `getCurrentUser()` in API routes and Server Components
- Middleware refreshes session on every request

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Datadog, or similar SDK)

**Logs:**
- Console-based only (no structured logging framework)

## CI/CD & Deployment

**Hosting:**
- Vercel (Seoul region `icn1`)
- Auto-deploy on GitHub push to main

**CI Pipeline:**
- GitHub → Vercel (no separate CI config detected — no `.github/workflows/`)

**Cron Jobs:**
- `/api/admin/sync-docs` — Daily at 03:00 UTC (Vercel Cron)
  - Syncs PDF document metadata from MES Supabase to trade-intel
  - Auth: Bearer token via `CRON_SECRET` env var, or admin user session

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` — Intel Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Intel Supabase anon key
- `MES_SUPABASE_URL` — MES/Commerce Supabase project URL
- `MES_SUPABASE_ANON_KEY` — MES/Commerce Supabase anon key
- `R2_ENDPOINT` — Cloudflare R2 S3-compatible endpoint
- `R2_ACCESS_KEY_ID` — R2 access key
- `R2_SECRET_ACCESS_KEY` — R2 secret key
- `R2_BUCKET_NAME` — R2 bucket (default: `fraijour`)

**Optional env vars:**
- `NEXT_PUBLIC_R2_PUBLIC_URL` — R2 public CDN URL (has default)
- `CRON_SECRET` — Bearer token for cron job authentication

**Secrets location:**
- `.env` file (local, gitignored)
- Vercel environment variables (production)

## Webhooks & Callbacks

**Incoming:**
- `/auth/callback` — Supabase OAuth redirect handler (`src/app/auth/callback/route.ts`)

**Outgoing:**
- None detected

## API Routes Summary

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/admin/sync-docs` | POST | Sync MES lab documents to trade-intel | Admin or CRON_SECRET |
| `/api/admin/sync-product-images` | POST | Scan R2, update product image URLs | Admin only |
| `/api/barcode-lookup` | GET | Lookup barcode on KoreanNet | None |
| `/api/pdf-proxy` | GET | Proxy PDF documents from Supabase storage | Authenticated (role-checked) |
| `/api/r2-download` | GET | Proxy R2 file downloads | None (SSRF-protected) |

## Cross-Project Data Flow

```
RISE MES (Supabase commerce)
    └── labdoc_products (PDF URLs)
            │
            ▼  [/api/admin/sync-docs — daily cron]
Trade Intel (Supabase intel)
    ├── documents table (synced metadata)
    ├── products table
    └── orders, shipments, etc.

Cloudflare R2
    ├── products/{sku}/ → product images
    └── contents/{slug}/ → content files
```

---

*Integration audit: 2026-03-25*
