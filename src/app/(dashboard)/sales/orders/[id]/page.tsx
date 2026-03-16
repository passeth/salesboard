import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getCurrentUser } from "@/lib/auth";
import { getOrderById, getOrderEvents, getOrderItems } from "@/lib/queries/orders";
import { getInventoryForProducts } from "@/lib/queries/sales-orders";
import { createClient } from "@/lib/supabase/server";
import { OrderWithOrg, UserRole } from "@/types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SalesOrderHeader } from "./sales-order-header";
import { SalesOrderItems } from "./sales-order-items";
import { SalesTimeline } from "./sales-timeline";

export default async function SalesOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== UserRole.Sales && currentUser.role !== UserRole.Admin)) {
    redirect("/login");
  }

  const supabase = await createClient();
  const [orderResult, itemsResult, eventsResult] = await Promise.all([
    getOrderById(supabase, id),
    getOrderItems(supabase, id),
    getOrderEvents(supabase, id),
  ]);

  const order = orderResult.data;

  if (!order) {
    notFound();
  }

  if (currentUser.role === UserRole.Sales && order.sales_owner_user_id !== currentUser.id) {
    notFound();
  }

  const productIds = Array.from(new Set(itemsResult.data.map((item) => item.product_id)));
  const inventoryByProductId = await getInventoryForProducts(supabase, productIds);

  return (
    <div className="flex flex-col gap-6 pb-24">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/sales/orders">Order Review</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{order.order_no}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <SalesOrderHeader order={order as OrderWithOrg} />
      <SalesOrderItems orderId={order.id} items={itemsResult.data} inventoryByProductId={inventoryByProductId} />
      <SalesTimeline events={eventsResult.data} />
    </div>
  );
}
