import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getContentMappingOverview, getMappingStats } from "./_actions/mapping-actions";
import { ContentMappingClient } from "./content-mapping-client";

export default async function ContentMappingPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) {
    redirect("/login");
  }

  const [overview, stats] = await Promise.all([
    getContentMappingOverview(),
    getMappingStats(),
  ]);

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Content Mapping"
        description="Manage product ↔ R2 content folder mappings"
      />
      <ContentMappingClient
        initialSlugs={overview.slugs}
        orphanedSlugs={overview.orphanedSlugs}
        initialStats={stats}
      />
    </section>
  );
}
