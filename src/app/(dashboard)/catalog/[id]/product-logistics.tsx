import { ProductRow } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProductLogistics({ product }: { product: ProductRow }) {
  const hasDimensions =
    product.case_length != null &&
    product.case_width != null &&
    product.case_height != null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logistics Specifications</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-medium text-muted-foreground">
              Units per Case
            </dt>
            <dd className="text-lg font-semibold">
              {product.units_per_case ?? (
                <span className="text-sm font-normal text-amber-600">
                  Not set
                </span>
              )}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-medium text-muted-foreground">
              CBM
            </dt>
            <dd className="text-sm">
              {product.cbm != null ? `${product.cbm} m³` : "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-medium text-muted-foreground">
              Net Weight
            </dt>
            <dd className="text-sm">
              {product.net_weight != null ? `${product.net_weight} kg` : "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-medium text-muted-foreground">
              Gross Weight
            </dt>
            <dd className="text-sm">
              {product.gross_weight != null
                ? `${product.gross_weight} kg`
                : "—"}
            </dd>
          </div>
          <div className="col-span-full flex flex-col gap-1">
            <dt className="text-sm font-medium text-muted-foreground">
              Case Dimensions (L × W × H)
            </dt>
            <dd className="text-sm">
              {hasDimensions
                ? `${product.case_length} × ${product.case_width} × ${product.case_height} cm`
                : "—"}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
