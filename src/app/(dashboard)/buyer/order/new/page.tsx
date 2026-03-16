import { getCurrentUser } from "@/lib/auth";
import { getOrderById, getOrderItems } from "@/lib/queries/orders";
import { getShipToOrganizations } from "@/lib/queries/organizations";
import { createClient } from "@/lib/supabase/server";
import { OrganizationRow } from "@/types";
import { redirect } from "next/navigation";
import { OrderForm } from "./order-form";

type NewOrderSearchParams = {
  product?: string;
  draft?: string;
  clone?: string;
};

type ProductOption = {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  units_per_case: number | null;
  image_url: string | null;
};

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<NewOrderSearchParams>;
}) {
  const params = await searchParams;
  const preSelectedProductId = params.product;

  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser.orgId) {
    redirect("/login");
  }

  const supabase = await createClient();
  const [{ data: products }, shipToResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, sku, name, brand, units_per_case, image_url")
      .eq("status", "active")
      .order("name", { ascending: true }),
    getShipToOrganizations(supabase, currentUser.orgId),
  ]);

  const shipToOrgs: OrganizationRow[] = shipToResult.data;

  const productList = (products ?? []) as ProductOption[];
  let draftId: string | undefined;
  let initialValues: React.ComponentProps<typeof OrderForm>["initialValues"];

  const sourceOrderId = params.draft ?? params.clone;

  if (sourceOrderId) {
    const [orderResult, itemsResult] = await Promise.all([
      getOrderById(supabase, sourceOrderId),
      getOrderItems(supabase, sourceOrderId),
    ]);

    if (orderResult.data && itemsResult.data.length > 0) {
      const order = orderResult.data;
      const meta = (order.metadata_json ?? {}) as Record<string, string>;

      if (params.draft && order.status === "draft") {
        draftId = sourceOrderId;
      }

      initialValues = {
        items: itemsResult.data.map((item) => ({
          product_id: item.product_id,
          product_name: item.product.name,
          product_sku: item.product.sku,
          requested_qty: item.requested_qty,
          units_per_case: item.units_per_case,
          unit_price: item.unit_price,
          image_url: item.product.image_url ?? null,
        })),
        requested_delivery_date: order.requested_delivery_date,
        ship_to_org_id: order.ship_to_org_id ?? shipToOrgs[0]?.id ?? currentUser.orgId,
        memo: meta.memo ?? "",
      };
    }
  }

  return (
    <OrderForm
      products={productList}
      shipToOrgs={shipToOrgs}
      preSelectedProductId={preSelectedProductId}
      userOrgId={currentUser.orgId}
      draftId={draftId}
      initialValues={initialValues}
    />
  );
}
