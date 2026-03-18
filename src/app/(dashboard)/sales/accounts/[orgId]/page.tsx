import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import {
  getAccountOverview,
  getAccountPerformance,
  getAccountPricing,
  getInternalUsers,
  getVendorOrganizations,
} from "@/lib/queries/sales-accounts";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { AccountDetailTabs } from "./account-detail-tabs";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== UserRole.Sales && currentUser.role !== UserRole.Admin)) {
    redirect("/login");
  }

  const supabase = await createClient();

  const [overviewResult, pricingResult, performanceResult, internalUsers, vendorOrgs] =
    await Promise.all([
      getAccountOverview(supabase, orgId),
      getAccountPricing(supabase, orgId),
      getAccountPerformance(supabase, orgId),
      getInternalUsers(supabase),
      getVendorOrganizations(supabase),
    ]);

  if (!overviewResult.data) {
    redirect("/sales/accounts");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={overviewResult.data.org.name} />

      <AccountDetailTabs
        overview={overviewResult.data}
        pricing={pricingResult.data}
        performance={performanceResult.data}
        internalUsers={internalUsers}
        vendorOrgs={vendorOrgs}
      />
    </div>
  );
}
