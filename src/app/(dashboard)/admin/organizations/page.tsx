import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getInternalUsers, getVendorOrganizations } from "@/lib/queries/sales-accounts";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { OrganizationsTabs } from "./organizations-tabs";

export default async function AdminOrganizationsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) {
    redirect("/login");
  }

  const supabase = await createClient();

  const countryNames = new Intl.DisplayNames(["ko"], { type: "region" });

  const [buyerOrgsResult, shipToResult, assignmentsResult, vendorsResult, salesUsersResult, allOrgsResult] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, code, status, parent_org_id, country_code, org_type")
      .in("org_type", ["buyer_company", "buyer"])
      .eq("status", "active")
      .order("name"),
    supabase
      .from("organizations")
      .select("id, parent_org_id")
      .eq("org_type", "buyer_ship_to")
      .eq("status", "active"),
    supabase
      .from("account_assignments")
      .select("buyer_org_id, vendor_org_id, sales_user_id")
      .eq("status", "active"),
    getVendorOrganizations(supabase),
    getInternalUsers(supabase),
    supabase
      .from("organizations")
      .select("id, name, code, org_type")
      .eq("status", "active")
      .order("name"),
  ]);

  const buyerCompanyNameMap = new Map<string, string>();
  for (const org of buyerOrgsResult.data ?? []) {
    if (org.org_type === "buyer_company") buyerCompanyNameMap.set(org.id, org.name);
  }

  const shipToCountMap = new Map<string, number>();
  for (const s of shipToResult.data ?? []) {
    if (s.parent_org_id) {
      shipToCountMap.set(s.parent_org_id, (shipToCountMap.get(s.parent_org_id) ?? 0) + 1);
    }
  }

  const assignmentMap = new Map<string, { vendor_org_id: string | null; sales_user_id: string | null }>();
  for (const a of assignmentsResult.data ?? []) {
    assignmentMap.set(a.buyer_org_id, a);
  }

  const vendorNameMap = new Map<string, string>();
  for (const v of vendorsResult) vendorNameMap.set(v.id, v.name);

  const salesUserNameMap = new Map<string, string>();
  for (const u of salesUsersResult) salesUserNameMap.set(u.id, u.name);

  const buyers = (buyerOrgsResult.data ?? []).map((org) => {
    const assignment = assignmentMap.get(org.id);
    return {
      id: org.id,
      name: org.name,
      code: org.code,
      country_name: org.country_code ? (countryNames.of(org.country_code) ?? org.country_code) : null,
      ship_to_count: shipToCountMap.get(org.id) ?? 0,
      vendor_name: assignment?.vendor_org_id ? (vendorNameMap.get(assignment.vendor_org_id) ?? null) : null,
      sales_user_name: assignment?.sales_user_id ? (salesUserNameMap.get(assignment.sales_user_id) ?? null) : null,
      status: org.status as string,
    };
  });

  const vendorBuyerCounts = new Map<string, number>();
  for (const a of assignmentsResult.data ?? []) {
    if (a.vendor_org_id) {
      vendorBuyerCounts.set(a.vendor_org_id, (vendorBuyerCounts.get(a.vendor_org_id) ?? 0) + 1);
    }
  }

  const vendorRows = vendorsResult.map((v) => ({
    id: v.id,
    name: v.name,
    code: v.code,
    assigned_buyer_count: vendorBuyerCounts.get(v.id) ?? 0,
  }));

  const salesBuyerCounts = new Map<string, number>();
  for (const a of assignmentsResult.data ?? []) {
    if (a.sales_user_id) {
      salesBuyerCounts.set(a.sales_user_id, (salesBuyerCounts.get(a.sales_user_id) ?? 0) + 1);
    }
  }

  const salesUserRows = salesUsersResult.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    assigned_buyer_count: salesBuyerCounts.get(u.id) ?? 0,
  }));

  const allOrgs = (allOrgsResult.data ?? []) as Array<{
    id: string;
    name: string;
    code: string | null;
    org_type: string;
  }>;

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="조직 관리" />
      <OrganizationsTabs
        buyers={buyers}
        vendors={vendorRows}
        salesUsers={salesUserRows}
        allOrgs={allOrgs}
      />
    </section>
  );
}
