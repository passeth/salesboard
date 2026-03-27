import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import {
  getVendorCommissions,
  getVendorCommissionSummary,
  getVendorOrganizations,
  VendorCommissionFilters,
} from "@/lib/queries/vendor";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { VendorOrgSelector } from "../vendor-org-selector";
import { VendorCommissionsFilters } from "./vendor-commissions-filters";
import { VendorCommissionsTable } from "./vendor-commissions-table";

type VendorCommissionsSearchParams = {
  vendorOrg?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: string;
};

export default async function VendorCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<VendorCommissionsSearchParams>;
}) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10);
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;

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

  const filters: VendorCommissionFilters = {
    status: params.status,
    fromDate: params.fromDate,
    toDate: params.toDate,
    page: safePage,
    pageSize: 20,
  };

  const [commissionsResult, summary] = await Promise.all([
    vendorOrgId ? getVendorCommissions(supabase, vendorOrgId, filters) : Promise.resolve({ data: [], count: 0 }),
    vendorOrgId ? getVendorCommissionSummary(supabase, vendorOrgId) : Promise.resolve({ totalEarned: 0, pending: 0, paid: 0 }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Commissions" />

      {isAdmin && (
        <VendorOrgSelector vendors={vendorOrgs} currentVendorOrg={params.vendorOrg} />
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">
              ${summary.totalEarned.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight text-amber-600">
              ${summary.pending.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight text-green-600">
              ${summary.paid.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <VendorCommissionsFilters
        currentStatus={params.status}
        currentFromDate={params.fromDate}
        currentToDate={params.toDate}
      />

      <VendorCommissionsTable
        commissions={commissionsResult.data}
        totalCount={commissionsResult.count}
        currentPage={safePage}
        pageSize={20}
      />
    </div>
  );
}
