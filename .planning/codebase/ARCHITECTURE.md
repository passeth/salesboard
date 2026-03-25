# Architecture

## Overview

Trade Intel is a **Next.js App Router** B2B export order management platform for EVAS Cosmetic's international buyers. It uses **role-based access control (RBAC)** with 5 distinct user roles, each with their own dashboard and allowed routes.

## Architectural Pattern

**Server-First RBAC Monolith** — pages are React Server Components with Supabase as the backend. Access control is enforced at the middleware level based on user roles stored in the `users` table.

### Layers

```
┌─────────────────────────────────────────┐
│  Browser (Client Components)            │
│  - shadcn/ui components                 │
│  - Data tables, forms, modals           │
│  - Agentation feedback widget           │
├─────────────────────────────────────────┤
│  Next.js App Router                     │
│  - Server Components (default)          │
│  - Server Actions (_actions/)           │
│  - API Routes (src/app/api/)            │
├─────────────────────────────────────────┤
│  Middleware (RBAC)                       │
│  - Auth check → role lookup → route ACL │
│  - Role-based redirect on /             │
├─────────────────────────────────────────┤
│  Supabase Client Layer                  │
│  - server.ts (SSR client)               │
│  - client.ts (browser client)           │
│  - middleware.ts (auth session)          │
├─────────────────────────────────────────┤
│  Supabase (PostgreSQL + Auth + Storage) │
│  - intel project (dedicated)            │
│  - RLS policies per role                │
│  - Cloudflare R2 for documents          │
└─────────────────────────────────────────┘
```

## User Roles & Route Access

| Role | Home | Allowed Prefixes | Purpose |
|------|------|-----------------|---------|
| `admin` | `/admin` | All routes | Internal EVAS admin |
| `buyer` | `/buyer` | `/buyer`, `/catalog`, `/profile` | International buyers |
| `vendor` | `/vendor` | `/vendor`, `/catalog`, `/profile` | Vendor partners |
| `sales` | `/sales` | `/sales`, `/catalog`, `/profile` | Sales team |
| `logistics` | `/logistics` | `/logistics`, `/profile` | Logistics team |

Middleware (`src/middleware.ts`) enforces RBAC: checks auth → queries `users.role` → validates route access → redirects unauthorized.

## Data Flow

### Read Path (Server Components)
1. Page RSC calls Supabase server client directly
2. Queries use `src/lib/queries/` for reusable data access
3. HTML streamed to browser

### Write Path (Server Actions)
1. Form submission triggers co-located `_actions/` server action
2. Action validates input via `src/lib/validations/`
3. Mutates Supabase via server client
4. `revalidatePath()` for cache invalidation

### API Routes
- `src/app/api/admin/` — Admin-only endpoints
- `src/app/api/barcode-lookup/` — Product barcode lookup
- `src/app/api/pdf-proxy/` — PDF document proxy
- `src/app/api/r2-download/` — Cloudflare R2 file downloads

## Authentication

- **Supabase Auth** with email/password login
- Middleware refreshes session on every request via `updateSession()`
- `src/lib/auth.ts` provides server-side auth utilities
- Role stored in `users` table (not JWT claims)

## Key Abstractions

### Query Layer (`src/lib/queries/`)
Reusable data access functions for Supabase queries. Separates data fetching from page components.

### Validation Layer (`src/lib/validations/`)
Zod-based validation schemas for server action inputs.

### Packing System (`src/lib/packing/`)
Business logic for order packing/shipping calculations.

### R2 Storage (`src/lib/r2/`)
Cloudflare R2 integration for document storage (invoices, packing lists, etc.).

### Design Tokens (`src/design-tokens/`)
Generated CSS variables for consistent styling. Generated via `pnpm tokens`.

## Domain Modules

### Admin (`src/app/(dashboard)/admin/`)
- Products, orders, users, organizations, inventory management
- Content mapping (product market content)
- Full CRUD across all entities

### Buyer (`src/app/(dashboard)/buyer/`)
- Order placement and tracking
- Product catalog browsing with buyer-specific pricing
- Ship-to address management
- Organization selector for multi-org buyers

### Sales (`src/app/(dashboard)/sales/`)
- Account management (buyer companies)
- Order review and processing
- Pricing and performance analytics

### Logistics (`src/app/(dashboard)/logistics/`)
- Packing list generation
- Shipment tracking
- Order fulfillment workflow

### Catalog (`src/app/(dashboard)/catalog/`)
- Shared product catalog (accessible by multiple roles)
- Product detail pages with role-specific views

## Order Lifecycle

```
Draft → Submitted → VendorReview → SalesReview → NeedsBuyerDecision
                                                       ↓
Confirmed → Invoiced → PartiallyShipped → Shipped → Completed
                                                       
(Any stage) → Rejected / Cancelled
```

12 distinct order statuses tracked in `OrderStatus` enum (`src/types/index.ts`).
