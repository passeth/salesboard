# Structure

## Directory Layout

```
trade-intel/
├── .planning/                # GSD planning documents
├── docs/                     # Project documentation
├── public/                   # Static assets
├── refer img/                # Reference images
├── scripts/                  # Utility scripts
├── skills/                   # Project-specific skills
├── supabase/                 # Supabase config & migrations
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/        # Login page
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx    # Dashboard shell (sidebar + header)
│   │   │   ├── loading.tsx   # Dashboard loading state
│   │   │   ├── admin/        # Admin module
│   │   │   │   ├── _actions/ # Server actions
│   │   │   │   ├── content-mapping/
│   │   │   │   ├── inventory/
│   │   │   │   ├── orders/
│   │   │   │   ├── organizations/
│   │   │   │   ├── products/
│   │   │   │   ├── users/
│   │   │   │   └── page.tsx
│   │   │   ├── buyer/        # Buyer module
│   │   │   │   ├── _actions/
│   │   │   │   ├── order/    # Single order detail
│   │   │   │   ├── orders/   # Order list
│   │   │   │   ├── products/ # Buyer product catalog
│   │   │   │   ├── ship-to/  # Ship-to address mgmt
│   │   │   │   └── page.tsx
│   │   │   ├── catalog/      # Shared product catalog
│   │   │   │   ├── _actions/
│   │   │   │   ├── [id]/     # Product detail
│   │   │   │   └── page.tsx
│   │   │   ├── logistics/    # Logistics module
│   │   │   │   ├── _actions/
│   │   │   │   ├── orders/
│   │   │   │   ├── packing/
│   │   │   │   ├── packing-list/
│   │   │   │   ├── shipments/
│   │   │   │   └── page.tsx
│   │   │   ├── sales/        # Sales module
│   │   │   │   ├── _actions/
│   │   │   │   ├── accounts/ # Account management
│   │   │   │   ├── orders/
│   │   │   │   └── page.tsx
│   │   │   └── profile/      # User profile
│   │   ├── api/
│   │   │   ├── admin/        # Admin API endpoints
│   │   │   ├── barcode-lookup/
│   │   │   ├── pdf-proxy/
│   │   │   └── r2-download/
│   │   ├── auth/             # Auth callback
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Root redirect
│   │   └── globals.css       # Global styles + design tokens
│   ├── components/
│   │   ├── ui/               # shadcn/ui primitives
│   │   ├── logistics/        # Logistics-specific components
│   │   ├── agentation-wrapper.tsx  # Agentation feedback widget
│   │   ├── data-table.tsx    # Reusable data table
│   │   ├── data-table-column-header.tsx
│   │   ├── data-table-pagination.tsx
│   │   ├── header-bar.tsx    # Dashboard header
│   │   ├── sidebar.tsx       # Dashboard sidebar nav
│   │   ├── page-header.tsx   # Page title component
│   │   ├── status-badge.tsx  # Order status badge
│   │   ├── order-item-status-badge.tsx
│   │   ├── box-quantity-display.tsx
│   │   └── empty-state.tsx
│   ├── design-tokens/        # Token generation scripts
│   ├── lib/
│   │   ├── supabase/         # Supabase client setup
│   │   │   ├── client.ts     # Browser client
│   │   │   ├── server.ts     # Server client
│   │   │   └── middleware.ts  # Auth middleware
│   │   ├── auth.ts           # Auth utilities
│   │   ├── queries/          # Reusable Supabase queries
│   │   ├── validations/      # Zod validation schemas
│   │   ├── packing/          # Packing business logic
│   │   ├── r2/               # Cloudflare R2 integration
│   │   └── utils.ts          # Common utilities
│   ├── middleware.ts          # RBAC middleware
│   └── types/
│       ├── index.ts          # Domain types & enums
│       └── database.ts       # Supabase generated types
├── next.config.ts
├── postcss.config.mjs        # Tailwind v4
├── tsconfig.json
├── components.json            # shadcn/ui config
├── package.json
├── pnpm-lock.yaml
├── vercel.json                # Vercel deployment config
├── trade.pen                  # Pencil design file
└── figma-design-system-prompt.md
```

## Key Locations

### Page Routes (Route Groups)
- **Auth**: `src/app/(auth)/login/` — Login page (public)
- **Dashboard**: `src/app/(dashboard)/` — All role-based modules (protected)
- **API**: `src/app/api/` — Backend API routes

### Server Actions Pattern
Each module uses co-located `_actions/` directory:
- `src/app/(dashboard)/admin/_actions/`
- `src/app/(dashboard)/buyer/_actions/`
- `src/app/(dashboard)/catalog/_actions/`
- `src/app/(dashboard)/logistics/_actions/`
- `src/app/(dashboard)/sales/_actions/`

### Shared Components
- **App shell**: `src/components/sidebar.tsx`, `src/components/header-bar.tsx`
- **Data display**: `src/components/data-table.tsx` (reusable table)
- **UI primitives**: `src/components/ui/` (shadcn/ui)
- **Domain**: `src/components/logistics/` (module-specific)

### Data Layer
- **Supabase clients**: `src/lib/supabase/`
- **Queries**: `src/lib/queries/` (reusable data access)
- **Validations**: `src/lib/validations/` (Zod schemas)
- **Business logic**: `src/lib/packing/`

## Naming Conventions

### Files
- **Pages**: `page.tsx` (Next.js convention)
- **Layouts**: `layout.tsx`
- **Actions**: `_actions/` directory (private, co-located)
- **Components**: `kebab-case.tsx` (e.g., `data-table.tsx`)

### Directories
- **Route groups**: `(name)` (e.g., `(auth)`, `(dashboard)`)
- **Dynamic routes**: `[param]` (e.g., `[id]`)
- **Private folders**: `_prefix` (e.g., `_actions`)

### Types
- **Enums**: PascalCase (e.g., `UserRole`, `OrderStatus`)
- **Row types**: `{Entity}Row` suffix (e.g., `ProductRow`, `OrderRow`)
- **Composite types**: Descriptive PascalCase (e.g., `BuyerCatalogProduct`, `SalesAccountSummary`)

## Configuration Files

| File | Purpose |
|---|---|
| `next.config.ts` | Next.js configuration |
| `tsconfig.json` | TypeScript with `@/` path alias |
| `postcss.config.mjs` | PostCSS (Tailwind v4) |
| `components.json` | shadcn/ui component config |
| `vercel.json` | Vercel deployment settings |
| `.mcp.json` | MCP server configuration |
| `.npmrc` | pnpm configuration |
| `trade.pen` | Pencil design file |
