import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getLogisticsStats } from "@/lib/queries/shipments";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { ArrowRight, CheckCircle2, Package, Truck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function LogisticsDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== UserRole.Logistics && currentUser.role !== UserRole.Admin)) {
    redirect("/login");
  }

  const supabase = await createClient();
  const stats = await getLogisticsStats(supabase);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Logistics Dashboard" />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Package className="size-4 text-primary" />
              Awaiting Shipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{stats.awaitingShipment}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Truck className="size-4 text-primary" />
              Active Shipments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{stats.activeShipments}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <CheckCircle2 className="size-4 text-primary" />
              Delivered This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{stats.deliveredThisMonth}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link
            href="/logistics/packing"
            className="flex items-center justify-between rounded-lg border bg-background px-4 py-3 text-sm font-medium transition hover:border-primary/50"
          >
            <span>Draft Packing Planner</span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
          <Link
            href="/logistics/shipments"
            className="flex items-center justify-between rounded-lg border bg-background px-4 py-3 text-sm font-medium transition hover:border-primary/50"
          >
            <span>Final Shipment Packing</span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
