import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", currentUser.orgId)
    .maybeSingle();

  return (
    <section className="space-y-6">
      <PageHeader title="My Profile" />

      <div className="space-y-6">
        <ProfileForm
          name={currentUser.name}
          phone={currentUser.phone}
          locale={currentUser.locale}
          email={currentUser.email}
          role={currentUser.role}
          organizationName={organization?.name ?? "Unknown organization"}
        />
        <PasswordForm />
      </div>
    </section>
  );
}
