import { PageHeader } from "@/components/page-header";
import {
  getActiveProducts,
  getProductBrands,
  getProductCategories,
} from "@/lib/queries/products";
import { createClient } from "@/lib/supabase/server";
import { CatalogFilters } from "./catalog-filters";
import { CatalogGrid } from "./catalog-grid";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const brand = params.brand;
  const category = params.category;
  const q = params.q;
  const view = (params.view as "grid" | "list") || "list";
  const page = params.page ? parseInt(params.page, 10) : 1;
  const pageSize = view === "list" ? 100 : 24;

  const supabase = await createClient();

  const [productsResult, brands, categories] = await Promise.all([
    getActiveProducts(supabase, {
      brand,
      category,
      search: q,
      page,
      pageSize,
    }),
    getProductBrands(supabase),
    getProductCategories(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Product Catalog" />
      
      <div className="flex flex-col gap-6">
        <CatalogFilters
          brands={brands}
          categories={categories}
          currentBrand={brand}
          currentCategory={category}
          currentSearch={q}
          currentView={view}
        />
        
        <CatalogGrid
          products={productsResult.data}
          view={view}
          totalCount={productsResult.count}
          currentPage={page}
          pageSize={pageSize}
        />
      </div>
    </div>
  );
}
