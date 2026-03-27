import { Separator } from "@/components/ui/separator";
import { getCurrentUser } from "@/lib/auth";
import {
  getAccountOverview,
  getAccountPerformance,
  getAccountPricing,
  getBuyerOrgList,
  getInternalUsers,
  getVendorOrganizations,
} from "@/lib/queries/sales-accounts";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { AccountDetailTabs } from "./account-detail-tabs";
import { AccountSwitcher } from "./account-switcher";
import { SalesUserSelect } from "./sales-user-select";

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

  const [overviewResult, pricingResult, performanceResult, internalUsers, vendorOrgs, buyerOrgs] =
    await Promise.all([
      getAccountOverview(supabase, orgId),
      getAccountPricing(supabase, orgId),
      getAccountPerformance(supabase, orgId),
      getInternalUsers(supabase),
      getVendorOrganizations(supabase),
      getBuyerOrgList(supabase),
    ]);

  if (!overviewResult.data) {
    redirect("/sales/accounts");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <AccountSwitcher
              currentName={overviewResult.data.org.name}
              currentId={orgId}
              accounts={buyerOrgs}
            />
          </div>
          <div className="flex items-center gap-2">
            <SalesUserSelect
              buyerOrgId={orgId}
              currentSalesUserId={overviewResult.data.assignment?.sales_user_id ?? null}
              salesUsers={internalUsers.filter((u) => u.role === "sales" || u.role === "admin")}
            />
          </div>
        </div>
        <Separator />
      </div>

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
