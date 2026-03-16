import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getAdminStats, getOrderPipeline } from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUS_CONFIG, UserRole } from "@/types";
import { ArrowRight, Building2, Package, ShoppingCart, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) {
    redirect("/login");
  }

  const supabase = await createClient();
  const [stats, pipeline] = await Promise.all([getAdminStats(supabase), getOrderPipeline(supabase)]);

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Admin Dashboard" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <ShoppingCart className="size-4 text-primary" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{stats.totalOrders}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Users className="size-4 text-primary" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{stats.activeUsers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Package className="size-4 text-primary" />
              Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{stats.totalProducts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Building2 className="size-4 text-primary" />
              Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{stats.totalOrgs}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pipeline.map((item) => (
            <div key={item.status} className="rounded-lg border bg-background px-4 py-3">
              <p className="text-sm font-medium">
                {ORDER_STATUS_CONFIG[item.status as keyof typeof ORDER_STATUS_CONFIG]?.label ?? item.status}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{item.count}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/users"
            className="flex items-center justify-between rounded-lg border bg-background px-4 py-3 text-sm font-medium transition hover:border-primary/50"
          >
            <span>Manage Users</span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
          <Link
            href="/admin/products"
            className="flex items-center justify-between rounded-lg border bg-background px-4 py-3 text-sm font-medium transition hover:border-primary/50"
          >
            <span>Manage Products</span>
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
    </section>
  );
}
