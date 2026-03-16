import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getAdminUsers } from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { UsersTable } from "./users-table";

type AdminUsersSearchParams = {
  role?: string;
  status?: string;
  sort?: string;
  sortDir?: string;
  page?: string;
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<AdminUsersSearchParams>;
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
  const usersResult = await getAdminUsers(supabase, {
    role: params.role,
    status: params.status,
    sort: params.sort,
    sortDir,
    page: safePage,
    pageSize: 20,
  });

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="User Management" />

      <UsersTable
        users={usersResult.data}
        totalCount={usersResult.count}
        currentPage={safePage}
        pageSize={20}
        currentRole={params.role}
        currentStatus={params.status}
        currentSort={params.sort}
        currentSortDir={params.sortDir}
      />
    </section>
  );
}
