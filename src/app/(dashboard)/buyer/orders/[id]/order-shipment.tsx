import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShipmentRow } from "@/types";

type OrderShipmentProps = {
  shipments: ShipmentRow[];
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-CA");
}

export function OrderShipment({ shipments }: OrderShipmentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipment</CardTitle>
      </CardHeader>
      <CardContent>
        {shipments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shipments available yet.</p>
        ) : (
          <div className="space-y-3">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Forwarder:</span> {shipment.forwarder_name ?? "-"}
                </p>
                <p>
                  <span className="text-muted-foreground">Tracking No:</span> {shipment.tracking_no ?? "-"}
                </p>
                <p>
                  <span className="text-muted-foreground">ETD:</span> {formatDate(shipment.etd)}
                </p>
                <p>
                  <span className="text-muted-foreground">ETA:</span> {formatDate(shipment.eta)}
                </p>
                <p className="md:col-span-2">
                  <span className="text-muted-foreground">Status:</span> {shipment.shipping_status}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
