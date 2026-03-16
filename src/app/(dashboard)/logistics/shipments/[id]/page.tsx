import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getCurrentUser } from "@/lib/auth";
import { getShipmentById, getShipmentPallets } from "@/lib/queries/shipments";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShipmentHeader } from "./shipment-header";
import { ShipmentPallets } from "./shipment-pallets";

export default async function ShipmentDetailPage({
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
  const [shipmentResult, palletsResult] = await Promise.all([
    getShipmentById(supabase, id),
    getShipmentPallets(supabase, id),
  ]);

  if (!shipmentResult.data) {
    notFound();
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
            <BreadcrumbPage>{shipmentResult.data.shipment_no}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <ShipmentHeader shipment={shipmentResult.data} />
      <ShipmentPallets pallets={palletsResult.data} />
    </div>
  );
}
