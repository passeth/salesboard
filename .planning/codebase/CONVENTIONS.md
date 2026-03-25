# Coding Conventions

**Analysis Date:** 2026-03-25

## Naming Patterns

**Files:**
- Components: `kebab-case.tsx` (e.g., `page-header.tsx`, `status-badge.tsx`, `data-table.tsx`)
- Server actions: `kebab-case-actions.ts` in `_actions/` directories (e.g., `order-actions.ts`, `cart-actions.ts`)
- Query modules: `kebab-case.ts` in `src/lib/queries/` (e.g., `products.ts`, `sales-accounts.ts`)
- Types: `kebab-case.ts` (e.g., `database.ts`, `index.ts`)
- API routes: `route.ts` inside Next.js App Router convention directories

**Functions:**
- Use `camelCase` for all functions: `getCurrentUser`, `getActiveProducts`, `toggleProductStatus`
- Server actions: verb-first naming — `createAndSubmitOrder`, `saveDraft`, `cancelOrder`, `upsertBuyerProductPrice`
- Query functions: `get` prefix — `getAdminStats`, `getProductBrands`, `getBuyerProducts`
- Helper/utility: descriptive verbs — `isUserRole`, `isAllowedPath`, `redirectTo`, `formatDate`

**Variables:**
- `camelCase` for local variables and function params: `cartItemCount`, `orderNo`, `currencyCode`
- `UPPER_SNAKE_CASE` for constants: `SYSTEM_ADMIN_ID`, `SUPPORTED_LOCALES`, `PUBLIC_PATHS`, `VALID_STATUSES`, `PDF_COLUMNS`
- Maps use descriptive names: `skuToProductId`, `buyerPriceMap`, `orderPriceMap`, `existingMap`

**Types:**
- `PascalCase` for type names: `CurrentUser`, `OrderWithOrg`, `BuyerCatalogProduct`
- Database row types suffixed with `Row`: `ProductRow`, `OrderRow`, `OrganizationRow` (in `src/types/database.ts`)
- Composite/view types use descriptive names: `OrderItemWithProduct`, `InventoryProductSummary`, `SalesAccountSummary`
- Enums use `PascalCase` values: `UserRole.Buyer`, `OrderStatus.Submitted`
- Use `type` keyword (not `interface`) for all type definitions
- Inline tuple types for Supabase join results: `type ItemTuple = { product_id: string; ... }`

**React Components:**
- `PascalCase` function names: `DataTable`, `PageHeader`, `StatusBadge`
- Named exports (not default) for components: `export function Button(...)`, `export function DataTable(...)`
- Default export only for Next.js pages: `export default async function AdminPage()`

## Code Style

**Formatting:**
- No dedicated formatter config (no `.prettierrc`, `.eslintrc`, `biome.json` detected)
- Consistent 2-space indentation throughout codebase
- Double quotes for imports: `import { cn } from "@/lib/utils"`
- Semicolons used consistently
- Trailing commas in multi-line structures

**Linting:**
- No ESLint or Biome configuration detected
- TypeScript strict mode enabled in `tsconfig.json` (`"strict": true`)
- `allowJs: false` — TypeScript only, no `.js` files in `src/`

## Import Organization

**Order:**
1. External packages (`react`, `next`, `@supabase/*`, `@tanstack/*`, `lucide-react`)
2. Internal aliases (`@/lib/*`, `@/types`, `@/components/*`)
3. Relative imports (`./data-table-pagination`, `./data-table-column-header`)

**Path Aliases:**
- `@/*` → `./src/*` (defined in `tsconfig.json`)
- Always use `@/` for cross-directory imports; relative imports only for sibling files

**Examples from codebase:**
```typescript
// External first
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

// Internal aliases
import { StatusBadge } from "@/components/status-badge";
import { OrderWithOrg, OrderStatus } from "@/types";
```

## Error Handling

**Server Actions (`"use server"` files):**
- Auth check at top of every action — either `getCurrentUser()` or `supabase.auth.getUser()`
- Unauthorized → `throw new Error("Unauthorized")` or `return { error: "Unauthorized" }`
- Two patterns coexist:
  - **Throw pattern** (most actions): `if (error) throw error;` — used in `order-actions.ts`, `accounts-actions.ts`
  - **Return error pattern** (some actions): `return { error: error.message }` — used in `product-actions.ts`
- Helper functions for auth validation: `validateAdminOrSales()` in `src/app/(dashboard)/sales/_actions/accounts-actions.ts`

**Query functions (`src/lib/queries/`):**
- Return `{ data, error }` tuples matching Supabase client pattern
- Null-safe with fallbacks: `data ?? []`, `data ?? null`, `count ?? 0`
- No throw — errors propagated via return value

**API Routes (`src/app/api/`):**
- Return `NextResponse.json({ error: message }, { status: code })` for errors
- Try-catch at top level with `error instanceof Error ? error.message : "fallback"`
- HTTP status codes: 401 (unauthorized), 500 (internal), 502 (upstream failure)

**Supabase Client:**
- Silent catch for cookie setting in server client: `try { ... } catch {}`
- Environment variable validation: throw immediately if missing

## Logging

**Framework:** None — no logging library detected

**Patterns:**
- No `console.log` statements found in production code
- Errors are thrown or returned, not logged
- API routes return structured JSON error responses

## Comments

**When to Comment:**
- JSDoc `/** ... */` comments on exported types to explain DB schema mapping: `/** User roles matching DB schema (users.role) */`
- Inline comments for non-obvious logic: `// Delete existing items for this order (for draft updates)`
- Sparse overall — code is largely self-documenting

**JSDoc/TSDoc:**
- Used on type definitions in `src/types/index.ts` for field documentation
- Not used on functions or components

## Function Design

**Size:** Functions range from small (5-15 lines for helpers) to medium (30-80 lines for server actions). Largest functions are query builders (~100+ lines) in `src/lib/queries/products.ts`.

**Parameters:**
- Object parameters for complex inputs: `CreateAndSubmitOrderInput`, `ProductFilters`
- Positional parameters for simple cases: `(supabase, orgId, filters?)`
- Supabase client always passed as first param to query functions (dependency injection)
- Server actions receive typed input objects, not FormData

**Return Values:**
- Server actions: `{ success: true }` or `{ error: string }`, or throw + `redirect()`
- Query functions: `{ data: T, error }` or `{ data: T[], count, error }`
- Components: JSX (no render props pattern used)

## Module Design

**Exports:**
- Named exports preferred: `export function`, `export type`, `export const`
- Default exports only for Next.js page/layout conventions
- UI components export both component and variants: `export { Button, buttonVariants }`

**Barrel Files:**
- `src/types/index.ts` — re-exports from `database.ts` plus app-level types
- `src/components/logistics/packing/index.ts` — barrel for packing components
- `src/lib/packing/index.ts` — barrel for packing utilities
- Not used extensively — most modules imported directly

## Component Patterns

**UI Components (shadcn/ui):**
- Located in `src/components/ui/`
- Use `class-variance-authority` (CVA) for variant styling
- `cn()` utility for conditional class merging (`clsx` + `tailwind-merge`)
- `data-slot` attributes for styling hooks
- shadcn/ui "new-york" style with Radix UI primitives

**Application Components:**
- Props defined as `type` (not `interface`): `type PageHeaderProps = { ... }`
- Composition pattern: `PageHeader` accepts `children` for action buttons
- Server Components by default; `"use client"` only when needed (state, interactivity)
- Table column definitions in separate `*-columns.tsx` files

**Data Tables:**
- Reusable `DataTable` generic component in `src/components/data-table.tsx`
- Column definitions co-located with page: `orders-columns.tsx`, `users-columns.tsx`
- Server-side pagination and sorting (manual mode)
- Generic type params: `DataTable<TData, TValue>`

## Validation

**Schema validation:**
- Zod v4 for input validation: `src/lib/validations/order.ts`
- Schema + inferred type pattern: `z.object(...)` then `z.infer<typeof schema>`
- Validation in server actions via `safeParse()`

**Auth validation:**
- Role-based access check at the start of every server action
- Middleware handles route-level access control: `src/middleware.ts`
- `ROLE_ALLOWED_PREFIXES` map for path-based authorization

## Styling

**Approach:**
- Tailwind CSS v4 via `@tailwindcss/postcss`
- Design tokens generated via `src/design-tokens/generate-css.ts` (run with `pnpm tokens`)
- CSS variables for design tokens: `var(--font-size-2xl)`, `var(--font-size-sm)`
- Status colors as semantic tokens: `bg-status-draft/10 text-status-draft`
- Responsive: mobile-first with `md:`, `lg:`, `xl:` breakpoints

---

*Convention analysis: 2026-03-25*
