"use server";

import { getCurrentUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";

type CreateUserInput = {
  email: string;
  password: string;
  name: string;
  role: string;
  org_id: string;
  phone?: string;
};

export async function adminCreateUser(input: CreateUserInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) throw new Error("Unauthorized");

  const supabase = createServiceClient();

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });

  if (authError) throw new Error(`Auth error: ${authError.message}`);
  if (!authData.user) throw new Error("Failed to create auth user");

  const { error: dbError } = await supabase.from("users").insert({
    id: authData.user.id,
    email: input.email,
    name: input.name,
    role: input.role,
    org_id: input.org_id,
    phone: input.phone ?? null,
    status: "active",
  });

  if (dbError) {
    // Rollback: delete auth user if DB insert fails
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(`DB error: ${dbError.message}`);
  }

  revalidatePath("/admin/users");
}

export async function adminResetPassword(userId: string, newPassword: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== UserRole.Admin) throw new Error("Unauthorized");

  if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");

  const supabase = createServiceClient();

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) throw new Error(`Failed to reset password: ${error.message}`);
}
