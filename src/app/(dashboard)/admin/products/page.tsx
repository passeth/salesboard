import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import {
  getAdminProducts,
  getProductBrandsForAdmin,
  getProductCategoriesForAdmin,
} from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { ProductsFilters } from "./products-filters";
import { ProductsTable } from "./products-table";

type AdminProductsSearchParams = {
  brand?: string;
  category?: string;
  status?: string;
  search?: string;
  sort?: string;
  sortDir?: string;
  page?: string;
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<AdminProductsSearchParams>;
}) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10);
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const sortDir = params.sortDir === "asc" || params.sortDir === "desc" ? params.sortDir : undefined;

  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) {
    redirect("/login");
  }

  const supabase = await createClient();
  const [productsResult, brands, categories] = await Promise.all([
    getAdminProducts(supabase, {
      brand: params.brand,
      category: params.category,
      status: params.status,
      search: params.search,
      sort: params.sort,
      sortDir,
      page: safePage,
      pageSize: 300,
    }),
    getProductBrandsForAdmin(supabase),
    getProductCategoriesForAdmin(supabase),
  ]);

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Product Management" />

      <ProductsFilters
        brands={brands}
        categories={categories}
        currentBrand={params.brand}
        currentCategory={params.category}
        currentStatus={params.status}
        currentSearch={params.search}
      />

      <ProductsTable
        products={productsResult.data}
        totalCount={productsResult.count}
        currentPage={safePage}
        pageSize={300}
        currentSort={params.sort}
        currentSortDir={params.sortDir}
        brands={brands}
      />
    </section>
  );
}
