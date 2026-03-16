import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InventoryLotRow } from "@/types";

type SalesInventoryPanelProps = {
  lots: InventoryLotRow[];
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-CA");
}

function confidenceIndicator(status: InventoryLotRow["confidence_status"]) {
  if (status === "high") {
    return "🟢 high";
  }

  if (status === "medium") {
    return "🟡 medium";
  }

  return "🔴 low";
}

export function SalesInventoryPanel({ lots }: SalesInventoryPanelProps) {
  if (lots.length === 0) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        No inventory available
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lot No</TableHead>
            <TableHead>Available Qty (boxes)</TableHead>
            <TableHead>Expiry Date</TableHead>
            <TableHead>Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lots.map((lot) => (
            <TableRow key={lot.id}>
              <TableCell className="font-medium">{lot.lot_no}</TableCell>
              <TableCell>{lot.available_qty}</TableCell>
              <TableCell>{formatDate(lot.expiry_date)}</TableCell>
              <TableCell>{confidenceIndicator(lot.confidence_status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
