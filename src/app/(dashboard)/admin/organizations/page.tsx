import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getAdminOrganizations } from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OrganizationsTable } from "./organizations-table";

type AdminOrganizationsSearchParams = {
  org_type?: string;
  status?: string;
  search?: string;
  sort?: string;
  sortDir?: string;
  page?: string;
};

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<AdminOrganizationsSearchParams>;
}) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10);
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const sortDir = params.sortDir === "asc" || params.sortDir === "desc" ? params.sortDir : undefined;

  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) {
    redirect("/login");
  }

  const supabase = await createClient();
  const organizationsResult = await getAdminOrganizations(supabase, {
    org_type: params.org_type,
    status: params.status,
    search: params.search,
    sort: params.sort,
    sortDir,
    page: safePage,
    pageSize: 20,
  });

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Organization Management" />

      <Suspense fallback={<div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">Loading organizations...</div>}>
        <OrganizationsTable
          organizations={organizationsResult.data}
          totalCount={organizationsResult.count}
          currentPage={safePage}
          pageSize={20}
          currentOrgType={params.org_type}
          currentStatus={params.status}
          currentSearch={params.search}
          currentSort={params.sort}
          currentSortDir={params.sortDir}
        />
      </Suspense>
    </section>
  );
}
