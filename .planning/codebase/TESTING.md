# Testing Patterns

**Analysis Date:** 2026-03-25

## Test Framework

**Runner:**
- Not configured — no test framework detected
- No `jest.config.*`, `vitest.config.*`, or test runner in `package.json` dependencies
- No test scripts in `package.json`

**Assertion Library:**
- Not detected

**Run Commands:**
```bash
# No test commands available
# package.json scripts: dev, build, start, tokens, figma:sync, figma:guide, migrate:images, generate:barcodes
```

## Test File Organization

**Location:**
- No test files exist — zero `*.test.*` or `*.spec.*` files found in the entire codebase

**Naming:**
- Not established

**Structure:**
```
# No test directory structure exists
```

## Test Structure

**Suite Organization:**
- Not applicable — no tests exist

**Patterns:**
- Not established

## Mocking

**Framework:** Not configured

**Patterns:**
- Not established

**What to Mock (recommended based on codebase architecture):**
- Supabase client (`createClient` from `@/lib/supabase/server`)
- `getCurrentUser` from `@/lib/auth`
- `cookies()` from `next/headers`
- R2/S3 client operations (`@aws-sdk/client-s3`)

**What NOT to Mock (recommended):**
- Zod validation schemas (test with real data)
- Type definitions and enums
- Pure utility functions (`cn()`, `formatDate()`)

## Fixtures and Factories

**Test Data:**
- Not established

**Location:**
- Not established

## Coverage

**Requirements:** None enforced — no coverage tooling configured

**View Coverage:**
```bash
# Not available
```

## Test Types

**Unit Tests:**
- Not implemented
- High-value targets for unit testing:
  - Zod validation schemas in `src/lib/validations/order.ts`
  - Packing simulator logic in `src/lib/packing/simulator.ts`
  - Utility functions in `src/lib/utils.ts`
  - `isUserRole()` type guard in `src/lib/auth.ts` and `src/middleware.ts`
  - `generateOrderNo()` in `src/app/(dashboard)/buyer/_actions/order-actions.ts`

**Integration Tests:**
- Not implemented
- High-value targets:
  - Server actions (auth + Supabase interactions): `src/app/(dashboard)/*/_actions/*.ts`
  - API routes: `src/app/api/*/route.ts`
  - Query functions: `src/lib/queries/*.ts`

**E2E Tests:**
- Not implemented — no Playwright or Cypress detected

## Common Patterns

**Async Testing:**
- Not established, but all server actions and queries are `async` — will require async test patterns

**Error Testing:**
- Not established, but two error patterns exist to test:
  1. Functions that `throw new Error(...)` — test with `expect(...).rejects.toThrow()`
  2. Functions that `return { error: string }` — test return value

## Recommendations for Test Setup

**Suggested framework:** Vitest (aligns with Next.js + TypeScript ecosystem)

**Priority test targets (by risk/value):**

1. **Server actions** (`src/app/(dashboard)/*/_actions/*.ts`) — 14 files
   - These contain business logic, auth checks, and data mutations
   - Most critical: `order-actions.ts` (buyer), `accounts-actions.ts` (sales)

2. **Query functions** (`src/lib/queries/*.ts`) — 7 files
   - Complex data aggregation logic (e.g., `getProductCatalogForBuyer` at 120+ lines)
   - Multiple Supabase joins and Map-based transformations

3. **Validation schemas** (`src/lib/validations/order.ts`) — 1 file
   - Quick wins: test valid/invalid inputs against Zod schemas

4. **Middleware** (`src/middleware.ts`) — 1 file
   - Role-based routing logic with multiple code paths

5. **Packing logic** (`src/lib/packing/simulator.ts`) — 1 file
   - Pure business logic, highly testable

**Existing testable patterns:**
- Query functions accept `SupabaseClient` as first parameter — easy to mock/inject
- Auth helpers (`getCurrentUser`, `validateAdminOrSales`) are isolated — easy to stub
- Zod schemas are exported and can be tested directly with `.safeParse()`

---

*Testing analysis: 2026-03-25*
