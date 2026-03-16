import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: userRecord } = await supabase
          .from("users")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!userRecord) {
          await supabase.auth.signOut();
          const loginUrl = new URL("/login", requestUrl.origin);
          loginUrl.searchParams.set("error", "no_account");
          return NextResponse.redirect(loginUrl);
        }
      }
    }
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
