import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import {
  getVendorDashboardStats,
  getVendorOrganizations,
  getVendorRecentOrders,
} from "@/lib/queries/vendor";
import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUS_CONFIG, OrderStatus, UserRole } from "@/types";
import { ArrowRight, Building2, DollarSign, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { VendorOrgSelector } from "./vendor-org-selector";

type DashboardSearchParams = {
  vendorOrg?: string;
};

export default async function VendorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== UserRole.Vendor && currentUser.role !== UserRole.Admin)) {
    redirect("/login");
  }

  if (!currentUser.orgId && currentUser.role === UserRole.Vendor) {
    redirect("/login");
  }

  const isAdmin = currentUser.role === UserRole.Admin;
  const supabase = await createClient();

  const vendorOrgs = isAdmin ? await getVendorOrganizations(supabase) : [];
  const vendorOrgId = isAdmin ? (params.vendorOrg ?? "") : (currentUser.orgId ?? "");

  const [stats, recentOrders] = await Promise.all([
    vendorOrgId ? getVendorDashboardStats(supabase, vendorOrgId) : Promise.resolve({ assignedBuyers: 0, activeOrders: 0, monthlyCommission: 0, currencyCode: "USD" }),
    vendorOrgId ? getVendorRecentOrders(supabase, vendorOrgId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Vendor Dashboard" />

      {isAdmin && (
        <VendorOrgSelector vendors={vendorOrgs} currentVendorOrg={params.vendorOrg} />
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Building2 className="size-4 text-primary" />
              Assigned Buyers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {stats.assignedBuyers}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <ShoppingCart className="size-4 text-primary" />
              Active Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {stats.activeOrders}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <DollarSign className="size-4 text-primary" />
              Monthly Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              ${stats.monthlyCommission.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {recentOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((order) => {
                const statusConfig =
                  ORDER_STATUS_CONFIG[order.status as OrderStatus];
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border bg-background px-4 py-3"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">
                        {order.order_no}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {order.organization?.name ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {statusConfig && (
                        <span className="text-xs text-muted-foreground">
                          {statusConfig.label}
                        </span>
                      )}
                      {order.vendor_commission_amount != null && (
                        <span className="text-sm font-medium">
                          ${Number(order.vendor_commission_amount).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/vendor/orders"
            className="flex items-center justify-between rounded-lg border bg-background px-4 py-3 text-sm font-medium transition hover:border-primary/50"
          >
            <span>View Orders</span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
          <Link
            href="/vendor/commissions"
            className="flex items-center justify-between rounded-lg border bg-background px-4 py-3 text-sm font-medium transition hover:border-primary/50"
          >
            <span>Commission Summary</span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
          <Link
            href="/vendor/accounts"
            className="flex items-center justify-between rounded-lg border bg-background px-4 py-3 text-sm font-medium transition hover:border-primary/50"
          >
            <span>Buyer Accounts</span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
          <Link
            href="/catalog"
            className="flex items-center justify-between rounded-lg border bg-background px-4 py-3 text-sm font-medium transition hover:border-primary/50"
          >
            <span>Browse Catalog</span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
