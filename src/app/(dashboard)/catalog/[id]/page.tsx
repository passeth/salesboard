import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProductById } from "@/lib/queries/products";
import { listContentFiles } from "@/lib/r2/actions";
import { notFound } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ProductInfo } from "./product-info";
import { ProductLogistics } from "./product-logistics";
import { ProductMarketTabs } from "./product-market-tabs";
import { AddToCartButton } from "./add-to-cart-button";
import { BrandContentGallery } from "./brand-content-gallery";
import { ProductDocuments } from "./product-documents";
import { listProductImages } from "../_actions/product-image-actions";
import { ProductImageManager } from "./product-image-manager";
import type { ProductMarketContentRow } from "@/types/database";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await getProductById(supabase, id);
  if (!product) notFound();

  const { data: marketContents } = await supabase
    .from("product_market_contents")
    .select("*")
    .eq("product_id", id)
    .eq("content_status", "active");

  const { data: masterData } = await supabase
    .from("product_master")
    .select("content_slug")
    .eq("product_code", product.sku)
    .maybeSingle();

  const contentSlug = masterData?.content_slug ?? null;

  const productImagesResult = await listProductImages(product.sku);
  const allImages = productImagesResult.success
    ? (productImagesResult.images ?? [])
    : [];

  const barcodePattern = new RegExp(
    `^${product.sku}_\\d{13,}\\.(png|jpg|jpeg|webp)$`,
    "i",
  );
  const productImages = allImages.filter(
    (img) => !barcodePattern.test(img.fileName),
  );
  const barcodeImage = allImages.find((img) =>
    barcodePattern.test(img.fileName),
  ) ?? null;

  let brandContentFiles: Array<{
    key: string;
    fileName: string;
    category: string;
    size: number;
    lastModified: string;
    publicUrl: string;
  }> = [];

  if (contentSlug) {
    const result = await listContentFiles(contentSlug);
    if (result.success && result.files) {
      brandContentFiles = result.files.map((f) => ({
        ...f,
        lastModified: f.lastModified.toISOString(),
      }));
    }
  }

  const currentUser = await getCurrentUser();
  const userRole = currentUser?.role ?? null;

  const { data: productDocs } = await supabase
    .from("documents")
    .select("id, document_type, file_name, updated_at, metadata_json")
    .eq("owner_type", "product")
    .eq("owner_id", id)
    .in("document_type", ["ingredients_en", "formula_breakdown", "inci_summary"])
    .order("document_type");

  const docList = productDocs ?? [];
  const lastSyncedAt = docList.length > 0
    ? docList.reduce((latest, d) => (d.updated_at > latest ? d.updated_at : latest), docList[0].updated_at)
    : null;

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/catalog">Catalog</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{product.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex justify-center px-4">
          <ProductImageManager
            productId={id}
            sku={product.sku}
            primaryImageUrl={product.image_url}
            images={productImages}
            isAdmin={userRole === "admin"}
          />
        </div>

        <div className="space-y-6">
          <ProductInfo product={product} barcodeImageUrl={barcodeImage?.url ?? null} />
          <ProductLogistics product={product} />
        </div>
      </div>

      <ProductMarketTabs
        marketContents={(marketContents ?? []) as ProductMarketContentRow[]}
      />

      {docList.length > 0 && (
        <ProductDocuments documents={docList} lastSyncedAt={lastSyncedAt} />
      )}

      <BrandContentGallery
        contentSlug={contentSlug}
        productCode={product.sku}
        files={brandContentFiles}
      />

      {userRole === "buyer" && (
        <div className="flex justify-end">
          <AddToCartButton
            productId={product.id}
            productName={product.name}
            unitsPerCase={product.units_per_case}
          />
        </div>
      )}
    </div>
  );
}
