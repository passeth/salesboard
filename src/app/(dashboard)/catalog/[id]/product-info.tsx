import { ProductRow } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarcodeDetailModal } from "./barcode-detail-modal";
import { BarcodeEditor } from "./barcode-editor";

type Props = {
  product: ProductRow;
  barcodeImageUrl: string | null;
  isAdmin?: boolean;
  productId?: string;
};

export function ProductInfo({ product, barcodeImageUrl, isAdmin, productId }: Props) {
  const extraJson = product.extra_json as Record<string, unknown> | null;
  const nameEn = extraJson?.name_en as string | undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Information</CardTitle>
        {nameEn && <p className="text-sm text-muted-foreground">{nameEn}</p>}
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-medium text-muted-foreground">SKU</dt>
            <dd className="text-sm">{product.sku}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-medium text-muted-foreground">Barcode</dt>
            <dd>
              {isAdmin && productId ? (
                <BarcodeEditor
                  productId={productId}
                  currentBarcode={product.barcode}
                  hasBarcodeImage={!!barcodeImageUrl}
                />
              ) : (
                <span className="text-sm">{product.barcode || "—"}</span>
              )}
            </dd>
          </div>
          {barcodeImageUrl && product.barcode && (
            <div className="col-span-full flex flex-col gap-1">
              <dt className="text-sm font-medium text-muted-foreground">
                Barcode Image
              </dt>
              <dd>
                <BarcodeDetailModal
                  barcodeImageUrl={barcodeImageUrl}
                  barcode={product.barcode}
                  sku={product.sku}
                  productName={product.name}
                />
              </dd>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-medium text-muted-foreground">QR Code</dt>
            <dd className="text-sm">{product.qr_code || "—"}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-medium text-muted-foreground">Brand</dt>
            <dd className="text-sm">
              {product.brand ? <Badge variant="secondary">{product.brand}</Badge> : "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-medium text-muted-foreground">Category</dt>
            <dd className="text-sm">{product.category || "—"}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-medium text-muted-foreground">Volume</dt>
            <dd className="text-sm">
              {product.volume_value && product.volume_unit
                ? `${product.volume_value} ${product.volume_unit}`
                : "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-medium text-muted-foreground">HS Code</dt>
            <dd className="text-sm">{product.hs_code || "—"}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-medium text-muted-foreground">Status</dt>
            <dd className="text-sm">
              <Badge
                variant={product.status === "active" ? "default" : "secondary"}
                className={
                  product.status === "active"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-gray-500 hover:bg-gray-600"
                }
              >
                {product.status}
              </Badge>
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
