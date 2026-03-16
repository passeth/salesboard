import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getBuyerOrganizations } from "@/lib/queries/organizations";
import { getBuyerProducts } from "@/lib/queries/products";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { BuyerOrgSelector } from "../buyer-org-selector";
import { BuyerProductsGrid } from "./buyer-products-grid";

export default async function BuyerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const q = params.q;

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const isAdmin = currentUser.role === UserRole.Admin;
  if (!isAdmin && !currentUser.orgId) redirect("/login");

  const selectedOrgId = isAdmin ? (params.org ?? null) : currentUser.orgId;

  const supabase = await createClient();

  let buyerOrgs: Awaited<ReturnType<typeof getBuyerOrganizations>>["data"] = [];
  if (isAdmin) {
    const { data } = await getBuyerOrganizations(supabase);
    buyerOrgs = data;
  }

  const productsResult = selectedOrgId
    ? await getBuyerProducts(supabase, selectedOrgId, { search: q })
    : { data: [] };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Our Products"
        description="Products you've ordered with cumulative quantities"
      />

      {isAdmin ? (
        <BuyerOrgSelector
          organizations={buyerOrgs}
          currentOrgId={params.org}
        />
      ) : null}

      <BuyerProductsGrid products={productsResult.data} />
    </div>
  );
}
