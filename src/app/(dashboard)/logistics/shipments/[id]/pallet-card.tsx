import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShipmentPallet } from "@/lib/queries/shipments";

type PalletCardProps = {
  pallet: ShipmentPallet;
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-CA");
}

function formatCbm(value: number | null) {
  if (value === null) {
    return "-";
  }

  return value.toFixed(3);
}

function calculatePalletCbm(pallet: ShipmentPallet) {
  if (pallet.pallet_cbm !== null) {
    return pallet.pallet_cbm;
  }

  if (
    pallet.pallet_width_mm === null ||
    pallet.pallet_depth_mm === null ||
    pallet.pallet_height_mm === null
  ) {
    return null;
  }

  const widthM = pallet.pallet_width_mm / 1000;
  const depthM = pallet.pallet_depth_mm / 1000;
  const heightM = pallet.pallet_height_mm / 1000;

  return widthM * depthM * heightM;
}

export function PalletCard({ pallet }: PalletCardProps) {
  const calculatedCbm = calculatePalletCbm(pallet);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span>{pallet.pallet_no}</span>
          <Badge variant="outline">{pallet.shipping_mark ?? "-"}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <p>
            <span className="text-muted-foreground">Dimensions:</span>{" "}
            {pallet.pallet_width_mm ?? "-"} x {pallet.pallet_depth_mm ?? "-"} x {pallet.pallet_height_mm ?? "-"} mm
          </p>
          <p>
            <span className="text-muted-foreground">Pallet CBM:</span> {formatCbm(calculatedCbm)}
          </p>
          <p>
            <span className="text-muted-foreground">Gross / Net:</span> {pallet.gross_weight ?? "-"} /{" "}
            {pallet.net_weight ?? "-"}
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Packed Cases</TableHead>
              <TableHead>Packed Units</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Lot No</TableHead>
              <TableHead>Partial Case</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pallet.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No pallet items yet.
                </TableCell>
              </TableRow>
            ) : (
              pallet.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product?.name ?? "-"}</TableCell>
                  <TableCell>{item.product?.sku ?? "-"}</TableCell>
                  <TableCell>{item.packed_case_qty}</TableCell>
                  <TableCell>{item.packed_unit_qty}</TableCell>
                  <TableCell>{formatDate(item.expiry_date_snapshot)}</TableCell>
                  <TableCell>{item.inventory_lot?.lot_no ?? "-"}</TableCell>
                  <TableCell>{item.is_partial_case ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
