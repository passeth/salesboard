import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getShipments, ShipmentFilters } from "@/lib/queries/shipments";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { ShipmentsFilters } from "./shipments-filters";
import { ShipmentsTable } from "./shipments-table";

type ShipmentsSearchParams = {
  status?: string;
  fromDate?: string;
  toDate?: string;
  sort?: string;
  sortDir?: string;
  page?: string;
};

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<ShipmentsSearchParams>;
}) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10);
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const sortDir = params.sortDir === "asc" || params.sortDir === "desc" ? params.sortDir : undefined;

  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== UserRole.Logistics && currentUser.role !== UserRole.Admin)) {
    redirect("/login");
  }

  const supabase = await createClient();
  const filters: ShipmentFilters = {
    status: params.status,
    fromDate: params.fromDate,
    toDate: params.toDate,
    sort: params.sort,
    sortDir,
    page: safePage,
    pageSize: 20,
  };

  const shipmentsResult = await getShipments(supabase, filters);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Shipments" />

      <ShipmentsFilters
        currentStatus={params.status}
        currentFromDate={params.fromDate}
        currentToDate={params.toDate}
      />

      <ShipmentsTable
        shipments={shipmentsResult.data}
        totalCount={shipmentsResult.count}
        currentPage={safePage}
        pageSize={20}
        currentSort={params.sort}
        currentSortDir={params.sortDir}
      />
    </div>
  );
}
