import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import {
  getAccountCountries,
  getSalesAccounts,
  type AccountListFilters,
} from "@/lib/queries/sales-accounts";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { SalesAccountsFilters } from "./sales-accounts-filters";
import { SalesAccountsTable } from "./sales-accounts-table";

type SearchParams = {
  search?: string;
  country?: string;
  hasVendor?: string;
};

export default async function SalesAccountsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== UserRole.Sales && currentUser.role !== UserRole.Admin)) {
    redirect("/login");
  }

  const supabase = await createClient();

  const filters: AccountListFilters = {
    search: params.search,
    country: params.country,
    hasVendor: params.hasVendor === "yes" || params.hasVendor === "no" ? params.hasVendor : undefined,
  };

  const [accountsResult, countries] = await Promise.all([
    getSalesAccounts(supabase, filters),
    getAccountCountries(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Accounts" />

      <SalesAccountsFilters
        currentSearch={params.search}
        currentCountry={params.country}
        currentHasVendor={params.hasVendor}
        countries={countries}
      />

      <SalesAccountsTable accounts={accountsResult.data} />
    </div>
  );
}
