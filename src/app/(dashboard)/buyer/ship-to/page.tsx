import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getShipToOrganizations } from "@/lib/queries/organizations";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShipToManager } from "./ship-to-manager";

export default async function ShipToPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.orgId) redirect("/login");

  const supabase = await createClient();
  const { data: shipToOrgs } = await getShipToOrganizations(supabase, currentUser.orgId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Ship-to Locations" description="Manage your delivery destinations" />
      <ShipToManager initialData={shipToOrgs} />
    </div>
  );
}
