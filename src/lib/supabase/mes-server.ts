import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getMesSupabaseEnv() {
  const url = process.env.MES_SUPABASE_URL;
  const anonKey = process.env.MES_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing MES Supabase environment variables (MES_SUPABASE_URL, MES_SUPABASE_ANON_KEY)");
  }

  return { url, anonKey };
}

export function createMesClient() {
  const { url, anonKey } = getMesSupabaseEnv();
  return createSupabaseClient(url, anonKey);
}
