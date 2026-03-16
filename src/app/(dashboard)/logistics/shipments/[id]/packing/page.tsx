import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/page-header";
import { ShipmentPackingWorkspace } from "@/components/logistics/packing/packing-workspace";
import { getCurrentUser } from "@/lib/auth";
import { getShipmentPackingData } from "@/lib/queries/shipment-packing";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function ShipmentPackingPage({
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
            <BreadcrumbPage>Packing</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        title="Shipment Packing"
        description="Final packing stage for a created shipment. Confirm pallet layout, lot allocation, and shipment-ready weights before marking packed."
      >
        <Badge variant="outline">Final Stage</Badge>
      </PageHeader>

      <ShipmentPackingWorkspace
        orderId={packingData.shipment.order.id}
        orderNo={packingData.shipment.order.order_no}
        shipmentId={packingData.shipment.id}
        shipmentNo={packingData.shipment.shipment_no}
        buyerName={packingData.shipment.order.organization.name}
        saveMode="shipment_final"
        initialDraftDocument={packingData.pallets.length === 0 ? packingData.draft?.draft_json ?? null : null}
        draftSavedAt={packingData.draft?.updated_at ?? null}
        shipmentContext={packingData.shipmentContext}
        orderItems={packingData.orderItems}
        lots={packingData.lots}
        initialPallets={packingData.pallets}
      />
    </div>
  );
}
