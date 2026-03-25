# Technology Stack

**Analysis Date:** 2026-03-25

## Languages

**Primary:**
- TypeScript 5.8 (strict mode) — All application code (`src/`)

**Secondary:**
- Python — Data scripts only (`scripts/enrich_products.py`, `scripts/generate_seed.py`, `scripts/parse_order_hx.py`)
- SQL — Supabase migrations (`supabase/migrations/`)

## Runtime

**Environment:**
- Node.js (version not pinned — no `.nvmrc` or `engines` field)

**Package Manager:**
- pnpm (enforced by project rules — npm/yarn forbidden)
- Lockfile: `pnpm-lock.yaml` present
- `.npmrc` config: `shamefully-hoist=true`, `approve-builds=canvas`

## Frameworks

**Core:**
- Next.js 15.2+ (App Router) — `next.config.ts`
- React 19 — UI rendering
- React DOM 19

**UI:**
- Tailwind CSS 4.1 — via `@tailwindcss/postcss` plugin (`postcss.config.mjs`)
- shadcn/ui (new-york style, RSC enabled) — `components.json`
- Radix UI 1.4 — Headless component primitives
- Lucide React 0.511 — Icon library

**Data/Forms:**
- TanStack React Table 8.21 — Data tables
- React Hook Form 7.71 + `@hookform/resolvers` 5.2 — Form handling
- Zod 4.3 — Schema validation
- date-fns 4.1 — Date formatting

**Build/Dev:**
- PostCSS 8.5 — CSS processing
- TypeScript 5.8 — Type checking (`pnpm tsc --noEmit`)

## Key Dependencies

**Critical:**
- `@supabase/ssr` 0.9 — Server/client Supabase clients with cookie-based auth
- `@supabase/supabase-js` 2.99 — Supabase JS SDK (used for MES client)
- `@aws-sdk/client-s3` 3.1010 — Cloudflare R2 file storage via S3-compatible API

**UI Utilities:**
- `class-variance-authority` 0.7 — Component variant management
- `clsx` 2.1 + `tailwind-merge` 3.3 — Conditional class composition (`src/lib/utils.ts`)
- `embla-carousel-react` 8.6 — Carousel component
- `react-day-picker` 9.14 — Date picker

**File Operations:**
- `file-saver` 2.0 — Client-side file downloads
- `jszip` 3.10 — ZIP file creation

**Dev/Scripts Only:**
- `bwip-js` 4.8 + `jsbarcode` 3.12 — Barcode generation scripts
- `csv-parse` 6.1 — CSV parsing for data import
- `xlsx` 0.18 — Excel file processing
- `postgres` 3.4 — Direct Postgres access for scripts
- `agentation` 2.3 — MCP annotation tool (dev only)

## Configuration

**TypeScript (`tsconfig.json`):**
- Target: ES2017
- Module: ESNext with bundler resolution
- Strict mode enabled
- Path alias: `@/*` → `./src/*`
- Incremental compilation enabled

**Next.js (`next.config.ts`):**
- `serverExternalPackages`: ["zod"]
- Remote image patterns: `pub-cdb650c7bfa1416a8f0e200aea466576.r2.dev` (R2 public URL)

**Vercel (`vercel.json`):**
- Region: `icn1` (Seoul)
- Cron: `/api/admin/sync-docs` runs daily at 03:00 UTC

**Environment Variables (existence only — contents NOT read):**
- `.env` file present
- Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Required: `MES_SUPABASE_URL`, `MES_SUPABASE_ANON_KEY` (cross-project MES access)
- Required: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- Optional: `NEXT_PUBLIC_R2_PUBLIC_URL`, `CRON_SECRET`

**Design Tokens:**
- Generated via `pnpm tokens` → `src/design-tokens/generate-css.ts`
- Figma sync: `pnpm figma:sync` → `src/design-tokens/figma-sync.ts`
- Token source: `src/design-tokens/tokens.json`
- Manual CSS token changes forbidden — always regenerate

## NPM Scripts

```bash
pnpm dev              # Next.js dev server
pnpm build            # Production build
pnpm start            # Production server
pnpm tokens           # Regenerate design token CSS
pnpm figma:sync       # Sync tokens from Figma
pnpm figma:guide      # Push tokens to Figma
pnpm migrate:images   # Migrate product images to R2
pnpm generate:barcodes # Generate barcode images
```

## Platform Requirements

**Development:**
- Node.js (latest LTS recommended)
- pnpm package manager
- Supabase project access (intel project)
- Cloudflare R2 credentials

**Production:**
- Vercel (Seoul region `icn1`)
- GitHub push triggers auto-deploy
- Direct `vercel --prod` forbidden

---

*Stack analysis: 2026-03-25*
