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
import { Package } from "lucide-react";
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
        <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-8">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              width={400}
              height={400}
              className="max-h-96 w-auto rounded-lg object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Package className="size-16" />
              <span className="text-sm">No image available</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <ProductInfo product={product} />
          <ProductLogistics product={product} />
        </div>
      </div>

      <ProductMarketTabs
        marketContents={(marketContents ?? []) as ProductMarketContentRow[]}
      />

      <BrandContentGallery
        contentSlug={contentSlug}
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
