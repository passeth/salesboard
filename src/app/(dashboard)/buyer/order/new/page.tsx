import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getBuyerDraftOrder } from "@/lib/queries/products";
import { getShipToOrganizations, getBuyerOrganizations } from "@/lib/queries/organizations";
import { createClient } from "@/lib/supabase/server";
import { UserRole, type OrganizationRow } from "@/types";
import { redirect } from "next/navigation";
import { BuyerOrgSelector } from "../../buyer-org-selector";
import { OrderForm } from "./order-form";

type NewOrderSearchParams = {
  org?: string;
};

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<NewOrderSearchParams>;
}) {
  const params = await searchParams;

  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser.orgId) {
    redirect("/login");
  }

  const supabase = await createClient();
  const isAdmin = currentUser.role === UserRole.Admin;

  const selectedOrgId = isAdmin && params.org ? params.org : currentUser.orgId;

  let draftOrder = null;
  let shipToOrgs: Array<{ id: string; name: string }> = [];

  if (selectedOrgId) {
    const [draftResult, shipToResult] = await Promise.all([
      getBuyerDraftOrder(supabase, selectedOrgId),
      getShipToOrganizations(supabase, selectedOrgId),
    ]);

    draftOrder = draftResult.data;
    shipToOrgs = shipToResult.data;
  }

  let buyerOrgs: Pick<OrganizationRow, "id" | "name" | "code" | "org_type">[] = [];
  if (isAdmin) {
    const buyerOrgsResult = await getBuyerOrganizations(supabase);
    buyerOrgs = buyerOrgsResult.data;
  }

  return (
    <div className="space-y-6">
      {isAdmin && buyerOrgs.length > 0 ? (
        <BuyerOrgSelector organizations={buyerOrgs} currentOrgId={selectedOrgId} />
      ) : null}

      <PageHeader title="Review Order" description="Review your cart and submit your order" />

      <OrderForm draftOrder={draftOrder} shipToOrgs={shipToOrgs} orgId={selectedOrgId} />
    </div>
  );
}
