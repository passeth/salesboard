import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getBuyerOrders } from "@/lib/queries/orders";
import { getBuyerOrganizations } from "@/lib/queries/organizations";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BuyerOrgSelector } from "../buyer-org-selector";
import { OrdersFilters } from "./orders-filters";
import { OrdersTable } from "./orders-table";

type OrdersPageSearchParams = {
  status?: string;
  fromDate?: string;
  toDate?: string;
  sort?: string;
  sortDir?: string;
  page?: string;
  org?: string;
};

export default async function BuyerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<OrdersPageSearchParams>;
}) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10);
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const sortDir = params.sortDir === "asc" || params.sortDir === "desc" ? params.sortDir : undefined;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const isAdmin = currentUser.role === UserRole.Admin;

  if (!isAdmin && !currentUser.orgId) {
    redirect("/login");
  }

  const selectedOrgId = isAdmin ? (params.org ?? null) : currentUser.orgId;

  const supabase = await createClient();
  let buyerOrgs: Awaited<ReturnType<typeof getBuyerOrganizations>>["data"] = [];
  let selectedOrgName: string | null = null;

  if (isAdmin) {
    const { data } = await getBuyerOrganizations(supabase);
    buyerOrgs = data;
    if (selectedOrgId) {
      const found = data.find((o) => o.id === selectedOrgId);
      selectedOrgName = found?.name ?? null;
    }
  }

  const ordersResult = await getBuyerOrders(supabase, selectedOrgId, {
    status: params.status,
    fromDate: params.fromDate,
    toDate: params.toDate,
    sort: params.sort,
    sortDir,
    page: safePage,
    pageSize: 20,
  });

  const title = isAdmin
    ? selectedOrgName
      ? `Orders — ${selectedOrgName}`
      : "All Buyer Orders"
    : "My Orders";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title}>
        {!isAdmin ? (
          <Button asChild>
            <Link href="/buyer/order/new">New Order</Link>
          </Button>
        ) : null}
      </PageHeader>

      {isAdmin ? (
        <BuyerOrgSelector
          organizations={buyerOrgs}
          currentOrgId={params.org}
        />
      ) : null}

      <OrdersFilters
        currentStatus={params.status}
        currentFromDate={params.fromDate}
        currentToDate={params.toDate}
      />

      <OrdersTable
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
