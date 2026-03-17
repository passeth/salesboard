import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getBuyerOrganizations } from "@/lib/queries/organizations";
import {
  getProductBrands,
  getProductCatalogForBuyer,
  getProductTranslations,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/lib/queries/products";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { BuyerOrgSelector } from "../buyer-org-selector";
import { BuyerProductsGrid } from "./buyer-products-grid";

export default async function BuyerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const brand = params.brand;
  const rawLang = params.lang ?? "en";
  const locale: SupportedLocale = (SUPPORTED_LOCALES as readonly string[]).includes(rawLang)
    ? (rawLang as SupportedLocale)
    : "en";

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const isAdmin = currentUser.role === UserRole.Admin;
  if (!isAdmin && !currentUser.orgId) redirect("/login");

  const selectedOrgId = isAdmin ? (params.org ?? null) : currentUser.orgId;

  const supabase = await createClient();

  let buyerOrgs: Awaited<ReturnType<typeof getBuyerOrganizations>>["data"] = [];
  if (isAdmin) {
    const { data } = await getBuyerOrganizations(supabase);
    buyerOrgs = data;
  }

  const [productsResult, brands, translations] = await Promise.all([
    selectedOrgId
      ? getProductCatalogForBuyer(supabase, selectedOrgId, { brand })
      : { data: [], error: null },
    getProductBrands(supabase),
    getProductTranslations(supabase, locale),
  ]);

  const translationsObj = Object.fromEntries(translations);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Product Catalog"
        description="Browse all products, add to cart for ordering"
      />

      {isAdmin ? (
        <BuyerOrgSelector
          organizations={buyerOrgs}
          currentOrgId={params.org}
        />
      ) : null}

      <BuyerProductsGrid
        products={productsResult.data}
        brands={brands}
        orgId={selectedOrgId ?? ""}
        locale={locale}
        translations={translationsObj}
      />
    </div>
  );
}
