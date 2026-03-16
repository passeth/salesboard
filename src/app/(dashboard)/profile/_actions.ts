"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ProfileActionState = {
  success: boolean;
  message: string;
};

const SUPPORTED_LOCALES = new Set(["en", "ko", "ja", "zh"]);

export async function updateProfile(_: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be logged in." };
  }

  const name = formData.get("name");
  const phone = formData.get("phone");
  const locale = formData.get("locale");

  if (typeof name !== "string" || name.trim().length === 0) {
    return { success: false, message: "Name is required." };
  }

  if (typeof locale !== "string" || !SUPPORTED_LOCALES.has(locale)) {
    return { success: false, message: "Please select a valid locale." };
  }

  let normalizedPhone: string | null = null;
  if (typeof phone === "string") {
    const trimmedPhone = phone.trim();
    normalizedPhone = trimmedPhone.length > 0 ? trimmedPhone : null;
  }

  const { error } = await supabase
    .from("users")
    .update({
      name: name.trim(),
      phone: normalizedPhone,
      locale,
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/profile");

  return { success: true, message: "Profile updated successfully." };
}

export async function changePassword(_: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be logged in." };
  }

  const currentPassword = formData.get("currentPassword");
  const newPassword = formData.get("newPassword");
  const confirmPassword = formData.get("confirmPassword");

  if (typeof currentPassword !== "string" || currentPassword.length === 0) {
    return { success: false, message: "Current password is required." };
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return { success: false, message: "New password must be at least 8 characters." };
  }

  if (typeof confirmPassword !== "string" || newPassword !== confirmPassword) {
    return { success: false, message: "New password and confirmation do not match." };
  }

  if (!user.email) {
    return { success: false, message: "User email is missing." };
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (authError) {
    return { success: false, message: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Password changed successfully." };
}
