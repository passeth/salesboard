import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getSalesOrderStats } from "@/lib/queries/sales-orders";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { ArrowRight, CheckCircle2, Clock, FileText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function SalesDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== UserRole.Sales && currentUser.role !== UserRole.Admin)) {
    redirect("/login");
  }

  const supabase = await createClient();
  const stats = await getSalesOrderStats(supabase, currentUser.role === UserRole.Admin ? null : currentUser.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Sales Dashboard" />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <FileText className="size-4 text-primary" />
              Pending Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{stats.pendingReview}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Clock className="size-4 text-primary" />
              Awaiting Buyer Decision
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{stats.awaitingDecision}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <CheckCircle2 className="size-4 text-primary" />
              Confirmed This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{stats.confirmedThisMonth}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/sales/orders"
            className="flex items-center justify-between rounded-lg border bg-background px-4 py-3 text-sm font-medium transition hover:border-primary/50"
          >
            <span>Review Orders</span>
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
