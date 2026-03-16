import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/page-header";
import { PackingListEditor } from "@/components/logistics/packing/packing-list-editor";
import { getCurrentUser } from "@/lib/auth";
import { getShipmentPackingData } from "@/lib/queries/shipment-packing";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function ShipmentPackingListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser || (currentUser.role !== UserRole.Logistics && currentUser.role !== UserRole.Admin)) {
    redirect("/login");
  }

  const supabase = await createClient();
  const packingData = await getShipmentPackingData(supabase, id);

  if (!packingData.shipment || !packingData.shipmentContext) {
    notFound();
  }

  if (packingData.error) {
    throw packingData.error;
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/logistics/shipments">Shipments</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/logistics/shipments/${id}`}>{packingData.shipment.shipment_no}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Packing List</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        title="Packing List"
        description="If no pallet packing is saved yet, the draft is seeded from confirmed order quantities."
      />

      <PackingListEditor
        orderNo={packingData.shipment.order.order_no}
        shipmentNo={packingData.shipment.shipment_no}
        buyerName={packingData.shipment.order.organization.name}
        shipmentContext={packingData.shipmentContext}
        orderItems={packingData.orderItems}
        pallets={packingData.pallets}
      />
    </div>
  );
}
