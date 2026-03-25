# Codebase Concerns

**Analysis Date:** 2026-03-25

## Tech Debt

**Hardcoded System Admin ID:**
- Issue: A UUID `1ffa6f06-6798-442c-aa59-5dfbf0c0f89a` is hardcoded as `SYSTEM_ADMIN_ID` in two files and duplicated across them
- Files: `src/app/(dashboard)/buyer/_actions/cart-actions.ts:6`, `src/app/(dashboard)/buyer/_actions/order-actions.ts:8`
- Impact: If the admin user is deleted or the system moves to a different environment, all buyer order creation breaks. The constant is also duplicated rather than shared.
- Fix approach: Move to an environment variable (`SYSTEM_ADMIN_ID`) or a config file in `src/lib/`, or implement proper sales assignment logic that looks up the assigned sales user from `account_assignments`

**Duplicate `getOrgCurrency` / `generateOrderNo` functions:**
- Issue: Both `cart-actions.ts` and `order-actions.ts` contain identical `getOrgCurrency()` and near-identical order number generation logic
- Files: `src/app/(dashboard)/buyer/_actions/cart-actions.ts:15-25`, `src/app/(dashboard)/buyer/_actions/order-actions.ts:10-20`
- Impact: Bug fixes or logic changes must be applied to both places; easy to miss one
- Fix approach: Extract shared helpers to `src/lib/queries/orders.ts` or a new `src/lib/order-utils.ts`

**Duplicate `isUserRole` guard function:**
- Issue: `isUserRole()` is defined identically in two files
- Files: `src/middleware.ts:40-42`, `src/lib/auth.ts:15-17`
- Impact: Minor duplication; easy to diverge
- Fix approach: Export from `src/types/index.ts` or `src/lib/auth.ts` and import in middleware

**`as any` casts in design token generator:**
- Issue: 10 instances of `as any` type casts to access component spec properties
- Files: `src/design-tokens/generate-css.ts:171-198`
- Impact: No runtime risk (script-only), but reduces type safety of the token generation pipeline
- Fix approach: Define proper TypeScript interfaces for button/toggle/input component specs

**Monster component — packing-workspace.tsx (2,208 lines):**
- Issue: Single client component with 2,208 lines containing UI, state management, dialogs, pallet logic, and save actions all in one file
- Files: `src/components/logistics/packing/packing-workspace.tsx`
- Impact: Extremely difficult to maintain, test, or debug. Any change risks regressions across unrelated functionality.
- Fix approach: Decompose into smaller components: separate dialogs, pallet editor, item list, save logic into individual files under `src/components/logistics/packing/`

**Large client components:**
- Issue: Several other components exceed 400 lines, mixing UI with business logic
- Files:
  - `src/lib/packing/simulator.ts` (1,506 lines)
  - `src/app/(dashboard)/admin/content-mapping/content-mapping-client.tsx` (1,171 lines)
  - `src/app/(dashboard)/buyer/products/buyer-products-grid.tsx` (680 lines)
- Impact: Harder to maintain, slower to load on client side
- Fix approach: Extract business logic into hooks or utility modules; split UI into sub-components

## Known Bugs

**Order number generation race condition:**
- Symptoms: Two concurrent order submissions on the same day could generate duplicate `order_no` values (e.g., `ORD-20260325-0001`)
- Files: `src/app/(dashboard)/buyer/_actions/cart-actions.ts:45-52`, `src/app/(dashboard)/buyer/_actions/order-actions.ts:41-52`
- Trigger: Two buyers submitting orders at the exact same moment
- Workaround: DB unique constraint on `order_no` would cause one to fail; currently no unique constraint visible in types

**Cancel order event_type mismatch:**
- Symptoms: When cancelling an order, the event is logged with `event_type: "submitted"` instead of `"cancelled"`
- Files: `src/app/(dashboard)/buyer/_actions/order-actions.ts:287`
- Trigger: Any buyer cancellation
- Workaround: None — timeline/audit log shows incorrect event type

## Security Considerations

**Unauthenticated API routes:**
- Risk: `/api/barcode-lookup` and `/api/r2-download` have no authentication checks — any request can reach them
- Files: `src/app/api/barcode-lookup/route.ts`, `src/app/api/r2-download/route.ts`
- Current mitigation: `r2-download` validates the URL starts with the R2 public URL (SSRF prevention); `barcode-lookup` validates barcode format. Middleware skips `/api` paths entirely (`src/middleware.ts:49`).
- Recommendations: Add authentication to both routes, or at minimum rate-limit them. The R2 download proxy could be abused to proxy arbitrary content from the R2 bucket. Barcode lookup could be used for scraping KoreanNet.

**Server Actions lack role-based authorization (inconsistent):**
- Risk: Some server actions verify user role (e.g., `sales-actions.ts` has `validateSalesUser()`), but buyer actions only check `auth.getUser()` — they don't verify the user actually has `buyer` role or belongs to the org they're modifying
- Files:
  - Missing role check: `src/app/(dashboard)/buyer/_actions/cart-actions.ts`, `src/app/(dashboard)/buyer/_actions/order-actions.ts`
  - Has role check: `src/app/(dashboard)/sales/_actions/sales-actions.ts:14-39`, `src/app/(dashboard)/admin/_actions/order-actions.ts:11-15`
- Current mitigation: Middleware blocks route access by role, so only buyers can reach `/buyer/*` pages. But server actions are callable directly via POST — a sales user could technically invoke a buyer action.
- Recommendations: Add consistent role validation to ALL server actions using a shared `validateRole()` helper

**Missing org-scoping on buyer actions:**
- Risk: Buyer cart/order actions accept `orgId` as a parameter but don't verify the authenticated user belongs to that org
- Files: `src/app/(dashboard)/buyer/_actions/cart-actions.ts:75` (`addToCart` accepts `orgId`)
- Current mitigation: RLS policies may restrict at DB level, but defense-in-depth is missing at application layer
- Recommendations: Validate `orgId` matches `currentUser.orgId` before proceeding

**Content-Disposition header injection:**
- Risk: The `filename` parameter in r2-download and pdf-proxy is used directly in `Content-Disposition` header without sanitization
- Files: `src/app/api/r2-download/route.ts:41`, `src/app/api/pdf-proxy/route.ts:63-65`
- Current mitigation: None
- Recommendations: Sanitize filename to strip special characters (`"`, `\n`, etc.) before embedding in header

**Silent empty catch blocks:**
- Risk: 14 empty `catch {}` blocks across the codebase swallow errors silently, making debugging difficult
- Files: `src/lib/supabase/server.ts:30`, `src/app/api/pdf-proxy/route.ts:38,69`, `src/app/(dashboard)/admin/content-mapping/_actions/mapping-actions.ts:88`, and 10+ more
- Current mitigation: None
- Recommendations: At minimum log errors in catch blocks; the cookie `setAll` catch in `server.ts:30` is intentional per Supabase SSR docs, but others should be reviewed

## Performance Bottlenecks

**Middleware DB query on every request:**
- Problem: Every authenticated request triggers a Supabase query to `users` table to fetch the user's role
- Files: `src/middleware.ts:77-81`
- Cause: User role is not stored in the JWT/session; must be fetched from DB
- Improvement path: Store role in JWT custom claims or user metadata to avoid per-request DB lookup. Alternatively, cache role in a cookie after first fetch.

**Dashboard layout cart count query:**
- Problem: Every page load for buyer role triggers an additional Supabase query to count cart items
- Files: `src/app/(dashboard)/layout.tsx:38-50`
- Cause: Cart count is fetched in the shared layout, so it runs on every navigation
- Improvement path: Use React cache or fetch the cart count client-side to avoid blocking SSR

**Sequential DB updates in server actions:**
- Problem: Cart and order operations update items one-by-one in a loop instead of batching
- Files: `src/app/(dashboard)/buyer/_actions/cart-actions.ts:130-136` (loop over `toUpdate`), `src/app/(dashboard)/sales/_actions/sales-actions.ts:80-95` (loop over items)
- Cause: Supabase JS client doesn't support bulk update with different values per row
- Improvement path: Use a Postgres function (RPC) for bulk operations, or at minimum use `Promise.all` for parallel execution

**Excessive revalidatePath calls:**
- Problem: Many server actions call `revalidatePath()` 3-6 times for different routes
- Files: `src/app/(dashboard)/logistics/_actions/logistics-actions.ts` (6 revalidations in one action), `src/app/(dashboard)/buyer/_actions/cart-actions.ts` (2 per action × 5 actions)
- Cause: Broad cache invalidation strategy
- Improvement path: Use more targeted `revalidateTag()` instead of path-based revalidation

## Fragile Areas

**Order status state machine (no formal definition):**
- Files: `src/types/index.ts:11-24` (enum only), various action files
- Why fragile: Order status transitions are implicitly defined across multiple action files with no centralized state machine. Each action file checks status independently (e.g., `order.status !== "draft"`, `["draft", "submitted"].includes(order.status)`).
- Safe modification: Before adding new statuses or transitions, map all existing transitions from all action files
- Test coverage: Zero — no automated tests exist

**Packing system (simulator + workspace):**
- Files: `src/lib/packing/simulator.ts` (1,506 lines), `src/components/logistics/packing/packing-workspace.tsx` (2,208 lines)
- Why fragile: Complex 3D packing simulation logic tightly coupled with a massive UI component. Any change to packing rules affects both files.
- Safe modification: Test packing logic in isolation before touching UI
- Test coverage: Zero — no automated tests exist

**MES integration (cross-database dependency):**
- Files: `src/lib/supabase/mes-server.ts`, `src/app/api/admin/sync-docs/route.ts`
- Why fragile: Depends on MES Supabase project's `labdoc_products` table structure. Schema changes in MES break trade-intel silently.
- Safe modification: Add type definitions for MES table schemas; version the sync API
- Test coverage: Zero

## Scaling Limits

**Order number generation:**
- Current capacity: 9,999 orders per day (4-digit sequence `ORD-YYYYMMDD-XXXX`)
- Limit: At 10,000 orders/day the sequence overflows
- Scaling path: Extend to 5+ digit sequence or use a different scheme

**R2 image sync (full scan):**
- Current capacity: Scans all objects under `products/` prefix on every sync
- Limit: Performance degrades linearly with total stored objects
- Scaling path: Use incremental sync with last-modified timestamps

## Dependencies at Risk

**`xlsx` package (SheetJS):**
- Risk: Using the community edition `xlsx@0.18.5` which is no longer actively maintained; the maintained version is `xlsx-js-style` or the commercial SheetJS Pro
- Impact: No security patches for vulnerabilities
- Migration plan: Evaluate `exceljs` or `xlsx-js-style` as alternatives

**`radix-ui@1.4.3` (monorepo package):**
- Risk: Using the newer `radix-ui` single package instead of individual `@radix-ui/*` scoped packages — this is relatively new and less battle-tested
- Impact: Low risk, but documentation examples may reference old package structure
- Migration plan: Monitor for stability; rollback to scoped packages if issues arise

## Missing Critical Features

**No email/notification system:**
- Problem: No notifications when order status changes — buyers, sales, and logistics must manually check the dashboard
- Blocks: Real-time collaboration; buyers don't know when their order is confirmed or needs a decision

**No audit log viewer:**
- Problem: `order_events` table records events, but there's no UI to view the full audit trail across all orders
- Blocks: Admin oversight, compliance tracking

**No rate limiting on API routes:**
- Problem: Public-facing API routes (`/api/barcode-lookup`, `/api/r2-download`) have no rate limiting
- Blocks: Production hardening; vulnerable to abuse

## Test Coverage Gaps

**Zero automated tests:**
- What's not tested: The entire codebase — there are no test files (`.test.*`, `.spec.*`) anywhere in `src/`
- Files: All of `src/`
- Risk: Any change could break existing functionality without detection. Critical business logic (order state transitions, pricing calculations, packing simulation) has zero coverage.
- Priority: **High** — Start with unit tests for `src/lib/packing/simulator.ts`, `src/lib/queries/`, and server actions in `src/app/(dashboard)/*/_actions/`

---

*Concerns audit: 2026-03-25*
