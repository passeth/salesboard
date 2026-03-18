"use client";

import { cn } from "@/lib/utils";
import { UserRole } from "@/types";
import {
  Box,
  Boxes,
  Building2,
  FileText,
  FolderSync,
  Globe2,
  Home,
  PackageSearch,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

const NAV_SECTIONS_BY_ROLE: Record<UserRole, NavSection[]> = {
  [UserRole.Buyer]: [
    {
      items: [
        { href: "/buyer", label: "Dashboard", icon: Home },
        { href: "/buyer/orders", label: "My Orders", icon: Box },
        { href: "/buyer/products", label: "Our Products", icon: Boxes },
        { href: "/buyer/ship-to", label: "Ship-to", icon: Truck },
        { href: "/catalog", label: "Catalog", icon: PackageSearch },
      ],
    },
  ],
  [UserRole.Vendor]: [
    {
      items: [
        { href: "/vendor", label: "Dashboard", icon: Home },
        { href: "/catalog", label: "Catalog", icon: PackageSearch },
      ],
    },
  ],
  [UserRole.Sales]: [
    {
      items: [
        { href: "/sales", label: "Dashboard", icon: Home },
        { href: "/sales/orders", label: "Order Review", icon: FileText },
        { href: "/sales/accounts", label: "Accounts", icon: Building2 },
        { href: "/catalog", label: "Catalog", icon: PackageSearch },
      ],
    },
  ],
  [UserRole.Logistics]: [
    {
      items: [
        { href: "/logistics", label: "Dashboard", icon: Home },
        { href: "/logistics/shipments", label: "Shipments", icon: Truck },
      ],
    },
    {
      title: "Packing",
      items: [
        { href: "/logistics/packing", label: "Packing Planner", icon: Boxes },
        { href: "/logistics/packing-list", label: "Packing Lists", icon: FileText },
      ],
    },
  ],
  [UserRole.Admin]: [
    {
      title: "Admin",
      items: [
        { href: "/admin", label: "Dashboard", icon: Home },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/organizations", label: "Organizations", icon: Building2 },
        { href: "/admin/products", label: "Products", icon: Boxes },
        { href: "/admin/inventory", label: "Inventory", icon: PackageSearch },
        { href: "/admin/orders", label: "All Orders", icon: ShoppingCart },
        { href: "/admin/content-mapping", label: "Content Mapping", icon: FolderSync },
      ],
    },
    {
      title: "Sales",
      items: [
        { href: "/sales", label: "Sales Dashboard", icon: Home },
        { href: "/sales/orders", label: "Order Review", icon: FileText },
        { href: "/sales/accounts", label: "Accounts", icon: Building2 },
      ],
    },
    {
      title: "Logistics",
      items: [
        { href: "/logistics", label: "Logistics Dashboard", icon: Home },
        { href: "/logistics/shipments", label: "Shipments", icon: Truck },
      ],
    },
    {
      title: "Packing",
      items: [
        { href: "/logistics/packing", label: "Packing Planner", icon: Boxes },
        { href: "/logistics/packing-list", label: "Packing Lists", icon: FileText },
      ],
    },
    {
      title: "Buyer",
      items: [
        { href: "/buyer", label: "Buyer Dashboard", icon: Home },
        { href: "/buyer/orders", label: "Buyer Orders", icon: ShoppingCart },
        { href: "/buyer/products", label: "Our Products", icon: Boxes },
        { href: "/buyer/ship-to", label: "Ship-to", icon: Truck },
      ],
    },
    {
      title: "Common",
      items: [
        { href: "/catalog", label: "Catalog", icon: PackageSearch },
      ],
    },
  ],
};

type SidebarProps = {
  userRole: UserRole;
  userEmail?: string | null;
  cartItemCount?: number;
};

function isActive(pathname: string, href: string, allHrefs: string[]) {
  if (pathname === href) return true;
  const hasChildItem = allHrefs.some(
    (h) => h !== href && h.startsWith(`${href}/`),
  );
  if (hasChildItem) return false;
  return pathname.startsWith(`${href}/`);
}

type RouteSection = "admin" | "sales" | "logistics" | "buyer" | "default";

const SECTION_ACCENT_HSL: Record<RouteSection, string> = {
  admin: "258 90% 66%",
  sales: "132 44% 41%",
  logistics: "29 88% 59%",
  buyer: "242 100% 68%",
  default: "242 100% 68%",
};

function getRouteSection(pathname: string): RouteSection {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/sales")) return "sales";
  if (pathname.startsWith("/logistics")) return "logistics";
  if (pathname.startsWith("/buyer")) return "buyer";
  return "default";
}

function getRoleLabel(role: UserRole) {
  switch (role) {
    case UserRole.Buyer:
      return "Buyer";
    case UserRole.Vendor:
      return "Vendor";
    case UserRole.Sales:
      return "Sales";
    case UserRole.Logistics:
      return "Logistics";
    case UserRole.Admin:
      return "Admin";
    default:
      return "Member";
  }
}

export function Sidebar({ userRole, userEmail, cartItemCount }: SidebarProps) {
  const pathname = usePathname();
  const sections = NAV_SECTIONS_BY_ROLE[userRole];
  const allHrefs = sections.flatMap((s) => s.items.map((i) => i.href));
  const firstHref = sections[0]?.items[0]?.href ?? "/";
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "TI";

  const routeSection = getRouteSection(pathname);
  const sectionStyle = useMemo(
    () => ({ "--sidebar-accent": SECTION_ACCENT_HSL[routeSection] }) as React.CSSProperties,
    [routeSection],
  );

  return (
    <aside className="flex h-screen flex-col bg-sidebar-background text-sidebar-foreground transition-colors duration-200" style={sectionStyle}>
      <div className="border-b border-sidebar-border p-5">
        <Link className="flex items-center gap-3" href={firstHref}>
          <div className="inline-flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Globe2 className="size-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs uppercase tracking-[0.2em] text-sidebar-foreground/60">Trade</p>
            <p className="text-base font-semibold text-sidebar-foreground">Trade Intel</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        {sections.map((section, sectionIndex) => {
          const sectionHasActiveItem = section.items.some((item) =>
            isActive(pathname, item.href, allHrefs),
          );

          return (
          <div key={section.title ?? sectionIndex} className={cn(sectionIndex > 0 && "mt-4")}>
            {section.title ? (
              <p className={cn(
                "mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                sectionHasActiveItem
                  ? "text-sidebar-accent"
                  : "text-sidebar-foreground/40",
              )}>
                {section.title}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href, allHrefs);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                    {item.href === "/buyer/products" && cartItemCount != null && cartItemCount > 0 && (
                      <span className="ml-auto inline-flex size-5 items-center justify-center rounded-full bg-sidebar-primary text-[10px] font-bold text-sidebar-primary-foreground">
                        {cartItemCount > 99 ? "99+" : cartItemCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <Link
          href="/profile"
          className="mb-3 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          <Settings className="size-4" />
          Settings
        </Link>

        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 px-3 py-2">
          <div className="inline-flex size-8 items-center justify-center rounded-full bg-sidebar-primary/20 text-xs font-semibold text-sidebar-foreground">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground">{getRoleLabel(userRole)}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">{userEmail ?? "Signed in"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
