import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getProductBrands, getProductCategories } from "@/lib/queries/products";
import {
  getVendorOrganizations,
  getVendorProducts,
} from "@/lib/queries/vendor";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { VendorOrgSelector } from "../vendor-org-selector";
import { VendorProductsGrid } from "./vendor-products-grid";

type SearchParams = {
  vendorOrg?: string;
  brand?: string;
};

export default async function VendorProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  if (
    !currentUser ||
    (currentUser.role !== UserRole.Vendor && currentUser.role !== UserRole.Admin)
  ) {
    redirect("/login");
  }

  if (!currentUser.orgId && currentUser.role === UserRole.Vendor) {
    redirect("/login");
  }

  const isAdmin = currentUser.role === UserRole.Admin;
  const supabase = await createClient();

  const vendorOrgs = isAdmin ? await getVendorOrganizations(supabase) : [];
  const vendorOrgId = isAdmin
    ? (params.vendorOrg ?? "")
    : (currentUser.orgId ?? "");

  const [productsResult, brands, categories] = await Promise.all([
    vendorOrgId
      ? getVendorProducts(supabase, vendorOrgId)
      : Promise.resolve({ products: [], commissions: [] }),
    getProductBrands(supabase),
    getProductCategories(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vendor Products"
        description="Manage product catalog and view commission rates"
      />

      {isAdmin && (
        <VendorOrgSelector
          vendors={vendorOrgs}
          currentVendorOrg={params.vendorOrg}
        />
      )}

      <VendorProductsGrid
        products={productsResult.products}
        commissions={productsResult.commissions}
        brands={brands}
        categories={categories}
      />
    </div>
  );
}
