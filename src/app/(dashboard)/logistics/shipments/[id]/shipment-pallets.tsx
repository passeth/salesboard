import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShipmentPallet } from "@/lib/queries/shipments";
import { PackageSearch } from "lucide-react";
import { PalletCard } from "./pallet-card";

type ShipmentPalletsProps = {
  pallets: ShipmentPallet[];
};

export function ShipmentPallets({ pallets }: ShipmentPalletsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pallets</CardTitle>
      </CardHeader>
      <CardContent>
        {pallets.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No pallets created yet"
            description="Pallets will appear here once packing starts."
          />
        ) : (
          <div className="space-y-4">
            {pallets.map((pallet) => (
              <PalletCard key={pallet.id} pallet={pallet} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
