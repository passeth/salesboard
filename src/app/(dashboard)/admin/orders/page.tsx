import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getAdminOrderFilterOptions, getAdminOrders } from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { OrdersFilters } from "./orders-filters";
import { OrdersTable } from "./orders-table";

type AdminOrdersSearchParams = {
  status?: string;
  orgId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  sort?: string;
  sortDir?: string;
  page?: string;
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<AdminOrdersSearchParams>;
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
  const [ordersResult, buyerOrganizations] = await Promise.all([
    getAdminOrders(supabase, {
      status: params.status,
      orgId: params.orgId,
      fromDate: params.fromDate,
      toDate: params.toDate,
      search: params.search,
      sort: params.sort,
      sortDir,
      page: safePage,
      pageSize: 20,
    }),
    getAdminOrderFilterOptions(supabase),
  ]);

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Order Management" />

      <OrdersFilters
        buyerOrganizations={buyerOrganizations}
        currentStatus={params.status}
        currentOrgId={params.orgId}
        currentFromDate={params.fromDate}
        currentToDate={params.toDate}
        currentSearch={params.search}
      />

      <OrdersTable
        orders={ordersResult.data}
        totalCount={ordersResult.count}
        currentPage={safePage}
        pageSize={20}
        currentSort={params.sort}
        currentSortDir={params.sortDir}
      />
    </section>
  );
}
