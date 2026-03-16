"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InventoryLotDetail } from "@/types";

type InventoryLotDetailsProps = {
  lots: InventoryLotDetail[];
  loading: boolean;
  error: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-CA");
}

export function InventoryLotDetails({ lots, loading, error }: InventoryLotDetailsProps) {
  if (loading) {
    return <div className="px-4 py-3 text-sm text-muted-foreground">Loading lot details...</div>;
  }

  if (error) {
    return <div className="px-4 py-3 text-sm text-destructive">{error}</div>;
  }

  if (lots.length === 0) {
    return <div className="px-4 py-3 text-sm text-muted-foreground">No lot details found.</div>;
  }

  return (
    <div className="px-2 py-3">
      <div className="overflow-hidden rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lot No</TableHead>
              <TableHead>Manufacturing Date</TableHead>
              <TableHead className="text-right">Total Quantity</TableHead>
              <TableHead className="text-right">Receipt Count</TableHead>
              <TableHead>Latest Receipt Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lots.map((lot) => (
              <TableRow key={lot.lot_no}>
                <TableCell className="font-medium">{lot.lot_no}</TableCell>
                <TableCell>{formatDate(lot.manufacturing_date)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {lot.total_quantity.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {lot.receipt_count.toLocaleString()}
                </TableCell>
                <TableCell>{formatDate(lot.latest_receipt_date)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
