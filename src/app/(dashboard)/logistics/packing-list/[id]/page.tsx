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
import { getOrderPackingData } from "@/lib/queries/shipment-packing";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function LogisticsPackingListDetailPage({
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
              <Link href="/logistics/packing-list">Packing Lists</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{packingData.order.order_no}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        title="Packing List"
        description={
          packingData.order.shipment
            ? "Shipment data exists, but the draft still falls back to order quantities when pallet packing is empty."
            : "No shipment exists yet. This packing list draft is initialized directly from the order."
        }
      />

      <PackingListEditor
        orderNo={packingData.order.order_no}
        shipmentNo={packingData.order.shipment?.shipment_no ?? null}
        buyerName={packingData.order.organization.name}
        shipmentContext={packingData.shipmentContext}
        orderItems={packingData.orderItems}
        pallets={packingData.pallets}
      />
    </div>
  );
}
