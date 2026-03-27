import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getCommittedOrderQuantities, getInventorySummary, getProductionPlans } from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";
import { createMesClient } from "@/lib/supabase/mes-server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { InventorySearch } from "./inventory-search";
import { InventorySyncButton } from "./inventory-sync-button";
import { InventoryTable } from "./inventory-table";

type AdminInventorySearchParams = {
  search?: string;
  brand?: string;
  sort?: string;
  sortDir?: string;
  page?: string;
};

/** Cache production plans for 60s — they don't change per page */
const getCachedProductionPlans = unstable_cache(
  async () => {
    const mesClient = createMesClient();
    const plansMap = await getProductionPlans(mesClient);
    // Convert Map to serializable object for caching
    const obj: Record<string, ReturnType<typeof plansMap.get> extends infer T ? T : never> = {};
    plansMap.forEach((v, k) => { obj[k] = v; });
    return obj;
  },
  ["production-plans"],
  { revalidate: 60 }
);

/** Cache committed quantities for 60s — they don't change per page */
const getCachedCommittedQty = unstable_cache(
  async () => {
    const supabase = await createClient();
    const committedMap = await getCommittedOrderQuantities(supabase);
    const obj: Record<string, number> = {};
    committedMap.forEach((v, k) => { obj[k] = v; });
    return obj;
  },
  ["committed-qty"],
  { revalidate: 60 }
);

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<AdminInventorySearchParams>;
}) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10);
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const sortDir = params.sortDir === "asc" || params.sortDir === "desc" ? params.sortDir : undefined;

  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) {
    redirect("/login");
  }

  const supabase = await createClient();

  const { data: brandsData } = await supabase
    .from("products")
    .select("brand")
    .not("brand", "is", null)
    .order("brand");
  const brands = [...new Set((brandsData ?? []).map((b) => b.brand as string))];

  const [inventoryResult, productionPlansObj, committedObj] = await Promise.all([
    getInventorySummary(supabase, {
      search: params.search,
      brand: params.brand,
      sort: params.sort,
      sortDir,
      page: safePage,
      pageSize: 200,
    }),
    getCachedProductionPlans(),
    getCachedCommittedQty(),
  ]);

  const productsWithPlans = inventoryResult.data.map((product) => {
    const plans = productionPlansObj[product.sku] ?? [];
    const plannedQty = plans.reduce((sum, p) => sum + p.remaining_qty, 0);
    const committedQty = committedObj[product.product_id] ?? 0;
    return { ...product, planned_qty: plannedQty, production_plans: plans, committed_qty: committedQty };
  });

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Inventory" />
        <InventorySyncButton />
      </div>

      <InventorySearch currentSearch={params.search} currentBrand={params.brand} brands={brands} />

      <InventoryTable
        products={productsWithPlans}
        totalCount={inventoryResult.count}
        currentPage={safePage}
        pageSize={200}
        currentSort={params.sort}
        currentSortDir={params.sortDir}
      />
    </section>
  );
}
