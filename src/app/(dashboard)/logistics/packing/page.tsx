import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getLogisticsPackingListOrders, LogisticsPackingListFilters } from "@/lib/queries/orders";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { PackingTable } from "./packing-table";

type PackingSearchParams = {
  fromDate?: string;
  toDate?: string;
  page?: string;
};

export default async function PackingPlannerIndexPage({
  searchParams,
}: {
  searchParams: Promise<PackingSearchParams>;
}) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10);
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;

  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== UserRole.Logistics && currentUser.role !== UserRole.Admin)) {
    redirect("/login");
  }

  const supabase = await createClient();
  const filters: LogisticsPackingListFilters = {
    fromDate: params.fromDate,
    toDate: params.toDate,
    page: safePage,
    pageSize: 20,
  };

  const ordersResult = await getLogisticsPackingListOrders(supabase, filters);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Packing Planner"
        description="Draft pallet plans immediately after order confirmation, then hand them off into final shipment packing once a shipment exists."
      />

      <PackingTable
        orders={ordersResult.data}
        totalCount={ordersResult.count}
        currentPage={safePage}
        pageSize={20}
      />
    </div>
  );
}
