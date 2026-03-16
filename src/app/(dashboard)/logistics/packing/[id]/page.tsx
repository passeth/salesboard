import { ShipmentPackingWorkspace } from "@/components/logistics/packing/packing-workspace";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getCurrentUser } from "@/lib/auth";
import { getOrderPackingData } from "@/lib/queries/shipment-packing";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function LogisticsPackingPlannerDetailPage({
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
  const packingData = await getOrderPackingData(supabase, id);

  if (!packingData.order || !packingData.shipmentContext) {
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
              <Link href="/logistics/packing">Packing Planner</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{packingData.order.order_no}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        title="Packing Planner"
        description={
          packingData.order.shipment
            ? "Shipment exists for this order. This screen now acts as the handoff into final shipment packing."
            : "No shipment exists yet. Save a draft plan here immediately after order confirmation."
        }
      >
        <Badge variant="outline">
          {packingData.order.shipment ? "Final Stage" : "Draft Stage"}
        </Badge>
        <Button asChild variant="outline">
          <Link href={`/logistics/packing-list/${packingData.order.id}`}>Open Packing List</Link>
        </Button>
        {packingData.order.shipment ? (
          <Button asChild variant="outline">
            <Link href={`/logistics/shipments/${packingData.order.shipment.id}/packing`}>Open Final Packing</Link>
          </Button>
        ) : null}
      </PageHeader>

      <ShipmentPackingWorkspace
        orderId={packingData.order.id}
        orderNo={packingData.order.order_no}
        shipmentId={packingData.order.shipment?.id ?? null}
        shipmentNo={packingData.order.shipment?.shipment_no ?? null}
        buyerName={packingData.order.organization.name}
        saveMode={packingData.order.shipment ? "shipment_final" : "order_draft"}
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
