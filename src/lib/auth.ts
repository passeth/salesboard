import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";

export type CurrentUser = {
  id: string;
  email: string;
  role: UserRole;
  orgId: string | null;
  name: string;
  phone: string | null;
  locale: string | null;
};

function isUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

export const getCurrentUser = cache(
  async (): Promise<CurrentUser | null> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: userRecord } = await supabase
      .from("users")
      .select("role, org_id, name, email, phone, locale")
      .eq("id", user.id)
      .maybeSingle();

    if (!userRecord || !isUserRole(userRecord.role)) return null;

    return {
      id: user.id,
      email: user.email ?? userRecord.email,
      role: userRecord.role as UserRole,
      orgId: userRecord.org_id ?? null,
      name: userRecord.name,
      phone: userRecord.phone ?? null,
      locale: userRecord.locale ?? null,
    };
  },
);
