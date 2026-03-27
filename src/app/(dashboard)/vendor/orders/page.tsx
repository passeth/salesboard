import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import {
  getVendorBuyerOrganizations,
  getVendorOrders,
  getVendorOrganizations,
  VendorOrderFilters,
} from "@/lib/queries/vendor";
import { createClient } from "@/lib/supabase/server";
import { OrderStatus, UserRole } from "@/types";
import { redirect } from "next/navigation";
import { VendorOrgSelector } from "../vendor-org-selector";
import { VendorOrdersFilters } from "./vendor-orders-filters";
import { VendorOrdersTable } from "./vendor-orders-table";

export type VendorOrderTab = "submitted" | "review" | "confirmed" | "completed";

const TAB_STATUSES: Record<VendorOrderTab, string[]> = {
  submitted: [OrderStatus.Submitted],
  review: [OrderStatus.VendorReview, OrderStatus.SalesReview, OrderStatus.NeedsBuyerDecision],
  confirmed: [OrderStatus.Confirmed, OrderStatus.Invoiced, OrderStatus.PartiallyShipped, OrderStatus.Shipped],
  completed: [OrderStatus.Completed],
};

type VendorOrdersSearchParams = {
  vendorOrg?: string;
  tab?: string;
  buyerOrg?: string;
  fromDate?: string;
  toDate?: string;
  sort?: string;
  sortDir?: string;
  page?: string;
};

export default async function VendorOrdersPage({
  searchParams,
}: {
  searchParams: Promise<VendorOrdersSearchParams>;
}) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10);
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const sortDir = params.sortDir === "asc" || params.sortDir === "desc" ? params.sortDir : undefined;

  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== UserRole.Vendor && currentUser.role !== UserRole.Admin)) {
    redirect("/login");
  }

  if (!currentUser.orgId && currentUser.role === UserRole.Vendor) {
    redirect("/login");
  }

  const isAdmin = currentUser.role === UserRole.Admin;
  const supabase = await createClient();

  const vendorOrgs = isAdmin ? await getVendorOrganizations(supabase) : [];
  const vendorOrgId = isAdmin ? (params.vendorOrg ?? "") : (currentUser.orgId ?? "");

  const activeTab = (params.tab === "review" || params.tab === "confirmed" || params.tab === "completed" ? params.tab : "submitted") as VendorOrderTab;

  const filters: VendorOrderFilters = {
    statuses: TAB_STATUSES[activeTab],
    buyerOrg: params.buyerOrg,
    fromDate: params.fromDate,
    toDate: params.toDate,
    sort: params.sort,
    sortDir,
    page: safePage,
    pageSize: 20,
  };

  const [ordersResult, buyerOrganizations] = await Promise.all([
    vendorOrgId ? getVendorOrders(supabase, vendorOrgId, filters) : Promise.resolve({ data: [], count: 0 }),
    vendorOrgId ? getVendorBuyerOrganizations(supabase, vendorOrgId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Orders" />

      {isAdmin && (
        <VendorOrgSelector vendors={vendorOrgs} currentVendorOrg={params.vendorOrg} />
      )}

      <VendorOrdersFilters
        currentTab={activeTab}
        currentBuyerOrg={params.buyerOrg}
        currentFromDate={params.fromDate}
        currentToDate={params.toDate}
        buyerOrganizations={buyerOrganizations}
      />

      <VendorOrdersTable
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
