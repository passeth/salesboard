import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getBuyerOrderCountsByStatus, getBuyerOrders } from "@/lib/queries/orders";
import { getBuyerOrganizations } from "@/lib/queries/organizations";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BuyerOrgSelector } from "../buyer-org-selector";
import { BUYER_STATUS_TABS } from "./buyer-status-tabs";
import { OrdersFilters } from "./orders-filters";
import { OrdersTable } from "./orders-table";

type OrdersPageSearchParams = {
  tab?: string;
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

  const activeTab = BUYER_STATUS_TABS.find((t) => t.key === params.tab);
  const statusesForQuery = activeTab?.statuses.length ? [...activeTab.statuses] : undefined;

  const ordersResult = await getBuyerOrders(supabase, selectedOrgId, {
    statuses: statusesForQuery,
    fromDate: params.fromDate,
    toDate: params.toDate,
    sort: params.sort,
    sortDir,
    page: safePage,
    pageSize: 20,
  });

  const countPromises = BUYER_STATUS_TABS.filter((t) => t.key !== "all").map(
    async (tab) => {
      const { count } = await getBuyerOrderCountsByStatus(
        supabase,
        selectedOrgId,
        [...tab.statuses],
      );
      return [tab.key, count] as const;
    },
  );

  const countEntries = await Promise.all(countPromises);
  const allCount = countEntries.reduce((sum, [, c]) => sum + c, 0);
  const tabCounts: Record<string, number> = Object.fromEntries([
    ["all", allCount],
    ...countEntries,
  ]);

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
        currentTab={params.tab}
        currentFromDate={params.fromDate}
        currentToDate={params.toDate}
        tabCounts={tabCounts}
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
