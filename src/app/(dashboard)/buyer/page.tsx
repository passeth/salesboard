import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getBuyerOrderCountsByStatus, getBuyerOrders } from "@/lib/queries/orders";
import { getBuyerOrganizations } from "@/lib/queries/organizations";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { AlertTriangle, ArrowRight, Box, CheckCircle, PackageSearch, ShoppingCart, Truck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BuyerOrgSelector } from "./buyer-org-selector";

export default async function BuyerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const params = await searchParams;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const isAdmin = currentUser.role === UserRole.Admin;

  if (!isAdmin && !currentUser.orgId) {
    redirect("/login");
  }

  const selectedOrgId = isAdmin ? (params.org ?? null) : currentUser.orgId;

  const supabase = await createClient();
  let buyerOrgs: Awaited<ReturnType<typeof getBuyerOrganizations>>["data"] = [];

  if (isAdmin) {
    const { data } = await getBuyerOrganizations(supabase);
    buyerOrgs = data;
  }

  const [ordersResult, actionRequiredResult, inTransitResult, confirmedResult] =
    await Promise.all([
      getBuyerOrders(supabase, selectedOrgId, { pageSize: 5 }),
      getBuyerOrderCountsByStatus(supabase, selectedOrgId, [
        "needs_buyer_decision",
      ]),
      getBuyerOrderCountsByStatus(supabase, selectedOrgId, [
        "shipped",
        "partially_shipped",
      ]),
      getBuyerOrderCountsByStatus(supabase, selectedOrgId, ["confirmed"]),
    ]);

  const recentOrders = ordersResult.data;
  const totalOrders = ordersResult.count;

  const ordersHref = isAdmin && selectedOrgId
    ? `/buyer/orders?org=${selectedOrgId}`
    : "/buyer/orders";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={isAdmin ? "Buyer Dashboard" : "My Dashboard"} />

      {isAdmin ? (
        <BuyerOrgSelector
          organizations={buyerOrgs}
          currentOrgId={params.org}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <ShoppingCart className="size-4 text-primary" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{totalOrders}</p>
          </CardContent>
        </Card>

        <Card className={actionRequiredResult.count > 0 ? "border-amber-300 bg-amber-50" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <AlertTriangle className={`size-4 ${actionRequiredResult.count > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{actionRequiredResult.count}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Truck className="size-4 text-blue-600" />
              In Transit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{inTransitResult.count}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <CheckCircle className="size-4 text-emerald-600" />
              Confirmed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{confirmedResult.count}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={ordersHref}>
          <Card className="h-full transition hover:border-primary/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Box className="size-4 text-primary" />
                View Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Browse all orders</p>
              <ArrowRight className="size-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/catalog">
          <Card className="h-full transition hover:border-primary/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <PackageSearch className="size-4 text-primary" />
                Catalog
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Browse products</p>
              <ArrowRight className="size-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {recentOrders.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Orders</CardTitle>
            <Link
              href={ordersHref}
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/buyer/orders/${order.id}`}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-muted/50 -mx-2 px-2 rounded"
                >
                  <div>
                    <p className="text-sm font-medium">{order.order_no}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.organization?.name ?? "-"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm capitalize text-muted-foreground">
                      {order.status.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-CA")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
