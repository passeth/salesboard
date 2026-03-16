import { updateSession } from "@/lib/supabase/middleware";
import { UserRole } from "@/types";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/login", "/auth/callback"]);

const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[]> = {
  [UserRole.Buyer]: ["/buyer", "/catalog", "/profile"],
  [UserRole.Vendor]: ["/vendor", "/catalog", "/profile"],
  [UserRole.Sales]: ["/sales", "/catalog", "/profile"],
  [UserRole.Logistics]: ["/logistics", "/profile"],
  [UserRole.Admin]: ["/admin", "/catalog", "/profile"],
};

const ROLE_HOME: Record<UserRole, string> = {
  [UserRole.Buyer]: "/buyer",
  [UserRole.Vendor]: "/vendor",
  [UserRole.Sales]: "/sales",
  [UserRole.Logistics]: "/logistics",
  [UserRole.Admin]: "/admin",
};

function isStaticAsset(pathname: string) {
  return /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$/i.test(pathname);
}

function isAllowedPath(pathname: string, allowedPrefixes: string[]) {
  return allowedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

function isUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/auth/callback" ||
    isStaticAsset(pathname)
  ) {
    return NextResponse.next();
  }

  const { supabase, response, user } = await updateSession(request);

  if (!user) {
    if (pathname === "/login") return NextResponse.next();
    return redirectTo(request, "/login");
  }

  if (pathname === "/login") {
    const { data: loginUserRecord } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const loginRole = loginUserRecord?.role;
    if (loginRole && isUserRole(loginRole)) {
      return redirectTo(request, ROLE_HOME[loginRole]);
    }
    return NextResponse.next();
  }

  const { data: userRecord } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = userRecord?.role;
  if (!role || !isUserRole(role)) {
    return redirectTo(request, "/login");
  }

  const homePath = ROLE_HOME[role];

  if (pathname === "/") {
    return redirectTo(request, homePath);
  }

  if (role !== UserRole.Admin) {
    const allowedPrefixes = ROLE_ALLOWED_PREFIXES[role];
    if (!isAllowedPath(pathname, allowedPrefixes)) {
      return redirectTo(request, homePath);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
