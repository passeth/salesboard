import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BoxQuantityDisplayProps = {
  boxes: number;
  unitsPerCase: number | null;
  className?: string;
};

export function BoxQuantityDisplay({ boxes, unitsPerCase, className }: BoxQuantityDisplayProps) {
  if (unitsPerCase === null) {
    return (
      <Badge variant="outline" className={cn("font-normal", className)}>
        <span>{boxes} boxes</span>
        <span className="text-muted-foreground">(units/case unknown)</span>
      </Badge>
    );
  }

  const totalUnits = boxes * unitsPerCase;

  return (
    <Badge variant="outline" className={cn("font-normal", className)}>
      <span>{boxes} boxes</span>
      <span className="text-muted-foreground">x {unitsPerCase} pcs =</span>
      <span>{totalUnits} pcs</span>
    </Badge>
  );
}
