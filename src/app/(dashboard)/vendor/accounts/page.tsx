import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getVendorAccounts, getVendorOrganizations } from "@/lib/queries/vendor";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { VendorOrgSelector } from "../vendor-org-selector";
import { VendorAccountsTable } from "./vendor-accounts-table";

type AccountsSearchParams = {
  vendorOrg?: string;
};

export default async function VendorAccountsPage({
  searchParams,
}: {
  searchParams: Promise<AccountsSearchParams>;
}) {
  const params = await searchParams;
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

  const accounts = vendorOrgId ? await getVendorAccounts(supabase, vendorOrgId) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Buyer Accounts" />

      {isAdmin && (
        <VendorOrgSelector vendors={vendorOrgs} currentVendorOrg={params.vendorOrg} />
      )}

      <VendorAccountsTable accounts={accounts} />
    </div>
  );
}
