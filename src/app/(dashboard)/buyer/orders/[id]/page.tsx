import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getOrderById, getOrderEvents, getOrderItems } from "@/lib/queries/orders";
import { createClient } from "@/lib/supabase/server";
import { DocumentRow, InvoiceRow, OrderWithOrg, ShipmentRow } from "@/types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BuyerDecisionSection } from "./buyer-decision-section";
import { OrderDetailTabs } from "./order-detail-tabs";
import { OrderSummaryHeader } from "./order-summary-header";

export default async function BuyerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const [orderResult, itemsResult, eventsResult, invoicesResult, shipmentsResult, documentsResult] =
    await Promise.all([
      getOrderById(supabase, id),
      getOrderItems(supabase, id),
      getOrderEvents(supabase, id),
      supabase.from("invoices").select("*").eq("order_id", id).order("created_at", { ascending: false }),
      supabase.from("shipments").select("*").eq("order_id", id).order("created_at", { ascending: false }),
      supabase
        .from("documents")
        .select("*")
        .eq("owner_type", "order")
        .eq("owner_id", id)
        .eq("is_buyer_visible", true)
        .order("created_at", { ascending: false }),
    ]);

  const order = orderResult.data;

  if (!order) {
    notFound();
  }

  // Draft orders redirect to cart review page
  if (order.status === "draft") {
    redirect(`/buyer/order/new?draft=${order.id}`);
  }

  const shipToOrgsResult = await supabase
    .from("organizations")
    .select("id, name, code")
    .eq("parent_org_id", order.ordering_org_id)
    .eq("org_type", "buyer_ship_to")
    .eq("status", "active")
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/buyer/orders">My Orders</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{order.order_no}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {order.status === "needs_buyer_decision" ? (
        <BuyerDecisionSection orderId={order.id} orderStatus={order.status} items={itemsResult.data} />
      ) : null}

      <OrderSummaryHeader
        order={order as OrderWithOrg}
        items={itemsResult.data}
        shipments={(shipmentsResult.data ?? []) as ShipmentRow[]}
        events={eventsResult.data}
        shipToOrgs={shipToOrgsResult.data ?? []}
      />

      <OrderDetailTabs
        items={itemsResult.data}
        events={eventsResult.data}
        invoices={(invoicesResult.data ?? []) as InvoiceRow[]}
        shipments={(shipmentsResult.data ?? []) as ShipmentRow[]}
        documents={(documentsResult.data ?? []) as DocumentRow[]}
        orderStatus={order.status}
        currencyCode={order.organization?.currency_code || order.currency_code}
      />
    </div>
  );
}
