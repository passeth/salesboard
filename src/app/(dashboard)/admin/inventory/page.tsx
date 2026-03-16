import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getCommittedOrderQuantities, getInventorySummary, getProductionPlans } from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";
import { createMesClient } from "@/lib/supabase/mes-server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { InventorySearch } from "./inventory-search";
import { InventorySyncButton } from "./inventory-sync-button";
import { InventoryTable } from "./inventory-table";

type AdminInventorySearchParams = {
  search?: string;
  sort?: string;
  sortDir?: string;
  page?: string;
};

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
  const mesClient = createMesClient();

  const [inventoryResult, productionPlansMap, committedMap] = await Promise.all([
    getInventorySummary(supabase, {
      search: params.search,
      sort: params.sort,
      sortDir,
      page: safePage,
      pageSize: 20,
    }),
    getProductionPlans(mesClient),
    getCommittedOrderQuantities(supabase),
  ]);

  const productsWithPlans = inventoryResult.data.map((product) => {
    const plans = productionPlansMap.get(product.sku) ?? [];
    const plannedQty = plans.reduce((sum, p) => sum + p.remaining_qty, 0);
    const committedQty = committedMap.get(product.product_id) ?? 0;
    return { ...product, planned_qty: plannedQty, production_plans: plans, committed_qty: committedQty };
  });

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Inventory" />
        <InventorySyncButton />
      </div>

      <InventorySearch currentSearch={params.search} />

      <InventoryTable
        products={productsWithPlans}
        totalCount={inventoryResult.count}
        currentPage={safePage}
        pageSize={20}
        currentSort={params.sort}
        currentSortDir={params.sortDir}
      />
    </section>
  );
}
