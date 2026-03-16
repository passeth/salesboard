import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getLogisticsPackingListOrders, LogisticsPackingListFilters } from "@/lib/queries/orders";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { PackingListTable } from "./packing-list-table";

type PackingListSearchParams = {
  fromDate?: string;
  toDate?: string;
  page?: string;
};

export default async function PackingListIndexPage({
  searchParams,
}: {
  searchParams: Promise<PackingListSearchParams>;
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
        title="Packing Lists"
        description="Draft packing lists directly from confirmed orders. If a shipment already exists, the latest shipment is attached automatically."
      />

      <PackingListTable
        orders={ordersResult.data}
        totalCount={ordersResult.count}
        currentPage={safePage}
        pageSize={20}
      />
    </div>
  );
}
