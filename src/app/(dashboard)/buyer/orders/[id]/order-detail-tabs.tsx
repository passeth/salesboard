"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentRow, InvoiceRow, OrderEventRow, OrderItemWithProduct, OrderStatus, ShipmentRow } from "@/types";
import { useState } from "react";
import { OrderDocuments } from "./order-documents";
import { OrderInvoice } from "./order-invoice";
import { OrderItemsTable } from "./order-items-table";
import { OrderShipment } from "./order-shipment";
import { OrderTimeline } from "./order-timeline";

type OrderDetailTabsProps = {
  items: OrderItemWithProduct[];
  events: OrderEventRow[];
  invoices: InvoiceRow[];
  shipments: ShipmentRow[];
  documents: DocumentRow[];
  orderStatus: OrderStatus | string;
};

export function OrderDetailTabs({
  items,
  events,
  invoices,
  shipments,
  documents,
  orderStatus,
}: OrderDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("items");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="items">
          Order Items
          <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
            {items.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="packing">
          Packing List
          {shipments.length > 0 && (
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
              {shipments.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="invoice">
          Invoice
          {invoices.length > 0 && (
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
              {invoices.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="documents">
          Documents
          {documents.length > 0 && (
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
              {documents.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="items" className="mt-4 space-y-4">
        <OrderItemsTable items={items} orderStatus={orderStatus} />
        <OrderTimeline events={events} />
      </TabsContent>

      <TabsContent value="packing" className="mt-4">
        <OrderShipment shipments={shipments} />
      </TabsContent>

      <TabsContent value="invoice" className="mt-4">
        <OrderInvoice invoices={invoices} />
      </TabsContent>

      <TabsContent value="documents" className="mt-4">
        <OrderDocuments documents={documents} />
      </TabsContent>
    </Tabs>
  );
}
