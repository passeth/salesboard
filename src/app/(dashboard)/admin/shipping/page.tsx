import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getAllShipToWithContacts } from "@/lib/queries/contacts";
import { getBuyerOrganizations } from "@/lib/queries/organizations";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { AdminShippingTable } from "./admin-shipping-table";

export default async function AdminShippingPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) redirect("/login");

  const supabase = await createClient();
  const [{ data }, { data: buyers }] = await Promise.all([
    getAllShipToWithContacts(supabase),
    getBuyerOrganizations(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Shipping Management"
        description="Manage all ship-to locations and consignee contacts across buyers"
      />
      <AdminShippingTable initialData={data} buyers={buyers} />
    </div>
  );
}
