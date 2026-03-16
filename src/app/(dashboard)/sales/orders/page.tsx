import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import {
  getSalesBuyerOrganizations,
  getSalesOrders,
  SalesOrderFilters,
} from "@/lib/queries/sales-orders";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { SalesOrdersFilters } from "./sales-orders-filters";
import { SalesOrdersTable } from "./sales-orders-table";

type SalesOrdersSearchParams = {
  status?: string;
  buyerOrg?: string;
  fromDate?: string;
  toDate?: string;
  sort?: string;
  sortDir?: string;
  page?: string;
};

export default async function SalesOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SalesOrdersSearchParams>;
}) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10);
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const sortDir = params.sortDir === "asc" || params.sortDir === "desc" ? params.sortDir : undefined;

  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== UserRole.Sales && currentUser.role !== UserRole.Admin)) {
    redirect("/login");
  }

  const supabase = await createClient();
  const salesUserId = currentUser.role === UserRole.Admin ? null : currentUser.id;

  const filters: SalesOrderFilters = {
    status: params.status,
    buyerOrg: params.buyerOrg,
    fromDate: params.fromDate,
    toDate: params.toDate,
    sort: params.sort,
    sortDir,
    page: safePage,
    pageSize: 20,
  };

  const [ordersResult, buyerOrganizations] = await Promise.all([
    getSalesOrders(supabase, salesUserId, filters),
    getSalesBuyerOrganizations(supabase, salesUserId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Order Review" />

      <SalesOrdersFilters
        currentStatus={params.status}
        currentBuyerOrg={params.buyerOrg}
        currentFromDate={params.fromDate}
        currentToDate={params.toDate}
        buyerOrganizations={buyerOrganizations}
      />

      <SalesOrdersTable
        orders={ordersResult.data}
        totalCount={ordersResult.count}
        currentPage={safePage}
        pageSize={20}
        currentSort={params.sort}
        currentSortDir={params.sortDir}
      />
    </div>
  );
}
