import { HeaderBar } from "@/components/header-bar";
import { Sidebar } from "@/components/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";

function getDashboardTitle(role: UserRole) {
  switch (role) {
    case UserRole.Buyer:
      return "Buyer Dashboard";
    case UserRole.Vendor:
      return "Vendor Dashboard";
    case UserRole.Sales:
      return "Sales Dashboard";
    case UserRole.Logistics:
      return "Logistics Dashboard";
    case UserRole.Admin:
      return "Admin Dashboard";
    default:
      return "Dashboard";
  }
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  let cartItemCount: number | undefined;
  if (currentUser.role === UserRole.Buyer && currentUser.orgId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("orders")
      .select("id, order_items(id)")
      .eq("ordering_org_id", currentUser.orgId)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const items = data.order_items as unknown as Array<{ id: string }>;
      cartItemCount = items?.length ?? 0;
    }
  }

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[240px_1fr]">
      <Sidebar userRole={currentUser.role} userEmail={currentUser.email} cartItemCount={cartItemCount} />

      <div className="flex min-w-0 flex-col">
        <HeaderBar title={getDashboardTitle(currentUser.role)} userEmail={currentUser.email} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
